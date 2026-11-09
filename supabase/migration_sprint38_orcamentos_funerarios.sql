-- =========================================================================
-- MIGRATION SPRINT 38: ORÇAMENTOS FUNERÁRIOS INTEGRADOS
-- 
-- Arquitetura Transacional:
-- 1. orcamentos_funerarios:
--    - Vinculado a tenant_id, atendimento_id (opcional/direto), cliente_id e contrato_id (opcional).
--    - Verificação de plano, cobertura contratual e carência.
--    - Estados: 'RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'CANCELADO'.
--    - Totais separados: total_coberto, total_adicional_particular, total_desconto, total_liquido_cliente.
--    - Snapshot imutável no momento da aprovação (dados contratuais, itens, regras).
-- 2. orcamento_funerario_itens:
--    - Vinculado a produto_id (catálogo Sprint 35).
--    - Indicador de item_coberto_plano (BOOLEAN).
--    - Separação entre valor coberto pela funerária/plano e valor particular devido pelo cliente.
-- 3. Funções RPC com SECURITY DEFINER:
--    - criar_orcamento_funerario: Cria rascunho com cálculo automático de carência e itens cobertos.
--    - enviar_orcamento_funerario: Transita para ENVIADO e gera token/link seguro para aceite presencial ou remoto.
--    - aprovar_orcamento_funerario: Grava snapshot imutável de itens/valores e transita para APROVADO.
--    - rejeitar_cancelar_orcamento_funerario: Transita para REJEITADO ou CANCELADO com justificativa.
-- 4. RLS, RBAC, isolamento multi-tenant e zero movimentação de estoque ou cobrança financeira no orçamento.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. TABELA PRINCIPAL DE ORÇAMENTOS FUNERÁRIOS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.orcamentos_funerarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    
    numero_orcamento BIGINT GENERATED ALWAYS AS IDENTITY,
    status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'CANCELADO')),
    
    -- Análise de Cobertura e Carência
    tem_cobertura_plano BOOLEAN NOT NULL DEFAULT FALSE,
    plano_nome TEXT,
    dias_carencia_plano INTEGER NOT NULL DEFAULT 0,
    dias_desde_adesao INTEGER,
    em_carencia BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Totais Financeiros Separados
    total_bruto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_bruto >= 0),
    total_coberto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_coberto >= 0),
    total_adicional_particular NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_adicional_particular >= 0),
    total_desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_desconto >= 0),
    total_liquido_cliente NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_liquido_cliente >= 0),
    
    desconto_autorizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    desconto_motivo TEXT,
    
    -- Aceite / Assinatura
    tipo_aceite TEXT CHECK (tipo_aceite IN ('PRESENCIAL', 'ELETRONICO_LINK', 'PROCURACAO', 'OUTRO')),
    responsavel_aceite_nome TEXT,
    responsavel_aceite_documento TEXT,
    token_assinatura_remota TEXT UNIQUE,
    data_envio TIMESTAMPTZ,
    data_aprovacao TIMESTAMPTZ,
    data_rejeicao_cancelamento TIMESTAMPTZ,
    motivo_rejeicao_cancelamento TEXT,
    
    -- Snapshot Imutável da Aprovação (congela itens, valores e cláusulas)
    snapshot_aprovacao JSONB DEFAULT NULL,
    aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    observacoes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT uq_orcamento_funerario_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_tenant_status ON public.orcamentos_funerarios(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_atendimento ON public.orcamentos_funerarios(tenant_id, atendimento_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON public.orcamentos_funerarios(tenant_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_contrato ON public.orcamentos_funerarios(tenant_id, contrato_id);

-- =========================================================================
-- 2. TABELA DE ITENS DO ORÇAMENTO FUNERÁRIO
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.orcamento_funerario_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    orcamento_id UUID NOT NULL REFERENCES public.orcamentos_funerarios(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos_servicos(id) ON DELETE RESTRICT,
    
    quantidade NUMERIC(12, 3) NOT NULL CHECK (quantidade > 0),
    preco_tabela NUMERIC(12, 2) NOT NULL CHECK (preco_tabela >= 0),
    
    -- Classificação da Cobertura
    item_coberto_plano BOOLEAN NOT NULL DEFAULT FALSE,
    valor_coberto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (valor_coberto >= 0),
    valor_particular NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (valor_particular >= 0),
    
    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (desconto >= 0),
    subtotal_cliente NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_cliente >= 0),
    observacao TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento ON public.orcamento_funerario_itens(tenant_id, orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_produto ON public.orcamento_funerario_itens(tenant_id, produto_id);

-- =========================================================================
-- 3. FUNÇÕES TRANSACIONAIS DO ORÇAMENTO (SECURITY DEFINER)
-- =========================================================================

-- 3.1 Criar ou Atualizar Rascunho de Orçamento com Verificação de Carência e Cobertura
CREATE OR REPLACE FUNCTION public.criar_orcamento_funerario(
    p_atendimento_id UUID DEFAULT NULL,
    p_cliente_id UUID DEFAULT NULL,
    p_contrato_id UUID DEFAULT NULL,
    p_itens JSONB DEFAULT '[]'::jsonb,
    p_desconto_valor NUMERIC(12, 2) DEFAULT 0.00,
    p_desconto_motivo TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_id UUID;
    v_uid UUID;
    v_orcamento_id UUID;
    v_contrato RECORD;
    v_plano RECORD;
    v_dias_desde_adesao INTEGER := NULL;
    v_em_carencia BOOLEAN := FALSE;
    v_tem_cobertura BOOLEAN := FALSE;
    v_plano_nome TEXT := NULL;
    v_dias_carencia INTEGER := 0;
    
    v_item RECORD;
    v_prod RECORD;
    v_subtotal_item NUMERIC(12, 2);
    v_valor_coberto_item NUMERIC(12, 2);
    v_valor_particular_item NUMERIC(12, 2);
    
    v_tot_bruto NUMERIC(12, 2) := 0.00;
    v_tot_coberto NUMERIC(12, 2) := 0.00;
    v_tot_particular NUMERIC(12, 2) := 0.00;
    v_tot_desconto NUMERIC(12, 2) := COALESCE(p_desconto_valor, 0.00);
    v_tot_liquido NUMERIC(12, 2);
BEGIN
    v_tenant_id := public.current_tenant_id();
    v_uid := public.current_auth_uid();

    IF v_tenant_id IS NULL OR v_uid IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Sessão ou Tenant não autenticado.' USING ERRCODE = '42501';
    END IF;

    -- Idempotência
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_orcamento_id FROM public.orcamentos_funerarios
        WHERE tenant_id = v_tenant_id AND idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN json_build_object('orcamento_id', v_orcamento_id, 'status', 'EXISTING')::jsonb;
        END IF;
    END IF;

    -- Análise Contratual e de Plano
    IF p_contrato_id IS NOT NULL THEN
        SELECT c.*, p.nome as plano_nome, p.dias_carencia, p.cobertura_basica
        INTO v_contrato
        FROM public.contratos c
        LEFT JOIN public.planos p ON c.plano_id = p.id
        WHERE c.id = p_contrato_id AND c.tenant_id = v_tenant_id;

        IF FOUND THEN
            v_tem_cobertura := (v_contrato.status = 'Ativo');
            v_plano_nome := v_contrato.plano_nome;
            v_dias_carencia := COALESCE(v_contrato.dias_carencia, 0);
            v_dias_desde_adesao := CURRENT_DATE - v_contrato.data_adesao;
            
            IF v_dias_desde_adesao < v_dias_carencia THEN
                v_em_carencia := TRUE;
                -- Contrato em carência não cobre itens automaticamente
                v_tem_cobertura := FALSE;
            END IF;
        END IF;
    END IF;

    -- Validação de Desconto: se > 0 exige autorização de supervisor (ou operador deve ter permissão)
    IF v_tot_desconto > 0 AND NOT public.can_manage_catalogo() THEN
        RAISE EXCEPTION 'Desconto em orçamento funerário requer autorização gerencial.' USING ERRCODE = 'P0001';
    END IF;

    -- Criação do Orçamento em estado RASCUNHO
    INSERT INTO public.orcamentos_funerarios (
        tenant_id, atendimento_id, cliente_id, contrato_id,
        status, tem_cobertura_plano, plano_nome, dias_carencia_plano,
        dias_desde_adesao, em_carencia, total_bruto, total_coberto,
        total_adicional_particular, total_desconto, total_liquido_cliente,
        desconto_autorizado_por, desconto_motivo, observacoes, idempotency_key
    ) VALUES (
        v_tenant_id, p_atendimento_id, p_cliente_id, p_contrato_id,
        'RASCUNHO', v_tem_cobertura, v_plano_nome, v_dias_carencia,
        v_dias_desde_adesao, v_em_carencia, 0.00, 0.00,
        0.00, v_tot_desconto, 0.00,
        CASE WHEN v_tot_desconto > 0 THEN v_uid ELSE NULL END, p_desconto_motivo,
        p_observacoes, p_idempotency_key
    ) RETURNING id INTO v_orcamento_id;

    -- Processamento dos Itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(
        produto_id UUID,
        quantidade NUMERIC,
        item_coberto_plano BOOLEAN,
        desconto NUMERIC,
        observacao TEXT
    )
    LOOP
        SELECT * INTO v_prod FROM public.produtos_servicos
        WHERE id = v_item.produto_id AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item de catálogo não encontrado: %', v_item.produto_id USING ERRCODE = 'P0001';
        END IF;

        IF v_item.quantidade <= 0 THEN
            RAISE EXCEPTION 'Quantidade de % deve ser maior que zero.', v_prod.nome USING ERRCODE = 'P0001';
        END IF;

        v_subtotal_item := ROUND(v_item.quantidade * v_prod.preco_venda, 2);
        v_tot_bruto := v_tot_bruto + v_subtotal_item;

        -- Se o item foi marcado como coberto e o contrato tem cobertura sem carência
        IF COALESCE(v_item.item_coberto_plano, false) AND v_tem_cobertura AND NOT v_em_carencia THEN
            v_valor_coberto_item := v_subtotal_item;
            v_valor_particular_item := 0.00;
        ELSE
            v_valor_coberto_item := 0.00;
            v_valor_particular_item := v_subtotal_item;
        END IF;

        v_tot_coberto := v_tot_coberto + v_valor_coberto_item;
        v_tot_particular := v_tot_particular + v_valor_particular_item;

        INSERT INTO public.orcamento_funerario_itens (
            tenant_id, orcamento_id, produto_id, quantidade,
            preco_tabela, item_coberto_plano, valor_coberto,
            valor_particular, desconto, subtotal_cliente, observacao
        ) VALUES (
            v_tenant_id, v_orcamento_id, v_prod.id, v_item.quantidade,
            v_prod.preco_venda, (v_valor_coberto_item > 0), v_valor_coberto_item,
            v_valor_particular_item, COALESCE(v_item.desconto, 0.00),
            GREATEST(0.00, v_valor_particular_item - COALESCE(v_item.desconto, 0.00)),
            v_item.observacao
        );
    END LOOP;

    v_tot_liquido := GREATEST(0.00, v_tot_particular - v_tot_desconto);

    -- Atualiza totais consolidados no cabeçalho
    UPDATE public.orcamentos_funerarios
    SET total_bruto = v_tot_bruto,
        total_coberto = v_tot_coberto,
        total_adicional_particular = v_tot_particular,
        total_liquido_cliente = v_tot_liquido,
        updated_at = NOW()
    WHERE id = v_orcamento_id;

    RETURN json_build_object(
        'orcamento_id', v_orcamento_id,
        'status', 'RASCUNHO',
        'tem_cobertura_plano', v_tem_cobertura,
        'em_carencia', v_em_carencia,
        'dias_carencia', v_dias_carencia,
        'dias_desde_adesao', v_dias_desde_adesao,
        'total_bruto', v_tot_bruto,
        'total_coberto', v_tot_coberto,
        'total_particular', v_tot_particular,
        'total_desconto', v_tot_desconto,
        'total_liquido_cliente', v_tot_liquido
    )::jsonb;
END;
$$;

-- 3.2 Enviar Orçamento para Aceite Presencial ou Link Remoto
CREATE OR REPLACE FUNCTION public.enviar_orcamento_funerario(
    p_orcamento_id UUID,
    p_tipo_aceite TEXT DEFAULT 'PRESENCIAL',
    p_responsavel_nome TEXT DEFAULT NULL,
    p_responsavel_documento TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orc RECORD;
    v_token TEXT;
BEGIN
    SELECT * INTO v_orc FROM public.orcamentos_funerarios
    WHERE id = p_orcamento_id AND tenant_id = public.current_tenant_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Orçamento funerário não encontrado.' USING ERRCODE = 'P0001';
    END IF;

    IF v_orc.status NOT IN ('RASCUNHO', 'ENVIADO') THEN
        RAISE EXCEPTION 'Apenas orçamentos em RASCUNHO ou ENVIADO podem ser enviados (status atual: %)', v_orc.status USING ERRCODE = 'P0001';
    END IF;

    -- Geração de token único sem dependência de extensões externas (utilizando gen_random_uuid nativo)
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

    UPDATE public.orcamentos_funerarios
    SET status = 'ENVIADO',
        tipo_aceite = p_tipo_aceite,
        responsavel_aceite_nome = p_responsavel_nome,
        responsavel_aceite_documento = p_responsavel_documento,
        token_assinatura_remota = v_token,
        data_envio = NOW(),
        updated_at = NOW()
    WHERE id = p_orcamento_id;

    RETURN json_build_object(
        'orcamento_id', p_orcamento_id,
        'status', 'ENVIADO',
        'token_assinatura', v_token,
        'tipo_aceite', p_tipo_aceite
    )::jsonb;
END;
$$;

-- 3.3 Aprovação com Snapshot Imutável de Itens, Preços e Condições
CREATE OR REPLACE FUNCTION public.aprovar_orcamento_funerario(
    p_orcamento_id UUID,
    p_responsavel_aceite_nome TEXT,
    p_responsavel_aceite_documento TEXT,
    p_tipo_aceite TEXT DEFAULT 'PRESENCIAL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orc RECORD;
    v_itens_snapshot JSONB;
    v_snapshot_completo JSONB;
    v_uid UUID;
BEGIN
    v_uid := public.current_auth_uid();

    SELECT * INTO v_orc FROM public.orcamentos_funerarios
    WHERE id = p_orcamento_id AND tenant_id = public.current_tenant_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Orçamento não encontrado.' USING ERRCODE = 'P0001';
    END IF;

    IF v_orc.status = 'APROVADO' THEN
        RETURN json_build_object('success', true, 'message', 'Orçamento já se encontra aprovado.')::jsonb;
    END IF;

    IF v_orc.status NOT IN ('RASCUNHO', 'ENVIADO') THEN
        RAISE EXCEPTION 'Orçamento em estado % não pode ser aprovado.', v_orc.status USING ERRCODE = 'P0001';
    END IF;

    -- Constrói o snapshot dos itens com nomes e valores no instante da aprovação
    SELECT jsonb_agg(
        jsonb_build_object(
            'produto_id', i.produto_id,
            'produto_nome', p.nome,
            'quantidade', i.quantidade,
            'preco_tabela', i.preco_tabela,
            'item_coberto_plano', i.item_coberto_plano,
            'valor_coberto', i.valor_coberto,
            'valor_particular', i.valor_particular,
            'desconto', i.desconto,
            'subtotal_cliente', i.subtotal_cliente,
            'observacao', i.observacao
        )
    ) INTO v_itens_snapshot
    FROM public.orcamento_funerario_itens i
    JOIN public.produtos_servicos p ON i.produto_id = p.id
    WHERE i.orcamento_id = p_orcamento_id;

    -- Snapshot completo e auditável
    v_snapshot_completo := jsonb_build_object(
        'data_aprovacao', NOW(),
        'aprovado_por_uid', v_uid,
        'responsavel_aceite_nome', p_responsavel_aceite_nome,
        'responsavel_aceite_documento', p_responsavel_aceite_documento,
        'tipo_aceite', p_tipo_aceite,
        'plano_nome', v_orc.plano_nome,
        'tem_cobertura_plano', v_orc.tem_cobertura_plano,
        'em_carencia', v_orc.em_carencia,
        'total_bruto', v_orc.total_bruto,
        'total_coberto', v_orc.total_coberto,
        'total_adicional_particular', v_orc.total_adicional_particular,
        'total_desconto', v_orc.total_desconto,
        'total_liquido_cliente', v_orc.total_liquido_cliente,
        'itens', v_itens_snapshot
    );

    UPDATE public.orcamentos_funerarios
    SET status = 'APROVADO',
        responsavel_aceite_nome = p_responsavel_aceite_nome,
        responsavel_aceite_documento = p_responsavel_aceite_documento,
        tipo_aceite = p_tipo_aceite,
        aprovado_por = v_uid,
        data_aprovacao = NOW(),
        snapshot_aprovacao = v_snapshot_completo,
        updated_at = NOW()
    WHERE id = p_orcamento_id;

    RETURN json_build_object(
        'success', true,
        'orcamento_id', p_orcamento_id,
        'status', 'APROVADO',
        'total_liquido_cliente', v_orc.total_liquido_cliente,
        'data_aprovacao', NOW()
    )::jsonb;
END;
$$;

-- 3.4 Rejeitar ou Cancelar Orçamento Funerário
CREATE OR REPLACE FUNCTION public.rejeitar_cancelar_orcamento_funerario(
    p_orcamento_id UUID,
    p_novo_status TEXT,
    p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orc RECORD;
BEGIN
    IF p_novo_status NOT IN ('REJEITADO', 'CANCELADO') THEN
        RAISE EXCEPTION 'Novo status deve ser REJEITADO ou CANCELADO.' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_orc FROM public.orcamentos_funerarios
    WHERE id = p_orcamento_id AND tenant_id = public.current_tenant_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Orçamento não encontrado.' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orcamentos_funerarios
    SET status = p_novo_status,
        motivo_rejeicao_cancelamento = p_motivo,
        data_rejeicao_cancelamento = NOW(),
        updated_at = NOW()
    WHERE id = p_orcamento_id;

    RETURN json_build_object(
        'success', true,
        'orcamento_id', p_orcamento_id,
        'status', p_novo_status,
        'motivo', p_motivo
    )::jsonb;
END;
$$;

-- Concessão de permissões de execução
REVOKE EXECUTE ON FUNCTION public.criar_orcamento_funerario(UUID, UUID, UUID, JSONB, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_orcamento_funerario(UUID, UUID, UUID, JSONB, NUMERIC, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.enviar_orcamento_funerario(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_orcamento_funerario(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.aprovar_orcamento_funerario(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aprovar_orcamento_funerario(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.rejeitar_cancelar_orcamento_funerario(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rejeitar_cancelar_orcamento_funerario(UUID, TEXT, TEXT) TO authenticated, service_role;

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) E POLÍTICAS RBAC
-- =========================================================================

ALTER TABLE public.orcamentos_funerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_funerario_itens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orcamentos_funerarios FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_funerario_itens FORCE ROW LEVEL SECURITY;

-- 4.1 orcamentos_funerarios
DROP POLICY IF EXISTS select_orcamentos_funerarios ON public.orcamentos_funerarios;
CREATE POLICY select_orcamentos_funerarios ON public.orcamentos_funerarios
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS insert_orcamentos_funerarios ON public.orcamentos_funerarios;
CREATE POLICY insert_orcamentos_funerarios ON public.orcamentos_funerarios
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS update_orcamentos_funerarios ON public.orcamentos_funerarios;
CREATE POLICY update_orcamentos_funerarios ON public.orcamentos_funerarios
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.2 orcamento_funerario_itens
DROP POLICY IF EXISTS select_orcamento_funerario_itens ON public.orcamento_funerario_itens;
CREATE POLICY select_orcamento_funerario_itens ON public.orcamento_funerario_itens
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS insert_orcamento_funerario_itens ON public.orcamento_funerario_itens;
CREATE POLICY insert_orcamento_funerario_itens ON public.orcamento_funerario_itens
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS update_orcamento_funerario_itens ON public.orcamento_funerario_itens;
CREATE POLICY update_orcamento_funerario_itens ON public.orcamento_funerario_itens
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- Imutabilidade pós-aprovação garantida por Trigger: Não permite alteração de itens se já aprovado
CREATE OR REPLACE FUNCTION public.fn_orcamento_itens_bloqueio_aprovado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.orcamentos_funerarios WHERE id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
    IF v_status = 'APROVADO' THEN
        RAISE EXCEPTION 'IMUTABILIDADE: Não é permitido modificar itens de um orçamento funerário já APROVADO.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orcamento_itens_bloqueio_aprovado ON public.orcamento_funerario_itens;
CREATE TRIGGER trg_orcamento_itens_bloqueio_aprovado
    BEFORE INSERT OR UPDATE OR DELETE ON public.orcamento_funerario_itens
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_orcamento_itens_bloqueio_aprovado();

COMMIT;
