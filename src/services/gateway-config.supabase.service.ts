/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { GatewayConfig } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

// TODO: criptografar api_key e webhook_secret antes de produção.

function toCamel(db: any): GatewayConfig | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    provider: db.provider,
    environment: db.environment,
    apiKey: db.api_key,
    webhookSecret: db.webhook_secret,
    enabled: db.enabled,
    lastTestAt: db.last_test_at,
    lastTestStatus: db.last_test_status,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function toSnake(ui: Partial<GatewayConfig>): any {
  if (!ui) return null;
  const payload: any = {};
  if (ui.tenantId !== undefined) payload.tenant_id = ui.tenantId;
  if (ui.provider !== undefined) payload.provider = ui.provider;
  if (ui.environment !== undefined) payload.environment = ui.environment;
  if (ui.apiKey !== undefined) payload.api_key = ui.apiKey;
  if (ui.webhookSecret !== undefined) payload.webhook_secret = ui.webhookSecret;
  if (ui.enabled !== undefined) payload.enabled = ui.enabled;
  if (ui.lastTestAt !== undefined) payload.last_test_at = ui.lastTestAt;
  if (ui.lastTestStatus !== undefined) payload.last_test_status = ui.lastTestStatus;
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

export const gatewayConfigSupabaseService = {
  async getConfig(): Promise<GatewayConfig | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    const { data, error } = await (supabase.from("gateway_configs") as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("provider", "ASAAS")
      .maybeSingle();

    if (error) {
      console.error("Error fetching gateway config:", error);
      return null;
    }

    return toCamel(data);
  },

  async saveConfig(data: Omit<GatewayConfig, "id" | "tenantId"> & { id?: string }): Promise<GatewayConfig | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }

    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
      provider: "ASAAS",
    };

    let result;
    if (data.id) {
      const { data: updated, error } = await (supabase.from("gateway_configs") as any)
        .update(dbPayload)
        .eq("id", data.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating gateway config:", error);
        throw new Error(error.message || "Erro ao atualizar configuração do gateway.");
      }
      result = updated;
    } else {
      const { data: inserted, error } = await (supabase.from("gateway_configs") as any)
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error("Error inserting gateway config:", error);
        throw new Error(error.message || "Erro ao criar configuração do gateway.");
      }
      result = inserted;
    }

    const camelResult = toCamel(result);
    if (camelResult?.id) {
      await auditLogSupabaseService.logActivity(
        "GATEWAY_CONFIG",
        "SAVE",
        camelResult.id,
        `Configuração do gateway ASAAS salva. Ambiente: ${camelResult.environment}. Ativo: ${camelResult.enabled}`
      );
    }
    return camelResult;
  },

  async toggleEnabled(enabled: boolean): Promise<GatewayConfig | null> {
    const current = await this.getConfig();
    if (!current || !current.id) {
      throw new Error("Configuração do gateway não encontrada para ativar/desativar.");
    }

    const { data, error } = await (supabase.from("gateway_configs") as any)
      .update({ enabled })
      .eq("id", current.id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling gateway enabled state:", error);
      throw new Error(error.message || "Erro ao alterar status de ativação do gateway.");
    }

    const camelResult = toCamel(data);
    if (camelResult?.id) {
      await auditLogSupabaseService.logActivity(
        "GATEWAY_CONFIG",
        "TOGGLE_ENABLED",
        camelResult.id,
        `Configuração do gateway ASAAS ${enabled ? "ativada" : "desativada"}`
      );
    }
    return camelResult;
  },

  async updateTestStatus(status: string): Promise<GatewayConfig | null> {
    const current = await this.getConfig();
    if (!current || !current.id) {
      throw new Error("Configuração do gateway não encontrada para atualizar teste.");
    }

    const { data, error } = await (supabase.from("gateway_configs") as any)
      .update({
        last_test_status: status,
        last_test_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating gateway test status:", error);
      throw new Error(error.message || "Erro ao atualizar status de teste do gateway.");
    }

    return toCamel(data);
  },
};
