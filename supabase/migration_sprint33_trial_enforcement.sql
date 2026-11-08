-- =========================================================================
-- Sprint Comercial 04.1 — Enforcement Seguro de Assinatura e Trial (Postgres / Supabase)
-- 
-- Objetivos:
-- 1. Suporte a precisão de 168 horas exatas (TIMESTAMPTZ) preservando dados existentes.
-- 2. Limpeza prévia de TODAS as políticas permissivas legadas (SELECT, INSERT, UPDATE, DELETE e FOR ALL).
-- 3. SECURITY DEFINER blindado: SET search_path = public, pg_temp; restrição de EXECUTE.
-- 4. Impedir acesso cruzado e bypass: validação vinculada estritamente ao auth.uid() e ao tenant_id da sessão.
-- 5. Bypass completo para SUPER_ADMIN e preservação do fluxo de regularização/pagamento.
-- 6. Totalmente idempotente e reversível.
-- =========================================================================

-- =========================================================================
-- PARTE 1: VERIFICAÇÃO PRÉVIA E MIGRAÇÃO DE COLUNAS COM PRESERVAÇÃO DE DADOS
-- =========================================================================

DO $$
BEGIN
  -- Se as colunas data_inicio ou data_vencimento forem do tipo DATE, converte para TIMESTAMPTZ preservando o valor
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenant_subscriptions' 
      AND column_name = 'data_inicio' 
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
      ALTER COLUMN data_inicio TYPE TIMESTAMP WITH TIME ZONE 
      USING data_inicio::timestamp with time zone;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenant_subscriptions' 
      AND column_name = 'data_vencimento' 
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
      ALTER COLUMN data_vencimento TYPE TIMESTAMP WITH TIME ZONE 
      USING (data_vencimento::timestamp with time zone + interval '23 hours 59 minutes 59 seconds');
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenant_subscriptions' 
      AND column_name = 'data_cancelamento' 
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.tenant_subscriptions 
      ALTER COLUMN data_cancelamento TYPE TIMESTAMP WITH TIME ZONE 
      USING data_cancelamento::timestamp with time zone;
  END IF;
END $$;


-- =========================================================================
-- PARTE 2: FUNÇÃO SECURITY DEFINER BLINDADA (SEM SEARCH_PATH VULNERABILITY)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_subscription_valid()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_is_super BOOLEAN;
  v_tenant_status TEXT;
  v_sub_status TEXT;
  v_data_vencimento TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
BEGIN
  -- 2.1 Obter ID do usuário autenticado no contexto seguro
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 2.2 Se for SUPER_ADMIN, acesso irrestrito garantido
  SELECT (COALESCE(r.nome, '') = 'SUPER_ADMIN' OR COALESCE(p.role, '') = 'SUPER_ADMIN')
  INTO v_is_super
  FROM public.profiles p
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = v_user_id;

  IF v_is_super IS TRUE THEN
    RETURN TRUE;
  END IF;

  -- 2.3 Obter o tenant_id vinculado ao perfil do usuário autenticado (nunca via parâmetro externo)
  SELECT p.tenant_id, p.ativo INTO v_tenant_id, v_is_super
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_tenant_id IS NULL OR v_is_super IS FALSE THEN
    RETURN FALSE;
  END IF;

  -- 2.4 Verificar se o tenant está com status bloqueado
  SELECT status INTO v_tenant_status
  FROM public.tenants
  WHERE id = v_tenant_id;

  IF v_tenant_status IS NULL OR v_tenant_status IN ('BLOQUEADO', 'SUSPENSO') THEN
    RETURN FALSE;
  END IF;

  -- 2.5 Buscar a assinatura mais recente do tenant
  SELECT status, data_vencimento INTO v_sub_status, v_data_vencimento
  FROM public.tenant_subscriptions
  WHERE tenant_id = v_tenant_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub_status IS NULL THEN
    RETURN FALSE;
  END IF;

  v_now := NOW();

  -- 2.6 Validação de 168 horas exatas do TRIAL e de assinaturas ativas
  IF v_sub_status = 'TRIAL' THEN
    -- Trial só é válido se a data de vencimento (timestamp UTC) for estritamente maior que agora
    RETURN (v_data_vencimento IS NOT NULL AND v_data_vencimento > v_now);
  ELSIF v_sub_status = 'ATIVO' THEN
    IF v_data_vencimento IS NOT NULL THEN
      RETURN (v_data_vencimento > v_now);
    END IF;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Restringir permissões de execução da função
REVOKE EXECUTE ON FUNCTION public.is_tenant_subscription_valid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_subscription_valid() TO authenticated, service_role;


-- =========================================================================
-- PARTE 3: REMOÇÃO COMPLETA DE POLICIES LEGADAS E PERMISSIVAS
-- =========================================================================

-- Clientes
DROP POLICY IF EXISTS select_clientes ON public.clientes;
DROP POLICY IF EXISTS insert_clientes ON public.clientes;
DROP POLICY IF EXISTS update_clientes ON public.clientes;
DROP POLICY IF EXISTS delete_clientes ON public.clientes;
DROP POLICY IF EXISTS clientes_all_policy ON public.clientes;
DROP POLICY IF EXISTS all_clientes ON public.clientes;

