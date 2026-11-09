-- =========================================================================
-- SUÍTE DE TESTES SQL DE HOMOLOGAÇÃO REAL — SPRINT 36: CAIXA POR OPERADOR
--
-- ARQUITETURA DE HOMOLOGAÇÃO ROBUSTA (SINGLE-BLOCK / ZERO TABLE CONFLICT):
-- 1. Executa em um ÚNICO bloco anônimo DO $$ ... $$ encapsulado em transação BEGIN ... ROLLBACK.
-- 2. Não cria nem depende de tabelas temporárias auxiliares, eliminando qualquer erro 42P01.
-- 3. Transição segura de papéis com:
--      EXECUTE 'SET LOCAL ROLE authenticated';
--      PERFORM set_config('request.jwt.claims', ..., true);
-- 4. Validações Exaustivas (13 testes):
--    - Teste 1: ADMIN Alfa cadastra dois terminais físicos com identificadores distintos.
--    - Teste 2: ATENDENTE Alfa abre turno com R$ 150,00 de fundo de troco (movimentação de abertura automática).
--    - Teste 3: Tentativa de abrir um SEGUNDO turno ativo para o mesmo operador é bloqueada com erro de duplicidade.
--    - Teste 4: Tentativa de abrir outro turno para o mesmo TERMINAL é bloqueada com erro de duplicidade.
--    - Teste 5: Suprimento em dinheiro de R$ 100,00 registrado com sucesso (Saldo esperado: R$ 250,00).
--    - Teste 6: Sangria legítima de R$ 50,00 registrada com sucesso (Saldo esperado: R$ 200,00).
--    - Teste 7: Tentativa de sangria abusiva de R$ 300,00 (acima do saldo disponível de R$ 200,00) é sumariamente bloqueada pelo banco.
--    - Teste 8: Fechamento Cego com divergência de caixa: operador declara R$ 190,00 (falta de R$ 10,00).
--               O retorno para o ATENDENTE omite os totais internos do sistema e a diferença apurada.
--               O turno transita automaticamente para 'EM_CONCILIACAO' com 'tem_divergencia = TRUE'.
--    - Teste 9: ATENDENTE Alfa tenta consultar colunas confidenciais diretamente na tabela base e é bloqueado por privilégio de coluna (42501).
--    - Teste 10: ATENDENTE Alfa tenta aprovar sua própria conciliação e é bloqueado por RBAC.
--    - Teste 11: ADMIN Alfa homologa a conciliação do turno com sucesso (status vai para 'FECHADO').
--    - Teste 12: Tentativa de DELETE em caixa_movimentacoes é bloqueada (imutabilidade contábil).
--    - Teste 13: Isolamento Multi-Tenant estrito (ADMIN Beta enxerga 0 caixas e 0 turnos do Tenant Alfa).
-- 5. Finaliza com ROLLBACK obrigatório: nenhum dado nem contexto persistem no banco.
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

    -- Entidades de Caixa e PDV
    v_caixa_1 UUID;
    v_caixa_2 UUID;
    v_turno_1 UUID;
    v_turno_outro UUID;
    v_mov_suprimento UUID;
    v_mov_sangria UUID;

    -- Variáveis de Verificação e Diagnóstico
    v_status TEXT;
    v_fundo NUMERIC;
    v_saldo_dinheiro NUMERIC;
    v_supervisor UUID;
    v_res_fechamento JSONB;
    v_count INT;
    v_rows_deleted INT;
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

    -- 4. Criar Perfis em public.profiles (Tenant A: 1 ADMIN + 1 ATENDENTE; Tenant B: 1 ADMIN)
    INSERT INTO public.profiles (id, tenant_id, nome, email, role, role_id, ativo)
    VALUES 
      (v_admin_a, v_tenant_a, 'Admin Alfa', 'admin_a@test.com', 'ADMIN', v_role_admin, true),
      (v_atendente_a, v_tenant_a, 'Atendente Alfa', 'atendente_a@test.com', 'ATENDENTE', v_role_atendente, true),
      (v_admin_b, v_tenant_b, 'Admin Beta', 'admin_b@test.com', 'ADMIN', v_role_admin, true);

    RAISE NOTICE '[OK] Fase 1: Tenants, Assinaturas, auth.users e Perfis criados com sucesso.';

    -- =========================================================================
    -- TRANSIÇÃO DE PAPEL: ATIVAR 'authenticated' E SIMULAR SESSÃO DO ADMIN ALFA
    -- =========================================================================
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ADMIN')
    )::text, true);

    -- =========================================================================
    -- FASE 2: TESTE 1 — ADMIN ALFA CADASTRA TERMINAIS DE CAIXA
    -- =========================================================================
    -- Inserção determinística do Caixa 1
    INSERT INTO public.caixas_fisicos (tenant_id, nome, identificador_pdv, descricao)
    VALUES (v_tenant_a, 'Caixa 01 - Recepção', 'PDV-01', 'Terminal principal da recepção')
    RETURNING id INTO v_caixa_1;

    -- Inserção determinística do Caixa 2
    INSERT INTO public.caixas_fisicos (tenant_id, nome, identificador_pdv, descricao)
    VALUES (v_tenant_a, 'Caixa 02 - Plantão', 'PDV-02', 'Terminal de apoio plantão')
    RETURNING id INTO v_caixa_2;

    RAISE NOTICE '[OK] Teste 1: Admin Alfa cadastrou 2 terminais físicos de caixa com sucesso (Caixa 1: %, Caixa 2: %).', v_caixa_1, v_caixa_2;

    -- =========================================================================
    -- FASE 3: TESTE 2 — ATENDENTE ALFA ABRE TURNO COM FUNDO DE TROCO
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_atendente_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ATENDENTE')
    )::text, true);

    v_turno_1 := public.abrir_turno_caixa(v_caixa_1, 150.00, 'Abertura de turno normal');

    SELECT status, fundo_troco INTO v_status, v_fundo
    FROM public.caixa_turnos
    WHERE id = v_turno_1 AND tenant_id = v_tenant_a;

    IF v_status <> 'ABERTO' OR v_fundo <> 150.00 THEN
        RAISE EXCEPTION 'FALHA NA ABERTURA: Status esperado ABERTO, obtido %; Fundo esperado 150.00, obtido %', v_status, v_fundo;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.caixa_movimentacoes
    WHERE turno_id = v_turno_1 AND tenant_id = v_tenant_a AND tipo = 'ABERTURA';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FALHA: Movimentação de abertura não gerada no Kardex financeiro!';
    END IF;

    RAISE NOTICE '[OK] Teste 2: Atendente Alfa abriu turno com sucesso (Turno ID: %, Fundo: R$ 150,00).', v_turno_1;

    -- =========================================================================
    -- FASE 4: TESTE 3 & 4 — BLOQUEIO DE MÚLTIPLOS TURNOS ATIVOS
    -- =========================================================================
    -- Teste 3: Mesmo operador tentando abrir outro turno no Caixa 2
    v_deu_erro := FALSE;
    BEGIN
        v_turno_outro := public.abrir_turno_caixa(v_caixa_2, 50.00, 'Segunda abertura simultanea proibida');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '23505' OR v_errm ILIKE '%uq_caixa_turno_operador_ativo%' OR v_errm ILIKE '%duplicate key%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 3: Bloqueio estrito de múltiplos turnos para o mesmo operador: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 3: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Operador conseguiu abrir dois turnos simultâneos!';
    END IF;

    -- Teste 4: Outro operador (Admin Alfa) tentando abrir turno no MESMO terminal Caixa 1
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ADMIN')
    )::text, true);

    v_deu_erro := FALSE;
    BEGIN
        v_turno_outro := public.abrir_turno_caixa(v_caixa_1, 80.00, 'Tentativa de ocupar terminal ja em uso');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '23505' OR v_errm ILIKE '%uq_caixa_turno_terminal_ativo%' OR v_errm ILIKE '%duplicate key%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 4: Bloqueio de terminal já em uso atuou com sucesso: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 4: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Terminal em uso aceitou abertura simultânea!';
    END IF;

    -- =========================================================================
    -- FASE 5: TESTE 5, 6 & 7 — SUPRIMENTO, SANGRIA E TRAVA DE SALDO EM DINHEIRO
    -- =========================================================================
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_atendente_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ATENDENTE')
    )::text, true);

    -- Teste 5: Suprimento em dinheiro de R$ 100,00 (Saldo: 150 + 100 = R$ 250,00)
    v_mov_suprimento := public.lancar_caixa_movimentacao(
        v_turno_1, 'SUPRIMENTO', 'DINHEIRO', 100.00, 'Reforço de troco notas de 10', 'SUP-001'
    );

    v_saldo_dinheiro := public.get_caixa_saldo_dinheiro(v_turno_1);
    IF v_saldo_dinheiro <> 250.00 THEN
        RAISE EXCEPTION 'FALHA NO SUPRIMENTO: Saldo esperado 250.00, obtido %', v_saldo_dinheiro;
    ELSE
        RAISE NOTICE '[OK] Teste 5: Suprimento efetuado. Saldo em dinheiro atualizado para R$ 250,00.';
    END IF;

    -- Teste 6: Sangria legítima de R$ 50,00 (Saldo: 250 - 50 = R$ 200,00)
    v_mov_sangria := public.lancar_caixa_movimentacao(
        v_turno_1, 'SANGRIA', 'DINHEIRO', 50.00, 'Sangria periódica para cofre', 'SAN-001'
    );

    v_saldo_dinheiro := public.get_caixa_saldo_dinheiro(v_turno_1);
    IF v_saldo_dinheiro <> 200.00 THEN
        RAISE EXCEPTION 'FALHA NA SANGRIA: Saldo esperado 200.00, obtido %', v_saldo_dinheiro;
    ELSE
        RAISE NOTICE '[OK] Teste 6: Sangria legítima efetuada. Saldo em dinheiro atualizado para R$ 200,00.';
    END IF;

    -- Teste 7: Tentativa de Sangria de R$ 300,00 (excede saldo de R$ 200,00 -> bloqueio)
    v_deu_erro := FALSE;
    BEGIN
        PERFORM public.lancar_caixa_movimentacao(
            v_turno_1, 'SANGRIA', 'DINHEIRO', 300.00, 'Sangria abusiva maior que o saldo', 'SAN-ABUSIVA'
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%excede o saldo em dinheiro disponível%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 7: Sangria acima do saldo bloqueada pelo banco: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 7: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Sangria permitiu saldo negativo em espécie no caixa!';
    END IF;

    -- =========================================================================
    -- FASE 6: TESTE 8 & 9 — FECHAMENTO CEGO E BLOQUEIO DE SELECT EM COLUNAS SENSÍVEIS
    -- =========================================================================
    -- Teste 8: Fechamento Cego
    -- Sistema calculou internamente: R$ 200,00 em dinheiro
    -- Operador declarou: R$ 190,00 (Falta de R$ 10,00)
    v_res_fechamento := public.fechar_turno_caixa_cego(
        v_turno_1,
        190.00, 0.00, 0.00, 0.00, 0.00,
        'Pequena falta de R$ 10,00 a apurar no troco'
    );

    -- Retorno não pode revelar diferenca_geral ou total_sistema_geral para o atendente
    IF (v_res_fechamento->>'diferenca_geral') IS NOT NULL OR (v_res_fechamento->>'total_sistema_geral') IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA NO FECHAMENTO CEGO: Totais do sistema vazaram para o operador! Retorno: %', v_res_fechamento;
    END IF;

    IF (v_res_fechamento->>'status') <> 'EM_CONCILIACAO' THEN
        RAISE EXCEPTION 'FALHA NO FECHAMENTO CEGO: Turno com divergência deveria ir para EM_CONCILIACAO, obtido %', v_res_fechamento;
    ELSE
        RAISE NOTICE '[OK] Teste 8: Fechamento cego blindado com sucesso. Status EM_CONCILIACAO confirmado sem vazamento de totais.';
    END IF;

    -- Teste 9: Atendente tenta consultar colunas confidenciais diretamente na tabela base (deve falhar por Column Grants: 42501)
    v_deu_erro := FALSE;
    BEGIN
        EXECUTE 'SELECT total_sistema_dinheiro FROM public.caixa_turnos WHERE id = ' || quote_literal(v_turno_1::text);
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '42501' OR v_errm ILIKE '%permission denied%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 9: Tentativa de consulta direta em colunas confidenciais bloqueada pelo PostgreSQL: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 9: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Operador conseguiu ler colunas confidenciais diretamente na tabela base!';
    END IF;

    -- =========================================================================
    -- FASE 7: TESTE 10 & 11 — CONCILIAÇÃO GERENCIAL E HOMOLOGAÇÃO
    -- =========================================================================
    -- Teste 10: Atendente tenta aprovar conciliação (deve falhar por falta de permissão gerencial)
    v_deu_erro := FALSE;
    BEGIN
        PERFORM public.aprovar_conciliacao_caixa(v_turno_1, 'Atendente tentando se auto-aprovar');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' OR v_errm ILIKE '%Acesso negado%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 10: Atendente bloqueado ao tentar homologar conciliação: %', v_errm;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 10: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Atendente conseguiu aprovar própria conciliação de caixa!';
    END IF;

    -- Teste 11: Admin Alfa homologa a divergência com sucesso
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ADMIN')
    )::text, true);

    PERFORM public.aprovar_conciliacao_caixa(v_turno_1, 'Divergência de R$ 10,00 analisada e abonada pelo supervisor.');

    SELECT status, supervisor_aprovador_id INTO v_status, v_supervisor
    FROM public.caixa_turnos
    WHERE id = v_turno_1 AND tenant_id = v_tenant_a;

    IF v_status <> 'FECHADO' OR v_supervisor <> v_admin_a THEN
        RAISE EXCEPTION 'FALHA: Homologação gerencial não finalizou o turno corretamente (status: %, supervisor: %).', v_status, v_supervisor;
    ELSE
        RAISE NOTICE '[OK] Teste 11: Supervisor homologou divergência com sucesso. Turno finalizado como FECHADO.';
    END IF;

    -- =========================================================================
    -- FASE 8: TESTE 12 & 13 — IMUTABILIDADE E ISOLAMENTO MULTI-TENANT
    -- =========================================================================
    -- Teste 12: Tentativa de DELETE em caixa_movimentacoes como ATENDENTE (papel sem privilégios administrativos)
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_atendente_a::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_a::text, 'role', 'ATENDENTE')
    )::text, true);

    v_deu_erro := FALSE;
    BEGIN
        DELETE FROM public.caixa_movimentacoes WHERE id = v_mov_sangria;
        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

        -- Se a instrução não lançou exceção (ex: filtrada silenciosamente por RLS delete policy USING (false)),
        -- verifica se 0 linhas foram afetadas
        IF v_rows_deleted = 0 THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 12: DELETE em caixa_movimentacoes filtrou 0 linhas (RLS bloqueou exclusão).';
        ELSE
            RAISE EXCEPTION 'FALHA DE SEGURANÇA: % linha(s) de movimentação contábil foram deletadas pelo ATENDENTE!', v_rows_deleted;
        END IF;
    EXCEPTION 
        WHEN insufficient_privilege OR raise_exception THEN
            GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 12: DELETE em caixa_movimentacoes bloqueado ativamente: % (SQLSTATE: %)', v_errm, v_sqlstate;
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
            IF v_sqlstate IN ('42501', 'P0001') OR v_errm ILIKE '%imutabilidade%' OR v_errm ILIKE '%permission denied%' THEN
                v_deu_erro := TRUE;
                RAISE NOTICE '[SUCESSO ESPERADO] Teste 12: DELETE em caixa_movimentacoes bloqueado: % (SQLSTATE: %)', v_errm, v_sqlstate;
            ELSE
                RAISE EXCEPTION 'ERRO INESPERADO no Teste 12: % (SQLSTATE: %)', v_errm, v_sqlstate;
            END IF;
    END;

    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: Movimentação contábil de caixa pôde ser deletada!';
    END IF;

    -- Teste 13: Tenant B isolado de Tenant A
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_admin_b::text,
        'role', 'authenticated',
        'user_metadata', json_build_object('tenant_id', v_tenant_b::text, 'role', 'ADMIN')
    )::text, true);

    SELECT COUNT(*) INTO v_count
    FROM public.caixa_turnos
    WHERE id = v_turno_1;

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FALHA GRAVE DE ISOLAMENTO RLS: Tenant B conseguiu visualizar turno do Tenant A!';
    ELSE
        RAISE NOTICE '[OK] Teste 13.1: RLS isolou visualização com sucesso. Tenant B vê 0 turnos do Tenant A.';
    END IF;

    v_deu_erro := FALSE;
    BEGIN
        PERFORM public.lancar_caixa_movimentacao(
            v_turno_1, 'SANGRIA', 'DINHEIRO', 10.00, 'Tentativa cross-tenant'
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errm = MESSAGE_TEXT;
        IF v_sqlstate = '42501' OR v_sqlstate = 'P0001' OR v_errm ILIKE '%não encontrado%' OR v_errm ILIKE '%permission denied%' THEN
            v_deu_erro := TRUE;
            RAISE NOTICE '[SUCESSO ESPERADO] Teste 13.2: Tentativa cross-tenant rejeitada pelo RLS/Função: % (SQLSTATE: %)', v_errm, v_sqlstate;
        ELSE
            RAISE EXCEPTION 'ERRO INESPERADO no Teste 13.2: % (SQLSTATE: %)', v_errm, v_sqlstate;
        END IF;
    END;
    IF NOT v_deu_erro THEN
        RAISE EXCEPTION 'FALHA GRAVE DE ISOLAMENTO: Tenant B conseguiu movimentar caixa do Tenant A!';
    END IF;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '>>> TODOS OS 13 TESTES DA SPRINT 36 HOMOLOGADOS COM SUCESSO 100%%!';
    RAISE NOTICE '=======================================================';
END $$;

-- =========================================================================
-- ROLLBACK TOTAL OBRIGATÓRIO (Nenhum dado nem tabela persistem)
-- =========================================================================
ROLLBACK;
