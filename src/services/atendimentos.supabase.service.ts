/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Atendimento } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Atendimento | null {
  if (!db) return null;
  return {
    id: db.id,
    contratoId: db.contrato_id || "",
    clienteNome: db.cliente_nome || "",
    planoNome: db.plano_nome || "",
    data: db.data || "",
    hora: db.hora || "",
    local: db.local || "",
    tipo: db.tipo || "TITULAR",
    responsavel: db.responsavel || "",
    telefone: db.telefone || "",
    observacoes: db.observacoes || "",
    status: db.status || "Aberto",
    operador: db.operador || "",
  };
}

function toSnake(ui: Partial<Atendimento>): any {
  if (!ui) return null;
  
  const payload: any = {};
  if (ui.contratoId !== undefined) payload.contrato_id = ui.contratoId || null;
  if (ui.clienteNome !== undefined) payload.cliente_nome = ui.clienteNome;
  if (ui.planoNome !== undefined) payload.plano_nome = ui.planoNome;
  if (ui.data !== undefined) payload.data = ui.data || null;
  if (ui.hora !== undefined) payload.hora = ui.hora;
  if (ui.local !== undefined) payload.local = ui.local;
  if (ui.tipo !== undefined) payload.tipo = ui.tipo;
  if (ui.responsavel !== undefined) payload.responsavel = ui.responsavel;
  if (ui.telefone !== undefined) payload.telefone = ui.telefone;
  if (ui.observacoes !== undefined) payload.observacoes = ui.observacoes;
  if (ui.status !== undefined) payload.status = ui.status;
  if (ui.operador !== undefined) payload.operador = ui.operador;
  
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

export const atendimentosSupabaseService = {
  async getAll(): Promise<Atendimento[]> {
    const { data, error } = await (supabase.from("atendimentos") as any)
      .select("*")
      .order("data", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {
      console.error("Error fetching atendimentos from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((a: Atendimento | null): a is Atendimento => a !== null);
  },

  async getById(id: string | number): Promise<Atendimento | null> {
    const { data, error } = await (supabase.from("atendimentos") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching atendimento by ID from Supabase:", error);
      return null;
    }

    return toCamel(data);
  },

  async create(data: Omit<Atendimento, "id">): Promise<Atendimento | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }
    
    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
    };

    const { data: inserted, error } = await (supabase.from("atendimentos") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating atendimento in Supabase:", error);
      throw new Error(error.message || "Erro ao criar atendimento no Supabase.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity(
        "Atendimentos",
        "CREATE",
        result.id,
        `Atendimento para ${result.clienteNome} aberto`
      );
    }
    return result;
  },

  async update(id: string | number, data: Partial<Atendimento>): Promise<Atendimento | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("atendimentos") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating atendimento in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar atendimento no Supabase.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      const isFinalized = data.status === "Finalizado";
      const hasStatusChange = data.status !== undefined;
      const action = isFinalized ? "FINALIZAR" : hasStatusChange ? "ALTERAR_STATUS" : "UPDATE";
      const phrase = isFinalized ? "finalizado" : hasStatusChange ? `status alterado para ${data.status}` : "atualizado";
      
      await auditLogSupabaseService.logActivity(
        "Atendimentos",
        action,
        result.id,
        `Atendimento de ${result.clienteNome} foi ${phrase}`
      );
    }
    return result;
  },

  async remove(id: string | number): Promise<boolean> {
    const { error } = await (supabase.from("atendimentos") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting atendimento from Supabase:", error);
      throw new Error(error.message || "Erro ao excluir atendimento no Supabase.");
    }

    await auditLogSupabaseService.logActivity(
      "Atendimentos",
      "DELETE",
      id,
      `Atendimento ID ${id} excluído permanentemente`
    );
    return true;
  },
};
