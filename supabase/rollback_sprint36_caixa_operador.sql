-- =========================================================================
-- Rollback Sprint 36: PDV — Fase 2: Caixa por Operador e Fechamento Cego
-- =========================================================================

BEGIN;

-- 1. Drop das Políticas RLS
DROP POLICY IF EXISTS delete_caixa_movimentacoes ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS update_caixa_movimentacoes ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS insert_caixa_movimentacoes ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS select_caixa_movimentacoes ON public.caixa_movimentacoes;

DROP POLICY IF EXISTS update_caixa_turnos ON public.caixa_turnos;
DROP POLICY IF EXISTS insert_caixa_turnos ON public.caixa_turnos;
DROP POLICY IF EXISTS select_caixa_turnos ON public.caixa_turnos;

DROP POLICY IF EXISTS update_caixas_fisicos ON public.caixas_fisicos;
DROP POLICY IF EXISTS insert_caixas_fisicos ON public.caixas_fisicos;
DROP POLICY IF EXISTS select_caixas_fisicos ON public.caixas_fisicos;

-- 2. Drop dos Triggers e Funções
DROP TRIGGER IF EXISTS trg_validar_caixa_movimentacao ON public.caixa_movimentacoes;
DROP FUNCTION IF EXISTS public.validar_caixa_movimentacao();

DROP FUNCTION IF EXISTS public.aprovar_conciliacao_caixa(UUID, TEXT);
DROP FUNCTION IF EXISTS public.fechar_turno_caixa_cego(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.lancar_caixa_movimentacao(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.abrir_turno_caixa(UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.get_caixa_saldo_dinheiro(UUID);

-- 3. Drop das Tabelas
DROP TABLE IF EXISTS public.caixa_movimentacoes CASCADE;
DROP TABLE IF EXISTS public.caixa_turnos CASCADE;
DROP TABLE IF EXISTS public.caixas_fisicos CASCADE;

COMMIT;
