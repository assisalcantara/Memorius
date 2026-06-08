-- 1. Create propostas_saas table
CREATE TABLE IF NOT EXISTS public.propostas_saas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads_saas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    valor_proposto NUMERIC(10, 2),
    plano_saas_id UUID REFERENCES public.saas_plans(id) ON DELETE SET NULL,
    validade DATE,
    status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'ENVIADA', 'NEGOCIACAO', 'APROVADA', 'RECUSADA', 'EXPIRADA')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on propostas_saas
ALTER TABLE public.propostas_saas ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for propostas_saas (SUPER_ADMIN only for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS propostas_saas_all_policy ON public.propostas_saas;
CREATE POLICY propostas_saas_all_policy ON public.propostas_saas
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Create trigger updated_at
DROP TRIGGER IF EXISTS on_propostas_saas_update ON public.propostas_saas;
CREATE TRIGGER on_propostas_saas_update
    BEFORE UPDATE ON public.propostas_saas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
