-- =========================================================================
-- Migration Sprint 36: PDV — Fase 2: Caixa por Operador e Fechamento Cego
--
-- Objetivos:
-- 1. Gestão de Terminais e Caixas Físicos por Tenant (caixas_fisicos).
-- 2. Sessões de Caixa por Operador (caixa_turnos) com abertura e fundo de troco.
-- 3. Fechamento Cego (Blind Closing): operador declara valores em espécie e demais
--    meios sem enxergar apurações prévias do sistema:
--    - RLS / Column Grants: Revogado SELECT direto nas colunas confidenciais de caixa_turnos
--      (total_sistema_* e diferenca_*) para authenticated.
--    - Concedido SELECT nessas colunas sensíveis apenas para ADMIN/GERENTE ou via View Segura.
--    - View Segura public.v_caixa_turnos_segura mascara campos de apuração interna
--      para operadores comuns até que o turno seja homologado (FECHADO).
--    - A resposta de fechar_turno_caixa_cego para ATENDENTE retorna apenas confirmação
--      do status (ex: EM_CONCILIACAO), omitindo a diferença numérica apurada até homologação.
-- 4. Conciliação automática de divergências (diferenca_apurada) e aprovação gerencial.
-- 5. Kardex Financeiro de Movimentações (caixa_movimentacoes) com histórico imutável:
--    - Suprimentos (entradas).
--    - Sangrias com trava matemática (não permite sangrar acima do saldo em espécie disponível,
--      incluindo ABERTURA, SUPRIMENTO e futuras VENDAS em dinheiro da Fase 3).
-- 6. Bloqueio estrito de múltiplos turnos ativos por operador ou por terminal (inclusive EM_CONCILIACAO).
-- 7. RLS e RBAC em profundidade:
--    - Operadores não consultam totais internos antes do fechamento (colunas, view e RPC protegidos).
--    - Apenas ADMIN e GERENTE aprovam divergências e visualizam auditorias completas de saldo.
-- 8. Funções SECURITY DEFINER blindadas com SET search_path = public, pg_temp.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. TABELA DE CAIXAS FÍSICOS (TERMINAIS / PONTOS DE ATENDIMENTO)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.caixas_fisicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    identificador_pdv TEXT,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_caixas_fisicos_nome UNIQUE (tenant_id, nome),
    CONSTRAINT uq_caixas_fisicos_identificador UNIQUE (tenant_id, identificador_pdv)
);

CREATE INDEX IF NOT EXISTS idx_caixas_fisicos_tenant_ativo ON public.caixas_fisicos(tenant_id, ativo);

-- =========================================================================
-- 2. TABELA DE TURNOS DE CAIXA (SESSÕES DE CAIXA POR OPERADOR)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.caixa_turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    caixa_id UUID NOT NULL REFERENCES public.caixas_fisicos(id) ON DELETE RESTRICT,
    operador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Status do Turno: ABERTO -> EM_CONCILIACAO -> FECHADO
    status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_CONCILIACAO', 'FECHADO')),
    
    -- Abertura
    data_abertura TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fundo_troco NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (fundo_troco >= 0),
    observacoes_abertura TEXT,
    
    -- Fechamento Cego (Valores declarados pelo operador na contagem física)
    data_fechamento TIMESTAMPTZ,
    total_declarado_dinheiro NUMERIC(12, 2) DEFAULT NULL CHECK (total_declarado_dinheiro IS NULL OR total_declarado_dinheiro >= 0),
    total_declarado_pix NUMERIC(12, 2) DEFAULT NULL CHECK (total_declarado_pix IS NULL OR total_declarado_pix >= 0),
    total_declarado_cartao_debito NUMERIC(12, 2) DEFAULT NULL CHECK (total_declarado_cartao_debito IS NULL OR total_declarado_cartao_debito >= 0),
    total_declarado_cartao_credito NUMERIC(12, 2) DEFAULT NULL CHECK (total_declarado_cartao_credito IS NULL OR total_declarado_cartao_credito >= 0),
    total_declarado_outros NUMERIC(12, 2) DEFAULT NULL CHECK (total_declarado_outros IS NULL OR total_declarado_outros >= 0),
    total_declarado_geral NUMERIC(12, 2) DEFAULT NULL,
    
    -- Totais Consolidados pelo Sistema (Apuração Interna Cega / Imutável)
    total_sistema_dinheiro NUMERIC(12, 2) DEFAULT NULL,
    total_sistema_pix NUMERIC(12, 2) DEFAULT NULL,
    total_sistema_cartao_debito NUMERIC(12, 2) DEFAULT NULL,
    total_sistema_cartao_credito NUMERIC(12, 2) DEFAULT NULL,
    total_sistema_outros NUMERIC(12, 2) DEFAULT NULL,
    total_sistema_geral NUMERIC(12, 2) DEFAULT NULL,
    
    -- Apuração de Divergência (Declarado - Sistema: Positivo = Sobra, Negativo = Falta)
    diferenca_dinheiro NUMERIC(12, 2) DEFAULT NULL,
    diferenca_geral NUMERIC(12, 2) DEFAULT NULL,
    tem_divergencia BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_divergencia TEXT,
    
    -- Homologação / Aprovação Gerencial de Fechamento com Divergência
    supervisor_aprovador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    supervisor_aprovador_nome TEXT,
    data_aprovacao TIMESTAMPTZ,
    observacoes_supervisor TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices parciais para garantir apenas 1 turno ativo (ABERTO ou EM_CONCILIACAO)
