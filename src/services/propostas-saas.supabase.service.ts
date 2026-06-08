/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { PropostaSaas } from "@/types";

function toCamel(db: any): PropostaSaas | null {
  if (!db) return null;
  return {
    id: db.id,
    leadId: db.lead_id,
    leadNomeEmpresa: db.leads_saas?.nome_empresa || undefined,
    titulo: db.titulo,
    descricao: db.descricao || undefined,
    valorProposto: db.valor_proposto !== null ? Number(db.valor_proposto) : undefined,
    planoSaasId: db.plano_saas_id || undefined,
    planoNome: db.saas_plans?.nome || undefined,
    validade: db.validade || undefined,
    status: db.status,
    observacoes: db.observacoes || undefined,
    convertedTenantId: db.converted_tenant_id || undefined,
    convertedAt: db.converted_at || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

function toSnake(ui: Partial<PropostaSaas>): any {
  const payload: any = {};
  if (ui.leadId !== undefined) payload.lead_id = ui.leadId;
  if (ui.titulo !== undefined) payload.titulo = ui.titulo;
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.valorProposto !== undefined) payload.valor_proposto = ui.valorProposto;
  if (ui.planoSaasId !== undefined) payload.plano_saas_id = ui.planoSaasId;
  if (ui.validade !== undefined) payload.validade = ui.validade;
  if (ui.status !== undefined) payload.status = ui.status;
  if (ui.observacoes !== undefined) payload.observacoes = ui.observacoes;
  if (ui.convertedTenantId !== undefined) payload.converted_tenant_id = ui.convertedTenantId;
  if (ui.convertedAt !== undefined) payload.converted_at = ui.convertedAt;
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

async function logAudit(acao: string, propostaId: string, descricao: string): Promise<void> {
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
      modulo: "PROPOSTAS_SAAS",
      acao,
      registro_id: propostaId,
      descricao,
      user_name: context.email || "Super Admin"
    });
  } catch (err: any) {
    console.warn("[PropostasSaas Service] Failed to log audit:", err.message);
  }
}

export const propostasSaasSupabaseService = {
  async getAll(): Promise<PropostaSaas[]> {
    const { data, error } = await supabase
      .from("propostas_saas")
      .select("*, leads_saas(nome_empresa), saas_plans(nome)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[PropostasSaas Service] Error fetching proposals:", error.message);
      return [];
    }
    return (data || []).map(toCamel) as PropostaSaas[];
  },

  async getById(id: string): Promise<PropostaSaas | null> {
    const { data, error } = await supabase
      .from("propostas_saas")
      .select("*, leads_saas(nome_empresa), saas_plans(nome)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[PropostasSaas Service] Error fetching proposal by id:", error.message);
      return null;
    }
    return toCamel(data);
  },

  async create(data: Omit<PropostaSaas, "id" | "createdAt" | "updatedAt">): Promise<PropostaSaas | null> {
    const dbPayload = toSnake(data);
    const { data: inserted, error } = await (supabase.from("propostas_saas") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[PropostasSaas Service] Error creating proposal:", error.message);
      throw new Error(error.message);
    }

    // Load with joined data for camel conversion
    const fullProposal = await this.getById(inserted.id);
    if (fullProposal) {
      await logAudit("CREATE_PROPOSTA", fullProposal.id, `Proposta "${fullProposal.titulo}" criada para lead ${fullProposal.leadNomeEmpresa}.`);
    }
    return fullProposal;
  },

  async update(id: string, data: Partial<PropostaSaas>): Promise<PropostaSaas | null> {
    const dbPayload = toSnake(data);
    const { error } = await (supabase.from("propostas_saas") as any)
      .update(dbPayload)
      .eq("id", id);

    if (error) {
      console.warn("[PropostasSaas Service] Error updating proposal:", error.message);
      throw new Error(error.message);
    }

    const fullProposal = await this.getById(id);
    if (fullProposal) {
      await logAudit("UPDATE_PROPOSTA", fullProposal.id, `Proposta "${fullProposal.titulo}" atualizada.`);
    }
    return fullProposal;
  },

  async updateStatus(id: string, status: PropostaSaas["status"]): Promise<boolean> {
    const { error } = await (supabase.from("propostas_saas") as any)
      .update({ status })
      .eq("id", id);

    if (error) {
      console.warn("[PropostasSaas Service] Error updating proposal status:", error.message);
      return false;
    }

    await logAudit("CHANGE_PROPOSTA_STATUS", id, `Status da proposta alterado para ${status}.`);
    return true;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("propostas_saas")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("[PropostasSaas Service] Error deleting proposal:", error.message);
      return false;
    }

    await logAudit("DELETE_PROPOSTA", id, `Proposta ${id} excluída.`);
    return true;
  },
  
  async convertToTenant(id: string, tenantId: string): Promise<boolean> {
    const { error } = await (supabase.from("propostas_saas") as any)
      .update({
        converted_tenant_id: tenantId,
        converted_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.warn("[PropostasSaas Service] Error converting proposal to tenant:", error.message);
      return false;
    }

    await logAudit("CREATE_TENANT_FROM_PROPOSTA", id, `Proposta comercial convertida em tenant. Tenant ID: ${tenantId}.`);
    return true;
  }
};
