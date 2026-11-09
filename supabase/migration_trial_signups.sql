-- =========================================================================
-- MIGRATION: trial_signups (Fluxo de Teste Grátis 7 Dias com Verificação)
-- PROJETO: MEMORIUS — REVISADA E AUDITADA
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.trial_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    plano_slug TEXT NOT NULL,
    plano_saas_id UUID REFERENCES public.saas_plans(id) ON DELETE SET NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVATED', 'EXPIRED')),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    ip_address TEXT,
    resend_count INTEGER NOT NULL DEFAULT 0,
    last_resend_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);

-- Índices otimizados para busca de token_hash, status e e-mail
CREATE INDEX IF NOT EXISTS idx_trial_signups_token_hash ON public.trial_signups(token_hash);
CREATE INDEX IF NOT EXISTS idx_trial_signups_email ON public.trial_signups(email);
CREATE INDEX IF NOT EXISTS idx_trial_signups_status ON public.trial_signups(status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.trial_signups ENABLE ROW LEVEL SECURITY;

-- 1. Acesso total exclusivo para service_role (operações exclusivas de backend)
DROP POLICY IF EXISTS trial_signups_service_role_policy ON public.trial_signups;
CREATE POLICY trial_signups_service_role_policy ON public.trial_signups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Leitura para SUPER_ADMIN autenticado (usando helper verificado public.is_super_admin())
DROP POLICY IF EXISTS trial_signups_super_admin_select ON public.trial_signups;
CREATE POLICY trial_signups_super_admin_select ON public.trial_signups
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
