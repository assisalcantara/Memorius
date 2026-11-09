-- =========================================================================
-- MIGRATION SPRINT 37: VENDAS E PAGAMENTOS DO PDV (FASE 3 PDV)
-- 
-- Arquitetura Transacional do PDV:
-- 1. pdv_vendas: Venda vinculada a tenant, turno, operador e cliente opcional.
-- 2. pdv_venda_itens: Itens da venda vinculados ao catálogo (Sprint 35) com controle de descontos.
-- 3. pdv_pagamentos: Pagamentos fracionados/mistos (DINHEIRO, PIX, CARTAO_DEBITO, CARTAO_CREDITO, etc.)
-- 4. Funções RPC com SECURITY DEFINER e concorrência segura (FOR UPDATE):
--    - criar_pdv_venda: Criação da venda com validação de itens, cálculo de totais e descontos.
--    - adicionar_pagamento_pdv: Registra pagamento, sincroniza com Caixa (Sprint 36) e ASAAS.
--    - confirmar_pagamento_pdv: Confirmação de recebimento (imediata para dinheiro ou via webhook para gateway).
--    - finalizar_pdv_venda: Verifica quitação integral, dá baixa no estoque (Sprint 35) e liquida venda.
--    - cancelar_estornar_pdv_venda: Cancelamento/estorno com autorização gerencial, estorno de caixa e devolução ao estoque.
-- 5. RLS, RBAC, auditoria e blindagem multi-tenant rigorosa.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. TABELA DE VENDAS DO PDV (pdv_vendas)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.pdv_vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    turno_id UUID NOT NULL REFERENCES public.caixa_turnos(id) ON DELETE RESTRICT,
    caixa_id UUID NOT NULL REFERENCES public.caixas_fisicos(id) ON DELETE RESTRICT,
    operador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    
    numero_venda BIGINT GENERATED ALWAYS AS IDENTITY,
    status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'AGUARDANDO_PAGAMENTO', 'CONCLUIDA', 'CANCELADA')),
    
    -- Totais Financeiros
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    desconto_valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (desconto_valor >= 0),
    desconto_percentual NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
    desconto_autorizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    desconto_motivo TEXT,
    
    total_liquido NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_liquido >= 0),
    total_pago NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_pago >= 0),
    troco NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (troco >= 0),
    
    -- Controle de Estoque
    estoque_baixado BOOLEAN NOT NULL DEFAULT FALSE,
    data_finalizacao TIMESTAMPTZ,
    
    -- Cancelamento / Estorno
    cancelado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cancelado_em TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    
    observacoes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT uq_pdv_vendas_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_pdv_vendas_tenant_status ON public.pdv_vendas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pdv_vendas_turno ON public.pdv_vendas(tenant_id, turno_id);
CREATE INDEX IF NOT EXISTS idx_pdv_vendas_data ON public.pdv_vendas(tenant_id, created_at DESC);

-- =========================================================================
-- 2. TABELA DE ITENS DA VENDA (pdv_venda_itens)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.pdv_venda_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    venda_id UUID NOT NULL REFERENCES public.pdv_vendas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos_servicos(id) ON DELETE RESTRICT,
    
    quantidade NUMERIC(12, 3) NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(12, 2) NOT NULL CHECK (preco_unitario >= 0),
    custo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (desconto >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_itens_venda ON public.pdv_venda_itens(tenant_id, venda_id);
CREATE INDEX IF NOT EXISTS idx_pdv_venda_itens_produto ON public.pdv_venda_itens(tenant_id, produto_id);

-- =========================================================================
-- 3. TABELA DE PAGAMENTOS DA VENDA (pdv_pagamentos)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.pdv_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    venda_id UUID NOT NULL REFERENCES public.pdv_vendas(id) ON DELETE CASCADE,
    
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'OUTROS')),
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    valor_recebido NUMERIC(12, 2) CHECK (valor_recebido >= valor), -- para troco em dinheiro
    troco NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (troco >= 0),
    
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ESTORNADO')),
    
    -- Integração Gateway (ASAAS)
    gateway_provider TEXT DEFAULT 'ASAAS',
    gateway_payment_id TEXT,
    gateway_status TEXT,
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    
    -- Rastreabilidade com Caixa (Sprint 36)
    caixa_movimentacao_id UUID REFERENCES public.caixa_movimentacoes(id) ON DELETE SET NULL,
    
    data_confirmacao TIMESTAMPTZ,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT uq_pdv_pagamento_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_pdv_pagamentos_venda ON public.pdv_pagamentos(tenant_id, venda_id);
