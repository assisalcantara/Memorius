-- =========================================================================
-- CORREÇÃO INCREMENTAL SPRINT 36: IMUTABILIDADE ABSOLUTA DE CAIXA_MOVIMENTACOES
-- Idempotente e segura: não recria tabelas nem apaga dados.
-- =========================================================================

-- 1. Revoga privilégios diretos de DML destrutivo para a role authenticated
REVOKE UPDATE, DELETE ON public.caixa_movimentacoes FROM authenticated;

-- 2. Substitui as policies de UPDATE e DELETE por bloqueio incondicional (USING (false))
DROP POLICY IF EXISTS update_caixa_movimentacoes ON public.caixa_movimentacoes;
CREATE POLICY update_caixa_movimentacoes ON public.caixa_movimentacoes
    FOR UPDATE TO authenticated
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS delete_caixa_movimentacoes ON public.caixa_movimentacoes;
CREATE POLICY delete_caixa_movimentacoes ON public.caixa_movimentacoes
    FOR DELETE TO authenticated
    USING (false);

-- 3. Trigger de proteção em profundidade: rejeita qualquer UPDATE ou DELETE com P0001
CREATE OR REPLACE FUNCTION public.fn_caixa_movimentacoes_imutavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'IMUTABILIDADE CONTÁBIL: Movimentações financeiras de caixa não podem ser alteradas ou excluídas.'
        USING ERRCODE = 'P0001';
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_caixa_movimentacoes_imutavel ON public.caixa_movimentacoes;
CREATE TRIGGER trg_caixa_movimentacoes_imutavel
    BEFORE UPDATE OR DELETE ON public.caixa_movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_caixa_movimentacoes_imutavel();
