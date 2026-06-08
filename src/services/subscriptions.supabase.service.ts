/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { TenantSubscription } from "@/types";
import { invoicesSupabaseService } from "./invoices.supabase.service";

// Integrated with Super Admin Executive Finance Dashboard

function toCamel(db: any): TenantSubscription | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    tenantEmpresa: db.tenants?.empresa || undefined,
    saasPlanId: db.saas_plan_id,
    saasPlanNome: db.saas_plans?.nome || undefined,
    status: db.status,
    ciclo: db.ciclo,
    valor: Number(db.valor),
    dataInicio: db.data_inicio,
    dataVencimento: db.data_vencimento,
    dataCancelamento: db.data_cancelamento || undefined,
    observacoes: db.observacoes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

function toSnake(ui: Partial<TenantSubscription>): any {
  const payload: any = {};
  if (ui.tenantId !== undefined) payload.tenant_id = ui.tenantId;
  if (ui.saasPlanId !== undefined) payload.saas_plan_id = ui.saasPlanId;
  if (ui.status !== undefined) payload.status = ui.status;
  if (ui.ciclo !== undefined) payload.ciclo = ui.ciclo;
  if (ui.valor !== undefined) payload.valor = ui.valor;
  if (ui.dataInicio !== undefined) payload.data_inicio = ui.dataInicio;
  if (ui.dataVencimento !== undefined) payload.data_vencimento = ui.dataVencimento;
  if (ui.dataCancelamento !== undefined) payload.data_cancelamento = ui.dataCancelamento;
  if (ui.observacoes !== undefined) payload.observacoes = ui.observacoes;
  return payload;
}

function getSuperAdminUserContext(): { tenantId: string | null; email: string | null } {
  if (typeof window === "undefined") return { tenantId: null, email: null };
  try {
    const storedUser = window.localStorage.getItem("legacyflow_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return {
        tenantId: user.tenant_id || null,
        email: user.email || null
      };
    }
  } catch {}
  return { tenantId: null, email: null };
}

async function logAudit(acao: string, subId: string, descricao: string, customTenantId?: string): Promise<void> {
  try {
    const context = getSuperAdminUserContext();
    let tenantId = customTenantId || context.tenantId;

    if (!tenantId) {
      const { data: firstTenant } = await (supabase.from("tenants") as any).select("id").limit(1).maybeSingle();
      tenantId = (firstTenant as any)?.id || null;
    }

    if (!tenantId) return;

    await (supabase.from("audit_logs") as any).insert({
      tenant_id: tenantId,
      modulo: "SUBSCRIPTIONS",
      acao,
      registro_id: subId,
      descricao,
      user_name: context.email || "Super Admin"
    });
  } catch (err: any) {
    console.warn("[Subscriptions Service] Failed to log audit:", err.message);
  }
}

