/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { SaaSInvoice } from "@/types";

// Supports SaaS Dashboard Executivo Financeiro queries and metrics

function toCamel(db: any): SaaSInvoice | null {
  if (!db) return null;
  return {
    id: db.id,
    subscriptionId: db.subscription_id || null,
    tenantId: db.tenant_id,
    tenantEmpresa: db.tenants?.empresa || undefined,
    descricao: db.descricao || undefined,
    valor: Number(db.valor),
    competencia: db.competencia,
    vencimento: db.vencimento,
    pagamentoEm: db.pagamento_em || null,
    status: db.status,
    observacoes: db.observacoes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

function toSnake(ui: Partial<SaaSInvoice>): any {
  const payload: any = {};
  if (ui.subscriptionId !== undefined) payload.subscription_id = ui.subscriptionId;
  if (ui.tenantId !== undefined) payload.tenant_id = ui.tenantId;
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.valor !== undefined) payload.valor = ui.valor;
  if (ui.competencia !== undefined) payload.competencia = ui.competencia;
  if (ui.vencimento !== undefined) payload.vencimento = ui.vencimento;
  if (ui.pagamentoEm !== undefined) payload.pagamento_em = ui.pagamentoEm;
  if (ui.status !== undefined) payload.status = ui.status;
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

async function logAudit(acao: string, invoiceId: string, descricao: string, customTenantId?: string): Promise<void> {
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
      modulo: "INVOICES",
      acao,
      registro_id: invoiceId,
      descricao,
      user_name: context.email || "Super Admin"
    });
  } catch (err: any) {
    console.warn("[Invoices Service] Failed to log audit:", err.message);
  }
}

export const invoicesSupabaseService = {
  async getAll(): Promise<SaaSInvoice[]> {
    const { data, error } = await supabase
      .from("saas_invoices")
      .select("*, tenants(empresa)")
      .order("vencimento", { ascending: false });

    if (error) {
      console.warn("[Invoices Service] Error fetching invoices:", error.message);
      return [];
    }
    return (data || []).map(toCamel) as SaaSInvoice[];
  },

  async getById(id: string): Promise<SaaSInvoice | null> {
    const { data, error } = await supabase
      .from("saas_invoices")
      .select("*, tenants(empresa)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[Invoices Service] Error fetching invoice by id:", error.message);
      return null;
    }
    return toCamel(data);
  },

  async checkDuplicate(subscriptionId: string, competencia: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("saas_invoices")
      .select("id")
      .eq("subscription_id", subscriptionId)
      .eq("competencia", competencia)
      .limit(1);

    if (error) {
      console.warn("[Invoices Service] Error checking duplicate invoice:", error.message);
      return false;
    }
    return (data && data.length > 0);
  },

  async create(data: Omit<SaaSInvoice, "id" | "createdAt" | "updatedAt">): Promise<SaaSInvoice | null> {
    // Check duplicates if linked to a subscription
    if (data.subscriptionId) {
      const isDuplicate = await this.checkDuplicate(data.subscriptionId, data.competencia);
      if (isDuplicate) {
        throw new Error(`Fatura duplicada: Já existe uma fatura gerada para esta assinatura na competência ${data.competencia}.`);
      }
    }

    const dbPayload = toSnake(data);
    const { data: inserted, error } = await (supabase.from("saas_invoices") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[Invoices Service] Error creating invoice:", error.message);
      throw new Error(error.message);
    }

    const fullInvoice = await this.getById(inserted.id);
    if (fullInvoice) {
      await logAudit("CREATE_INVOICE", fullInvoice.id, `Fatura criada para o tenant ${fullInvoice.tenantEmpresa || fullInvoice.tenantId} no valor de R$ ${fullInvoice.valor.toFixed(2)} (Competência ${fullInvoice.competencia}).`, fullInvoice.tenantId);
    }
    return fullInvoice;
  },

  async update(id: string, data: Partial<SaaSInvoice>): Promise<SaaSInvoice | null> {
    const dbPayload = toSnake(data);
    const { error } = await (supabase.from("saas_invoices") as any)
      .update(dbPayload)
      .eq("id", id);

    if (error) {
      console.warn("[Invoices Service] Error updating invoice:", error.message);
      throw new Error(error.message);
    }

    const fullInvoice = await this.getById(id);
    if (fullInvoice) {
      await logAudit("UPDATE_INVOICE", fullInvoice.id, `Fatura atualizada para o tenant ${fullInvoice.tenantEmpresa || fullInvoice.tenantId}.`, fullInvoice.tenantId);
    }
    return fullInvoice;
  },

  async markAsPaid(id: string): Promise<boolean> {
    const invoice = await this.getById(id);
    if (!invoice) {
      throw new Error("Fatura não encontrada.");
    }
    if (invoice.status === "CANCELADO") {
      throw new Error("Não é permitido marcar como paga uma fatura que está cancelada.");
    }

    const nowStr = new Date().toISOString();
    const { error } = await (supabase.from("saas_invoices") as any)
      .update({
        status: "PAGO",
        pagamento_em: nowStr
      })
      .eq("id", id);

    if (error) {
      console.warn("[Invoices Service] Error marking invoice as paid:", error.message);
      return false;
    }

    await logAudit("MARK_INVOICE_PAID", id, `Fatura marcada como PAGA.`, invoice.tenantId);
    return true;
  },

  async cancel(id: string): Promise<boolean> {
    const invoice = await this.getById(id);
    if (!invoice) {
      throw new Error("Fatura não encontrada.");
    }
    if (invoice.status === "PAGO") {
      throw new Error("Não é permitido cancelar uma fatura que já foi paga.");
    }

    const { error } = await (supabase.from("saas_invoices") as any)
      .update({ status: "CANCELADO" })
      .eq("id", id);

    if (error) {
      console.warn("[Invoices Service] Error cancelling invoice:", error.message);
      return false;
    }

    await logAudit("CANCEL_INVOICE", id, `Fatura cancelada.`, invoice.tenantId);
    return true;
  },

  async remove(id: string): Promise<boolean> {
    const invoice = await this.getById(id);
    const { error } = await supabase
      .from("saas_invoices")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("[Invoices Service] Error deleting invoice:", error.message);
      return false;
    }

    if (invoice) {
      await logAudit("DELETE_INVOICE", id, `Fatura excluída permanentemente.`, invoice.tenantId);
    }
    return true;
  }
};