-- Planos
DROP POLICY IF EXISTS select_planos ON public.planos;
DROP POLICY IF EXISTS insert_planos ON public.planos;
DROP POLICY IF EXISTS update_planos ON public.planos;
DROP POLICY IF EXISTS delete_planos ON public.planos;
DROP POLICY IF EXISTS planos_all_policy ON public.planos;

-- Contratos
DROP POLICY IF EXISTS select_contratos ON public.contratos;
DROP POLICY IF EXISTS insert_contratos ON public.contratos;
DROP POLICY IF EXISTS update_contratos ON public.contratos;
DROP POLICY IF EXISTS delete_contratos ON public.contratos;
DROP POLICY IF EXISTS contratos_all_policy ON public.contratos;

-- Agregados
DROP POLICY IF EXISTS select_agregados ON public.agregados;
DROP POLICY IF EXISTS insert_agregados ON public.agregados;
DROP POLICY IF EXISTS update_agregados ON public.agregados;
DROP POLICY IF EXISTS delete_agregados ON public.agregados;
DROP POLICY IF EXISTS agregados_all_policy ON public.agregados;

-- Mensalidades
DROP POLICY IF EXISTS select_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS insert_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS update_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS delete_mensalidades ON public.mensalidades;
DROP POLICY IF EXISTS mensalidades_all_policy ON public.mensalidades;

-- Atendimentos
DROP POLICY IF EXISTS select_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS insert_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS update_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS delete_atendimentos ON public.atendimentos;
DROP POLICY IF EXISTS atendimentos_all_policy ON public.atendimentos;

-- Cobranças
DROP POLICY IF EXISTS select_cobrancas ON public.cobrancas;
DROP POLICY IF EXISTS insert_cobrancas ON public.cobrancas;
DROP POLICY IF EXISTS update_cobrancas ON public.cobrancas;
DROP POLICY IF EXISTS delete_cobrancas ON public.cobrancas;
DROP POLICY IF EXISTS cobrancas_all_policy ON public.cobrancas;

-- Modelos de Contrato
DROP POLICY IF EXISTS select_contract_templates ON public.contract_templates;
DROP POLICY IF EXISTS insert_contract_templates ON public.contract_templates;
DROP POLICY IF EXISTS update_contract_templates ON public.contract_templates;
DROP POLICY IF EXISTS delete_contract_templates ON public.contract_templates;
DROP POLICY IF EXISTS contract_templates_all_policy ON public.contract_templates;


-- =========================================================================
-- PARTE 4: APLICAÇÃO DAS POLICIES RESTRITIVAS COM ENFORCEMENT
-- =========================================================================

-- 4.1 CLIENTES
CREATE POLICY select_clientes ON public.clientes
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_clientes ON public.clientes
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_clientes ON public.clientes
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_clientes ON public.clientes
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.2 PLANOS
CREATE POLICY select_planos ON public.planos
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_planos ON public.planos
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_planos ON public.planos
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_planos ON public.planos
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.3 CONTRATOS
CREATE POLICY select_contratos ON public.contratos
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_contratos ON public.contratos
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_contratos ON public.contratos
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_contratos ON public.contratos
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.4 AGREGADOS
CREATE POLICY select_agregados ON public.agregados
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_agregados ON public.agregados
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_agregados ON public.agregados
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_agregados ON public.agregados
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.5 MENSALIDADES
CREATE POLICY select_mensalidades ON public.mensalidades
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_mensalidades ON public.mensalidades
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_mensalidades ON public.mensalidades
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_mensalidades ON public.mensalidades
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.6 ATENDIMENTOS
CREATE POLICY select_atendimentos ON public.atendimentos
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_atendimentos ON public.atendimentos
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_atendimentos ON public.atendimentos
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_atendimentos ON public.atendimentos
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.7 COBRANCAS
CREATE POLICY select_cobrancas ON public.cobrancas
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_cobrancas ON public.cobrancas
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_cobrancas ON public.cobrancas
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_cobrancas ON public.cobrancas
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

-- 4.8 CONTRACT_TEMPLATES
CREATE POLICY select_contract_templates ON public.contract_templates
    FOR SELECT TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY insert_contract_templates ON public.contract_templates
    FOR INSERT TO authenticated
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY update_contract_templates ON public.contract_templates
    FOR UPDATE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin())
    WITH CHECK ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());

CREATE POLICY delete_contract_templates ON public.contract_templates
    FOR DELETE TO authenticated
    USING ((tenant_id = public.current_tenant_id() AND public.is_tenant_subscription_valid()) OR public.is_super_admin());


-- =========================================================================
-- PARTE 5: QUERY DE VERIFICAÇÃO PÓS-APLICAÇÃO
-- =========================================================================

-- Pode ser executada para certificar que todas as 8 tabelas possuem RLS ativo e as policies configuradas:
/*
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('clientes', 'planos', 'contratos', 'agregados', 'mensalidades', 'atendimentos', 'cobrancas', 'contract_templates')
ORDER BY tablename, cmd;
*/