export const subscriptionsSupabaseService = {
  async getAll(): Promise<TenantSubscription[]> {
    const { data, error } = await supabase
      .from("tenant_subscriptions")
      .select("*, tenants(empresa), saas_plans(nome)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Subscriptions Service] Error fetching subscriptions:", error.message);
      return [];
    }
    return (data || []).map(toCamel) as TenantSubscription[];
  },

  async getById(id: string): Promise<TenantSubscription | null> {
    const { data, error } = await supabase
      .from("tenant_subscriptions")
      .select("*, tenants(empresa), saas_plans(nome)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[Subscriptions Service] Error fetching subscription by id:", error.message);
      return null;
    }
    return toCamel(data);
  },

  async getByTenantId(tenantId: string): Promise<TenantSubscription | null> {
    const { data, error } = await supabase
      .from("tenant_subscriptions")
      .select("*, tenants(empresa), saas_plans(nome)")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      console.warn("[Subscriptions Service] Error fetching subscription by tenantId:", error.message);
      return null;
    }
    return toCamel(data);
  },

  async create(data: Omit<TenantSubscription, "id" | "createdAt" | "updatedAt">): Promise<TenantSubscription | null> {
    const dbPayload = toSnake(data);
    const { data: inserted, error } = await (supabase.from("tenant_subscriptions") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[Subscriptions Service] Error creating subscription:", error.message);
      throw new Error(error.message);
    }

    const fullSub = await this.getById(inserted.id);
    if (fullSub) {
      await logAudit("CREATE_SUBSCRIPTION", fullSub.id, `Assinatura criada para o tenant ${fullSub.tenantEmpresa || fullSub.tenantId}.`, fullSub.tenantId);
    }
    return fullSub;
  },

  async update(id: string, data: Partial<TenantSubscription>): Promise<TenantSubscription | null> {
    const dbPayload = toSnake(data);
    const { error } = await (supabase.from("tenant_subscriptions") as any)
      .update(dbPayload)
      .eq("id", id);

    if (error) {
      console.warn("[Subscriptions Service] Error updating subscription:", error.message);
      throw new Error(error.message);
    }

    const fullSub = await this.getById(id);
    if (fullSub) {
      await logAudit("UPDATE_SUBSCRIPTION", fullSub.id, `Assinatura atualizada para o tenant ${fullSub.tenantEmpresa || fullSub.tenantId}.`, fullSub.tenantId);
    }
    return fullSub;
  },

  async suspend(id: string): Promise<boolean> {
    const { error } = await (supabase.from("tenant_subscriptions") as any)
      .update({ status: "SUSPENSO" })
      .eq("id", id);

    if (error) {
      console.warn("[Subscriptions Service] Error suspending subscription:", error.message);
      return false;
    }

    const sub = await this.getById(id);
    await logAudit("SUSPEND_SUBSCRIPTION", id, `Assinatura suspensa.`, sub?.tenantId);
    return true;
  },

  async cancel(id: string): Promise<boolean> {
    const todayStr = new Date().toISOString().split("T")[0];
    const { error } = await (supabase.from("tenant_subscriptions") as any)
      .update({
        status: "CANCELADO",
        data_cancelamento: todayStr
      })
      .eq("id", id);

    if (error) {
      console.warn("[Subscriptions Service] Error cancelling subscription:", error.message);
      return false;
    }

    const sub = await this.getById(id);
    await logAudit("CANCEL_SUBSCRIPTION", id, `Assinatura cancelada comercialmente.`, sub?.tenantId);
    return true;
  },

  async activate(id: string): Promise<boolean> {
    const { error } = await (supabase.from("tenant_subscriptions") as any)
      .update({ status: "ATIVO" })
      .eq("id", id);

    if (error) {
      console.warn("[Subscriptions Service] Error activating subscription:", error.message);
      return false;
    }

    const sub = await this.getById(id);
    await logAudit("ACTIVATE_SUBSCRIPTION", id, `Assinatura ativada.`, sub?.tenantId);
    return true;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("tenant_subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("[Subscriptions Service] Error deleting subscription:", error.message);
      return false;
    }
    return true;
  },

  async renew(id: string): Promise<{ success: boolean; message: string }> {
    const sub = await this.getById(id);
    if (!sub) {
      throw new Error("Assinatura não encontrada.");
    }
    if (sub.status !== "ATIVO" && sub.status !== "TRIAL") {
      throw new Error("Somente assinaturas ATIVAS ou em período TRIAL podem ser renovadas.");
    }

    // 1. Calculate new vencimento
    const oldVenc = new Date(sub.dataVencimento);
    let newVenc: Date;
    if (sub.ciclo === "ANUAL") {
      newVenc = new Date(oldVenc.getFullYear() + 1, oldVenc.getMonth(), oldVenc.getDate());
    } else {
      newVenc = new Date(oldVenc.getFullYear(), oldVenc.getMonth() + 1, oldVenc.getDate());
    }
    const newVencStr = newVenc.toISOString().split("T")[0];

    // 2. Calculate next competence
    const nextCompDate = new Date(oldVenc.getFullYear(), oldVenc.getMonth() + 1, 1);
    const mm = String(nextCompDate.getMonth() + 1).padStart(2, "0");
    const yyyy = nextCompDate.getFullYear();
    const nextCompetencia = `${mm}/${yyyy}`;

    // 3. Update subscription data_vencimento
    const { error: updateErr } = await (supabase.from("tenant_subscriptions") as any)
      .update({ data_vencimento: newVencStr })
      .eq("id", id);

    if (updateErr) {
      throw new Error(`Erro ao renovar assinatura: ${updateErr.message}`);
    }

    // 4. Log audit RENEW_SUBSCRIPTION
    await logAudit("RENEW_SUBSCRIPTION", id, `Assinatura renovada manualmente para ${newVencStr}.`, sub.tenantId);

    // 5. Create PENDENTE invoice checking for duplicates
    let invoiceMsg = "";
    try {
      const isDuplicate = await invoicesSupabaseService.checkDuplicate(id, nextCompetencia);
      if (isDuplicate) {
        invoiceMsg = `Fatura para a competência ${nextCompetencia} já existe e não foi duplicada.`;
      } else {
        await invoicesSupabaseService.create({
          subscriptionId: id,
          tenantId: sub.tenantId,
          valor: sub.valor,
          competencia: nextCompetencia,
          vencimento: newVencStr,
          status: "PENDENTE",
          descricao: `Mensalidade SaaS - Plano ${sub.saasPlanNome || ""}`,
          observacoes: `Fatura gerada automaticamente via renovação manual da assinatura.`
        });
        invoiceMsg = "Assinatura renovada e fatura gerada com sucesso!";
      }
    } catch (invErr: any) {
      console.warn("[Subscriptions Service] Error creating invoice during renewal:", invErr.message);
      invoiceMsg = "Assinatura renovada, mas fatura não foi criada.";
    }

    return { success: true, message: invoiceMsg };
  }
};
