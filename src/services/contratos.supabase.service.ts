/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Contrato } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Contrato | null {
  if (!db) return null;
  
  // Resolve joined relational names
  const clienteNome = db.clientes?.nome || "Cliente Removido";
  const planoNome = db.planos?.nome || "Plano Removido";

  return {
    id: db.id,
    numeroContrato: db.numero_contrato,
    clienteId: db.cliente_id || "",
    clienteNome,
    planoId: db.plano_id || "",
    planoNome,
    dataInicio: db.data_adesao || "",
    status: db.status || "Ativo",
  };
}

function toSnake(ui: Partial<Contrato>): any {
  if (!ui) return null;
  
  const payload: any = {};
  if (ui.numeroContrato !== undefined) payload.numero_contrato = ui.numeroContrato;
  if (ui.clienteId !== undefined) payload.cliente_id = ui.clienteId || null;
  if (ui.planoId !== undefined) payload.plano_id = ui.planoId || null;
  if (ui.dataInicio !== undefined) payload.data_adesao = ui.dataInicio || null;
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

export const contratosSupabaseService = {
  async getAll(): Promise<Contrato[]> {
    const { data, error } = await (supabase.from("contratos") as any)
      .select(`
        *,
        clientes:cliente_id (nome),
        planos:plano_id (nome)
      `)
      .order("numero_contrato", { ascending: true });

    if (error) {
      console.error("Error fetching contratos from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((c: Contrato | null): c is Contrato => c !== null);
  },

  async getById(id: string | number): Promise<Contrato | null> {
    const { data, error } = await (supabase.from("contratos") as any)
      .select(`
        *,
        clientes:cliente_id (nome),
        planos:plano_id (nome)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching contrato by ID from Supabase:", error);
      return null;
    }

    return toCamel(data);
  },

  async create(data: Omit<Contrato, "id">): Promise<Contrato | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }
    
    // Fetch plano details to store the current valor_mensal on the contract row
    let planoValor = 0;
    if (data.planoId) {
      const { data: planoData } = await (supabase.from("planos") as any)
        .select("valor_mensal")
        .eq("id", data.planoId)
        .single();
      if (planoData) {
        planoValor = Number(planoData.valor_mensal) || 0;
      }
    }

    const dbPayload = {
      ...toSnake(data),
      valor_mensal: planoValor,
      tenant_id: tenantId,
    };

    const { data: inserted, error } = await (supabase.from("contratos") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating contrato in Supabase:", error);
      throw new Error(error.message || "Erro ao criar contrato no Supabase.");
    }

    // Return mapped object, we need to fetch the inserted with names
    const result = await this.getById(inserted.id);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Contratos", "CREATE", result.id, `Contrato Nº ${result.numeroContrato} gerado para ${result.clienteNome}`);
    }
    return result;
  },

  async update(id: string | number, data: Partial<Contrato>): Promise<Contrato | null> {
    const dbPayload = toSnake(data);

    // If plan is changed, update current contract valor_mensal as well
    if (data.planoId) {
      const { data: planoData } = await (supabase.from("planos") as any)
        .select("valor_mensal")
        .eq("id", data.planoId)
        .single();
      if (planoData) {
        dbPayload.valor_mensal = Number(planoData.valor_mensal) || 0;
      }
    }

    const { data: updated, error } = await (supabase.from("contratos") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating contrato in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar contrato no Supabase.");
    }

    const result = await this.getById(updated.id);
    if (result && result.id) {
      const isCanceled = data.status === "Cancelado";
      const action = isCanceled ? "CANCELAR" : "UPDATE";
      const phrase = isCanceled ? "cancelado" : "atualizado";
      await auditLogSupabaseService.logActivity("Contratos", action, result.id, `Contrato Nº ${result.numeroContrato} ${phrase}`);
    }
    return result;
  },

  async remove(id: string | number): Promise<boolean> {
    const { error } = await (supabase.from("contratos") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting contrato from Supabase:", error);
      throw new Error(error.message || "Erro ao excluir contrato no Supabase.");
    }

    await auditLogSupabaseService.logActivity("Contratos", "DELETE", id, `Contrato ID ${id} excluído permanentemente`);
    return true;
  },
};
