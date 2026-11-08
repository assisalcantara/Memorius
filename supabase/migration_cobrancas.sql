-- Migration to create cobrancas table
CREATE TABLE IF NOT EXISTS public.cobrancas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    mensalidade_id UUID NOT NULL REFERENCES public.mensalidades(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    gateway_provider TEXT NOT NULL DEFAULT 'ASAAS',
    gateway_customer_id TEXT,
    gateway_payment_id TEXT,
    gateway_method TEXT,
    gateway_status TEXT,
    valor NUMERIC NOT NULL,
    descricao TEXT,
    vencimento DATE NOT NULL,
    invoice_url TEXT,
    bank_slip_url TEXT,
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS select_cobrancas ON public.cobrancas;
CREATE POLICY select_cobrancas ON public.cobrancas
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS insert_cobrancas ON public.cobrancas;
CREATE POLICY insert_cobrancas ON public.cobrancas
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS update_cobrancas ON public.cobrancas;
CREATE POLICY update_cobrancas ON public.cobrancas
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS delete_cobrancas ON public.cobrancas;
CREATE POLICY delete_cobrancas ON public.cobrancas
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_tenant_id());

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS on_cobrancas_update ON public.cobrancas;
CREATE TRIGGER on_cobrancas_update
    BEFORE UPDATE ON public.cobrancas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
