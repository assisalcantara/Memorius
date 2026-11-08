-- =========================================================================
-- ROLLBACK SCRIPT — Sprint Comercial 04.1 (Restaurar policies anteriores)
-- =========================================================================

-- 1. Restaurar policies originais de clientes
DROP POLICY IF EXISTS select_clientes ON public.clientes;
DROP POLICY IF EXISTS insert_clientes ON public.clientes;
DROP POLICY IF EXISTS update_clientes ON public.clientes;
DROP POLICY IF EXISTS delete_clientes ON public.clientes;

CREATE POLICY select_clientes ON public.clientes FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY insert_clientes ON public.clientes FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY update_clientes ON public.clientes FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY delete_clientes ON public.clientes FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 2. Restaurar policies originais de planos
DROP POLICY IF EXISTS select_planos ON public.planos;
DROP POLICY IF EXISTS insert_planos ON public.planos;
DROP POLICY IF EXISTS update_planos ON public.planos;
DROP POLICY IF EXISTS delete_planos ON public.planos;

CREATE POLICY select_planos ON public.planos FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY insert_planos ON public.planos FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY update_planos ON public.planos FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY delete_planos ON public.planos FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 3. Restaurar policies originais de contratos
DROP POLICY IF EXISTS select_contratos ON public.contratos;
DROP POLICY IF EXISTS insert_contratos ON public.contratos;
DROP POLICY IF EXISTS update_contratos ON public.contratos;
DROP POLICY IF EXISTS delete_contratos ON public.contratos;

CREATE POLICY select_contratos ON public.contratos FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY insert_contratos ON public.contratos FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY update_contratos ON public.contratos FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY delete_contratos ON public.contratos FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 4. Restaurar policies originais de agregados
DROP POLICY IF EXISTS select_agregados ON public.agregados;
DROP POLICY IF EXISTS insert_agregados ON public.agregados;
DROP POLICY IF EXISTS update_agregados ON public.agregados;
DROP POLICY IF EXISTS delete_agregados ON public.agregados;

CREATE POLICY select_agregados ON public.agregados FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY insert_agregados ON public.agregados FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY update_agregados ON public.agregados FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY delete_agregados ON public.agregados FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 5. Restaurar policies originais de mensalidades
DROP POLICY IF EXISTS select_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS insert_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS update_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS delete_mensalidades ON public.mensalidades;

CREATE POLICY select_mensalidades ON public.mensalidades FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY insert_mensalidades ON public.mensalidades FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY update_mensalidades ON public.mensalidades FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY delete_mensalidades ON public.mensalidades FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 6. Restaurar policies originais de atendimentos
DROP POLICY IF EXISTS select_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS insert_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS update_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS delete_atendimentos ON public.atendimentos;

CREATE POLICY select_atendimentos ON public.atendimentos FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY insert_atendimentos ON public.atendimentos FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY update_atendimentos ON public.atendimentos FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY delete_atendimentos ON public.atendimentos FOR DELETE TO authenticated USING (tenant_id = public.current_tenant_id());

-- 7. Remover a função de enforcement
DROP FUNCTION IF EXISTS public.is_tenant_subscription_valid();
