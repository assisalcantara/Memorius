-- =========================================================================
-- ROLLBACK SPRINT 38: ORÇAMENTOS FUNERÁRIOS INTEGRADOS
-- =========================================================================

BEGIN;

-- 1. Remoção de Triggers e Funções
DROP TRIGGER IF EXISTS trg_orcamento_itens_bloqueio_aprovado ON public.orcamento_funerario_itens;
DROP FUNCTION IF EXISTS public.fn_orcamento_itens_bloqueio_aprovado();

DROP FUNCTION IF EXISTS public.rejeitar_cancelar_orcamento_funerario(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.aprovar_orcamento_funerario(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.enviar_orcamento_funerario(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.criar_orcamento_funerario(UUID, UUID, UUID, JSONB, NUMERIC, TEXT, TEXT, TEXT);

-- 2. Remoção de Tabelas
DROP TABLE IF EXISTS public.orcamento_funerario_itens CASCADE;
DROP TABLE IF EXISTS public.orcamentos_funerarios CASCADE;

COMMIT;
