/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { EmpresaConfig } from "@/types";

function toCamel(db: any): EmpresaConfig | null {
  if (!db) return null;
  return {
    id: db.id,
    tenant_id: db.tenant_id,
    razaoSocial: db.razao_social || "",
    nomeFantasia: db.nome_fantasia || "",
    cnpj: db.cnpj || "",
    telefone: db.telefone || "",
    celular: db.celular || "",
    email: db.email || "",
    site: db.site || "",
    logradouro: db.logradouro || "",
    numero: db.numero || "",
    bairro: db.bairro || "",
    cidade: db.cidade || "",
    estado: db.uf || "",
    cep: db.cep || "",
    logoUrl: db.logo_url || "",
    corPrimaria: db.cor_primaria || "#2f80ed",
    corSecundaria: db.cor_secundaria || "#27ae60",
  };
}

function toSnake(ui: Partial<EmpresaConfig>): any {
  if (!ui) return null;
  const payload: any = {};
  if (ui.razaoSocial !== undefined) payload.razao_social = ui.razaoSocial;
  if (ui.nomeFantasia !== undefined) payload.nome_fantasia = ui.nomeFantasia;
  if (ui.cnpj !== undefined) payload.cnpj = ui.cnpj;
  if (ui.telefone !== undefined) payload.telefone = ui.telefone;
  if (ui.celular !== undefined) payload.celular = ui.celular;
  if (ui.email !== undefined) payload.email = ui.email;
  if (ui.site !== undefined) payload.site = ui.site;
  if (ui.logradouro !== undefined) payload.logradouro = ui.logradouro;
  if (ui.numero !== undefined) payload.numero = ui.numero;
  if (ui.bairro !== undefined) payload.bairro = ui.bairro;
  if (ui.cidade !== undefined) payload.cidade = ui.cidade;
  if (ui.estado !== undefined) payload.uf = ui.estado;
  if (ui.cep !== undefined) payload.cep = ui.cep;
  if (ui.logoUrl !== undefined) payload.logo_url = ui.logoUrl;
  if (ui.corPrimaria !== undefined) payload.cor_primaria = ui.corPrimaria;
  if (ui.corSecundaria !== undefined) payload.cor_secundaria = ui.corSecundaria;
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

const defaultFallbackConfig = (tenantId: string): EmpresaConfig => ({
  id: "",
  tenant_id: tenantId,
  razaoSocial: "Memorius Ltda",
  nomeFantasia: "Memorius",
  cnpj: "",
  telefone: "",
  celular: "",
  email: "",
  site: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "SP",
  cep: "",
  logoUrl: "",
  corPrimaria: "#0b4f59",
  corSecundaria: "#6c757d",
});

export const empresaConfigSupabaseService = {
  async getConfig(): Promise<EmpresaConfig | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return null;

    const { data, error } = await supabase
      .from("empresa_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      console.warn(`[Config Service] Error fetching configurations: message="${error.message}", code="${error.code}", details="${error.details}"`);
      return defaultFallbackConfig(tenantId);
    }

    if (!data) {
      return defaultFallbackConfig(tenantId);
    }

    return toCamel(data);
  },

  async saveConfig(data: Partial<EmpresaConfig>): Promise<EmpresaConfig | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }

    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
    };

    const { data: upserted, error } = await supabase
      .from("empresa_config")
      .upsert(dbPayload, { onConflict: "tenant_id" })
      .select()
      .single();

    if (error) {
      console.warn(`[Config Service] Error saving configurations: message="${error.message}", code="${error.code}", details="${error.details}"`);
      throw new Error(error.message || "Erro ao salvar as configurações da empresa.");
    }

    return toCamel(upserted);
  },

  async uploadLogo(file: File, tenantId: string): Promise<string> {
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const filePath = `${tenantId}/logo-${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      throw new Error(uploadError.message || "Erro ao realizar o upload da logomarca.");
    }

    const { data } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    return data?.publicUrl || "";
  }
};
