/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Cliente } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Cliente | null {
  if (!db) return null;
  return {
    id: db.id,
    nomeCompleto: db.nome,
    cpf: db.cpf || "",
    rg: db.rg || "",
    dataNascimento: db.data_nascimento || "",
    sexo: db.sexo || "MASCULINO",
    nomePai: db.nome_pai || "",
    nomeMae: db.nome_mae || "",
    naturalidade: db.naturalidade || "",
    estadoCivil: db.estado_civil || "Solteiro",
    nomeConjuge: db.nome_conjuge || "",
    profissao: db.profissao || "",
    localTrabalho: db.local_trabalho || "",
    cep: db.cep || "",
    logradouro: db.logradouro || "",
    numero: db.numero || "",
    complemento: db.complemento || "",
    bairro: db.bairro || "",
    cidade: db.cidade || "",
    estado: db.uf || "",
    telefone: db.telefone || "",
    email: db.email || "",
    status: db.status || "Ativo",
    dataCadastro: db.created_at ? db.created_at.split("T")[0] : "",
  };
}

function toSnake(ui: Partial<Cliente>): any {
  if (!ui) return null;
  
  const payload: any = {};
  if (ui.nomeCompleto !== undefined) payload.nome = ui.nomeCompleto;
  if (ui.cpf !== undefined) payload.cpf = ui.cpf;
  if (ui.rg !== undefined) payload.rg = ui.rg;
  if (ui.dataNascimento !== undefined) payload.data_nascimento = ui.dataNascimento || null;
  if (ui.sexo !== undefined) payload.sexo = ui.sexo;
  if (ui.nomePai !== undefined) payload.nome_pai = ui.nomePai;
  if (ui.nomeMae !== undefined) payload.nome_mae = ui.nomeMae;
  if (ui.naturalidade !== undefined) payload.naturalidade = ui.naturalidade;
  if (ui.estadoCivil !== undefined) payload.estado_civil = ui.estadoCivil;
  if (ui.nomeConjuge !== undefined) payload.nome_conjuge = ui.nomeConjuge;
  if (ui.profissao !== undefined) payload.profissao = ui.profissao;
  if (ui.localTrabalho !== undefined) payload.local_trabalho = ui.localTrabalho;
  if (ui.cep !== undefined) payload.cep = ui.cep;
  if (ui.logradouro !== undefined) payload.logradouro = ui.logradouro;
  if (ui.numero !== undefined) payload.numero = ui.numero;
  if (ui.complemento !== undefined) payload.complemento = ui.complemento;
  if (ui.bairro !== undefined) payload.bairro = ui.bairro;
  if (ui.cidade !== undefined) payload.cidade = ui.cidade;
  if (ui.estado !== undefined) payload.uf = ui.estado;
  if (ui.telefone !== undefined) payload.telefone = ui.telefone;
  if (ui.email !== undefined) payload.email = ui.email;
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

export const clientesSupabaseService = {
  async getAll(): Promise<Cliente[]> {
    const { data, error } = await (supabase.from("clientes") as any)
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Error fetching clientes from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((c: Cliente | null): c is Cliente => c !== null);
  },

  async getById(id: string | number): Promise<Cliente | null> {
    const { data, error } = await (supabase.from("clientes") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching cliente by ID from Supabase:", error);
      return null;
    }

    return toCamel(data);
  },

  async create(data: Omit<Cliente, "id">): Promise<Cliente | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }
    
    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
    };

    const { data: inserted, error } = await (supabase.from("clientes") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating cliente in Supabase:", error);
      throw new Error(error.message || "Erro ao criar cliente no Supabase.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Clientes", "CREATE", result.id, `Cliente ${result.nomeCompleto} cadastrado`);
    }
    return result;
  },

  async update(id: string | number, data: Partial<Cliente>): Promise<Cliente | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("clientes") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating cliente in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar cliente no Supabase.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity("Clientes", "UPDATE", result.id, `Dados de ${result.nomeCompleto} atualizados`);
    }
    return result;
  },

  async remove(id: string | number): Promise<boolean> {
    const { error } = await (supabase.from("clientes") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting cliente from Supabase:", error);
      throw new Error(error.message || "Erro ao excluir cliente no Supabase.");
    }

    await auditLogSupabaseService.logActivity("Clientes", "DELETE", id, `Cliente ID ${id} excluído permanentemente`);
    return true;
  },
};
