-- 1. Add converted_tenant_id and converted_at columns to propostas_saas table
ALTER TABLE public.propostas_saas ADD COLUMN IF NOT EXISTS converted_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.propostas_saas ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
