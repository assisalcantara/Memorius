/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { ContractTemplate } from "@/types";

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

export const contractTemplatesSupabaseService = {
  async getAll(): Promise<ContractTemplate[]> {
    const { data, error } = await (supabase.from("contract_templates") as any)
      .select("*")
      .order("titulo", { ascending: true });

    if (error) {
      console.error("Error fetching contract templates:", error);
      return [];
    }

    return data || [];
  },

  async getActive(): Promise<ContractTemplate[]> {
    const { data, error } = await (supabase.from("contract_templates") as any)
      .select("*")
      .eq("ativo", true)
      .order("titulo", { ascending: true });

    if (error) {
      console.error("Error fetching active contract templates:", error);
      return [];
    }

    return data || [];
  },

  async create(template: Omit<ContractTemplate, "id" | "created_at" | "updated_at">): Promise<ContractTemplate | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }

    const payload = {
      titulo: template.titulo,
      conteudo: template.conteudo,
      ativo: template.ativo !== undefined ? template.ativo : true,
      tenant_id: tenantId
    };

    const { data, error } = await (supabase.from("contract_templates") as any)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error creating contract template:", error);
      throw new Error(error.message || "Erro ao criar modelo de contrato.");
    }

    return data;
  },

  async update(id: string, template: Partial<ContractTemplate>): Promise<ContractTemplate | null> {
    const payload: any = {};
    if (template.titulo !== undefined) payload.titulo = template.titulo;
    if (template.conteudo !== undefined) payload.conteudo = template.conteudo;
    if (template.ativo !== undefined) payload.ativo = template.ativo;

    const { data, error } = await (supabase.from("contract_templates") as any)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating contract template:", error);
      throw new Error(error.message || "Erro ao atualizar modelo de contrato.");
    }

    return data;
  },

  async toggleActive(id: string, currentStatus: boolean): Promise<ContractTemplate | null> {
    const { data, error } = await (supabase.from("contract_templates") as any)
      .update({ ativo: !currentStatus })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling contract template status:", error);
      throw new Error(error.message || "Erro ao alterar status do modelo.");
    }

    return data;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await (supabase.from("contract_templates") as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting contract template:", error);
      throw new Error(error.message || "Erro ao excluir modelo de contrato.");
    }

    return true;
  }
};
