/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { LeadSaas } from "@/types";

function toCamel(db: any): LeadSaas | null {
  if (!db) return null;
  return {
    id: db.id,
    nomeEmpresa: db.nome_empresa,
    responsavel: db.responsavel || undefined,
    telefone: db.telefone || undefined,
    whatsapp: db.whatsapp || undefined,
    email: db.email || undefined,
    cidade: db.cidade || undefined,
    uf: db.uf || undefined,
    origem: db.origem || undefined,
    interessePlano: db.interesse_plano || undefined,
    observacoes: db.observacoes || undefined,
    status: db.status,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

function toSnake(ui: Partial<LeadSaas>): any {
  const payload: any = {};
  if (ui.nomeEmpresa !== undefined) payload.nome_empresa = ui.nomeEmpresa;
  if (ui.responsavel !== undefined) payload.responsavel = ui.responsavel;
  if (ui.telefone !== undefined) payload.telefone = ui.telefone;
  if (ui.whatsapp !== undefined) payload.whatsapp = ui.whatsapp;
  if (ui.email !== undefined) payload.email = ui.email;
  if (ui.cidade !== undefined) payload.cidade = ui.cidade;
  if (ui.uf !== undefined) payload.uf = ui.uf;
  if (ui.origem !== undefined) payload.origem = ui.origem;
  if (ui.interessePlano !== undefined) payload.interesse_plano = ui.interessePlano;
  if (ui.observacoes !== undefined) payload.observacoes = ui.observacoes;
  if (ui.status !== undefined) payload.status = ui.status;
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

async function logAudit(acao: string, leadId: string, descricao: string): Promise<void> {
  try {
    const context = getSuperAdminUserContext();
    let tenantId = context.tenantId;

    if (!tenantId) {
      const { data: firstTenant } = await (supabase.from("tenants") as any).select("id").limit(1).maybeSingle();
      tenantId = (firstTenant as any)?.id || null;
    }

    if (!tenantId) return;

    await (supabase.from("audit_logs") as any).insert({
      tenant_id: tenantId,
      modulo: "LEADS_SAAS",
      acao,
      registro_id: leadId,
      descricao,
      user_name: context.email || "Super Admin"
    });
  } catch (err: any) {
    console.warn("[LeadsSaas Service] Failed to log audit:", err.message);
  }
}

export const leadsSaasSupabaseService = {
  async getAll(): Promise<LeadSaas[]> {
    const { data, error } = await supabase
      .from("leads_saas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[LeadsSaas Service] Error fetching leads:", error.message);
      return [];
    }
    return (data || []).map(toCamel) as LeadSaas[];
  },

  async getById(id: string): Promise<LeadSaas | null> {
    const { data, error } = await supabase
      .from("leads_saas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[LeadsSaas Service] Error fetching lead by id:", error.message);
      return null;
    }
    return toCamel(data);
  },

  async create(data: Omit<LeadSaas, "id" | "createdAt" | "updatedAt">): Promise<LeadSaas | null> {
    const dbPayload = toSnake(data);
    const { data: inserted, error } = await (supabase.from("leads_saas") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[LeadsSaas Service] Error creating lead:", error.message);
      throw new Error(error.message);
    }

    const lead = toCamel(inserted);
    if (lead) {
      await logAudit("CREATE_LEAD", lead.id, `Lead da empresa ${lead.nomeEmpresa} criado.`);
    }
    return lead;
  },

  async update(id: string, data: Partial<LeadSaas>): Promise<LeadSaas | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("leads_saas") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.warn("[LeadsSaas Service] Error updating lead:", error.message);
      throw new Error(error.message);
    }

    const lead = toCamel(updated);
    if (lead) {
      await logAudit("UPDATE_LEAD", lead.id, `Lead da empresa ${lead.nomeEmpresa} atualizado.`);
    }
    return lead;
  },

  async updateStatus(id: string, status: LeadSaas["status"]): Promise<boolean> {
    const { error } = await (supabase.from("leads_saas") as any)
      .update({ status })
      .eq("id", id);

    if (error) {
      console.warn("[LeadsSaas Service] Error updating lead status:", error.message);
      return false;
    }

    await logAudit("CHANGE_LEAD_STATUS", id, `Status do lead alterado para ${status}.`);
    return true;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("leads_saas")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("[LeadsSaas Service] Error deleting lead:", error.message);
      return false;
    }

    await logAudit("DELETE_LEAD", id, `Lead ${id} excluído.`);
    return true;
  }
};