CREATE INDEX IF NOT EXISTS idx_pdv_pagamentos_gateway ON public.pdv_pagamentos(tenant_id, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_pdv_pagamentos_status ON public.pdv_pagamentos(tenant_id, status);

-- =========================================================================
-- 4. FUNÇÕES TRANSACIONAIS DO PDV (SECURITY DEFINER)
-- =========================================================================

-- 4.1 Criar Venda Completa com Itens
CREATE OR REPLACE FUNCTION public.criar_pdv_venda(
    p_turno_id UUID,
    p_cliente_id UUID,
    p_itens JSONB,
    p_desconto_valor NUMERIC(12, 2) DEFAULT 0.00,
    p_desconto_autorizado_por UUID DEFAULT NULL,
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
    v_operador_id UUID;
    v_caixa_id UUID;
    v_turno_status TEXT;
    v_venda_id UUID;
    v_item RECORD;
    v_prod RECORD;
    v_subtotal NUMERIC(12, 2) := 0.00;
    v_item_subtotal NUMERIC(12, 2);
    v_total_liquido NUMERIC(12, 2);
    v_desconto NUMERIC(12, 2) := COALESCE(p_desconto_valor, 0.00);
BEGIN
    v_tenant_id := public.current_tenant_id();
    v_operador_id := public.current_auth_uid();

    IF v_tenant_id IS NULL OR v_operador_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário ou Tenant não identificado.' USING ERRCODE = '42501';
    END IF;

    -- 1. Idempotência
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_venda_id FROM public.pdv_vendas 
        WHERE tenant_id = v_tenant_id AND idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN json_build_object('venda_id', v_venda_id, 'status', 'EXISTING')::jsonb;
        END IF;
    END IF;

    -- 2. Validar Turno Aberto pertencente ao operador
    SELECT caixa_id, status INTO v_caixa_id, v_turno_status
    FROM public.caixa_turnos
    WHERE id = p_turno_id AND tenant_id = v_tenant_id AND operador_id = v_operador_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Turno não encontrado ou não pertence ao operador atual.' USING ERRCODE = 'P0001';
    END IF;

    IF v_turno_status <> 'ABERTO' THEN
        RAISE EXCEPTION 'Operação inválida: O turno não está ABERTO (status atual: %)', v_turno_status USING ERRCODE = 'P0001';
    END IF;

    -- 3. Validar Desconto: se houver desconto acima de 0, exige motivo e autorizador gerencial
    IF v_desconto > 0 THEN
        IF p_desconto_autorizado_por IS NULL THEN
            -- Se o próprio operador for ADMIN/GERENTE, autoriza a si mesmo
            IF NOT public.can_manage_catalogo() THEN
                RAISE EXCEPTION 'Desconto em venda requer autorização gerencial.' USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    -- 4. Cria cabeçalho da Venda
    INSERT INTO public.pdv_vendas (
        tenant_id, turno_id, caixa_id, operador_id, cliente_id,
        subtotal, desconto_valor, desconto_autorizado_por, desconto_motivo,
        total_liquido, total_pago, troco, status, observacoes, idempotency_key
    ) VALUES (
        v_tenant_id, p_turno_id, v_caixa_id, v_operador_id, p_cliente_id,
        0.00, v_desconto, p_desconto_autorizado_por, p_desconto_motivo,
        0.00, 0.00, 0.00, 'ABERTA', p_observacoes, p_idempotency_key
    ) RETURNING id INTO v_venda_id;

    -- 5. Inserir itens e calcular subtotal
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(
        produto_id UUID,
        quantidade NUMERIC,
        desconto NUMERIC
    )
    LOOP
        SELECT * INTO v_prod FROM public.produtos_servicos
        WHERE id = v_item.produto_id AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item do catálogo não encontrado: %', v_item.produto_id USING ERRCODE = 'P0001';
        END IF;

        IF v_prod.ativo = FALSE THEN
            RAISE EXCEPTION 'Item % está inativo no catálogo.', v_prod.nome USING ERRCODE = 'P0001';
        END IF;

        IF v_item.quantidade <= 0 THEN
            RAISE EXCEPTION 'Quantidade do item % deve ser maior que zero.', v_prod.nome USING ERRCODE = 'P0001';
        END IF;

        v_item_subtotal := ROUND((v_item.quantidade * v_prod.preco_venda) - COALESCE(v_item.desconto, 0.00), 2);
        IF v_item_subtotal < 0 THEN
            v_item_subtotal := 0.00;
        END IF;

        v_subtotal := v_subtotal + v_item_subtotal;

        INSERT INTO public.pdv_venda_itens (
            tenant_id, venda_id, produto_id, quantidade,
            preco_unitario, custo_unitario, desconto, subtotal
        ) VALUES (
            v_tenant_id, v_venda_id, v_prod.id, v_item.quantidade,
            v_prod.preco_venda, v_prod.custo_medio, COALESCE(v_item.desconto, 0.00), v_item_subtotal
        );
    END LOOP;

    v_total_liquido := GREATEST(0.00, v_subtotal - v_desconto);

    UPDATE public.pdv_vendas
    SET subtotal = v_subtotal,
        total_liquido = v_total_liquido,
        status = 'AGUARDANDO_PAGAMENTO',
        updated_at = NOW()
    WHERE id = v_venda_id;

    RETURN json_build_object(
        'venda_id', v_venda_id,
        'subtotal', v_subtotal,
        'desconto', v_desconto,
        'total_liquido', v_total_liquido,
        'status', 'AGUARDANDO_PAGAMENTO'
    )::jsonb;
END;
$$;

-- 4.2 Registrar e Confirmar Pagamento no PDV
CREATE OR REPLACE FUNCTION public.adicionar_pagamento_pdv(
    p_venda_id UUID,
    p_forma_pagamento TEXT,
    p_valor NUMERIC(12, 2),
    p_valor_recebido NUMERIC(12, 2) DEFAULT NULL,
    p_gateway_payment_id TEXT DEFAULT NULL,
    p_pix_qr_code TEXT DEFAULT NULL,
    p_pix_copy_paste TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_venda RECORD;
    v_pagamento_id UUID;
    v_troco NUMERIC(12, 2) := 0.00;
    v_status_pagamento TEXT;
    v_mov_caixa_id UUID := NULL;
    v_total_ja_pago NUMERIC(12, 2);
BEGIN
    SELECT * INTO v_venda FROM public.pdv_vendas
    WHERE id = p_venda_id AND tenant_id = public.current_tenant_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = 'P0001';
    END IF;

    IF v_venda.status NOT IN ('ABERTA', 'AGUARDANDO_PAGAMENTO') THEN
        RAISE EXCEPTION 'Venda já finalizada ou cancelada (status: %)', v_venda.status USING ERRCODE = 'P0001';
    END IF;

    IF p_valor <= 0 THEN
        RAISE EXCEPTION 'Valor do pagamento deve ser superior a zero.' USING ERRCODE = 'P0001';
    END IF;

    -- Se for em dinheiro, calcula troco se valor recebido for maior
    IF p_forma_pagamento = 'DINHEIRO' THEN
        IF p_valor_recebido IS NOT NULL AND p_valor_recebido > p_valor THEN
            v_troco := p_valor_recebido - p_valor;
        END IF;
        -- Dinheiro é confirmado imediatamente
        v_status_pagamento := 'CONFIRMADO';
    ELSE
        -- Demais formas podem ser confirmadas de imediato (cartão presencial) ou aguardar gateway
        IF p_gateway_payment_id IS NOT NULL THEN
            v_status_pagamento := 'PENDENTE';
        ELSE
            v_status_pagamento := 'CONFIRMADO';
        END IF;
    END IF;

    -- Idempotência
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_pagamento_id FROM public.pdv_pagamentos
        WHERE tenant_id = v_venda.tenant_id AND idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN json_build_object('pagamento_id', v_pagamento_id, 'status', 'EXISTING')::jsonb;
        END IF;
    END IF;

    -- Se pagamento for CONFIRMADO de imediato, lança no Caixa (Sprint 36)
    IF v_status_pagamento = 'CONFIRMADO' THEN
        v_mov_caixa_id := public.lancar_caixa_movimentacao(
            p_turno_id => v_venda.turno_id,
            p_tipo => 'VENDA',
            p_forma_pagamento => p_forma_pagamento,
            p_valor => p_valor,
            p_motivo => 'Recebimento de Venda PDV #' || v_venda.numero_venda,
            p_documento_ref => 'VD-' || v_venda.numero_venda,
            p_idempotency_key => 'MOV-PAG-' || gen_random_uuid()::text
        );
    END IF;

    INSERT INTO public.pdv_pagamentos (
        tenant_id, venda_id, forma_pagamento, valor, valor_recebido, troco,
        status, gateway_payment_id, pix_qr_code, pix_copy_paste,
        caixa_movimentacao_id, data_confirmacao, idempotency_key
    ) VALUES (
        v_venda.tenant_id, v_venda.id, p_forma_pagamento, p_valor, p_valor_recebido, v_troco,
        v_status_pagamento, p_gateway_payment_id, p_pix_qr_code, p_pix_copy_paste,
        v_mov_caixa_id, CASE WHEN v_status_pagamento = 'CONFIRMADO' THEN NOW() ELSE NULL END, p_idempotency_key
    ) RETURNING id INTO v_pagamento_id;

    -- Atualiza total pago na venda se confirmado
    IF v_status_pagamento = 'CONFIRMADO' THEN
        SELECT COALESCE(SUM(valor), 0.00) INTO v_total_ja_pago
        FROM public.pdv_pagamentos
        WHERE venda_id = v_venda.id AND status = 'CONFIRMADO';

        UPDATE public.pdv_vendas
        SET total_pago = v_total_ja_pago,
            troco = troco + v_troco,
            updated_at = NOW()
        WHERE id = v_venda.id;
    END IF;

    RETURN json_build_object(
        'pagamento_id', v_pagamento_id,
        'status', v_status_pagamento,
        'troco', v_troco,
        'caixa_movimentacao_id', v_mov_caixa_id
    )::jsonb;
END;
$$;

-- 4.3 Confirmação de Pagamento via Webhook / Gateway
CREATE OR REPLACE FUNCTION public.confirmar_pagamento_gateway_pdv(
    p_gateway_payment_id TEXT,
    p_gateway_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pagamento RECORD;
    v_venda RECORD;
    v_mov_caixa_id UUID;
    v_total_pago NUMERIC(12, 2);
BEGIN
    SELECT * INTO v_pagamento FROM public.pdv_pagamentos
    WHERE gateway_payment_id = p_gateway_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Pagamento não localizado')::jsonb;
    END IF;

    IF v_pagamento.status = 'CONFIRMADO' THEN
        RETURN json_build_object('success', true, 'message', 'Pagamento já estava confirmado')::jsonb;
    END IF;

    SELECT * INTO v_venda FROM public.pdv_vendas
    WHERE id = v_pagamento.venda_id
    FOR UPDATE;

    -- Lança no caixa se ainda não foi lançado
    IF v_pagamento.caixa_movimentacao_id IS NULL THEN
        v_mov_caixa_id := public.lancar_caixa_movimentacao(
            p_turno_id => v_venda.turno_id,
            p_tipo => 'VENDA',
            p_forma_pagamento => v_pagamento.forma_pagamento,
            p_valor => v_pagamento.valor,
            p_motivo => 'Recebimento Gateway PDV #' || v_venda.numero_venda || ' (' || v_pagamento.forma_pagamento || ')',
            p_documento_ref => 'GW-' || p_gateway_payment_id,
            p_idempotency_key => 'MOV-GW-' || p_gateway_payment_id
        );
    ELSE
        v_mov_caixa_id := v_pagamento.caixa_movimentacao_id;
    END IF;

    UPDATE public.pdv_pagamentos
    SET status = 'CONFIRMADO',
        gateway_status = p_gateway_status,
        caixa_movimentacao_id = v_mov_caixa_id,
        data_confirmacao = NOW(),
        updated_at = NOW()
    WHERE id = v_pagamento.id;

    -- Atualiza total pago da venda
    SELECT COALESCE(SUM(valor), 0.00) INTO v_total_pago
    FROM public.pdv_pagamentos
    WHERE venda_id = v_venda.id AND status = 'CONFIRMADO';

    UPDATE public.pdv_vendas
    SET total_pago = v_total_pago,
        updated_at = NOW()
    WHERE id = v_venda.id;

    RETURN json_build_object(
        'success', true,
        'pagamento_id', v_pagamento.id,
        'venda_id', v_venda.id,
        'total_pago', v_total_pago
    )::jsonb;
END;
$$;

-- 4.4 Finalizar Venda e Dar Baixa de Estoque (Atomicamente e uma única vez)
CREATE OR REPLACE FUNCTION public.finalizar_pdv_venda(p_venda_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_venda RECORD;
    v_item RECORD;
    v_total_confirmado NUMERIC(12, 2);
    v_idempotency_mov TEXT;
BEGIN
    SELECT * INTO v_venda FROM public.pdv_vendas
    WHERE id = p_venda_id AND tenant_id = public.current_tenant_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = 'P0001';
    END IF;

    IF v_venda.status = 'CONCLUIDA' THEN
        RETURN json_build_object('success', true, 'venda_id', v_venda.id, 'status', 'CONCLUIDA', 'message', 'Venda já concluída')::jsonb;
    END IF;

    IF v_venda.status = 'CANCELADA' THEN
        RAISE EXCEPTION 'Não é possível finalizar uma venda cancelada.' USING ERRCODE = 'P0001';
    END IF;

    -- Verifica total recebido
    SELECT COALESCE(SUM(valor), 0.00) INTO v_total_confirmado
    FROM public.pdv_pagamentos
    WHERE venda_id = v_venda.id AND status = 'CONFIRMADO';

    IF v_total_confirmado < v_venda.total_liquido THEN
        RAISE EXCEPTION 'Pagamento insuficiente. Total Líquido: R$ %, Total Confirmado: R$ %',
            v_venda.total_liquido, v_total_confirmado USING ERRCODE = 'P0001';
    END IF;

    -- Baixa de estoque dos itens (Sprint 35) - apenas se ainda não foi baixado
    IF v_venda.estoque_baixado = FALSE THEN
        FOR v_item IN SELECT * FROM public.pdv_venda_itens WHERE venda_id = v_venda.id
        LOOP
            v_idempotency_mov := 'BAIXA-VD-' || v_venda.id::text || '-' || v_item.id::text;
            
            INSERT INTO public.estoque_movimentacoes (
                tenant_id, produto_id, tipo_movimentacao, origem, quantidade,
                custo_unitario, valor_total, documento_ref, motivo, idempotency_key
            ) VALUES (
                v_venda.tenant_id, v_item.produto_id, 'SAIDA', 'VENDA_PDV', v_item.quantidade,
                v_item.custo_unitario, (v_item.quantidade * v_item.custo_unitario),
                'VD-' || v_venda.numero_venda,
                'Venda PDV #' || v_venda.numero_venda,
                v_idempotency_mov
            );
        END LOOP;
    END IF;

    UPDATE public.pdv_vendas
    SET status = 'CONCLUIDA',
        estoque_baixado = TRUE,
        data_finalizacao = NOW(),
        updated_at = NOW()
    WHERE id = v_venda.id;

    RETURN json_build_object(
        'success', true,
        'venda_id', v_venda.id,
        'numero_venda', v_venda.numero_venda,
        'status', 'CONCLUIDA'
    )::jsonb;
END;
$$;

-- 4.5 Cancelamento / Estorno com Autorização Gerencial e Movimentos Compensatórios
CREATE OR REPLACE FUNCTION public.cancelar_estornar_pdv_venda(
    p_venda_id UUID,
    p_motivo TEXT,
    p_autorizado_por UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_venda RECORD;
    v_item RECORD;
    v_pag RECORD;
    v_auth_user UUID;
    v_is_gerente BOOLEAN;
    v_idempotency_estorno TEXT;
BEGIN
    v_auth_user := public.current_auth_uid();
    v_is_gerente := public.can_manage_catalogo();

    -- Validação de perfil gerencial para cancelamento/estorno
    IF NOT v_is_gerente AND p_autorizado_por IS NULL THEN
        RAISE EXCEPTION 'Cancelamento ou estorno de venda exige perfil de ADMIN ou GERENTE.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_venda FROM public.pdv_vendas
    WHERE id = p_venda_id AND tenant_id = public.current_tenant_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = 'P0001';
    END IF;

    IF v_venda.status = 'CANCELADA' THEN
        RETURN json_build_object('success', true, 'message', 'Venda já estava cancelada.')::jsonb;
    END IF;

    -- 1. Se o estoque já havia sido baixado, realiza devolução compensatória (Sprint 35)
    IF v_venda.estoque_baixado = TRUE THEN
        FOR v_item IN SELECT * FROM public.pdv_venda_itens WHERE venda_id = v_venda.id
        LOOP
            v_idempotency_estorno := 'DEV-ESTORNO-VD-' || v_venda.id::text || '-' || v_item.id::text;
            
            INSERT INTO public.estoque_movimentacoes (
                tenant_id, produto_id, tipo_movimentacao, origem, quantidade,
                custo_unitario, valor_total, documento_ref, motivo, idempotency_key
            ) VALUES (
                v_venda.tenant_id, v_item.produto_id, 'DEVOLUCAO', 'CANCELAMENTO_PDV', v_item.quantidade,
                v_item.custo_unitario, (v_item.quantidade * v_item.custo_unitario),
                'ESTORNO-VD-' || v_venda.numero_venda,
                'Estorno de Venda PDV #' || v_venda.numero_venda || ': ' || COALESCE(p_motivo, 'Sem motivo'),
                v_idempotency_estorno
            );
        END LOOP;
    END IF;

    -- 2. Estorna movimentações financeiras de caixa associadas aos pagamentos confirmados
    FOR v_pag IN SELECT * FROM public.pdv_pagamentos WHERE venda_id = v_venda.id AND status = 'CONFIRMADO'
    LOOP
        -- Se foi dinheiro ou débito em terminal, gera sangria/estorno compensatório no caixa
        PERFORM public.lancar_caixa_movimentacao(
            p_turno_id => v_venda.turno_id,
            p_tipo => 'ESTORNO',
            p_forma_pagamento => v_pag.forma_pagamento,
            p_valor => v_pag.valor,
            p_motivo => 'Estorno Pagamento Venda PDV #' || v_venda.numero_venda,
            p_documento_ref => 'ESTORNO-PAG-' || v_pag.id::text,
            p_idempotency_key => 'MOV-ESTORNO-' || v_pag.id::text,
            p_autorizado_por => COALESCE(p_autorizado_por, v_auth_user)
        );

        UPDATE public.pdv_pagamentos
        SET status = 'ESTORNADO',
            updated_at = NOW()
        WHERE id = v_pag.id;
    END LOOP;

    -- 3. Atualiza status da venda para CANCELADA
    UPDATE public.pdv_vendas
    SET status = 'CANCELADA',
        cancelado_por = COALESCE(p_autorizado_por, v_auth_user),
        cancelado_em = NOW(),
        motivo_cancelamento = p_motivo,
        updated_at = NOW()
    WHERE id = v_venda.id;

    RETURN json_build_object(
        'success', true,
        'venda_id', v_venda.id,
        'status', 'CANCELADA',
        'motivo', p_motivo
    )::jsonb;
END;
$$;

-- Concessão de permissões de execução para as RPCs
REVOKE EXECUTE ON FUNCTION public.criar_pdv_venda(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_pdv_venda(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.adicionar_pagamento_pdv(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adicionar_pagamento_pdv(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.confirmar_pagamento_gateway_pdv(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_gateway_pdv(TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.finalizar_pdv_venda(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_pdv_venda(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancelar_estornar_pdv_venda(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_estornar_pdv_venda(UUID, TEXT, UUID) TO authenticated, service_role;

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) E POLÍTICAS RBAC
-- =========================================================================

ALTER TABLE public.pdv_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_pagamentos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pdv_vendas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_venda_itens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_pagamentos FORCE ROW LEVEL SECURITY;

-- 5.1 pdv_vendas
DROP POLICY IF EXISTS select_pdv_vendas ON public.pdv_vendas;
CREATE POLICY select_pdv_vendas ON public.pdv_vendas
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS insert_pdv_vendas ON public.pdv_vendas;
CREATE POLICY insert_pdv_vendas ON public.pdv_vendas
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS update_pdv_vendas ON public.pdv_vendas;
CREATE POLICY update_pdv_vendas ON public.pdv_vendas
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 5.2 pdv_venda_itens
DROP POLICY IF EXISTS select_pdv_venda_itens ON public.pdv_venda_itens;
CREATE POLICY select_pdv_venda_itens ON public.pdv_venda_itens
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS insert_pdv_venda_itens ON public.pdv_venda_itens;
CREATE POLICY insert_pdv_venda_itens ON public.pdv_venda_itens
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 5.3 pdv_pagamentos
DROP POLICY IF EXISTS select_pdv_pagamentos ON public.pdv_pagamentos;
CREATE POLICY select_pdv_pagamentos ON public.pdv_pagamentos
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS insert_pdv_pagamentos ON public.pdv_pagamentos;
CREATE POLICY insert_pdv_pagamentos ON public.pdv_pagamentos
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

DROP POLICY IF EXISTS update_pdv_pagamentos ON public.pdv_pagamentos;
CREATE POLICY update_pdv_pagamentos ON public.pdv_pagamentos
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- Imutabilidade contábil: Nenhuma linha de pagamento pode ser deletada
DROP POLICY IF EXISTS delete_pdv_pagamentos ON public.pdv_pagamentos;
CREATE POLICY delete_pdv_pagamentos ON public.pdv_pagamentos
    FOR DELETE TO authenticated
    USING (false);

COMMIT;
