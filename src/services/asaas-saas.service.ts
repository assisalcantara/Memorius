/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { SaasGatewayConfig } from "@/types";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
}

export const asaasSaasService = {
  async getConfig(): Promise<SaasGatewayConfig | null> {
    const { data, error } = await (supabase
      .from("saas_gateway_config") as any)
      .select("*")
      .eq("provider", "ASAAS")
      .maybeSingle();

    if (error) {
      console.warn("[ASAAS SaaS Service] Error fetching config:", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      provider: data.provider,
      ambiente: data.ambiente as any,
      apiKey: data.api_key ? "****************************************" : "", // Mask API key
      ativo: data.ativo,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async saveConfig(config: Omit<SaasGatewayConfig, "id" | "createdAt" | "updatedAt">): Promise<boolean> {
    // 1. Fetch current config to check if exists
    const { data: current } = await (supabase
      .from("saas_gateway_config") as any)
      .select("id, api_key")
      .eq("provider", "ASAAS")
      .maybeSingle();

    const payload: any = {
      provider: "ASAAS",
      ambiente: config.ambiente,
      ativo: config.ativo
    };

    // If API Key is not masked, save it. Otherwise keep database value
    if (config.apiKey && !config.apiKey.includes("*")) {
      payload.api_key = config.apiKey;
    }

    let error;
    if (current) {
      const { error: err } = await (supabase.from("saas_gateway_config") as any)
        .update(payload)
        .eq("id", current.id);
      error = err;
    } else {
      // If creating new config, require apiKey
      if (!payload.api_key) {
        throw new Error("A API Key é obrigatória para a primeira configuração.");
      }
      const { error: err } = await (supabase.from("saas_gateway_config") as any)
        .insert(payload);
      error = err;
    }

    if (error) {
      console.warn("[ASAAS SaaS Service] Error saving config:", error.message);
      throw new Error(error.message);
    }
    return true;
  },

  async testConnection(ambiente: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/asaas", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "testConnection",
        payload: { ambiente, apiKey }
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      return { success: false, message: errData.error || "Erro ao testar conexão." };
    }

    return await res.json();
  },

  async createCustomer(data: { name: string; email: string; cpfCnpj: string; phone?: string; mobilePhone?: string }): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/asaas", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "createCustomer",
        payload: data
      })
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || "Falha ao criar cliente no ASAAS.");
    }
    return resData;
  },

  async createPayment(data: { customer: string; value: number; dueDate: string; description: string }): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/asaas", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "createPayment",
        payload: data
      })
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || "Falha ao gerar cobrança no ASAAS.");
    }
    return resData;
  }
};
