export interface TenantConfig {
  tenantId: string;
  empresa: string;
  responsavel: string;
  tipo: string;
  logo?: string;
  tema?: string;
}

export const FALLBACK_TENANT: TenantConfig = {
  tenantId: "demo",
  empresa: "Memorius Demo",
  responsavel: "Administrador Demo",
  tipo: "admin",
};
