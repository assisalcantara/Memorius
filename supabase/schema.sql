-- Blueprint SQL Schema for LegacyFlow (Sprint 13 & 14)
-- Setup Tenants and User Profiles

-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'usuario',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    nome TEXT,
    email TEXT,
    role TEXT,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Enabling Row Level Security (RLS) Blueprint
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Sprint 14: Row Level Security (RLS) & Multi-tenant isolation
-- =========================================================================

-- 4. Helper Function: Get Current Tenant ID from Authenticated Session Profile
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Create Clientes Table
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT,
    rg TEXT,
    data_nascimento DATE,
    sexo TEXT NOT NULL DEFAULT 'MASCULINO',
    nome_pai TEXT,
    nome_mae TEXT,
    naturalidade TEXT,
    estado_civil TEXT,
    nome_conjuge TEXT,
    profissao TEXT,
    local_trabalho TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    telefone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Create Policies for Clientes
CREATE POLICY select_clientes ON public.clientes
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_clientes ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_clientes ON public.clientes
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_clientes ON public.clientes
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 6. Trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_clientes_update
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6.1 Create Planos Table
CREATE TABLE IF NOT EXISTS public.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    dias_carencia INTEGER DEFAULT 0,
    n_meses INTEGER,
    limite_dependentes INTEGER DEFAULT 0,
    valor_mensal NUMERIC(10, 2) DEFAULT 0.00,
    descricao TEXT,
    cobertura_basica TEXT,
    cobertura_adicional TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Planos
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- Create Policies for Planos
CREATE POLICY select_planos ON public.planos
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_planos ON public.planos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_planos ON public.planos
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_planos ON public.planos
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- Trigger to auto-update updated_at on planos update
CREATE OR REPLACE TRIGGER on_planos_update
    BEFORE UPDATE ON public.planos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6.2 Create Contratos Table
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    plano_id UUID REFERENCES public.planos(id) ON DELETE SET NULL,
    numero_contrato TEXT NOT NULL,
    data_adesao DATE NOT NULL,
    valor_mensal NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Contratos
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Create Policies for Contratos
CREATE POLICY select_contratos ON public.contratos
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_contratos ON public.contratos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_contratos ON public.contratos
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_contratos ON public.contratos
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- Trigger to auto-update updated_at on contratos update
CREATE OR REPLACE TRIGGER on_contratos_update
    BEFORE UPDATE ON public.contratos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6.3 Create Agregados Table
CREATE TABLE IF NOT EXISTS public.agregados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT,
    data_nascimento DATE,
    parentesco TEXT,
    liberacao TEXT NOT NULL DEFAULT 'Sim',
    status TEXT NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Agregados
ALTER TABLE public.agregados ENABLE ROW LEVEL SECURITY;

-- Create Policies for Agregados
CREATE POLICY select_agregados ON public.agregados
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_agregados ON public.agregados
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_agregados ON public.agregados
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_agregados ON public.agregados
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- Trigger to auto-update updated_at on agregados update
CREATE OR REPLACE TRIGGER on_agregados_update
    BEFORE UPDATE ON public.agregados
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6.4 Create Mensalidades Table
CREATE TABLE IF NOT EXISTS public.mensalidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    numero_contrato TEXT NOT NULL,
    cliente_nome TEXT NOT NULL,
    plano_nome TEXT NOT NULL,
    competencia TEXT NOT NULL,
    data_vencimento DATE NOT NULL,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'EM_ABERTO',
    data_pagamento DATE,
    valor_recebido NUMERIC(10, 2),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Mensalidades
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

-- Create Policies for Mensalidades
CREATE POLICY select_mensalidades ON public.mensalidades
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_mensalidades ON public.mensalidades
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_mensalidades ON public.mensalidades
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_mensalidades ON public.mensalidades
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- Trigger to auto-update updated_at on mensalidades update
CREATE OR REPLACE TRIGGER on_mensalidades_update
    BEFORE UPDATE ON public.mensalidades
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6.5 Create Atendimentos Table
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL,
    plano_nome TEXT NOT NULL,
    data DATE NOT NULL,
    hora TEXT NOT NULL,
    local TEXT NOT NULL,
    tipo TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    telefone TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'Aberto',
    operador TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Atendimentos
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Create Policies for Atendimentos
CREATE POLICY select_atendimentos ON public.atendimentos
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_atendimentos ON public.atendimentos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_atendimentos ON public.atendimentos
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_atendimentos ON public.atendimentos
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- Trigger to auto-update updated_at on atendimentos update
CREATE OR REPLACE TRIGGER on_atendimentos_update
    BEFORE UPDATE ON public.atendimentos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Blueprints of RLS Policies for Business Tables
-- Note: These tables are not created yet. The policies below are commented out
-- or provided as templates for future business tables implementation.

/*
-- EXAMPLE: Clientes RLS Blueprint
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_clientes ON public.clientes
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_clientes ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_clientes ON public.clientes
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_clientes ON public.clientes
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());


-- EXAMPLE: Planos RLS Blueprint
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_planos ON public.planos
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_planos ON public.planos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_planos ON public.planos
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_planos ON public.planos
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());


-- EXAMPLE: Contratos RLS Blueprint
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_contratos ON public.contratos
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_contratos ON public.contratos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_contratos ON public.contratos
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_contratos ON public.contratos
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());


-- EXAMPLE: Agregados RLS Blueprint
ALTER TABLE public.agregados ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_agregados ON public.agregados
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_agregados ON public.agregados
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_agregados ON public.agregados
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_agregados ON public.agregados
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());


-- EXAMPLE: Mensalidades RLS Blueprint
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_mensalidades ON public.mensalidades
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_mensalidades ON public.mensalidades
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_mensalidades ON public.mensalidades
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_mensalidades ON public.mensalidades
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());


-- EXAMPLE: Atendimentos RLS Blueprint
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_atendimentos ON public.atendimentos
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY insert_atendimentos ON public.atendimentos
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY update_atendimentos ON public.atendimentos
  FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY delete_atendimentos ON public.atendimentos
  FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());
*/
