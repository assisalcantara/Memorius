-- =========================================================================
-- Rollback — Sprint Comercial 06.1 — Enforcement dos Limites Comerciais
-- =========================================================================

BEGIN;

-- 1. Remover Triggers
DROP TRIGGER IF EXISTS trg_enforce_limit_clientes ON public.clientes;
DROP TRIGGER IF EXISTS trg_enforce_limit_contratos ON public.contratos;
DROP TRIGGER IF EXISTS trg_enforce_limit_profiles ON public.profiles;

-- 2. Remover Funções de Enforcement
DROP FUNCTION IF EXISTS public.enforce_tenant_resource_limits();
DROP FUNCTION IF EXISTS public.get_tenant_plan_limit(TEXT, UUID);

COMMIT;
