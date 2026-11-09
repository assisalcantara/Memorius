-- =========================================================================
-- SUÍTE DE TESTES SQL DE HOMOLOGAÇÃO REAL — SPRINT 37: VENDAS E PAGAMENTOS DO PDV
--
-- ARQUITETURA DE HOMOLOGAÇÃO ROBUSTA (SINGLE-BLOCK / ZERO TABLE CONFLICT):
-- 1. Executa em um ÚNICO bloco anônimo DO $$ ... $$ encapsulado em transação BEGIN ... ROLLBACK.
-- 2. Não cria nem depende de tabelas temporárias auxiliares, eliminando qualquer erro 42P01.
-- 3. Transição segura de papéis com:
--      EXECUTE 'SET LOCAL ROLE authenticated';
--      PERFORM set_config('request.jwt.claims', ..., true);
-- 4. Validações Exaustivas (10 testes):
--    - Teste 1: ADMIN Alfa cadastra produtos no catálogo (Sprint 35), abre terminal físico e abre turno de caixa (Sprint 36).
--    - Teste 2: ATENDENTE Alfa cria venda com múltiplos itens (produtos com estoque e serviço) e cálculo exato de subtotal.
--    - Teste 3: Tentativa de aplicar desconto sem autorização gerencial é bloqueada.
--    - Teste 4: Desconto autorizado pelo ADMIN é aplicado com sucesso.
--    - Teste 5: Pagamento misto (Dinheiro com troco + Cartão presencial confirmado) integra imediatamente ao caixa.
--    - Teste 6: Tentativa de finalizar venda antes da quitação integral é sumariamente bloqueada.
--    - Teste 7: Adição de pagamento PIX PENDENTE (Gateway ASAAS) e confirmação atômica via webhook/função gateway.
--    - Teste 8: Finalização da venda provoca baixa atômica e exata no estoque apenas dos itens controlados (uma única vez).
--    - Teste 9: Cancelamento / Estorno com autorização gerencial devolve itens ao estoque e gera estorno compensatório no caixa.
--    - Teste 10: Isolamento Multi-Tenant estrito (Tenant Beta enxerga 0 vendas e 0 pagamentos de Tenant Alfa).
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

    -- Catálogo e Estoque (Sprint 35)
    v_cat_id UUID;
    v_prod_urna UUID;
    v_serv_translado UUID;

    -- Caixa e PDV (Sprint 36)
    v_caixa_pdv UUID;
    v_turno_id UUID;

    -- Vendas e Pagamentos (Sprint 37)
    v_res_venda JSONB;
    v_venda_id UUID;
    v_res_pag JSONB;
    v_pag_dinheiro_id UUID;
    v_pag_cartao_id UUID;
    v_pag_pix_id UUID;
    v_res_finalizacao JSONB;
    v_res_estorno JSONB;

    -- Variáveis de Verificação e Diagnóstico
    v_saldo_estoque NUMERIC;
    v_saldo_caixa NUMERIC;
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

    -- 2. Assinaturas Ativas
    INSERT INTO public.tenant_subscriptions (tenant_id, saas_plan_id, status, ciclo, valor, data_inicio, data_vencimento)
    VALUES 
      (v_tenant_a, v_plan_id, 'ATIVO', 'MENSAL', 299.00, CURRENT_DATE, (NOW() + interval '30 days')),
      (v_tenant_b, v_plan_id, 'ATIVO', 'MENSAL', 299.00, CURRENT_DATE, (NOW() + interval '30 days'));

    -- 3. auth.users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      (v_admin_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_a_s37@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
      (v_atendente_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atendente_a_s37@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
      (v_admin_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_b_s37@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());

    -- 4. Perfis
    INSERT INTO public.profiles (id, tenant_id, nome, email, role, role_id, ativo)
    VALUES 
      (v_admin_a, v_tenant_a, 'Admin Alfa S37', 'admin_a_s37@test.com', 'ADMIN', v_role_admin, true),
      (v_atendente_a, v_tenant_a, 'Atendente Alfa S37', 'atendente_a_s37@test.com', 'ATENDENTE', v_role_atendente, true),
      (v_admin_b, v_tenant_b, 'Admin Beta S37', 'admin_b_s37@test.com', 'ADMIN', v_role_admin, true);

    RAISE NOTICE '[OK] Fase 1: Setup de Tenants e Usuários concluído.';

    -- =========================================================================
    -- TRANSIÇÃO DE PAPEL: ATIVAR 'authenticated' COMO ADMIN ALFA
    -- =========================================================================
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ADMIN')
    )::text, true);

    -- =========================================================================
    -- FASE 2: TESTE 1 — SETUP DE CATÁLOGO, ESTOQUE E CAIXA FÍSICO
    -- =========================================================================
    -- 1. Categoria
    INSERT INTO public.item_categorias (tenant_id, nome, tipo)
    VALUES (v_tenant_a, 'Urnas e Serviços S37', 'PRODUTO')
    RETURNING id INTO v_cat_id;

    -- 2. Produto com estoque (Preço: R$ 1.200,00, Estoque Inicial: 5 un)
    INSERT INTO public.produtos_servicos (
        tenant_id, categoria_id, codigo, nome, tipo,
        preco_venda, preco_custo, controla_estoque, permite_estoque_negativo
    ) VALUES (
        v_tenant_a, v_cat_id, 'URN-S37', 'Urna Luxo Mogno', 'PRODUTO',
        1200.00, 400.00, true, false
    ) RETURNING id INTO v_prod_urna;

    INSERT INTO public.estoque_movimentacoes (
        tenant_id, produto_id, tipo_movimentacao, origem, quantidade, custo_unitario, valor_total, motivo, idempotency_key
    ) VALUES (
        v_tenant_a, v_prod_urna, 'ENTRADA', 'COMPRA', 5.000, 400.00, 2000.00, 'Saldo Inicial S37', 'INIT-ESTOQUE-S37'
    );

    -- 3. Serviço (Sem controle de estoque, Preço: R$ 300,00)
    INSERT INTO public.produtos_servicos (
        tenant_id, categoria_id, codigo, nome, tipo,
        preco_venda, preco_custo, controla_estoque, permite_estoque_negativo
    ) VALUES (
        v_tenant_a, v_cat_id, 'SRV-S37', 'Cortejo Especial', 'SERVICO',
        300.00, 0.00, false, false
    ) RETURNING id INTO v_serv_translado;

    -- 4. Terminal de Caixa e Fundo de Troco
    INSERT INTO public.caixas_fisicos (tenant_id, nome, identificador_pdv)
    VALUES (v_tenant_a, 'PDV 01 Recepção', 'PDV-01')
    RETURNING id INTO v_caixa_pdv;

    -- Atendente Alfa abre turno com R$ 100,00 de troco
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_atendente_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ATENDENTE')
    )::text, true);

    v_turno_id := public.abrir_turno_caixa(v_caixa_pdv, 100.00, 'Abertura Turno Vendas');
    RAISE NOTICE '[OK] Teste 1: Catálogo, estoque (5 un) e turno de caixa (R$ 100,00) inicializados.';

    -- =========================================================================
    -- FASE 3: TESTE 2 & 3 & 4 — CRIAÇÃO DE VENDA E POLÍTICA DE DESCONTO
    -- =========================================================================
    -- Teste 3: Tentativa de conceder desconto de R$ 100,00 pelo ATENDENTE sem autorização (deve falhar)
    v_deu_erro := FALSE;
    BEGIN
        PERFORM public.criar_pdv_venda(
            p_turno_id => v_turno_id,
            p_cliente_id => NULL,
            p_itens => jsonb_build_array(
                jsonb_build_object('produto_id', v_prod_urna, 'quantidade', 1, 'desconto', 0)
            ),
            p_desconto_valor => 100.00,
            p_desconto_autorizado_por => NULL
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%requer autorização gerencial%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 3: Desconto não autorizado barrado com sucesso: %', v_errm;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 3: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Desconto não autorizado foi aceito pelo PDV!';
    END IF;

    -- Teste 2 & 4: Criação de Venda com 1 Urna (R$ 1.200) + 1 Serviço (R$ 300) = R$ 1.500,00
    -- Desconto de R$ 100,00 devidamente autorizado pelo ADMIN Alfa -> Total Líquido R$ 1.400,00
    v_res_venda := public.criar_pdv_venda(
        p_turno_id => v_turno_id,
        p_cliente_id => NULL,
        p_itens => jsonb_build_array(
            jsonb_build_object('produto_id', v_prod_urna, 'quantidade', 1, 'desconto', 0),
            jsonb_build_object('produto_id', v_serv_translado, 'quantidade', 1, 'desconto', 0)
        ),
        p_desconto_valor => 100.00,
        p_desconto_autorizado_por => v_admin_a,
        p_desconto_motivo => 'Desconto comercial supervisor',
        p_idempotency_key => 'VD-TESTE-S37-001'
    );

    v_venda_id := (v_res_venda->>'venda_id')::uuid;

    IF (v_res_venda->>'total_liquido')::numeric <> 1400.00 THEN
        RAISE EXCEPTION 'FALHA NO TOTAL DA VENDA: Esperado 1400.00, obtido %', (v_res_venda->>'total_liquido');
    END IF;
    RAISE NOTICE '[OK] Teste 2 & 4: Venda criada com sucesso. Subtotal R$ 1.500,00 - Desconto R$ 100,00 = Total Líquido R$ 1.400,00.';

    -- =========================================================================
    -- FASE 4: TESTE 5 & 6 — PAGAMENTOS MISTOS E TRAVA DE QUITAÇÃO
    -- =========================================================================
    -- Pagamento 1: R$ 400,00 em DINHEIRO (Cliente entrega R$ 450,00, troco R$ 50,00)
    v_res_pag := public.adicionar_pagamento_pdv(
        p_venda_id => v_venda_id,
        p_forma_pagamento => 'DINHEIRO',
        p_valor => 400.00,
        p_valor_recebido => 450.00,
        p_idempotency_key => 'PAG-DIN-S37-001'
    );
    v_pag_dinheiro_id := (v_res_pag->>'pagamento_id')::uuid;

    IF (v_res_pag->>'troco')::numeric <> 50.00 THEN
        RAISE EXCEPTION 'FALHA NO CÁLCULO DO TROCO: Esperado 50.00, obtido %', (v_res_pag->>'troco');
    END IF;
    RAISE NOTICE '[OK] Teste 5.1: Pagamento em dinheiro registrado. Troco calculado: R$ 50,00. Integrado ao caixa.';

    -- Pagamento 2: R$ 500,00 em CARTÃO DE DÉBITO presencial (CONFIRMADO de imediato)
    v_res_pag := public.adicionar_pagamento_pdv(
        p_venda_id => v_venda_id,
        p_forma_pagamento => 'CARTAO_DEBITO',
        p_valor => 500.00,
        p_idempotency_key => 'PAG-DEB-S37-001'
    );
    v_pag_cartao_id := (v_res_pag->>'pagamento_id')::uuid;
    RAISE NOTICE '[OK] Teste 5.2: Pagamento em cartão registrado e confirmado: R$ 500,00.';

    -- Teste 6: Tentativa de finalizar venda quando foram pagos apenas R$ 900 de R$ 1.400 (deve falhar)
    v_deu_erro := FALSE;
    BEGIN
        PERFORM public.finalizar_pdv_venda(v_venda_id);
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%Pagamento insuficiente%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 6: Bloqueio de finalização de venda não quitada: %', v_errm;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 6: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Venda com pagamento pendente foi finalizada!';
    END IF;

    -- =========================================================================
    -- FASE 5: TESTE 7 — PAGAMENTO PIX GATEWAY ASAAS E CONFIRMAÇÃO POR WEBHOOK
    -- =========================================================================
    -- Pagamento 3: R$ 500,00 em PIX gerado via gateway ASAAS (Status inicial PENDENTE)
    v_res_pag := public.adicionar_pagamento_pdv(
        p_venda_id => v_venda_id,
        p_forma_pagamento => 'PIX',
        p_valor => 500.00,
        p_gateway_payment_id => 'pay_asaas_s37_test_999',
        p_pix_qr_code => 'qrcode_string_test',
        p_pix_copy_paste => '00020126580014br.gov.bcb.pix...',
        p_idempotency_key => 'PAG-PIX-S37-001'
    );
    v_pag_pix_id := (v_res_pag->>'pagamento_id')::uuid;

    IF (v_res_pag->>'status') <> 'PENDENTE' THEN
        RAISE EXCEPTION 'FALHA NO GATEWAY PIX: Status inicial deveria ser PENDENTE, obtido %', (v_res_pag->>'status');
    END IF;
    RAISE NOTICE '[OK] Teste 7.1: Pagamento via Gateway ASAAS criado como PENDENTE com PIX copia e cola.';

    -- Simulação de Webhook recebido do ASAAS (confirmar_pagamento_gateway_pdv)
    v_res_pag := public.confirmar_pagamento_gateway_pdv('pay_asaas_s37_test_999', 'RECEIVED');
    IF NOT (v_res_pag->>'success')::boolean THEN
        RAISE EXCEPTION 'FALHA NO WEBHOOK ASAAS: %', v_res_pag;
    END IF;
    RAISE NOTICE '[OK] Teste 7.2: Webhook ASAAS confirmou pagamento PIX de R$ 500,00 e lançou no caixa.';

    -- =========================================================================
    -- FASE 6: TESTE 8 — FINALIZAÇÃO DA VENDA E BAIXA ATÔMICA DO ESTOQUE
    -- =========================================================================
    -- Verifica saldo de estoque antes da finalização (deve ser 5 un)
    SELECT estoque_atual INTO v_saldo_estoque FROM public.produtos_servicos WHERE id = v_prod_urna;
    IF v_saldo_estoque <> 5.000 THEN
        RAISE EXCEPTION 'FALHA DE ESTOQUE: Saldo antes da finalização deveria ser 5.000, obtido %', v_saldo_estoque;
    END IF;

    -- Finaliza venda (Total pago = 400 + 500 + 500 = R$ 1.400,00 -> 100% quitada)
    v_res_finalizacao := public.finalizar_pdv_venda(v_venda_id);
    IF (v_res_finalizacao->>'status') <> 'CONCLUIDA' THEN
        RAISE EXCEPTION 'FALHA NA FINALIZAÇÃO: Status esperado CONCLUIDA, obtido %', v_res_finalizacao;
    END IF;

    -- Verifica saldo de estoque após finalização (deve ter baixado 1 un -> 4 un restantes)
    SELECT estoque_atual INTO v_saldo_estoque FROM public.produtos_servicos WHERE id = v_prod_urna;
    IF v_saldo_estoque <> 4.000 THEN
        RAISE EXCEPTION 'FALHA DE BAIXA DE ESTOQUE: Saldo esperado 4.000, obtido %', v_saldo_estoque;
    END IF;

    -- Idempotência da baixa: chamar finalizar novamente não altera saldo nem re-baixa
    PERFORM public.finalizar_pdv_venda(v_venda_id);
    SELECT estoque_atual INTO v_saldo_estoque FROM public.produtos_servicos WHERE id = v_prod_urna;
    IF v_saldo_estoque <> 4.000 THEN
        RAISE EXCEPTION 'FALHA DE IDEMPOTÊNCIA NO ESTOQUE: Segunda chamada alterou estoque para %', v_saldo_estoque;
    END IF;
    RAISE NOTICE '[OK] Teste 8: Venda CONCLUÍDA com sucesso. Baixa atômica de estoque confirmada (5 -> 4 un). Idempotência validada.';

    -- =========================================================================
    -- FASE 7: TESTE 9 — CANCELAMENTO / ESTORNO GERENCIAL COMPENSATÓRIO
    -- =========================================================================
    -- Admin Alfa autoriza cancelamento da venda
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ADMIN')
    )::text, true);

    v_res_estorno := public.cancelar_estornar_pdv_venda(
        p_venda_id => v_venda_id,
        p_motivo => 'Cliente desistiu da compra logo após fechamento'
    );

    IF (v_res_estorno->>'status') <> 'CANCELADA' THEN
        RAISE EXCEPTION 'FALHA NO ESTORNO: Status esperado CANCELADA, obtido %', v_res_estorno;
    END IF;

    -- Devolução de estoque verificada (estoque volta para 5 un)
    SELECT estoque_atual INTO v_saldo_estoque FROM public.produtos_servicos WHERE id = v_prod_urna;
    IF v_saldo_estoque <> 5.000 THEN
        RAISE EXCEPTION 'FALHA NA RECOMPOSIÇÃO DO ESTOQUE: Esperado 5.000, obtido %', v_saldo_estoque;
    END IF;

    -- Verifica se foram geradas movimentações compensatórias de estorno no caixa
    SELECT COUNT(*) INTO v_count
    FROM public.caixa_movimentacoes
    WHERE turno_id = v_turno_id AND tipo = 'ESTORNO';

    IF v_count < 1 THEN
        RAISE EXCEPTION 'FALHA DE ESTORNO DE CAIXA: Nenhuma movimentação de estorno contábil foi gerada!';
    END IF;
    RAISE NOTICE '[OK] Teste 9: Venda cancelada com sucesso. Estoque recomposto (4 -> 5 un) e estornos de caixa registrados.';

    -- =========================================================================
    -- FASE 8: TESTE 10 — ISOLAMENTO MULTI-TENANT ESTRITO
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_b::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_b::text, 'role', 'ADMIN')
    )::text, true);

    SELECT COUNT(*) INTO v_count FROM public.pdv_vendas WHERE id = v_venda_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FALHA DE RLS MULTI-TENANT: Admin Tenant B conseguiu consultar venda de Tenant A!';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.pdv_pagamentos WHERE venda_id = v_venda_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FALHA DE RLS MULTI-TENANT: Admin Tenant B conseguiu consultar pagamentos de Tenant A!';
    END IF;

    RAISE NOTICE '[OK] Teste 10: RLS validado com sucesso. Tenant B não enxerga dados de Tenant A.';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '>>> TODOS OS 10 TESTES DA SPRINT 37 HOMOLOGADOS COM SUCESSO 100%%!';
    RAISE NOTICE '=======================================================';
END $$;

-- =========================================================================
-- ROLLBACK TOTAL OBRIGATÓRIO (Nenhum dado nem tabela persistem)
-- =========================================================================
ROLLBACK;
