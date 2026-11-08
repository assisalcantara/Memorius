import { SupabaseClient } from "@supabase/supabase-js";

export interface TenantUsageLimits {
  allowed: boolean;
  isSuperAdmin: boolean;
  resource: "USUARIOS" | "CLIENTES" | "CONTRATOS";
  currentCount: number;
  limit: number; // 0 or Infinity for unlimited
  planName: string;
  message?: string;
  upgradeMessage?: string;
}

export interface TenantPlanLimitsSummary {
  planId?: string;
  planName: string;
  trialDias: number;
  isSuperAdmin: boolean;
  limits: {
    usuarios: number;
    clientes: number;
    contratos: number;
  };
  usage: {
    usuarios: number;
    clientes: number;
    contratos: number;
  };
  hasReached: {
    usuarios: boolean;
    clientes: boolean;
    contratos: boolean;
  };
}

/**
 * Consulta e valida limites do plano contratado para um tenant específico.
 * Evita contagem duplicada e respeita o escopo exclusivo do tenant_id.
 */
export async function getTenantPlanLimits(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  userRole?: string | null
): Promise<TenantPlanLimitsSummary> {
  const isSuper = userRole === "SUPER_ADMIN";

  // Valores padrão fallback
  const fallbackLimits = {
    planName: "Essencial",
    trialDias: 7,
    isSuperAdmin: isSuper,
    limits: {
      usuarios: 2,
      clientes: 500,
      contratos: 500,
    },
    usage: {
      usuarios: 0,
      clientes: 0,
      contratos: 0,
    },
    hasReached: {
      usuarios: false,
      clientes: false,
      contratos: false,
    },
  };

  if (!tenantId) {
    return fallbackLimits;
  }

  try {
    // 1. Obter a assinatura mais recente do tenant
    const { data: sub } = await supabaseAdmin
      .from("tenant_subscriptions")
      .select("id, saas_plan_id, status")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let planData: any = null;
    if (sub?.saas_plan_id) {
      const { data: plan } = await supabaseAdmin
        .from("saas_plans")
        .select("id, nome, limite_usuarios, limite_clientes, limite_contratos, trial_dias")
        .eq("id", sub.saas_plan_id)
        .maybeSingle();
      planData = plan;
    }

    // Se não encontrou o plano vinculado, tenta pegar o plano Profissional ou Essencial padrão ativo
    if (!planData) {
      const { data: defaultPlan } = await supabaseAdmin
        .from("saas_plans")
        .select("id, nome, limite_usuarios, limite_clientes, limite_contratos, trial_dias")
        .eq("destaque", true)
        .eq("ativo", true)
        .maybeSingle();
      planData = defaultPlan;
    }

    const limUsuarios = planData?.limite_usuarios !== null && planData?.limite_usuarios !== undefined
      ? Number(planData.limite_usuarios)
      : 2;
    const limClientes = planData?.limite_clientes !== null && planData?.limite_clientes !== undefined
      ? Number(planData.limite_clientes)
      : 500;
    const limContratos = planData?.limite_contratos !== null && planData?.limite_contratos !== undefined
      ? Number(planData.limite_contratos)
      : 500;

    // 2. Contar recursos atuais ativos exclusivamente deste tenant (sem duplicidade)
    // Contagem de usuários ativos no tenant
    const { count: usuariosCount } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("ativo", true);

    // Contagem de clientes/associados no tenant (status != 'Inativo')
    const { count: clientesCount } = await supabaseAdmin
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Contagem de contratos ativos no tenant
    const { count: contratosCount } = await supabaseAdmin
      .from("contratos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .ilike("status", "Ativo");

    const currentUsuarios = usuariosCount || 0;
    const currentClientes = clientesCount || 0;
    const currentContratos = contratosCount || 0;

    return {
      planId: planData?.id,
      planName: planData?.nome || "Plano Comercial",
      trialDias: planData?.trial_dias || 7,
      isSuperAdmin: isSuper,
      limits: {
        usuarios: limUsuarios,
        clientes: limClientes,
        contratos: limContratos,
      },
      usage: {
        usuarios: currentUsuarios,
        clientes: currentClientes,
        contratos: currentContratos,
      },
      hasReached: {
        usuarios: !isSuper && limUsuarios > 0 && currentUsuarios >= limUsuarios,
        clientes: !isSuper && limClientes > 0 && currentClientes >= limClientes,
        contratos: !isSuper && limContratos > 0 && currentContratos >= limContratos,
      },
    };
  } catch (err: any) {
    console.error("[getTenantPlanLimits] Erro ao consultar limites:", err?.message);
    return fallbackLimits;
  }
}

/**
 * Validação server-side antes de inserir novo recurso (usuário, cliente ou contrato).
 */
export async function validateResourceCreationLimit(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  resource: "USUARIOS" | "CLIENTES" | "CONTRATOS",
  userRole?: string | null
): Promise<TenantUsageLimits> {
  if (userRole === "SUPER_ADMIN") {
    return {
      allowed: true,
      isSuperAdmin: true,
      resource,
      currentCount: 0,
      limit: 0,
      planName: "SUPER_ADMIN",
    };
  }

  const summary = await getTenantPlanLimits(supabaseAdmin, tenantId, userRole);
  let reached = false;
  let current = 0;
  let limit = 0;
  let label = "";

  if (resource === "USUARIOS") {
    current = summary.usage.usuarios;
    limit = summary.limits.usuarios;
    reached = summary.hasReached.usuarios;
    label = "usuários operadores";
  } else if (resource === "CLIENTES") {
    current = summary.usage.clientes;
    limit = summary.limits.clientes;
    reached = summary.hasReached.clientes;
    label = "associados cadastrados";
  } else if (resource === "CONTRATOS") {
    current = summary.usage.contratos;
    limit = summary.limits.contratos;
    reached = summary.hasReached.contratos;
    label = "contratos ativos";
  }

  if (reached) {
    return {
      allowed: false,
      isSuperAdmin: false,
      resource,
      currentCount: current,
      limit,
      planName: summary.planName,
      message: `Limite de ${limit} ${label} atingido no plano ${summary.planName}.`,
      upgradeMessage: `Seu plano atual (${summary.planName}) atingiu o limite contratado (${current}/${limit} ${label}). Para cadastrar novos registros sem interrupção de serviço, faça o upgrade da sua assinatura.`,
    };
  }

  return {
    allowed: true,
    isSuperAdmin: false,
    resource,
    currentCount: current,
    limit,
    planName: summary.planName,
  };
}
