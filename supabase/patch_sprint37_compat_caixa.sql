-- =========================================================================
-- PATCH INCREMENTAL 2 SPRINT 37: COMPATIBILIZAÇÃO EXATA DE ESTOQUE E CAIXA
-- Corrige a coluna "origem" nas funções finalizar_pdv_venda e cancelar_estornar_pdv_venda:
-- O check constraint de estoque_movimentacoes exige:
--   CHECK (origem IN ('MANUAL', 'COMPRA', 'PDV_VENDA', 'PDV_CANCELAMENTO', 'ATENDIMENTO_OS', 'INVENTARIO'))
-- Portanto:
--   - Finalização de venda usa: origem = 'PDV_VENDA'
--   - Cancelamento/estorno usa: origem = 'PDV_CANCELAMENTO'
-- =========================================================================

-- 1. Atualizar finalizar_pdv_venda com origem = 'PDV_VENDA'
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
            
            -- Origem corrigida exatamente conforme check constraint: 'PDV_VENDA'
            INSERT INTO public.estoque_movimentacoes (
                tenant_id, produto_id, tipo_movimentacao, origem, quantidade,
                custo_unitario, valor_total, documento_ref, motivo, idempotency_key
            ) VALUES (
                v_venda.tenant_id, v_item.produto_id, 'SAIDA', 'PDV_VENDA', v_item.quantidade,
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

-- 2. Atualizar cancelar_estornar_pdv_venda com origem = 'PDV_CANCELAMENTO'
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
    v_idempotency_caixa TEXT;
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
            
            -- Origem corrigida exatamente conforme check constraint: 'PDV_CANCELAMENTO'
            INSERT INTO public.estoque_movimentacoes (
                tenant_id, produto_id, tipo_movimentacao, origem, quantidade,
                custo_unitario, valor_total, documento_ref, motivo, idempotency_key
            ) VALUES (
                v_venda.tenant_id, v_item.produto_id, 'DEVOLUCAO', 'PDV_CANCELAMENTO', v_item.quantidade,
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
        v_idempotency_caixa := 'MOV-ESTORNO-' || v_pag.id::text;
        
        PERFORM public.lancar_caixa_movimentacao(
            p_turno_id => v_venda.turno_id,
            p_tipo => 'ESTORNO',
            p_forma_pagamento => v_pag.forma_pagamento,
            p_valor => v_pag.valor,
            p_motivo => 'Estorno Pagamento Venda PDV #' || v_venda.numero_venda,
            p_idempotency_key => v_idempotency_caixa,
            p_autorizador_id => COALESCE(p_autorizado_por, v_auth_user)
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

-- Concessão de permissões de execução
REVOKE EXECUTE ON FUNCTION public.finalizar_pdv_venda(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_pdv_venda(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancelar_estornar_pdv_venda(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_estornar_pdv_venda(UUID, TEXT, UUID) TO authenticated, service_role;
