-- 1. Create saas_gateway_config table
CREATE TABLE IF NOT EXISTS public.saas_gateway_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'ASAAS',
    ambiente TEXT NOT NULL CHECK (ambiente IN ('SANDBOX', 'PRODUCAO')),
    api_key TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on saas_gateway_config
ALTER TABLE public.saas_gateway_config ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for saas_gateway_config (SUPER_ADMIN only for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS saas_gateway_config_all_policy ON public.saas_gateway_config;
CREATE POLICY saas_gateway_config_all_policy ON public.saas_gateway_config
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Create trigger updated_at
DROP TRIGGER IF EXISTS on_saas_gateway_config_update ON public.saas_gateway_config;
CREATE TRIGGER on_saas_gateway_config_update
    BEFORE UPDATE ON public.saas_gateway_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Alter saas_invoices table to support ASAAS integration fields
ALTER TABLE public.saas_invoices 
    ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT,
    ADD COLUMN IF NOT EXISTS asaas_status TEXT;
