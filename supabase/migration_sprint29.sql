-- 1. Drop the foreign key constraint referencing auth.users to allow pending profile invites
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Add status column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO';

-- 3. Enable RLS on profiles if not enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create tenant-scoped RLS policies for public.profiles (including login transition overrides)
DROP POLICY IF EXISTS select_profiles ON public.profiles;
CREATE POLICY select_profiles ON public.profiles
    FOR SELECT TO authenticated 
    USING (
        tenant_id = public.current_tenant_id()
        OR email = auth.jwt() ->> 'email'
    );

DROP POLICY IF EXISTS insert_profiles ON public.profiles;
CREATE POLICY insert_profiles ON public.profiles
    FOR INSERT TO authenticated 
    WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS update_profiles ON public.profiles;
CREATE POLICY update_profiles ON public.profiles
    FOR UPDATE TO authenticated 
    USING (
        tenant_id = public.current_tenant_id()
        OR (status = 'CONVIDADO' AND email = auth.jwt() ->> 'email')
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR (status = 'ATIVO' AND email = auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS delete_profiles ON public.profiles;
CREATE POLICY delete_profiles ON public.profiles
    FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());
