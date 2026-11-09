-- =========================================================================
-- SUÍTE DE TESTES SQL DE HOMOLOGAÇÃO REAL — SPRINT 35: PRODUTOS E ESTOQUE
--
-- ARQUITETURA DE HOMOLOGAÇÃO ROBUSTA (SINGLE-BLOCK / ZERO TABLE CONFLICT):
-- 1. Executa em um ÚNICO bloco anônimo DO $$ ... $$ encapsulado em transação BEGIN ... ROLLBACK.
-- 2. Não cria nem depende de tabelas temporárias auxiliares, eliminando qualquer erro 42P01.
-- 3. Testa RLS e RBAC autênticos utilizando:
--      SET LOCAL ROLE authenticated;
--      PERFORM set_config('request.jwt.claims', ..., true);
-- 4. Valida:
--    - Teste 1: ADMIN Alfa cadastra categorias e produtos e inicializa estoque via movimentação legítima.
--    - Teste 2: ATENDENTE Alfa é bloqueado ao tentar cadastrar produtos no catálogo (can_manage_catalogo = false).
--    - Teste 3: UPDATE direto em estoque_atual e custo_medio é bloqueado pelo PostgreSQL (Privilégio de Coluna / Defesa em Profundidade).
--    - Teste 4: ATENDENTE Alfa registra movimentação de entrada legítima; Custo Médio Ponderado e Saldo são recalculados perfeitamente.
--    - Teste 5: Chave de idempotência única bloqueia reenvios duplicados.
--    - Teste 6: Saída legítima abate saldo e tentativa de saída excedente é bloqueada (Anti-Estoque Negativo).
--    - Teste 7: Movimentação de serviços é registrada sem alterar estoque.
--    - Teste 8: Isolamento Multi-Tenant estrito (Tenant B enxerga 0 linhas e não consegue movimentar produto de Tenant A).
-- 5. Finaliza com ROLLBACK obrigatório: nenhum dado persiste em produção.
-- =========================================================================

BEGIN;

DO $$
DECLARE
    -- Identificadores de Teste
    v_tenant_a UUID := gen_random_uuid();
    v_tenant_b UUID := gen_random_uuid();
    v_admin_a UUID := gen_random_uuid();
    v_atendente_a UUID := gen_random_uuid();
    v_admin_b UUID := gen_random_uuid();
    v_role_admin UUID;
    v_role_atendente UUID;
    v_plan_id UUID;

    -- Entidades de Catálogo
    v_cat_urnas UUID;
    v_prod_urna UUID;
    v_serv_translado UUID;

    -- Variáveis de Verificação
    v_saldo NUMERIC;
    v_custo NUMERIC;
    v_count INT;
    v_deu_erro BOOLEAN;
    v_sqlstate TEXT;
    v_errm TEXT;
