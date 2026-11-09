-- =========================================================================
-- PATCH INCREMENTAL SPRINT 38: CORREÇÃO DE TOKEN EM ENVIAR_ORCAMENTO_FUNERARIO
-- Substitui gen_random_bytes(24) por geração segura com gen_random_uuid() nativo do PostgreSQL.
-- Seguro, idempotente e sem recriar tabelas.
-- =========================================================================

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

    -- Token hexadecimal seguro gerado via gen_random_uuid nativo (64 caracteres)
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

REVOKE EXECUTE ON FUNCTION public.enviar_orcamento_funerario(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_orcamento_funerario(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
