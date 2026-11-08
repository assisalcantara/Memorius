-- Migration to create public.gateway_configs table
CREATE TABLE IF NOT EXISTS public.gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'ASAAS',
    environment TEXT NOT NULL DEFAULT 'SANDBOX',
    api_key TEXT NOT NULL,
    webhook_secret TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    last_test_at TIMESTAMPTZ,
    last_test_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (tenant_id, provider),
    CONSTRAINT gateway_configs_environment_check CHECK (environment IN ('SANDBOX', 'PRODUCAO'))
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gateway_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- SELECT: Authenticated users belonging to the same tenant
DROP POLICY IF EXISTS select_gateway_configs ON public.gateway_configs;
CREATE POLICY select_gateway_configs ON public.gateway_configs
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());

-- INSERT: Authenticated users belonging to the same tenant
DROP POLICY IF EXISTS insert_gateway_configs ON public.gateway_configs;
CREATE POLICY insert_gateway_configs ON public.gateway_configs
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id());

-- UPDATE: Authenticated users belonging to the same tenant
DROP POLICY IF EXISTS update_gateway_configs ON public.gateway_configs;
CREATE POLICY update_gateway_configs ON public.gateway_configs
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- DELETE: Authenticated users belonging to the same tenant
DROP POLICY IF EXISTS delete_gateway_configs ON public.gateway_configs;
CREATE POLICY delete_gateway_configs ON public.gateway_configs
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_tenant_id());

-- Create Trigger to auto-update updated_at column
DROP TRIGGER IF EXISTS on_gateway_configs_update ON public.gateway_configs;
CREATE TRIGGER on_gateway_configs_update
    BEFORE UPDATE ON public.gateway_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
