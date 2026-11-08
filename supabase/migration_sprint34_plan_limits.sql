-- =========================================================================
-- Sprint Comercial 06.1 — Finalização do Enforcement dos Limites Comerciais
-- 
-- Objetivos:
-- 1. Impedir excesso de associados (clientes), contratos ativos e usuários ativos no banco.
-- 2. Proteger INSERTs e transições de UPDATE que aumentem consumo de cota (ativação/reativação).
-- 3. Prevenção de concorrência com bloqueio transacional (pg_advisory_xact_lock por tenant).
-- 4. Preservar policies RLS da Sprint 33, isolamento por tenant, SUPER_ADMIN e dados existentes.
-- 5. Sem alterar ou recriar os planos comerciais já sincronizados (saas_plans).
-- 6. Totalmente idempotente e reversível.
-- =========================================================================

BEGIN;

-- =========================================================================
-- PARTE 1: FUNÇÃO AUXILIAR DE CONSULTA DO LIMITE DO TENANT (SECURITY DEFINER)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_plan_limit(p_resource TEXT, p_tenant_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_limit BIGINT;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  -- 1. Buscar limite contratado na assinatura mais recente do tenant
  IF p_resource = 'CLIENTES' THEN
    SELECT sp.limite_clientes
    INTO v_limit
    FROM public.tenant_subscriptions ts
    JOIN public.saas_plans sp ON ts.saas_plan_id = sp.id
    WHERE ts.tenant_id = p_tenant_id
    ORDER BY ts.created_at DESC
    LIMIT 1;
  ELSIF p_resource = 'CONTRATOS' THEN
    SELECT sp.limite_contratos
    INTO v_limit
    FROM public.tenant_subscriptions ts
    JOIN public.saas_plans sp ON ts.saas_plan_id = sp.id
    WHERE ts.tenant_id = p_tenant_id
    ORDER BY ts.created_at DESC
    LIMIT 1;
  ELSIF p_resource = 'USUARIOS' THEN
    SELECT sp.limite_usuarios
    INTO v_limit
    FROM public.tenant_subscriptions ts
    JOIN public.saas_plans sp ON ts.saas_plan_id = sp.id
    WHERE ts.tenant_id = p_tenant_id
    ORDER BY ts.created_at DESC
    LIMIT 1;
  ELSE
    RETURN 0;
  END IF;

  -- 2. Se não possuir assinatura vinculada ou limite for nulo, aplica fallback seguro (Essencial)
  IF v_limit IS NULL THEN
    IF p_resource = 'USUARIOS' THEN
      v_limit := 2;
    ELSE
      v_limit := 500;
    END IF;
  END IF;

  RETURN v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_tenant_plan_limit(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_plan_limit(TEXT, UUID) TO authenticated, service_role;


-- =========================================================================
-- PARTE 2: TRIGGER FUNCTION TRANSACIONAL COM LOCK ANTI-CONCORRÊNCIA
-- =========================================================================

CREATE OR REPLACE FUNCTION public.enforce_tenant_resource_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_super BOOLEAN;
  v_tenant_id UUID;
  v_limit BIGINT;
  v_current_count BIGINT;
  v_resource_name TEXT;
  v_lock_key BIGINT;
BEGIN
  -- 2.1 Verificar se o usuário autenticado é SUPER_ADMIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT (COALESCE(r.nome, '') = 'SUPER_ADMIN' OR COALESCE(p.role, '') = 'SUPER_ADMIN')
    INTO v_is_super
    FROM public.profiles p
    LEFT JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = v_user_id;

    IF v_is_super IS TRUE THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 2.2 Determinar o tenant do registro
  v_tenant_id := NEW.tenant_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Registro sem tenant_id definido.' USING ERRCODE = 'P0001';
  END IF;

  -- 2.3 Bloqueio transacional de concorrência por tenant (pg_advisory_xact_lock)
  -- Libera automaticamente no COMMIT ou ROLLBACK da transação
  v_lock_key := ('x' || substr(md5(v_tenant_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 2.4 Verificação por recurso / tabela
  IF TG_TABLE_NAME = 'clientes' THEN
    -- Aplica-se a INSERT (cada novo cliente consome cota)
    IF TG_OP = 'INSERT' THEN
      v_limit := public.get_tenant_plan_limit('CLIENTES', v_tenant_id);
      SELECT count(*) INTO v_current_count
      FROM public.clientes
      WHERE tenant_id = v_tenant_id;

      IF v_current_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de associados (% registros) atingido no plano atual do tenant. Faça upgrade da assinatura para cadastrar novos clientes.', v_limit
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'contratos' THEN
    -- Aplica-se a INSERT com status Ativo ou UPDATE que transiciona para Ativo
    IF (TG_OP = 'INSERT' AND UPPER(TRIM(COALESCE(NEW.status, ''))) = 'ATIVO') OR
       (TG_OP = 'UPDATE' AND UPPER(TRIM(COALESCE(NEW.status, ''))) = 'ATIVO' AND UPPER(TRIM(COALESCE(OLD.status, ''))) <> 'ATIVO') THEN
      
      v_limit := public.get_tenant_plan_limit('CONTRATOS', v_tenant_id);
      SELECT count(*) INTO v_current_count
      FROM public.contratos
      WHERE tenant_id = v_tenant_id
        AND UPPER(TRIM(status)) = 'ATIVO';

      IF v_current_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de contratos ativos (% contratos) atingido no plano atual do tenant. Faça upgrade da assinatura para emitir ou reativar contratos.', v_limit
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'profiles' THEN
    -- Aplica-se a INSERT com ativo=true ou UPDATE que reativa usuário (ativo: false -> true)
    IF (TG_OP = 'INSERT' AND NEW.ativo IS TRUE) OR
       (TG_OP = 'UPDATE' AND NEW.ativo IS TRUE AND (OLD.ativo IS FALSE OR OLD.ativo IS NULL)) THEN
      
      -- Ignorar perfis de SUPER_ADMIN globais que possam estar sendo vinculados
      IF COALESCE(NEW.role, '') <> 'SUPER_ADMIN' THEN
        v_limit := public.get_tenant_plan_limit('USUARIOS', v_tenant_id);
        SELECT count(*) INTO v_current_count
        FROM public.profiles
        WHERE tenant_id = v_tenant_id
          AND ativo IS TRUE
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_current_count >= v_limit THEN
          RAISE EXCEPTION 'Limite de usuários operadores (% usuários) atingido no plano atual do tenant. Faça upgrade da assinatura para adicionar ou reativar operadores.', v_limit
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_tenant_resource_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_tenant_resource_limits() TO authenticated, service_role;


-- =========================================================================
-- PARTE 3: TRIGGERS ANTES DE INSERT E UPDATE (BLOQUEIO TRANSAÇÃO ATÔMICO)
-- =========================================================================

-- 1. CLIENTES (Limite de Associados)
DROP TRIGGER IF EXISTS trg_enforce_limit_clientes ON public.clientes;
CREATE TRIGGER trg_enforce_limit_clientes
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tenant_resource_limits();

-- 2. CONTRATOS (Limite de Contratos Ativos e Reativações)
DROP TRIGGER IF EXISTS trg_enforce_limit_contratos ON public.contratos;
CREATE TRIGGER trg_enforce_limit_contratos
  BEFORE INSERT OR UPDATE OF status ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tenant_resource_limits();

-- 3. PROFILES (Limite de Usuários Operadores e Reativações)
DROP TRIGGER IF EXISTS trg_enforce_limit_profiles ON public.profiles;
CREATE TRIGGER trg_enforce_limit_profiles
  BEFORE INSERT OR UPDATE OF ativo, status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tenant_resource_limits();

COMMIT;
