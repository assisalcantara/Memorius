-- 1. Create saas_invoices table
CREATE TABLE IF NOT EXISTS public.saas_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    descricao TEXT,
    valor NUMERIC(10, 2) NOT NULL,
    competencia VARCHAR(7) NOT NULL, -- Format: 'MM/YYYY'
    vencimento DATE NOT NULL,
    pagamento_em TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on saas_invoices
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for saas_invoices (SUPER_ADMIN only for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS saas_invoices_all_policy ON public.saas_invoices;
CREATE POLICY saas_invoices_all_policy ON public.saas_invoices
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Create trigger updated_at
DROP TRIGGER IF EXISTS on_saas_invoices_update ON public.saas_invoices;
CREATE TRIGGER on_saas_invoices_update
    BEFORE UPDATE ON public.saas_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
