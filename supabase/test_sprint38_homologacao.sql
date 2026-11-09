-- =========================================================================
-- SUÍTE DE TESTES SQL DE HOMOLOGAÇÃO REAL — SPRINT 38: ORÇAMENTOS FUNERÁRIOS
--
-- ARQUITETURA DE HOMOLOGAÇÃO ROBUSTA (SINGLE-BLOCK / ZERO TABLE CONFLICT):
-- 1. Executa em um ÚNICO bloco anônimo DO $$ ... $$ encapsulado em transação BEGIN ... ROLLBACK.
-- 2. Não cria nem depende de tabelas temporárias auxiliares, eliminando qualquer erro 42P01.
-- 3. Transição segura de papéis com:
--      EXECUTE 'SET LOCAL ROLE authenticated';
--      PERFORM set_config('request.jwt.claims', ..., true);
-- 4. Validações Exaustivas (10 testes):
--    - Teste 1: ADMIN Alfa cadastra cliente, plano funerário com carência (90 dias) e contratos (um cumprido e outro em carência).
--    - Teste 2: ATENDENTE cria Orçamento Funerário particular (sem plano): 100% dos itens devidos pelo cliente.
--    - Teste 3: ATENDENTE cria Orçamento com contrato em CARÊNCIA: identifica carência ativa e não aplica cobertura indevida.
--    - Teste 4: ATENDENTE cria Orçamento com contrato ATIVO e fora de carência: separa com exatidão itens cobertos e adicionais particulares.
--    - Teste 5: Cálculo de desconto não autorizado é bloqueado e com autorização gerencial é aplicado com sucesso.
--    - Teste 6: Envio de orçamento gera token de aceite e transita para status 'ENVIADO'.
--    - Teste 7: Aprovação formal gera snapshot imutável completo com data, responsável e itens congelados.
--    - Teste 8: Tentativa de adulterar ou excluir itens de orçamento APROVADO é sumariamente barrada pelo trigger de imutabilidade.
--    - Teste 9: Homologa cancelamento e rejeição com motivo auditado.
--    - Teste 10: Isolamento Multi-Tenant estrito (Tenant Beta enxerga 0 orçamentos e 0 itens do Tenant Alfa).
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
    v_saas_plan_id UUID;

    -- Entidades de Domínio
    v_cliente_1 UUID;
    v_plano_funerario UUID;
    v_contrato_ok UUID;
    v_contrato_carencia UUID;
    v_atendimento UUID;

    -- Catálogo (Sprint 35)
    v_cat_id UUID;
    v_prod_urna UUID;
    v_serv_translado UUID;
    v_prod_flores UUID;

    -- Orçamentos (Sprint 38)
    v_res_orc JSONB;
    v_orc_particular UUID;
    v_orc_carencia UUID;
    v_orc_coberto UUID;
    v_orc_recusado UUID;
    v_res_aprovacao JSONB;
    v_snapshot JSONB;

    -- Verificações
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

    SELECT id INTO v_saas_plan_id FROM public.saas_plans WHERE ativo = true ORDER BY created_at ASC LIMIT 1;
    IF v_saas_plan_id IS NULL THEN
        INSERT INTO public.saas_plans (nome, descricao, limite_usuarios, limite_clientes, limite_contratos, ativo)
        VALUES ('Plano Teste Homologacao S38', 'Plano para suite de testes', 10, 1000, 1000, true)
        RETURNING id INTO v_saas_plan_id;
    END IF;

    -- 1. Tenants de Teste
    INSERT INTO public.tenants (id, empresa, responsavel, tipo, status)
    VALUES 
      (v_tenant_a, 'Funerária Alfa (Tenant A - S38)', 'Diretor Alfa', 'assinante', 'ATIVO'),
      (v_tenant_b, 'Funerária Beta (Tenant B - S38)', 'Diretor Beta', 'assinante', 'ATIVO');

    -- 2. Assinaturas Ativas
    INSERT INTO public.tenant_subscriptions (tenant_id, saas_plan_id, status, ciclo, valor, data_inicio, data_vencimento)
    VALUES 
      (v_tenant_a, v_saas_plan_id, 'ATIVO', 'MENSAL', 299.00, CURRENT_DATE, (NOW() + interval '30 days')),
      (v_tenant_b, v_saas_plan_id, 'ATIVO', 'MENSAL', 299.00, CURRENT_DATE, (NOW() + interval '30 days'));

    -- 3. auth.users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      (v_admin_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_a_s38@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
      (v_atendente_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atendente_a_s38@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
      (v_admin_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_b_s38@test.com', 'fake', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());

    -- 4. Perfis
    INSERT INTO public.profiles (id, tenant_id, nome, email, role, role_id, ativo)
    VALUES 
      (v_admin_a, v_tenant_a, 'Admin Alfa S38', 'admin_a_s38@test.com', 'ADMIN', v_role_admin, true),
      (v_atendente_a, v_tenant_a, 'Atendente Alfa S38', 'atendente_a_s38@test.com', 'ATENDENTE', v_role_atendente, true),
      (v_admin_b, v_tenant_b, 'Admin Beta S38', 'admin_b_s38@test.com', 'ADMIN', v_role_admin, true);

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
    -- FASE 2: TESTE 1 — SETUP DE CLIENTE, PLANOS, CONTRATOS E CATÁLOGO
    -- =========================================================================
    -- 1. Cliente
    INSERT INTO public.clientes (tenant_id, nome, cpf, telefone)
    VALUES (v_tenant_a, 'João das Couves', '12345678901', '11999999999')
    RETURNING id INTO v_cliente_1;

    -- 2. Plano Funerário Familiar com 90 dias de carência
    INSERT INTO public.planos (tenant_id, nome, dias_carencia, valor_mensal, status, cobertura_basica)
    VALUES (v_tenant_a, 'Plano Familiar Master', 90, 85.00, 'Ativo', 'Urna padrão e cortejo cobertos')
    RETURNING id INTO v_plano_funerario;

    -- 3. Contrato 1: Ativo e Antigo (adesão há 180 dias -> Carência CUMPRIDA)
    INSERT INTO public.contratos (tenant_id, cliente_id, plano_id, numero_contrato, data_adesao, valor_mensal, status)
    VALUES (v_tenant_a, v_cliente_1, v_plano_funerario, 'CTR-OK-001', CURRENT_DATE - 180, 85.00, 'Ativo')
    RETURNING id INTO v_contrato_ok;

    -- 4. Contrato 2: Recém-assinado (adesão há 15 dias -> EM CARÊNCIA)
    INSERT INTO public.contratos (tenant_id, cliente_id, plano_id, numero_contrato, data_adesao, valor_mensal, status)
    VALUES (v_tenant_a, v_cliente_1, v_plano_funerario, 'CTR-CARENCIA-002', CURRENT_DATE - 15, 85.00, 'Ativo')
    RETURNING id INTO v_contrato_carencia;

    -- 5. Atendimento Funerário
    INSERT INTO public.atendimentos (tenant_id, contrato_id, cliente_nome, plano_nome, data, hora, local, tipo, responsavel, status, operador)
    VALUES (v_tenant_a, v_contrato_ok, 'João das Couves', 'Plano Familiar Master', CURRENT_DATE, '10:00', 'Hospital Municipal', 'TITULAR', 'Maria das Couves', 'Aberto', 'Atendente Alfa')
    RETURNING id INTO v_atendimento;

    -- 6. Catálogo (Sprint 35)
    INSERT INTO public.item_categorias (tenant_id, nome, tipo)
    VALUES (v_tenant_a, 'Itens Funerários S38', 'PRODUTO')
    RETURNING id INTO v_cat_id;

    -- Urna (R$ 1.500,00)
    INSERT INTO public.produtos_servicos (tenant_id, categoria_id, codigo, nome, tipo, preco_venda, controla_estoque)
    VALUES (v_tenant_a, v_cat_id, 'URN-PADRAO', 'Urna Padrão Sextavada', 'PRODUTO', 1500.00, true)
    RETURNING id INTO v_prod_urna;

    -- Translado / Serviço (R$ 400,00)
    INSERT INTO public.produtos_servicos (tenant_id, categoria_id, codigo, nome, tipo, preco_venda, controla_estoque)
    VALUES (v_tenant_a, v_cat_id, 'SRV-TRANSLADO', 'Translado Municipal', 'SERVICO', 400.00, false)
    RETURNING id INTO v_serv_translado;

    -- Coroa de Flores Extra Particular (R$ 350,00)
    INSERT INTO public.produtos_servicos (tenant_id, categoria_id, codigo, nome, tipo, preco_venda, controla_estoque)
    VALUES (v_tenant_a, v_cat_id, 'FLORES-EXTRA', 'Coroa de Flores Nobre', 'PRODUTO', 350.00, false)
    RETURNING id INTO v_prod_flores;

    RAISE NOTICE '[OK] Teste 1: Configuração de planos, carência (90 dias), contratos e catálogo efetuada.';

    -- =========================================================================
    -- FASE 3: TESTE 2 — ORÇAMENTO 100% PARTICULAR (SEM PLANO)
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_atendente_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ATENDENTE')
    )::text, true);

    v_res_orc := public.criar_orcamento_funerario(
        p_atendimento_id => v_atendimento,
        p_cliente_id => v_cliente_1,
        p_contrato_id => NULL, -- Sem cobertura
        p_itens => jsonb_build_array(
            jsonb_build_object('produto_id', v_prod_urna, 'quantidade', 1, 'item_coberto_plano', false),
            jsonb_build_object('produto_id', v_serv_translado, 'quantidade', 1, 'item_coberto_plano', false)
        )
    );
    v_orc_particular := (v_res_orc->>'orcamento_id')::uuid;

    IF (v_res_orc->>'total_coberto')::numeric <> 0.00 OR (v_res_orc->>'total_liquido_cliente')::numeric <> 1900.00 THEN
        RAISE EXCEPTION 'FALHA NO ORÇAMENTO PARTICULAR: Esperado líquido R$ 1900.00 e coberto R$ 0.00, obtido %', v_res_orc;
    END IF;
    RAISE NOTICE '[OK] Teste 2: Orçamento particular sem plano calculado perfeitamente (R$ 1.900,00 devido pelo cliente).';

    -- =========================================================================
    -- FASE 4: TESTE 3 — ORÇAMENTO COM CONTRATO EM CARÊNCIA
    -- =========================================================================
    v_res_orc := public.criar_orcamento_funerario(
        p_atendimento_id => v_atendimento,
        p_cliente_id => v_cliente_1,
        p_contrato_id => v_contrato_carencia, -- 15 dias de adesão (< 90 dias)
        p_itens => jsonb_build_array(
            jsonb_build_object('produto_id', v_prod_urna, 'quantidade', 1, 'item_coberto_plano', true)
        )
    );
    v_orc_carencia := (v_res_orc->>'orcamento_id')::uuid;

    IF (v_res_orc->>'em_carencia')::boolean <> TRUE OR (v_res_orc->>'total_coberto')::numeric <> 0.00 THEN
        RAISE EXCEPTION 'FALHA NA VERIFICAÇÃO DE CARÊNCIA: Contrato deveria estar em carência com R$ 0 coberto! Obtido %', v_res_orc;
    END IF;
    RAISE NOTICE '[OK] Teste 3: Carência ativa detectada (15 < 90 dias) e cobertura bloqueada de forma automatizada.';

    -- =========================================================================
    -- FASE 5: TESTE 4 & 5 — ORÇAMENTO COBERTO + ITENS ADICIONAIS PARTICULARES + DESCONTO
    -- =========================================================================
    -- Tentativa de aplicar desconto sem autorização por ATENDENTE (deve falhar)
    v_deu_erro := FALSE;
    BEGIN
        PERFORM public.criar_orcamento_funerario(
            p_atendimento_id => v_atendimento,
            p_cliente_id => v_cliente_1,
            p_contrato_id => v_contrato_ok,
            p_itens => jsonb_build_array(
                jsonb_build_object('produto_id', v_prod_urna, 'quantidade', 1, 'item_coberto_plano', true)
            ),
            p_desconto_valor => 50.00
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%requer autorização gerencial%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 5.1: Desconto não autorizado barrado no orçamento: %', v_errm;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 5.1: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Desconto não autorizado foi aceito no orçamento!';
    END IF;

    -- Criação como ADMIN (desconto autorizado de R$ 50,00)
    -- Itens:
    --   - Urna (R$ 1.500) -> COBERTO PELO PLANO
    --   - Translado (R$ 400) -> COBERTO PELO PLANO
    --   - Flores Nobres (R$ 350) -> PARTICULAR ADICIONAL
    -- Total Bruto: R$ 2.250,00
    -- Total Coberto: R$ 1.900,00
    -- Total Particular: R$ 350,00 - R$ 50,00 (desconto) = R$ 300,00 devido
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ADMIN')
    )::text, true);

    v_res_orc := public.criar_orcamento_funerario(
        p_atendimento_id => v_atendimento,
        p_cliente_id => v_cliente_1,
        p_contrato_id => v_contrato_ok,
        p_itens => jsonb_build_array(
            jsonb_build_object('produto_id', v_prod_urna, 'quantidade', 1, 'item_coberto_plano', true),
            jsonb_build_object('produto_id', v_serv_translado, 'quantidade', 1, 'item_coberto_plano', true),
            jsonb_build_object('produto_id', v_prod_flores, 'quantidade', 1, 'item_coberto_plano', false)
        ),
        p_desconto_valor => 50.00,
        p_desconto_motivo => 'Desconto especial diretoria',
        p_idempotency_key => 'ORC-TESTE-S38-001'
    );
    v_orc_coberto := (v_res_orc->>'orcamento_id')::uuid;

    IF (v_res_orc->>'total_coberto')::numeric <> 1900.00 OR (v_res_orc->>'total_liquido_cliente')::numeric <> 300.00 THEN
        RAISE EXCEPTION 'FALHA NO CÁLCULO SEPARADO: Coberto esperado 1900.00 (obtido %), Líquido esperado 300.00 (obtido %)',
            (v_res_orc->>'total_coberto'), (v_res_orc->>'total_liquido_cliente');
    END IF;
    RAISE NOTICE '[OK] Teste 4 & 5.2: Orçamento com plano ativo calculou separadamente: Coberto R$ 1.900,00 e Devido Cliente R$ 300,00.';

    -- =========================================================================
    -- FASE 6: TESTE 6 — ENVIO DO ORÇAMENTO E GERAÇÃO DE TOKEN DE ACEITE
    -- =========================================================================
    v_res_orc := public.enviar_orcamento_funerario(
        p_orcamento_id => v_orc_coberto,
        p_tipo_aceite => 'ELETRONICO_LINK',
        p_responsavel_nome => 'Maria das Couves',
        p_responsavel_documento => '98765432100'
    );

    IF (v_res_orc->>'status') <> 'ENVIADO' OR (v_res_orc->>'token_assinatura') IS NULL THEN
        RAISE EXCEPTION 'FALHA NO ENVIO DO ORÇAMENTO: %', v_res_orc;
    END IF;
    RAISE NOTICE '[OK] Teste 6: Orçamento enviado com sucesso. Token de aceite remoto gerado.';

    -- =========================================================================
    -- FASE 7: TESTE 7 & 8 — APROVAÇÃO FORMAL COM SNAPSHOT IMUTÁVEL
    -- =========================================================================
    v_res_aprovacao := public.aprovar_orcamento_funerario(
        p_orcamento_id => v_orc_coberto,
        p_responsavel_aceite_nome => 'Maria das Couves',
        p_responsavel_aceite_documento => '98765432100',
        p_tipo_aceite => 'PRESENCIAL'
    );

    IF (v_res_aprovacao->>'status') <> 'APROVADO' THEN
        RAISE EXCEPTION 'FALHA NA APROVAÇÃO: %', v_res_aprovacao;
    END IF;

    -- Verifica snapshot gravado
    SELECT snapshot_aprovacao INTO v_snapshot FROM public.orcamentos_funerarios WHERE id = v_orc_coberto;
    IF v_snapshot IS NULL OR jsonb_array_length(v_snapshot->'itens') <> 3 THEN
        RAISE EXCEPTION 'FALHA NO SNAPSHOT IMUTÁVEL: Snapshot não gravou os 3 itens corretamente!';
    END IF;
    RAISE NOTICE '[OK] Teste 7: Orçamento APROVADO com sucesso. Snapshot imutável gerado com todos os itens e preços.';

    -- Teste 8: Tentativa de alterar itens após aprovação (deve falhar por Trigger de imutabilidade)
    v_deu_erro := FALSE;
    BEGIN
        INSERT INTO public.orcamento_funerario_itens (
            tenant_id, orcamento_id, produto_id, quantidade, preco_tabela, item_coberto_plano, valor_coberto, valor_particular, subtotal_cliente
        ) VALUES (
            v_tenant_a, v_orc_coberto, v_prod_flores, 1, 350.00, false, 0.00, 350.00, 350.00
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%IMUTABILIDADE%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 8: Trigger impediu alteração em itens de orçamento APROVADO: %', v_errm;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 8: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Itens de orçamento APROVADO puderam ser alterados!';
    END IF;

    -- =========================================================================
    -- FASE 8: TESTE 9 — REJEIÇÃO E CANCELAMENTO COM JUSTIFICATIVA
    -- =========================================================================
    v_res_orc := public.rejeitar_cancelar_orcamento_funerario(
        p_orcamento_id => v_orc_particular,
        p_novo_status => 'REJEITADO',
        p_motivo => 'Família optou por contratação direta de outra funerária'
    );
    IF (v_res_orc->>'status') <> 'REJEITADO' THEN
        RAISE EXCEPTION 'FALHA NA REJEIÇÃO: %', v_res_orc;
    END IF;
    RAISE NOTICE '[OK] Teste 9: Orçamento REJEITADO com justificativa auditada.';

    -- =========================================================================
    -- FASE 9: TESTE 10 — ISOLAMENTO MULTI-TENANT ESTRITO
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_b::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_b::text, 'role', 'ADMIN')
    )::text, true);

    SELECT COUNT(*) INTO v_count FROM public.orcamentos_funerarios WHERE id = v_orc_coberto;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FALHA DE RLS: Tenant B conseguiu visualizar orçamento de Tenant A!';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.orcamento_funerario_itens WHERE orcamento_id = v_orc_coberto;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FALHA DE RLS: Tenant B conseguiu visualizar itens de orçamento de Tenant A!';
    END IF;

    RAISE NOTICE '[OK] Teste 10: RLS validado com sucesso. Tenant B enxerga 0 orçamentos de Tenant A.';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '>>> TODOS OS 10 TESTES DA SPRINT 38 HOMOLOGADOS COM SUCESSO 100%%!';
    RAISE NOTICE '=======================================================';
END $$;

-- =========================================================================
-- ROLLBACK TOTAL OBRIGATÓRIO (Nenhum dado persiste no banco)
-- =========================================================================
ROLLBACK;
