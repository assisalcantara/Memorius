/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Mensalidade } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Mensalidade | null {
  if (!db) return null;
  return {
    id: db.id,
    contratoId: db.contrato_id || "",
    numeroContrato: db.numero_contrato || "",
    clienteNome: db.cliente_nome || "",
    planoNome: db.plano_name || db.plano_nome || "",
    competencia: db.competencia || "",
    dataVencimento: db.data_vencimento || "",
    valor: db.valor !== undefined ? String(db.valor) : "0",
    status: db.status || "EM_ABERTO",
    dataPagamento: db.data_pagamento || "",
    valorRecebido: db.valor_recebido !== null && db.valor_recebido !== undefined ? String(db.valor_recebido) : "",
    observacao: db.observacao || "",
  };
}

function toSnake(ui: Partial<Mensalidade>): any {
  if (!ui) return null;
  
  const payload: any = {};
  if (ui.contratoId !== undefined) payload.contrato_id = ui.contratoId || null;
  if (ui.numeroContrato !== undefined) payload.numero_contrato = ui.numeroContrato;
  if (ui.clienteNome !== undefined) payload.cliente_nome = ui.clienteNome;
  if (ui.planoNome !== undefined) payload.plano_nome = ui.planoNome;
  if (ui.competencia !== undefined) payload.competencia = ui.competencia;
  if (ui.dataVencimento !== undefined) payload.data_vencimento = ui.dataVencimento || null;
  if (ui.valor !== undefined) payload.valor = ui.valor ? Number(ui.valor) : 0;
  if (ui.status !== undefined) payload.status = ui.status;
  if (ui.dataPagamento !== undefined) payload.data_pagamento = ui.dataPagamento || null;
  if (ui.valorRecebido !== undefined) payload.valor_recebido = ui.valorRecebido ? Number(ui.valorRecebido) : null;
  if (ui.observacao !== undefined) payload.observacao = ui.observacao;
  
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

export const mensalidadesSupabaseService = {
  async getAll(): Promise<Mensalidade[]> {
    const { data, error } = await (supabase.from("mensalidades") as any)
      .select("*")
      .order("data_vencimento", { ascending: false });

    if (error) {
      console.error("Error fetching mensalidades from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((m: Mensalidade | null): m is Mensalidade => m !== null);
  },

  async getById(id: string | number): Promise<Mensalidade | null> {
    const { data, error } = await (supabase.from("mensalidades") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching mensalidade by ID from Supabase:", error);
      return null;
    }

    return toCamel(data);
  },

  async create(data: Omit<Mensalidade, "id">): Promise<Mensalidade | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }
    
    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
    };

    const { data: inserted, error } = await (supabase.from("mensalidades") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating mensalidade in Supabase:", error);
      throw new Error(error.message || "Erro ao criar mensalidade no Supabase.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Mensalidades", "CREATE", result.id, `Mensalidade gerada no valor de R$ ${result.valor} para ${result.clienteNome} (Vencimento: ${result.dataVencimento})`);
    }
    return result;
  },

  async update(id: string | number, data: Partial<Mensalidade>): Promise<Mensalidade | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("mensalidades") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating mensalidade in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar mensalidade no Supabase.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      const action = data.status === "PAGO" ? "RECEBER" : data.status === "CANCELADO" ? "CANCELAR" : "UPDATE";
      const phrase = data.status === "PAGO" ? "recebida (paga)" : data.status === "CANCELADO" ? "cancelada" : "atualizada";
      await auditLogSupabaseService.logActivity("Mensalidades", action, result.id, `Mensalidade de ${result.clienteNome} no valor de R$ ${result.valor} foi ${phrase}`);
    }
    return result;
  },

  async remove(id: string | number): Promise<boolean> {
    const { error } = await (supabase.from("mensalidades") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting mensalidade from Supabase:", error);
      throw new Error(error.message || "Erro ao excluir mensalidade no Supabase.");
    }

    await auditLogSupabaseService.logActivity("Mensalidades", "DELETE", id, `Mensalidade ID ${id} excluída`);
    return true;
  },
};
