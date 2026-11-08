import { SupabaseClient } from "@supabase/supabase-js";

export interface SubscriptionStatusResult {
  allowed: boolean;
  isSuperAdmin: boolean;
  status: "ATIVO" | "TRIAL" | "SUSPENSO" | "CANCELADO" | "EXSPIRADO" | "SEM_ASSINATURA";
  dataVencimento?: string;
  diasRestantes?: number;
  message?: string;
}

/**
 * Valida a assinatura de um tenant no servidor (Server-Side).
 * 
 * Regras:
 * 1. SUPER_ADMIN nunca é bloqueado.
 * 2. Se a assinatura for ATIVO:
 *    - Se possuir data_vencimento e data_vencimento < hoje UTC -> bloqueia por vencimento.
 *    - Caso contrário, acesso liberado.
 * 3. Se a assinatura for TRIAL:
 *    - data_vencimento >= hoje UTC -> TRIAL válido (permitido).
 *    - data_vencimento < hoje UTC -> TRIAL expirado (bloqueia operações).
 * 4. Se a assinatura for SUSPENSO ou CANCELADO -> bloqueia operações.
 * 5. Se o tenant estiver com status = BLOQUEADO na tabela tenants -> bloqueia operações.
 */
export async function validateTenantSubscription(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  userRole?: string | null
): Promise<SubscriptionStatusResult> {
  if (userRole === "SUPER_ADMIN") {
    return {
      allowed: true,
      isSuperAdmin: true,
      status: "ATIVO",
      message: "Acesso total irrestrito (SUPER_ADMIN)."
    };
  }

  // 1. Verificar se o tenant em si está bloqueado administrativamente
  const { data: tenantData } = await supabaseAdmin
    .from("tenants")
    .select("status, empresa")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantData?.status === "BLOQUEADO" || tenantData?.status === "SUSPENSO") {
    return {
      allowed: false,
      isSuperAdmin: false,
      status: "SUSPENSO",
      message: `Acesso suspenso para a empresa ${tenantData.empresa || ""}. Entre em contato com o suporte.`
    };
  }

  // 2. Buscar assinatura mais recente do tenant
  const { data: sub } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("id, status, data_vencimento, ciclo, valor")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return {
      allowed: false,
      isSuperAdmin: false,
      status: "SEM_ASSINATURA",
      message: "Nenhuma assinatura ativa encontrada para este tenant."
    };
  }

  const nowUtc = new Date();
  const nowMs = nowUtc.getTime();
  const dataVenc = sub.data_vencimento;

  // Calcular diferença de tempo (milissegundos / horas / dias)
  let diasRestantes = 0;
  let vencimentoMs = 0;
  if (dataVenc) {
    // Tratar se dataVenc for "YYYY-MM-DD" ou timestamp ISO "YYYY-MM-DDTHH:mm:ss.sssZ"
    vencimentoMs = dataVenc.includes("T")
      ? new Date(dataVenc).getTime()
      : new Date(`${dataVenc}T23:59:59.999Z`).getTime();

    const diffMs = vencimentoMs - nowMs;
    diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const isExpired = vencimentoMs > 0 && vencimentoMs <= nowMs;

  // Assinatura Suspensa ou Cancelada
  if (sub.status === "SUSPENSO" || sub.status === "CANCELADO") {
    return {
      allowed: false,
      isSuperAdmin: false,
      status: sub.status,
      dataVencimento: dataVenc,
      diasRestantes: 0,
      message: `Sua assinatura está ${sub.status.toLowerCase()}. Regularize seu plano para continuar operando.`
    };
  }

  // Período de Testes (TRIAL - 168 horas exatas)
  if (sub.status === "TRIAL") {
    if (isExpired) {
      return {
        allowed: false,
        isSuperAdmin: false,
        status: "EXSPIRADO",
        dataVencimento: dataVenc,
        diasRestantes: 0,
        message: "O seu período de testes grátis (Trial de 7 dias) expirou. Escolha um plano para reativar seu acesso."
      };
    }

    return {
      allowed: true,
      isSuperAdmin: false,
      status: "TRIAL",
      dataVencimento: dataVenc,
      diasRestantes: Math.max(1, diasRestantes),
      message: `Período de avaliação TRIAL ativo (${diasRestantes} dias restantes).`
    };
  }

  // Assinatura ATIVA (Paga)
  if (sub.status === "ATIVO") {
    if (isExpired) {
      return {
        allowed: false,
        isSuperAdmin: false,
        status: "EXSPIRADO",
        dataVencimento: dataVenc,
        diasRestantes: 0,
        message: "A sua assinatura anual ou mensal está vencida. Efetue o pagamento da fatura para continuar."
      };
    }

    return {
      allowed: true,
      isSuperAdmin: false,
      status: "ATIVO",
      dataVencimento: dataVenc,
      diasRestantes,
      message: "Assinatura ativa e regular."
    };
  }

  return {
    allowed: false,
    isSuperAdmin: false,
    status: "SUSPENSO",
    message: "Status de assinatura desconhecido. Contate o suporte."
  };
}
