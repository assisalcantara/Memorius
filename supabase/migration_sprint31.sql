-- 0. Ensure dependent tables exist
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO';

CREATE TABLE IF NOT EXISTS public.empresa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    razao_social TEXT,
    nome_fantasia TEXT,
    cnpj TEXT,
    telefone TEXT,
    celular TEXT,
    email TEXT,
    site TEXT,
    logradouro TEXT,
    numero TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    cep TEXT,
    logo_url TEXT,
    cor_primaria TEXT DEFAULT '#2f80ed',
    cor_secundaria TEXT DEFAULT '#27ae60',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    role_name TEXT,
    modulo TEXT NOT NULL,
    acao TEXT NOT NULL,
    registro_id TEXT,
    descricao TEXT,
    ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 1. Insert SUPER_ADMIN role
INSERT INTO public.roles (nome, descricao) 
VALUES ('SUPER_ADMIN', 'Administrador global da plataforma') 
ON CONFLICT (nome) DO NOTHING;

-- 2. Add status column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO';

-- 3. Create helper function is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Check if roles table exists and has entries, then find role name
  SELECT r.nome INTO v_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();
  
  RETURN (COALESCE(v_role_name, '') = 'SUPER_ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies for public.tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_tenants ON public.tenants;
CREATE POLICY select_tenants ON public.tenants
    FOR SELECT TO authenticated
    USING (id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS insert_tenants ON public.tenants;
CREATE POLICY insert_tenants ON public.tenants
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS update_tenants ON public.tenants;
CREATE POLICY update_tenants ON public.tenants
    FOR UPDATE TO authenticated
    USING (id = public.current_tenant_id() OR public.is_super_admin())
    WITH CHECK (id = public.current_tenant_id() OR public.is_super_admin());

-- 5. RLS Policies for public.profiles
DROP POLICY IF EXISTS select_profiles ON public.profiles;
CREATE POLICY select_profiles ON public.profiles
    FOR SELECT TO authenticated 
    USING (
        tenant_id = public.current_tenant_id()
        OR email = auth.jwt() ->> 'email'
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS insert_profiles ON public.profiles;
CREATE POLICY insert_profiles ON public.profiles
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS update_profiles ON public.profiles;
CREATE POLICY update_profiles ON public.profiles
    FOR UPDATE TO authenticated 
    USING (
        tenant_id = public.current_tenant_id()
        OR (status = 'CONVIDADO' AND email = auth.jwt() ->> 'email')
        OR public.is_super_admin()
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR (status = 'ATIVO' AND email = auth.jwt() ->> 'email')
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS delete_profiles ON public.profiles;
CREATE POLICY delete_profiles ON public.profiles
    FOR DELETE TO authenticated 
    USING (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

-- 6. RLS Policies for public.empresa_config
DROP POLICY IF EXISTS select_empresa_config ON public.empresa_config;
CREATE POLICY select_empresa_config ON public.empresa_config
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS insert_empresa_config ON public.empresa_config;
CREATE POLICY insert_empresa_config ON public.empresa_config
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS update_empresa_config ON public.empresa_config;
CREATE POLICY update_empresa_config ON public.empresa_config
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- 7. RLS Policies for public.audit_logs
DROP POLICY IF EXISTS select_audit_logs ON public.audit_logs;
CREATE POLICY select_audit_logs ON public.audit_logs
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS insert_audit_logs ON public.audit_logs;
CREATE POLICY insert_audit_logs ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
