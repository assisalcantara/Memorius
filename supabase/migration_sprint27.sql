-- 1. Create public.empresa_config table
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

-- 2. Enable RLS on empresa_config
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for empresa_config
CREATE POLICY select_empresa_config ON public.empresa_config
    FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_empresa_config ON public.empresa_config
    FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_empresa_config ON public.empresa_config
    FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- 4. Trigger for updated_at on empresa_config
CREATE OR REPLACE TRIGGER on_empresa_config_update
    BEFORE UPDATE ON public.empresa_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Supabase Storage Bucket 'logos' Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Bucket Security Policies (Tenant Isolation)
CREATE POLICY "Public Select Logos" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'logos');

CREATE POLICY "Authenticated Upload Logos" ON storage.objects 
    FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = 'logos' 
        AND name LIKE (public.current_tenant_id()::text || '/%')
    );

CREATE POLICY "Authenticated Update Logos" ON storage.objects 
    FOR UPDATE TO authenticated 
    USING (
        bucket_id = 'logos' 
        AND name LIKE (public.current_tenant_id()::text || '/%')
    )
    WITH CHECK (
        bucket_id = 'logos' 
        AND name LIKE (public.current_tenant_id()::text || '/%')
    );

CREATE POLICY "Authenticated Delete Logos" ON storage.objects 
    FOR DELETE TO authenticated 
    USING (
        bucket_id = 'logos' 
        AND name LIKE (public.current_tenant_id()::text || '/%')
    );