BEGIN
    -- =========================================================================
    -- FASE 1: PREPARAÇÃO DE DADOS (Executado como postgres / superuser)
    -- =========================================================================
    SELECT id INTO v_role_admin FROM public.roles WHERE nome = 'ADMIN' LIMIT 1;
    SELECT id INTO v_role_atendente FROM public.roles WHERE nome = 'ATENDENTE' LIMIT 1;

    SELECT id INTO v_plan_id FROM public.saas_plans WHERE ativo = true ORDER BY created_at ASC LIMIT 1;
    IF v_plan_id IS NULL THEN
        INSERT INTO public.saas_plans (nome, descricao, limite_usuarios, limite_clientes, limite_contratos, ativo)
        VALUES ('Plano Teste Homologacao', 'Plano para suite de testes', 10, 1000, 1000, true)
        RETURNING id INTO v_plan_id;
    END IF;

    -- 1. Criar Tenants de Teste
    INSERT INTO public.tenants (id, empresa, responsavel, tipo, status)
    VALUES 
      (v_tenant_a, 'Funerária Alfa (Tenant A)', 'Diretor Alfa', 'assinante', 'ATIVO'),
      (v_tenant_b, 'Funerária Beta (Tenant B)', 'Diretor Beta', 'assinante', 'ATIVO');

    -- 2. Criar Assinaturas Ativas para os Tenants (garante is_tenant_subscription_valid() = TRUE)
    INSERT INTO public.tenant_subscriptions (tenant_id, saas_plan_id, status, ciclo, valor, data_inicio, data_vencimento)
    VALUES 
      (v_tenant_a, v_plan_id, 'ATIVO', 'MENSAL', 299.00, CURRENT_DATE, (NOW() + interval '30 days')),
      (v_tenant_b, v_plan_id, 'ATIVO', 'MENSAL', 299.00, CURRENT_DATE, (NOW() + interval '30 days'));

    -- 3. Criar Usuários em auth.users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      (v_admin_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_a@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
      (v_atendente_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atendente_a@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
      (v_admin_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_b@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());

    -- 4. Criar Perfis em public.profiles (Tenant A: 1 ADMIN + 1 ATENDENTE)
    INSERT INTO public.profiles (id, tenant_id, nome, email, role, role_id, ativo)
    VALUES 
      (v_admin_a, v_tenant_a, 'Admin Alfa', 'admin_a@test.com', 'ADMIN', v_role_admin, true),
      (v_atendente_a, v_tenant_a, 'Atendente Alfa', 'atendente_a@test.com', 'ATENDENTE', v_role_atendente, true),
      (v_admin_b, v_tenant_b, 'Admin Beta', 'admin_b@test.com', 'ADMIN', v_role_admin, true);

    RAISE NOTICE '[OK] Fase 1: Tenants, Assinaturas, auth.users e Perfis criados.';

    -- =========================================================================
    -- TRANSIÇÃO DE PAPEL: ATIVAR 'authenticated' E SIMULAR SESSÃO DO ADMIN ALFA
    -- =========================================================================
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a::text, 'role', 'authenticated')::text, true);

    -- =========================================================================
    -- FASE 2: TESTE 1 — ADMIN ALFA CADASTRA CATEGORIA, PRODUTO E SERVIÇO
    -- =========================================================================
    -- 1. Admin cadastra Categoria
    INSERT INTO public.item_categorias (tenant_id, nome, tipo)
    VALUES (v_tenant_a, 'Urnas Padrão', 'PRODUTO')
    RETURNING id INTO v_cat_urnas;

    -- 2. Admin cadastra Produto no Catálogo (sem passar estoque_atual nem custo_medio)
    INSERT INTO public.produtos_servicos (
        tenant_id, categoria_id, codigo, codigo_barras, nome, tipo,
        preco_venda, preco_custo, controla_estoque, permite_estoque_negativo
    ) VALUES (
        v_tenant_a, v_cat_urnas, 'URN-001', '7891234567890', 'Urna Sextavada Standard', 'PRODUTO',
        1500.00, 400.00, true, false
    ) RETURNING id INTO v_prod_urna;

    -- 3. Admin cadastra Serviço
    INSERT INTO public.produtos_servicos (
        tenant_id, categoria_id, codigo, nome, tipo,
        preco_venda, preco_custo, controla_estoque, permite_estoque_negativo
    ) VALUES (
        v_tenant_a, v_cat_urnas, 'SRV-001', 'Translado Municipal', 'SERVICO',
        600.00, 0.00, false, false
    ) RETURNING id INTO v_serv_translado;

    -- 4. Inicializa saldo e custo médio através da movimentação legítima (10 un a R$ 400,00)
    INSERT INTO public.estoque_movimentacoes (
        tenant_id, produto_id, tipo_movimentacao, origem, quantidade, custo_unitario, valor_total, motivo, idempotency_key
    ) VALUES (
        v_tenant_a, v_prod_urna, 'ENTRADA', 'COMPRA', 10.000, 400.00, 4000.00, 'Saldo Inicial de Homologação', 'INIT-SALDO-001'
    );

    SELECT estoque_atual, custo_medio INTO v_saldo, v_custo
    FROM public.produtos_servicos WHERE id = v_prod_urna;

    IF v_saldo <> 10.000 OR v_custo <> 400.00 THEN
        RAISE EXCEPTION 'FALHA NA INICIALIZAÇÃO: Saldo esperado 10.000 (obtido %), Custo esperado 400.00 (obtido %)', v_saldo, v_custo;
    END IF;
    RAISE NOTICE '[OK] Teste 1: Admin Alfa cadastrou categoria, produto, serviço e saldo inicial sob papel authenticated.';

    -- =========================================================================
    -- FASE 3: TESTE 2 — ATENDENTE ALFA TENTA CRIAR PRODUTO (Bloqueio RBAC Real)
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_atendente_a::text, 'role', 'authenticated')::text, true);

    v_deu_erro := FALSE;
    BEGIN
        INSERT INTO public.produtos_servicos (
            tenant_id, nome, tipo, preco_venda
        ) VALUES (
            v_tenant_a, 'Urna Proibida por Atendente', 'PRODUTO', 200.00
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '42501' OR v_errm ILIKE '%row-level security%' OR v_errm ILIKE '%permission denied%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 2: ATENDENTE bloqueado com sucesso pelo RLS (can_manage_catalogo): % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO ao testar bloqueio de ATENDENTE: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;

    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário ATENDENTE conseguiu cadastrar produto no catálogo!';
    END IF;

    -- =========================================================================
    -- FASE 4: TESTE 3 — BLOQUEIO DE UPDATE DIRETO EM estoque_atual E custo_medio
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a::text, 'role', 'authenticated')::text, true);

    -- 3.1 Tentativa de UPDATE direto em estoque_atual
    v_deu_erro := FALSE;
    BEGIN
        UPDATE public.produtos_servicos
        SET estoque_atual = 999.000
        WHERE id = v_prod_urna;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '42501' OR v_sqlstate = 'P0001' OR v_errm ILIKE '%permission denied%' OR v_errm ILIKE '%diretamente%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 3.1: UPDATE direto em estoque_atual bloqueado pelo PostgreSQL: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 3.1: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: UPDATE direto em estoque_atual não foi bloqueado!';
    END IF;

    -- 3.2 Tentativa de UPDATE direto em custo_medio
    v_deu_erro := FALSE;
    BEGIN
        UPDATE public.produtos_servicos
        SET custo_medio = 999.00
        WHERE id = v_prod_urna;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '42501' OR v_sqlstate = 'P0001' OR v_errm ILIKE '%permission denied%' OR v_errm ILIKE '%diretamente%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 3.2: UPDATE direto em custo_medio bloqueado pelo PostgreSQL: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 3.2: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: UPDATE direto em custo_medio não foi bloqueado!';
    END IF;

    -- =========================================================================
    -- FASE 5: TESTE 4 & 5 — MOVIMENTAÇÃO PELO ATENDENTE, CUSTO MÉDIO E IDEMPOTÊNCIA
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_atendente_a::text, 'role', 'authenticated')::text, true);

    -- Entrada legítima de 10 un a R$ 600,00 (Saldo anterior: 10 un a R$ 400,00)
    -- Novo saldo esperado: 20 un | Novo custo médio esperado: (4000 + 6000) / 20 = R$ 500,00
    INSERT INTO public.estoque_movimentacoes (
        tenant_id, produto_id, tipo_movimentacao, origem, quantidade, custo_unitario, valor_total, motivo, idempotency_key
    ) VALUES (
        v_tenant_a, v_prod_urna, 'ENTRADA', 'COMPRA', 10.000, 600.00, 6000.00, 'NF 100', 'IDEM-KEY-001'
    );

    SELECT estoque_atual, custo_medio INTO v_saldo, v_custo
    FROM public.produtos_servicos WHERE id = v_prod_urna;

    IF v_saldo <> 20.000 OR v_custo <> 500.00 THEN
        RAISE EXCEPTION 'FALHA NO RECÁLCULO DO CUSTO MÉDIO: Saldo esperado 20 (obtido %), Custo esperado 500 (obtido %)', v_saldo, v_custo;
    ELSE
        RAISE NOTICE '[OK] Teste 4: Atendente registrou entrada com sucesso. Saldo = 20 un, Custo Médio = R$ 500,00.';
    END IF;

    -- Teste 5: Idempotência com a mesma chave (bloqueio por chave única duplicada: 23505)
    v_deu_erro := FALSE;
    BEGIN
        INSERT INTO public.estoque_movimentacoes (
            tenant_id, produto_id, tipo_movimentacao, origem, quantidade, custo_unitario, valor_total, motivo, idempotency_key
        ) VALUES (
            v_tenant_a, v_prod_urna, 'ENTRADA', 'COMPRA', 10.000, 600.00, 6000.00, 'NF 100', 'IDEM-KEY-001'
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '23505' OR v_errm ILIKE '%duplicate key%' OR v_errm ILIKE '%uq_estoque_mov_idempotency%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 5: Reenvio duplicado bloqueado por idempotência: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 5: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Chave de idempotência permitiu duplicidade!';
    END IF;

    -- =========================================================================
    -- FASE 6: TESTE 6 & 7 — SAÍDA VÁLIDA, ESTOQUE NEGATIVO E SERVIÇOS
    -- =========================================================================
    -- Saída de 5 un (Saldo vai de 20 para 15 un)
    INSERT INTO public.estoque_movimentacoes (
        tenant_id, produto_id, tipo_movimentacao, origem, quantidade, valor_total, motivo
    ) VALUES (
        v_tenant_a, v_prod_urna, 'SAIDA', 'PDV_VENDA', 5.000, 7500.00, 'Cupom PDV 01'
    );

    SELECT estoque_atual INTO v_saldo FROM public.produtos_servicos WHERE id = v_prod_urna;
    IF v_saldo <> 15.000 THEN
        RAISE EXCEPTION 'FALHA: Saldo esperado 15 un, obtido %', v_saldo;
    ELSE
        RAISE NOTICE '[OK] Teste 6.1: Saída legítima efetuada com sucesso. Saldo = 15 un.';
    END IF;

    -- Tentativa de saída de 20 un (saldo é 15 -> bloqueio por saldo insuficiente)
    v_deu_erro := FALSE;
    BEGIN
        INSERT INTO public.estoque_movimentacoes (
            tenant_id, produto_id, tipo_movimentacao, origem, quantidade, motivo
        ) VALUES (
            v_tenant_a, v_prod_urna, 'SAIDA', 'PDV_VENDA', 20.000, 'Tentativa de estoque negativo'
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%saldo insuficiente%' OR v_errm ILIKE '%negativo%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 6.2: Bloqueio estrito de estoque negativo atuou com precisão: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 6.2: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Saída excedente permitiu estoque negativo!';
    END IF;

    -- Teste 7: Movimentação de serviço não altera saldo
    INSERT INTO public.estoque_movimentacoes (
        tenant_id, produto_id, tipo_movimentacao, origem, quantidade, motivo
    ) VALUES (
        v_tenant_a, v_serv_translado, 'SAIDA', 'ATENDIMENTO_OS', 1.000, 'Ordem OS 12'
    );

    SELECT estoque_atual INTO v_saldo FROM public.produtos_servicos WHERE id = v_serv_translado;
    IF v_saldo <> 0.000 THEN
        RAISE EXCEPTION 'FALHA: Serviço não deve alterar estoque!';
    ELSE
        RAISE NOTICE '[OK] Teste 7: Serviço prestado sem impacto no saldo de estoque.';
    END IF;

    -- =========================================================================
    -- FASE 7: TESTE 8 — ISOLAMENTO MULTI-TENANT (TENANT B NÃO ACESSA TENANT A)
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_b::text, 'role', 'authenticated')::text, true);

    -- Tenant B consulta produtos do Tenant A via RLS (deve retornar 0 linhas)
    SELECT COUNT(*) INTO v_count
    FROM public.produtos_servicos
    WHERE id = v_prod_urna;

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FALHA GRAVE DE ISOLAMENTO RLS: Tenant B conseguiu visualizar produto do Tenant A!';
    ELSE
        RAISE NOTICE '[OK] Teste 8.1: RLS isolou visualização com sucesso. Tenant B vê 0 produtos do Tenant A.';
    END IF;

    -- Tenant B tenta movimentar estoque do Tenant A (deve falhar por RLS/Trigger)
    v_deu_erro := FALSE;
    BEGIN
        INSERT INTO public.estoque_movimentacoes (
            tenant_id, produto_id, tipo_movimentacao, origem, quantidade, motivo
        ) VALUES (
            v_tenant_a, v_prod_urna, 'SAIDA', 'MANUAL', 1.000, 'Invasão cross-tenant'
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '42501' OR v_sqlstate = 'P0001' OR v_errm ILIKE '%row-level security%' OR v_errm ILIKE '%outro tenant%' OR v_errm ILIKE '%permission denied%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 8.2: Tentativa cross-tenant rejeitada pelo RLS/Trigger: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 8.2: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA GRAVE DE ISOLAMENTO: Tenant B conseguiu movimentar estoque do Tenant A!';
    END IF;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '>>> TODOS OS TESTES FORAM HOMOLOGADOS COM SUCESSO 100%%!';
    RAISE NOTICE '=======================================================';
END $$;

-- =========================================================================
-- FASE 8: ROLLBACK TOTAL OBRIGATÓRIO (Nenhum dado persiste em produção)
-- =========================================================================
ROLLBACK;