-- por operador e por terminal simultaneamente
CREATE UNIQUE INDEX IF NOT EXISTS uq_caixa_turno_operador_ativo 
    ON public.caixa_turnos(tenant_id, operador_id) 
    WHERE status IN ('ABERTO', 'EM_CONCILIACAO');

CREATE UNIQUE INDEX IF NOT EXISTS uq_caixa_turno_terminal_ativo 
    ON public.caixa_turnos(tenant_id, caixa_id) 
    WHERE status IN ('ABERTO', 'EM_CONCILIACAO');

CREATE INDEX IF NOT EXISTS idx_caixa_turnos_tenant_status ON public.caixa_turnos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_caixa_turnos_datas ON public.caixa_turnos(tenant_id, data_abertura DESC);

-- =========================================================================
-- 3. TABELA DE MOVIMENTAÇÕES DE CAIXA (KARDEX FINANCEIRO OPERACIONAL)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    turno_id UUID NOT NULL REFERENCES public.caixa_turnos(id) ON DELETE CASCADE,
    
    -- Tipo da movimentação
    tipo TEXT NOT NULL CHECK (tipo IN ('ABERTURA', 'SUPRIMENTO', 'SANGRIA', 'VENDA', 'ESTORNO')),
    forma_pagamento TEXT NOT NULL DEFAULT 'DINHEIRO' CHECK (forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'OUTROS')),
    
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    motivo TEXT NOT NULL,
    documento_ref TEXT,
    idempotency_key TEXT,
    
    -- Rastreio do operador que efetuou a operação
    operador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operador_nome TEXT,
    
    -- Se a operação requereu autorização gerencial (ex: sangria especial ou estorno)
    autorizador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    autorizador_nome TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_caixa_mov_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_caixa_mov_turno ON public.caixa_movimentacoes(tenant_id, turno_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_caixa_mov_tipo_forma ON public.caixa_movimentacoes(tenant_id, tipo, forma_pagamento);

-- =========================================================================
-- 4. FUNÇÕES DE CÁLCULO E PROTEÇÃO DE SALDO EM DINHEIRO (SECURITY DEFINER)
-- =========================================================================

-- Retorna o saldo líquido disponível em espécie para o turno ativo
-- Inclui o fundo de troco inicial e todas as entradas em espécie (SUPRIMENTO, VENDA da Fase 3)
-- subtraindo as saídas (SANGRIA, ESTORNO)
CREATE OR REPLACE FUNCTION public.get_caixa_saldo_dinheiro(p_turno_id UUID)
RETURNS NUMERIC(12, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_fundo NUMERIC(12, 2);
    v_entradas NUMERIC(12, 2);
    v_saidas NUMERIC(12, 2);
BEGIN
    SELECT fundo_troco INTO v_fundo
    FROM public.caixa_turnos
    WHERE id = p_turno_id;

    IF v_fundo IS NULL THEN
        RETURN 0.00;
    END IF;

    -- Entradas em dinheiro (SUPRIMENTO e VENDAS em dinheiro da Fase 3)
    SELECT COALESCE(SUM(valor), 0.00) INTO v_entradas
    FROM public.caixa_movimentacoes
    WHERE turno_id = p_turno_id
      AND forma_pagamento = 'DINHEIRO'
      AND tipo IN ('SUPRIMENTO', 'VENDA');

    -- Saídas em dinheiro (SANGRIA e ESTORNOS)
    SELECT COALESCE(SUM(valor), 0.00) INTO v_saidas
    FROM public.caixa_movimentacoes
    WHERE turno_id = p_turno_id
      AND forma_pagamento = 'DINHEIRO'
      AND tipo IN ('SANGRIA', 'ESTORNO');

    RETURN ROUND(v_fundo + v_entradas - v_saidas, 2);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_caixa_saldo_dinheiro(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_caixa_saldo_dinheiro(UUID) TO authenticated, service_role;

-- =========================================================================
-- 5. TRIGGER TRANSACIONAL DE VALIDAÇÃO DE SANGRIA E CONCORRÊNCIA
-- =========================================================================

CREATE OR REPLACE FUNCTION public.validar_caixa_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_turno RECORD;
    v_saldo_dinheiro NUMERIC(12, 2);
BEGIN
    -- 1. Bloqueio transacional da linha do turno contra concorrência simultânea
    SELECT *
    INTO v_turno
    FROM public.caixa_turnos
    WHERE id = NEW.turno_id AND tenant_id = NEW.tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Turno de caixa não localizado ou pertence a outro tenant.';
    END IF;

    -- 2. Turno precisa estar com status 'ABERTO' para aceitar movimentações
    IF v_turno.status <> 'ABERTO' THEN
        RAISE EXCEPTION 'Operação rejeitada: O turno de caixa está com status % e não aceita lançamentos.', v_turno.status;
    END IF;

    -- 3. Validação de Sangria em Dinheiro (não permite exceder saldo em espécie disponível)
    IF NEW.tipo = 'SANGRIA' AND NEW.forma_pagamento = 'DINHEIRO' THEN
        v_saldo_dinheiro := public.get_caixa_saldo_dinheiro(NEW.turno_id);
        IF NEW.valor > v_saldo_dinheiro THEN
            RAISE EXCEPTION 'Sangria rejeitada: Valor solicitado (R$ %) excede o saldo em dinheiro disponível no caixa (R$ %).', 
                NEW.valor, v_saldo_dinheiro;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_caixa_movimentacao ON public.caixa_movimentacoes;
CREATE TRIGGER trg_validar_caixa_movimentacao
    BEFORE INSERT ON public.caixa_movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_caixa_movimentacao();

-- =========================================================================
-- 6. RPC: ABERTURA DE TURNO DE CAIXA (SECURITY DEFINER)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.abrir_turno_caixa(
    p_caixa_id UUID,
    p_fundo_troco NUMERIC(12, 2),
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_tenant_id UUID;
    v_operador_nome TEXT;
    v_turno_id UUID;
    v_caixa_nome TEXT;
BEGIN
    v_uid := public.current_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    v_tenant_id := public.current_tenant_id();
    IF v_tenant_id IS NULL OR NOT public.is_tenant_subscription_valid() THEN
        RAISE EXCEPTION 'Tenant inválido ou assinatura inativa/expirada.';
    END IF;

    IF p_fundo_troco < 0 THEN
        RAISE EXCEPTION 'Fundo de troco não pode ser negativo.';
    END IF;

    -- Obter e travar o terminal físico
    SELECT nome INTO v_caixa_nome
    FROM public.caixas_fisicos
    WHERE id = p_caixa_id AND tenant_id = v_tenant_id AND ativo = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caixa terminal não encontrado ou inativo.';
    END IF;

    -- Obter nome do operador
    SELECT COALESCE(nome, email, 'Operador') INTO v_operador_nome
    FROM public.profiles
    WHERE id = v_uid;

    -- Lock transacional por operador para prevenir dupla abertura concorrente
    PERFORM pg_advisory_xact_lock(hashtext('abrir_caixa_' || v_uid::text));

    -- Inserir Turno
    INSERT INTO public.caixa_turnos (
        tenant_id, caixa_id, operador_id, fundo_troco, observacoes_abertura, status
    ) VALUES (
        v_tenant_id, p_caixa_id, v_uid, p_fundo_troco, p_observacoes, 'ABERTO'
    ) RETURNING id INTO v_turno_id;

    -- Lançar movimentação de abertura no Kardex caso fundo_troco > 0
    IF p_fundo_troco > 0 THEN
        INSERT INTO public.caixa_movimentacoes (
            tenant_id, turno_id, tipo, forma_pagamento, valor, motivo, operador_id, operador_nome, idempotency_key
        ) VALUES (
            v_tenant_id, v_turno_id, 'ABERTURA', 'DINHEIRO', p_fundo_troco, 'Fundo de troco de abertura',
            v_uid, v_operador_nome, 'ABERTURA-' || v_turno_id::text
        );
    END IF;

    RETURN v_turno_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abrir_turno_caixa(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abrir_turno_caixa(UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- =========================================================================
-- 7. RPC: REGISTRAR SUPRIMENTO OU SANGRIA (SECURITY DEFINER)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.lancar_caixa_movimentacao(
    p_turno_id UUID,
    p_tipo TEXT,
    p_forma_pagamento TEXT,
    p_valor NUMERIC(12, 2),
    p_motivo TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_autorizador_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_tenant_id UUID;
    v_operador_nome TEXT;
    v_autorizador_nome TEXT := NULL;
    v_mov_id UUID;
    v_turno RECORD;
BEGIN
    v_uid := public.current_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    v_tenant_id := public.current_tenant_id();
    IF v_tenant_id IS NULL OR NOT public.is_tenant_subscription_valid() THEN
        RAISE EXCEPTION 'Tenant inválido ou assinatura inativa/expirada.';
    END IF;

    IF p_tipo NOT IN ('SUPRIMENTO', 'SANGRIA') THEN
        RAISE EXCEPTION 'Tipo de movimentação avulsa inválida. Permitido: SUPRIMENTO ou SANGRIA.';
    END IF;

    IF p_valor <= 0 THEN
        RAISE EXCEPTION 'O valor da movimentação deve ser estritamente positivo.';
    END IF;

    IF COALESCE(TRIM(p_motivo), '') = '' THEN
        RAISE EXCEPTION 'O motivo da movimentação é obrigatório.';
    END IF;

    SELECT * INTO v_turno
    FROM public.caixa_turnos
    WHERE id = p_turno_id AND tenant_id = v_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Turno de caixa não encontrado.';
    END IF;

    -- Operador só lança no seu próprio turno, a menos que seja ADMIN ou GERENTE
    IF v_turno.operador_id <> v_uid AND NOT public.can_manage_catalogo() THEN
        RAISE EXCEPTION 'Você não tem permissão para lançar movimentações no caixa de outro operador.';
    END IF;

    SELECT COALESCE(nome, email, 'Operador') INTO v_operador_nome
    FROM public.profiles WHERE id = v_uid;

    -- Se informado autorizador, valida existência e permissão gerencial
    IF p_autorizador_id IS NOT NULL THEN
        SELECT COALESCE(p.nome, p.email, 'Supervisor') INTO v_autorizador_nome
        FROM public.profiles p
        LEFT JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = p_autorizador_id AND p.tenant_id = v_tenant_id
          AND (UPPER(COALESCE(r.nome, p.role, '')) IN ('ADMIN', 'GERENTE', 'SUPER_ADMIN'));

        IF v_autorizador_nome IS NULL THEN
            RAISE EXCEPTION 'Autorizador informado não possui perfil gerencial válido.';
        END IF;
    END IF;

    INSERT INTO public.caixa_movimentacoes (
        tenant_id, turno_id, tipo, forma_pagamento, valor, motivo, idempotency_key,
        operador_id, operador_nome, autorizador_id, autorizador_nome
    ) VALUES (
        v_tenant_id, p_turno_id, p_tipo, p_forma_pagamento, p_valor, TRIM(p_motivo), p_idempotency_key,
        v_uid, v_operador_nome, p_autorizador_id, v_autorizador_nome
    ) RETURNING id INTO v_mov_id;

    RETURN v_mov_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lancar_caixa_movimentacao(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lancar_caixa_movimentacao(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID) TO authenticated, service_role;

-- =========================================================================
-- 8. RPC: FECHAMENTO CEGO E APURAÇÃO DE DIVERGÊNCIAS (SECURITY DEFINER)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fechar_turno_caixa_cego(
    p_turno_id UUID,
    p_declarado_dinheiro NUMERIC(12, 2),
    p_declarado_pix NUMERIC(12, 2) DEFAULT 0.00,
    p_declarado_cartao_debito NUMERIC(12, 2) DEFAULT 0.00,
    p_declarado_cartao_credito NUMERIC(12, 2) DEFAULT 0.00,
    p_declarado_outros NUMERIC(12, 2) DEFAULT 0.00,
    p_motivo_divergencia TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_tenant_id UUID;
    v_turno RECORD;
    v_is_gerente BOOLEAN;
    
    -- Apurações do Sistema
    v_sis_dinheiro NUMERIC(12, 2);
    v_sis_pix NUMERIC(12, 2);
    v_sis_debito NUMERIC(12, 2);
    v_sis_credito NUMERIC(12, 2);
    v_sis_outros NUMERIC(12, 2);
    v_sis_geral NUMERIC(12, 2);
    
    -- Totais Declarados
    v_dec_geral NUMERIC(12, 2);
    v_dif_dinheiro NUMERIC(12, 2);
    v_dif_geral NUMERIC(12, 2);
    v_tem_divergencia BOOLEAN := FALSE;
    v_novo_status TEXT;
BEGIN
    v_uid := public.current_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    v_tenant_id := public.current_tenant_id();
    IF v_tenant_id IS NULL OR NOT public.is_tenant_subscription_valid() THEN
        RAISE EXCEPTION 'Tenant inválido ou assinatura inativa/expirada.';
    END IF;

    v_is_gerente := public.can_manage_catalogo();

    -- Bloqueia a linha do turno
    SELECT * INTO v_turno
    FROM public.caixa_turnos
    WHERE id = p_turno_id AND tenant_id = v_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Turno de caixa não encontrado.';
    END IF;

    IF v_turno.status <> 'ABERTO' THEN
        RAISE EXCEPTION 'Turno já se encontra com status %.', v_turno.status;
    END IF;

    IF v_turno.operador_id <> v_uid AND NOT v_is_gerente THEN
        RAISE EXCEPTION 'Apenas o operador responsável ou gerência podem fechar este turno.';
    END IF;

    -- Validação de valores declarados
    p_declarado_dinheiro := COALESCE(p_declarado_dinheiro, 0.00);
    p_declarado_pix := COALESCE(p_declarado_pix, 0.00);
    p_declarado_cartao_debito := COALESCE(p_declarado_cartao_debito, 0.00);
    p_declarado_cartao_credito := COALESCE(p_declarado_cartao_credito, 0.00);
    p_declarado_outros := COALESCE(p_declarado_outros, 0.00);

    IF p_declarado_dinheiro < 0 OR p_declarado_pix < 0 OR p_declarado_cartao_debito < 0 OR p_declarado_cartao_credito < 0 OR p_declarado_outros < 0 THEN
        RAISE EXCEPTION 'Os valores declarados não podem ser negativos.';
    END IF;

    v_dec_geral := p_declarado_dinheiro + p_declarado_pix + p_declarado_cartao_debito + p_declarado_cartao_credito + p_declarado_outros;

    -- 1. Apuração Interna do Sistema para Espécie (Fundo de troco + entradas - sangrias/estornos)
    v_sis_dinheiro := public.get_caixa_saldo_dinheiro(p_turno_id);

    -- 2. Apuração Interna para outros métodos
    SELECT COALESCE(SUM(CASE WHEN tipo IN ('SUPRIMENTO', 'VENDA') THEN valor ELSE -valor END), 0.00)
    INTO v_sis_pix
    FROM public.caixa_movimentacoes
    WHERE turno_id = p_turno_id AND forma_pagamento = 'PIX';

    SELECT COALESCE(SUM(CASE WHEN tipo IN ('SUPRIMENTO', 'VENDA') THEN valor ELSE -valor END), 0.00)
    INTO v_sis_debito
    FROM public.caixa_movimentacoes
    WHERE turno_id = p_turno_id AND forma_pagamento = 'CARTAO_DEBITO';

    SELECT COALESCE(SUM(CASE WHEN tipo IN ('SUPRIMENTO', 'VENDA') THEN valor ELSE -valor END), 0.00)
    INTO v_sis_credito
    FROM public.caixa_movimentacoes
    WHERE turno_id = p_turno_id AND forma_pagamento = 'CARTAO_CREDITO';

    SELECT COALESCE(SUM(CASE WHEN tipo IN ('SUPRIMENTO', 'VENDA') THEN valor ELSE -valor END), 0.00)
    INTO v_sis_outros
    FROM public.caixa_movimentacoes
    WHERE turno_id = p_turno_id AND forma_pagamento IN ('BOLETO', 'OUTROS');

    v_sis_geral := v_sis_dinheiro + v_sis_pix + v_sis_debito + v_sis_credito + v_sis_outros;

    -- 3. Cálculo matemático de divergências
    v_dif_dinheiro := ROUND(p_declarado_dinheiro - v_sis_dinheiro, 2);
    v_dif_geral := ROUND(v_dec_geral - v_sis_geral, 2);

    IF v_dif_geral <> 0.00 OR v_dif_dinheiro <> 0.00 THEN
        v_tem_divergencia := TRUE;
        -- Se houver divergência, transita para EM_CONCILIACAO requerendo análise/homologação de supervisor
        v_novo_status := 'EM_CONCILIACAO';
    ELSE
        v_tem_divergencia := FALSE;
        v_novo_status := 'FECHADO';
    END IF;

    -- 4. Atualizar registro do turno
    UPDATE public.caixa_turnos
    SET 
        status = v_novo_status,
        data_fechamento = NOW(),
        total_declarado_dinheiro = p_declarado_dinheiro,
        total_declarado_pix = p_declarado_pix,
        total_declarado_cartao_debito = p_declarado_cartao_debito,
        total_declarado_cartao_credito = p_declarado_cartao_credito,
        total_declarado_outros = p_declarado_outros,
        total_declarado_geral = v_dec_geral,
        total_sistema_dinheiro = v_sis_dinheiro,
        total_sistema_pix = v_sis_pix,
        total_sistema_cartao_debito = v_sis_debito,
        total_sistema_cartao_credito = v_sis_credito,
        total_sistema_outros = v_sis_outros,
        total_sistema_geral = v_sis_geral,
        diferenca_dinheiro = v_dif_dinheiro,
        diferenca_geral = v_dif_geral,
        tem_divergencia = v_tem_divergencia,
        motivo_divergencia = TRIM(p_motivo_divergencia),
        updated_at = NOW()
    WHERE id = p_turno_id;

    -- 5. Defesa do Fechamento Cego:
    -- Operadores comuns (ATENDENTE) recebem apenas confirmação cega da declaração
    -- Sem revelação de totais do sistema ou valores exatos de diferença
    IF NOT v_is_gerente THEN
        RETURN json_build_object(
            'turno_id', p_turno_id,
            'status', v_novo_status,
            'total_declarado_geral', v_dec_geral,
            'mensagem', CASE 
                WHEN v_novo_status = 'EM_CONCILIACAO' THEN 'Turno enviado para conciliação gerencial.'
                ELSE 'Turno de caixa encerrado com sucesso.'
            END
        )::jsonb;
    END IF;

    -- Gerentes recebem apuração completa
    RETURN json_build_object(
        'turno_id', p_turno_id,
        'status', v_novo_status,
        'tem_divergencia', v_tem_divergencia,
        'diferenca_dinheiro', v_dif_dinheiro,
        'diferenca_geral', v_dif_geral,
        'total_declarado_geral', v_dec_geral,
        'total_sistema_geral', v_sis_geral
    )::jsonb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fechar_turno_caixa_cego(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fechar_turno_caixa_cego(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated, service_role;

-- =========================================================================
-- 9. RPC: HOMOLOGAÇÃO GERENCIAL DE DIVERGÊNCIA DE CAIXA (SECURITY DEFINER)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.aprovar_conciliacao_caixa(
    p_turno_id UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_tenant_id UUID;
    v_supervisor_nome TEXT;
    v_turno RECORD;
BEGIN
    v_uid := public.current_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    v_tenant_id := public.current_tenant_id();
    IF v_tenant_id IS NULL OR NOT public.is_tenant_subscription_valid() THEN
        RAISE EXCEPTION 'Tenant inválido ou assinatura inativa/expirada.';
    END IF;

    -- Apenas ADMIN e GERENTE podem aprovar divergências de caixa
    IF NOT public.can_manage_catalogo() THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores ou gerentes podem homologar divergências de caixa.';
    END IF;

    SELECT * INTO v_turno
    FROM public.caixa_turnos
    WHERE id = p_turno_id AND tenant_id = v_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Turno de caixa não encontrado.';
    END IF;

    IF v_turno.status <> 'EM_CONCILIACAO' THEN
        RAISE EXCEPTION 'O turno não está pendente de conciliação (status atual: %).', v_turno.status;
    END IF;

    SELECT COALESCE(nome, email, 'Supervisor') INTO v_supervisor_nome
    FROM public.profiles WHERE id = v_uid;

    UPDATE public.caixa_turnos
    SET 
        status = 'FECHADO',
        supervisor_aprovador_id = v_uid,
        supervisor_aprovador_nome = v_supervisor_nome,
        data_aprovacao = NOW(),
        observacoes_supervisor = TRIM(p_observacoes),
        updated_at = NOW()
    WHERE id = p_turno_id;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aprovar_conciliacao_caixa(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aprovar_conciliacao_caixa(UUID, TEXT) TO authenticated, service_role;

-- =========================================================================
-- 10. ROW LEVEL SECURITY (RLS) E POLÍTICAS RBAC
-- =========================================================================

ALTER TABLE public.caixas_fisicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.caixas_fisicos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_turnos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes FORCE ROW LEVEL SECURITY;

-- 10.1 caixas_fisicos
DROP POLICY IF EXISTS select_caixas_fisicos ON public.caixas_fisicos;
CREATE POLICY select_caixas_fisicos ON public.caixas_fisicos
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS insert_caixas_fisicos ON public.caixas_fisicos;
CREATE POLICY insert_caixas_fisicos ON public.caixas_fisicos
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid() AND public.can_manage_catalogo()) OR public.is_super_admin());

DROP POLICY IF EXISTS update_caixas_fisicos ON public.caixas_fisicos;
CREATE POLICY update_caixas_fisicos ON public.caixas_fisicos
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid() AND public.can_manage_catalogo()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid() AND public.can_manage_catalogo()) OR public.is_super_admin());

-- 10.2 caixa_turnos
DROP POLICY IF EXISTS select_caixa_turnos ON public.caixa_turnos;
CREATE POLICY select_caixa_turnos ON public.caixa_turnos
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- Criação direta restrita (geralmente feita via abrir_turno_caixa)
DROP POLICY IF EXISTS insert_caixa_turnos ON public.caixa_turnos;
CREATE POLICY insert_caixa_turnos ON public.caixa_turnos
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid() AND (operador_id = public.current_auth_uid() OR public.can_manage_catalogo())) OR public.is_super_admin());

-- Atualização direta de turnos bloqueada para operadores comuns (fechamento/conciliação via RPC)
DROP POLICY IF EXISTS update_caixa_turnos ON public.caixa_turnos;
CREATE POLICY update_caixa_turnos ON public.caixa_turnos
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid() AND public.can_manage_catalogo()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid() AND public.can_manage_catalogo()) OR public.is_super_admin());

-- 10.3 caixa_movimentacoes (Histórico contábil imutável)
-- ADMIN e SUPER_ADMIN visualizam todas as movimentações do tenant para conciliação.
-- ATENDENTE visualiza estritamente as suas próprias movimentações (blindagem do fechamento cego).
DROP POLICY IF EXISTS select_caixa_movimentacoes ON public.caixa_movimentacoes;
CREATE POLICY select_caixa_movimentacoes ON public.caixa_movimentacoes
    FOR SELECT TO authenticated
    USING (
        (tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()
         AND (operador_id = public.current_auth_uid() OR public.can_manage_catalogo()))
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS insert_caixa_movimentacoes ON public.caixa_movimentacoes;
CREATE POLICY insert_caixa_movimentacoes ON public.caixa_movimentacoes
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- Movimentações de caixa NUNCA podem ser alteradas ou deletadas
DROP POLICY IF EXISTS update_caixa_movimentacoes ON public.caixa_movimentacoes;
CREATE POLICY update_caixa_movimentacoes ON public.caixa_movimentacoes
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS delete_caixa_movimentacoes ON public.caixa_movimentacoes;
CREATE POLICY delete_caixa_movimentacoes ON public.caixa_movimentacoes
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- =========================================================================
-- 11. VIEW SEGURA PARA FECHAMENTO CEGO (MASCARAMENTO DINÂMICO DE TOTAIS)
-- =========================================================================

CREATE OR REPLACE VIEW public.v_caixa_turnos_segura AS
SELECT
    t.id,
    t.tenant_id,
    t.caixa_id,
    t.operador_id,
    t.status,
    t.data_abertura,
    t.fundo_troco,
    t.observacoes_abertura,
    t.data_fechamento,
    t.total_declarado_dinheiro,
    t.total_declarado_pix,
    t.total_declarado_cartao_debito,
    t.total_declarado_cartao_credito,
    t.total_declarado_outros,
    t.total_declarado_geral,
    
    -- Campos confidenciais do sistema: mascarados para operadores comuns antes de homologação
    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.total_sistema_dinheiro 
        ELSE NULL 
    END AS total_sistema_dinheiro,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.total_sistema_pix 
        ELSE NULL 
    END AS total_sistema_pix,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.total_sistema_cartao_debito 
        ELSE NULL 
    END AS total_sistema_cartao_debito,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.total_sistema_cartao_credito 
        ELSE NULL 
    END AS total_sistema_cartao_credito,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.total_sistema_outros 
        ELSE NULL 
    END AS total_sistema_outros,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.total_sistema_geral 
        ELSE NULL 
    END AS total_sistema_geral,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.diferenca_dinheiro 
        ELSE NULL 
    END AS diferenca_dinheiro,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.diferenca_geral 
        ELSE NULL 
    END AS diferenca_geral,

    CASE 
        WHEN public.can_manage_catalogo() OR t.status = 'FECHADO' 
        THEN t.tem_divergencia 
        ELSE FALSE 
    END AS tem_divergencia,

    t.motivo_divergencia,
    t.supervisor_aprovador_id,
    t.supervisor_aprovador_nome,
    t.data_aprovacao,
    t.observacoes_supervisor,
    t.created_at,
    t.updated_at
FROM public.caixa_turnos t;

GRANT SELECT ON public.v_caixa_turnos_segura TO authenticated, service_role;

-- =========================================================================
-- 12. PRIVILÉGIOS DE COLUNA (DEFESA EM PROFUNDIDADE SQL)
-- =========================================================================

-- Revoga UPDATE direto em colunas críticas de caixa_turnos para authenticated
REVOKE UPDATE ON public.caixa_turnos FROM authenticated;

-- Permite apenas que ADMINs atualizem campos de anotação de supervisor
GRANT UPDATE (
    observacoes_supervisor,
    updated_at
) ON public.caixa_turnos TO authenticated;

-- 12.1 DEFESA EM PROFUNDIDADE DE COLUNAS NO FECHAMENTO CEGO:
-- Revoga SELECT genérico em caixa_turnos de authenticated e concede SELECT apenas nas colunas operacionais
-- As colunas total_sistema_* e diferenca_* NÃO são concedidas para authenticated diretamente na tabela base!
-- Usuários autenticados acessam turnos com segurança através da View v_caixa_turnos_segura
REVOKE SELECT ON public.caixa_turnos FROM authenticated;

GRANT SELECT (
    id,
    tenant_id,
    caixa_id,
    operador_id,
    status,
    data_abertura,
    fundo_troco,
    observacoes_abertura,
    data_fechamento,
    total_declarado_dinheiro,
    total_declarado_pix,
    total_declarado_cartao_debito,
    total_declarado_cartao_credito,
    total_declarado_outros,
    total_declarado_geral,
    motivo_divergencia,
    supervisor_aprovador_id,
    supervisor_aprovador_nome,
    data_aprovacao,
    observacoes_supervisor,
    created_at,
    updated_at
) ON public.caixa_turnos TO authenticated;

COMMIT;
