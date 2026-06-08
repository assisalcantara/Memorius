-- 1. Create saas_plans table
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_mensal NUMERIC(10, 2),
    valor_anual NUMERIC(10, 2),
    limite_usuarios INTEGER,
    limite_clientes INTEGER,
    limite_contratos INTEGER,
    limite_storage_mb INTEGER,
    trial_dias INTEGER,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    destaque BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on saas_plans
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for saas_plans (SUPER_ADMIN only for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS saas_plans_all_policy ON public.saas_plans;
CREATE POLICY saas_plans_all_policy ON public.saas_plans
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Create trigger updated_at
DROP TRIGGER IF EXISTS on_saas_plans_update ON public.saas_plans;
CREATE TRIGGER on_saas_plans_update
    BEFORE UPDATE ON public.saas_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
