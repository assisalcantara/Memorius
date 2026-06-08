-- 1. Create tenant_subscriptions table
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    saas_plan_id UUID NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('ATIVO', 'TRIAL', 'SUSPENSO', 'CANCELADO')),
    ciclo TEXT NOT NULL DEFAULT 'MENSAL' CHECK (ciclo IN ('MENSAL', 'ANUAL')),
    valor NUMERIC(10, 2) NOT NULL,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    data_cancelamento DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on tenant_subscriptions
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for tenant_subscriptions (SUPER_ADMIN only for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS tenant_subscriptions_all_policy ON public.tenant_subscriptions;
CREATE POLICY tenant_subscriptions_all_policy ON public.tenant_subscriptions
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Create trigger updated_at
DROP TRIGGER IF EXISTS on_tenant_subscriptions_update ON public.tenant_subscriptions;
CREATE TRIGGER on_tenant_subscriptions_update
    BEFORE UPDATE ON public.tenant_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
