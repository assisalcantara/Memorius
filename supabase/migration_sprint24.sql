-- 1. Create public.roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for roles (SELECT for authenticated users)
CREATE POLICY select_roles ON public.roles
    FOR SELECT TO authenticated USING (true);

-- 4. Insert initial roles
INSERT INTO public.roles (nome, descricao) VALUES 
  ('ADMIN', 'Administrador com acesso total'),
  ('GERENTE', 'Gerente com acesso a todas as abas operacionais'),
  ('ATENDENTE', 'Atendimento e cadastro de clientes'),
  ('FINANCEIRO', 'Controle de cobranças e mensalidades'),
  ('CONSULTA', 'Consulta a clientes e relatórios')
ON CONFLICT (nome) DO NOTHING;

-- 5. Add role_id to public.profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- 6. Migrate existing string role values to new role_id
UPDATE public.profiles p
SET role_id = r.id
FROM public.roles r
WHERE UPPER(p.role) = r.nome;

-- Default any profile without role_id to CONSULTA
UPDATE public.profiles p
SET role_id = (SELECT id FROM public.roles WHERE nome = 'CONSULTA' LIMIT 1)
WHERE role_id IS NULL;
