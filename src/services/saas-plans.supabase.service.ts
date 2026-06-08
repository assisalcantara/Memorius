/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { SaasPlan } from "@/types";

function toCamel(db: any): SaasPlan | null {
  if (!db) return null;
  return {
    id: db.id,
    nome: db.nome,
    descricao: db.descricao || "",
    valorMensal: db.valor_mensal !== null ? Number(db.valor_mensal) : undefined,
    valorAnual: db.valor_anual !== null ? Number(db.valor_anual) : undefined,
    limiteUsuarios: db.limite_usuarios !== null ? Number(db.limite_usuarios) : undefined,
    limiteClientes: db.limite_clientes !== null ? Number(db.limite_clientes) : undefined,
    limiteContratos: db.limite_contratos !== null ? Number(db.limite_contratos) : undefined,
    limiteStorageMb: db.limite_storage_mb !== null ? Number(db.limite_storage_mb) : undefined,
    trialDias: db.trial_dias !== null ? Number(db.trial_dias) : undefined,
    ativo: !!db.ativo,
    destaque: !!db.destaque,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

function toSnake(ui: Partial<SaasPlan>): any {
  const payload: any = {};
  if (ui.nome !== undefined) payload.nome = ui.nome;
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.valorMensal !== undefined) payload.valor_mensal = ui.valorMensal;
  if (ui.valorAnual !== undefined) payload.valor_anual = ui.valorAnual;
  if (ui.limiteUsuarios !== undefined) payload.limite_usuarios = ui.limiteUsuarios;
  if (ui.limiteClientes !== undefined) payload.limite_clientes = ui.limiteClientes;
  if (ui.limiteContratos !== undefined) payload.limite_contratos = ui.limiteContratos;
  if (ui.limiteStorageMb !== undefined) payload.limite_storage_mb = ui.limiteStorageMb;
  if (ui.trialDias !== undefined) payload.trial_dias = ui.trialDias;
  if (ui.ativo !== undefined) payload.ativo = ui.ativo;
  if (ui.destaque !== undefined) payload.destaque = ui.destaque;
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

async function logAudit(acao: string, planId: string, descricao: string): Promise<void> {
  try {
    const context = getSuperAdminUserContext();
    let tenantId = context.tenantId;

    if (!tenantId) {
      // Fetch any tenant ID to satisfy NOT NULL constraint if we cannot find one in context
      const { data: firstTenant } = await (supabase.from("tenants") as any).select("id").limit(1).maybeSingle();
      tenantId = (firstTenant as any)?.id || null;
    }

    if (!tenantId) return;

    await (supabase.from("audit_logs") as any).insert({
      tenant_id: tenantId,
      modulo: "SAAS_PLANS",
      acao,
      registro_id: planId,
      descricao,
      user_name: context.email || "Super Admin"
    });
  } catch (err: any) {
    console.warn("[SaasPlans Service] Failed to log audit:", err.message);
  }
}

export const saasPlansSupabaseService = {
  async getAll(): Promise<SaasPlan[]> {
    const { data, error } = await supabase
      .from("saas_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[SaasPlans Service] Error fetching plans:", error.message);
      return [];
    }
    return (data || []).map(toCamel) as SaasPlan[];
  },

  async getById(id: string): Promise<SaasPlan | null> {
    const { data, error } = await supabase
      .from("saas_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[SaasPlans Service] Error fetching plan by id:", error.message);
      return null;
    }
    return toCamel(data);
  },

  async create(data: Omit<SaasPlan, "id" | "createdAt" | "updatedAt">): Promise<SaasPlan | null> {
    const dbPayload = toSnake(data);
    const { data: inserted, error } = await (supabase.from("saas_plans") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[SaasPlans Service] Error creating plan:", error.message);
      throw new Error(error.message);
    }

    const plan = toCamel(inserted);
    if (plan) {
      await logAudit("CREATE_SAAS_PLAN", plan.id, `Plano SaaS ${plan.nome} criado.`);
    }
    return plan;
  },

  async update(id: string, data: Partial<SaasPlan>): Promise<SaasPlan | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("saas_plans") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.warn("[SaasPlans Service] Error updating plan:", error.message);
      throw new Error(error.message);
    }

    const plan = toCamel(updated);
    if (plan) {
      await logAudit("UPDATE_SAAS_PLAN", plan.id, `Plano SaaS ${plan.nome} atualizado.`);
    }
    return plan;
  },

  async toggleActive(id: string, ativo: boolean): Promise<boolean> {
    const { error } = await (supabase.from("saas_plans") as any)
      .update({ ativo })
      .eq("id", id);

    if (error) {
      console.warn("[SaasPlans Service] Error toggling plan active status:", error.message);
      return false;
    }

    const acao = ativo ? "ENABLE_SAAS_PLAN" : "DISABLE_SAAS_PLAN";
    await logAudit(acao, id, `Plano SaaS ${ativo ? "ativado" : "desativado"}.`);
    return true;
  },

  async toggleHighlight(id: string, destaque: boolean): Promise<boolean> {
    const { error } = await (supabase.from("saas_plans") as any)
      .update({ destaque })
      .eq("id", id);

    if (error) {
      console.warn("[SaasPlans Service] Error toggling plan highlight status:", error.message);
      return false;
    }

    await logAudit("HIGHLIGHT_SAAS_PLAN", id, `Destaque do plano SaaS alterado para ${destaque}.`);
    return true;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("saas_plans")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("[SaasPlans Service] Error deleting plan:", error.message);
      return false;
    }

    await logAudit("DELETE_SAAS_PLAN", id, `Plano SaaS ${id} excluído.`);
    return true;
  }
};
