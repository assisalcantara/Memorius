-- 1. Create contract_templates table
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- 3. Create helper function to check if the authenticated user is a tenant ADMIN
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT r.nome INTO v_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();
  RETURN (COALESCE(v_role_name, '') = 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create RLS Policies
-- SELECT: Authenticated users belonging to the same tenant
DROP POLICY IF EXISTS select_contract_templates ON public.contract_templates;
CREATE POLICY select_contract_templates ON public.contract_templates
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());

-- INSERT: Authenticated users of the same tenant with role ADMIN
DROP POLICY IF EXISTS insert_contract_templates ON public.contract_templates;
CREATE POLICY insert_contract_templates ON public.contract_templates
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_tenant_admin());

-- UPDATE: Authenticated users of the same tenant with role ADMIN
DROP POLICY IF EXISTS update_contract_templates ON public.contract_templates;
CREATE POLICY update_contract_templates ON public.contract_templates
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id() AND public.is_tenant_admin())
    WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_tenant_admin());

-- DELETE: Authenticated users of the same tenant with role ADMIN
DROP POLICY IF EXISTS delete_contract_templates ON public.contract_templates;
CREATE POLICY delete_contract_templates ON public.contract_templates
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_tenant_id() AND public.is_tenant_admin());

-- 5. Create Trigger to auto-update updated_at column
DROP TRIGGER IF EXISTS on_contract_templates_update ON public.contract_templates;
CREATE TRIGGER on_contract_templates_update
    BEFORE UPDATE ON public.contract_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
