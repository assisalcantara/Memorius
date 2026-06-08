-- 1. Create public.audit_logs table
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

-- 2. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for audit_logs
CREATE POLICY select_audit_logs ON public.audit_logs
    FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_audit_logs ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
