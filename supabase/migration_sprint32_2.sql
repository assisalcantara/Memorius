-- 1. Create leads_saas table
CREATE TABLE IF NOT EXISTS public.leads_saas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT NOT NULL,
    responsavel TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    cidade TEXT,
    uf TEXT,
    origem TEXT,
    interesse_plano TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'NOVO' CHECK (status IN ('NOVO', 'CONTATO_REALIZADO', 'PROPOSTA_ENVIADA', 'NEGOCIACAO', 'FECHADO', 'PERDIDO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on leads_saas
ALTER TABLE public.leads_saas ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for leads_saas (SUPER_ADMIN only for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS leads_saas_all_policy ON public.leads_saas;
CREATE POLICY leads_saas_all_policy ON public.leads_saas
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Create trigger updated_at
DROP TRIGGER IF EXISTS on_leads_saas_update ON public.leads_saas;
CREATE TRIGGER on_leads_saas_update
    BEFORE UPDATE ON public.leads_saas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
