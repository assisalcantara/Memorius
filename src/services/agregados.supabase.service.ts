/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Agregado } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Agregado | null {
  if (!db) return null;
  return {
    id: db.id,
    contratoId: db.contrato_id || "",
    nome: db.nome,
    cpf: db.cpf || "",
    dataNascimento: db.data_nascimento || "",
    parentesco: db.parentesco || "",
    liberacao: db.liberacao || "Sim",
  };
}

function toSnake(ui: Partial<Agregado>): any {
  if (!ui) return null;
  
  const payload: any = {};
  if (ui.contratoId !== undefined) payload.contrato_id = ui.contratoId || null;
  if (ui.nome !== undefined) payload.nome = ui.nome;
  if (ui.cpf !== undefined) payload.cpf = ui.cpf;
  if (ui.dataNascimento !== undefined) payload.data_nascimento = ui.dataNascimento || null;
  if (ui.parentesco !== undefined) payload.parentesco = ui.parentesco;
  if (ui.liberacao !== undefined) payload.liberacao = ui.liberacao;
  
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

export const agregadosSupabaseService = {
  async getAll(): Promise<Agregado[]> {
    const { data, error } = await (supabase.from("agregados") as any)
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Error fetching agregados from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((a: Agregado | null): a is Agregado => a !== null);
  },

  async getById(id: string | number): Promise<Agregado | null> {
    const { data, error } = await (supabase.from("agregados") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching agregado by ID from Supabase:", error);
      return null;
    }

    return toCamel(data);
  },

  async getByContratoId(contratoId: string | number): Promise<Agregado[]> {
    const { data, error } = await (supabase.from("agregados") as any)
      .select("*")
      .eq("contrato_id", contratoId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Error fetching agregados by contrato ID from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((a: Agregado | null): a is Agregado => a !== null);
  },

  async create(data: Omit<Agregado, "id">): Promise<Agregado | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }
    
    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
      status: "Ativo",
    };

    const { data: inserted, error } = await (supabase.from("agregados") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating agregado in Supabase:", error);
      throw new Error(error.message || "Erro ao criar agregado no Supabase.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Agregados", "CREATE", result.id, `Agregado ${result.nome} adicionado ao contrato ID ${result.contratoId}`);
    }
    return result;
  },

  async update(id: string | number, data: Partial<Agregado>): Promise<Agregado | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("agregados") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating agregado in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar agregado no Supabase.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Agregados", "UPDATE", result.id, `Agregado ${result.nome} atualizado`);
    }
    return result;
  },

  async remove(id: string | number): Promise<boolean> {
    const { error } = await (supabase.from("agregados") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting agregado from Supabase:", error);
      throw new Error(error.message || "Erro ao excluir agregado no Supabase.");
    }

    await auditLogSupabaseService.logActivity("Agregados", "DELETE", id, `Agregado ID ${id} excluído permanentemente`);
    return true;
  },
};
