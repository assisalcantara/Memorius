/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Plano } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Plano | null {
  if (!db) return null;
  return {
    id: db.id,
    nome: db.nome,
    diasCarencia: db.dias_carencia !== undefined ? String(db.dias_carencia) : "0",
    nMeses: db.n_meses !== null && db.n_meses !== undefined ? String(db.n_meses) : "",
    limiteDependentes: db.limite_dependentes !== undefined ? String(db.limite_dependentes) : "0",
    valorMensal: db.valor_mensal !== undefined ? String(db.valor_mensal) : "0",
    descricao: db.descricao || "",
    coberturaBasica: db.cobertura_basica || "",
    coberturaAdicional: db.cobertura_adicional || "",
    status: db.status || "Ativo",
    dataCadastro: db.created_at ? db.created_at.split("T")[0] : "",
  };
}

function toSnake(ui: Partial<Plano>): any {
  if (!ui) return null;
  
  const payload: any = {};
  if (ui.nome !== undefined) payload.nome = ui.nome;
  if (ui.diasCarencia !== undefined) payload.dias_carencia = ui.diasCarencia ? Number(ui.diasCarencia) : 0;
  if (ui.nMeses !== undefined) payload.n_meses = ui.nMeses ? Number(ui.nMeses) : null;
  if (ui.limiteDependentes !== undefined) payload.limite_dependentes = ui.limiteDependentes ? Number(ui.limiteDependentes) : 0;
  if (ui.valorMensal !== undefined) payload.valor_mensal = ui.valorMensal ? Number(ui.valorMensal) : 0;
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.coberturaBasica !== undefined) payload.cobertura_basica = ui.coberturaBasica;
  if (ui.coberturaAdicional !== undefined) payload.cobertura_adicional = ui.coberturaAdicional;
  if (ui.status !== undefined) payload.status = ui.status;
  
  return payload;
}

function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storedUser = window.localStorage.getItem("legacyflow_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.tenant_id || null;
    }
  } catch {}
  return null;
}

export const planosSupabaseService = {
  async getAll(): Promise<Plano[]> {
    const { data, error } = await (supabase.from("planos") as any)
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Error fetching planos from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((p: Plano | null): p is Plano => p !== null);
  },

  async getById(id: string | number): Promise<Plano | null> {
    const { data, error } = await (supabase.from("planos") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching plano by ID from Supabase:", error);
      return null;
    }

    return toCamel(data);
  },

  async create(data: Omit<Plano, "id">): Promise<Plano | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }
    
    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
    };

    const { data: inserted, error } = await (supabase.from("planos") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating plano in Supabase:", error);
      throw new Error(error.message || "Erro ao criar plano no Supabase.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Planos", "CREATE", result.id, `Plano ${result.nome} criado`);
    }
    return result;
  },

  async update(id: string | number, data: Partial<Plano>): Promise<Plano | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("planos") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating plano in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar plano no Supabase.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Planos", "UPDATE", result.id, `Plano ${result.nome} editado`);
    }
    return result;
  },

  async remove(id: string | number): Promise<boolean> {
    const { error } = await (supabase.from("planos") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting plano from Supabase:", error);
      throw new Error(error.message || "Erro ao excluir plano no Supabase.");
    }

    await auditLogSupabaseService.logActivity("Planos", "DELETE", id, `Plano ID ${id} excluído permanentemente`);
    return true;
  },
};
