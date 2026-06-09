/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { saasPlansSupabaseService } from "./saas-plans.supabase.service";
import { TenantSubscription } from "@/types";

// Supports Super Admin Dashboard KPIs and metrics
export interface TenantAdminData {
  id?: string;
  empresa: string;
  responsavel: string;
  tipo?: string;
  status?: string;
  created_at?: string;
  subscription?: TenantSubscription;
}

export interface SaaSMetrics {
  totalTenants: number;
  activeTenants: number;
  blockedTenants: number;
  totalUsers: number;
  newTenants30Days: number;
}

export const tenantsAdminSupabaseService = {
  async getAllTenants(): Promise<TenantAdminData[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*, tenant_subscriptions(*, saas_plans(nome))")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[tenantsAdminService] Error fetching all tenants:", error.message);
      return [];
    }

    return (data || []).map((t: any) => {
      let subscription: any = undefined;
      const dbSub = Array.isArray(t.tenant_subscriptions) ? t.tenant_subscriptions[0] : t.tenant_subscriptions;
      if (dbSub) {
        subscription = {
          id: dbSub.id,
          tenantId: dbSub.tenant_id,
          tenantEmpresa: t.empresa,
          saasPlanId: dbSub.saas_plan_id,
          saasPlanNome: dbSub.saas_plans?.nome || undefined,
          status: dbSub.status,
          ciclo: dbSub.ciclo,
          valor: Number(dbSub.valor),
          dataInicio: dbSub.data_inicio,
          dataVencimento: dbSub.data_vencimento,
          dataCancelamento: dbSub.data_cancelamento || undefined,
          observacoes: dbSub.observacoes || undefined,
          createdAt: dbSub.created_at,
          updatedAt: dbSub.updated_at
        };
      }
      return {
        id: t.id,
        empresa: t.empresa,
        responsavel: t.responsavel,
        tipo: t.tipo,
        status: t.status,
        created_at: t.created_at,
        subscription
      };
    });
  },

  async getTenantById(id: string): Promise<any> {
    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (tErr) {
      console.warn("[tenantsAdminService] Error fetching tenant by ID:", tErr.message);
      return null;
    }

    const { data: config, error: cErr } = await supabase
      .from("empresa_config")
      .select("*")
      .eq("tenant_id", id)
      .maybeSingle();

    if (cErr) {
      console.warn("[tenantsAdminService] Error fetching company config for tenant:", cErr.message);
    }

    const { data: adminProfile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", id)
      .eq("role", "ADMIN")
      .limit(1);

    if (pErr) {
      console.warn("[tenantsAdminService] Error fetching admin profile for tenant:", pErr.message);
    }

    return {
      tenant,
      config,
      admin: adminProfile && adminProfile.length > 0 ? adminProfile[0] : null
    };
  },

  async createTenant(data: {
    empresa: string;
    nomeFantasia: string;
    cnpj: string;
    telefone: string;
    celular: string;
    email: string;
    cidade: string;
    uf: string;
    adminNome: string;
    adminEmail: string;
    adminTelefone: string;
    planoSaasId?: string;
    planoSaas?: string;
    status: string;
    limiteUsuarios: number;
    limiteClientes?: number;
    limiteContratos?: number;
    limiteStorageMb?: number;
    trialDias?: number;
    valorAssinatura?: number;
    observacoes: string;
    password?: string;
  }): Promise<{ success: boolean; tenantId?: string; inviteSent: boolean; message?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const finalPlanoSaasId = data.planoSaasId || data.planoSaas || "";

      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          ...data,
          planoSaasId: finalPlanoSaasId
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao cadastrar o tenant.");
      }

      const tenantId = resData.tenantId;

      // Create initial subscription using planoSaasId
      try {
        if (finalPlanoSaasId) {
          const plan = await saasPlansSupabaseService.getById(finalPlanoSaasId);
          if (plan) {
            const trialDays = typeof data.trialDias === "number" ? data.trialDias : (plan.trialDias || 30);
            const statusInicial = data.status || "TRIAL";
            const valorAssinatura = typeof data.valorAssinatura === "number" ? data.valorAssinatura : (plan.valorMensal || 0);

            const vencimento = new Date();
            if (statusInicial === "TRIAL") {
              vencimento.setDate(vencimento.getDate() + trialDays);
            } else {
              vencimento.setDate(vencimento.getDate() + 30);
            }

            const { error: subErr } = await (supabase.from("tenant_subscriptions") as any).insert({
              tenant_id: tenantId,
              saas_plan_id: plan.id,
              status: statusInicial,
              ciclo: "MENSAL",
              valor: valorAssinatura,
              data_inicio: new Date().toISOString().split("T")[0],
              data_vencimento: vencimento.toISOString().split("T")[0],
              observacoes: data.observacoes || "Assinatura inicial criada pelo Super Admin."
            });

            if (subErr) {
              console.warn("[tenantsAdminService] Warning: Failed to insert tenant subscription:", subErr.message);
            }
          }
        }
      } catch (errSub: any) {
        console.warn("[tenantsAdminService] Error creating subscription:", errSub.message);
      }

      return {
        success: true,
        tenantId,
        inviteSent: false,
        message: "Tenant cadastrado com sucesso!"
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.warn("[tenantsAdminService] Error in createTenant:", error.message);
      return {
        success: false,
        inviteSent: false,
        message: error.message || "Erro inesperado ao cadastrar o tenant."
      };
    }
  },

  async updateTenant(
    id: string,
    data: {
      empresa: string;
      responsavel: string;
      status: string;
      password?: string;
      limiteUsuarios?: number;
      limiteClientes?: number;
      limiteContratos?: number;
      limiteStorageMb?: number;
      saasPlanId?: string;
      subStatus?: string;
      subCiclo?: string;
      subValor?: number;
      subDataInicio?: string;
      subDataVencimento?: string;
      subObservacoes?: string;
    }
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/tenants", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          tenantId: id,
          ...data
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao atualizar o tenant.");
      }

      return true;
    } catch (err: unknown) {
      const error = err as Error;
      console.warn("[tenantsAdminService] Error updating tenant:", error.message);
      return false;
    }
  },

  async removeTenant(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("[tenantsAdminService] Error deleting tenant:", error.message);
        return false;
      }

      // Register Audit Log
      try {
        await (supabase.from("audit_logs") as any).insert({
          tenant_id: id,
          modulo: "SAAS_ADMIN",
          acao: "DELETE_TENANT",
          registro_id: String(id),
          descricao: `Tenant excluído do sistema.`,
          user_name: "Super Admin"
        });
      } catch {}

      return true;
    } catch (err: any) {
      console.warn("[tenantsAdminService] Error in removeTenant:", err.message);
      return false;
    }
  },

  async toggleTenantStatus(id: string, newStatus: string): Promise<boolean> {
    const { error } = await (supabase.from("tenants") as any)
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.warn("[tenantsAdminService] Error toggling tenant status:", error.message);
      return false;
    }

    const logAction = newStatus === "ATIVO" ? "ENABLE_TENANT" : "DISABLE_TENANT";

    // Register Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        tenant_id: id,
        modulo: "SAAS_ADMIN",
        acao: logAction,
        registro_id: String(id),
        descricao: `Status do Tenant alterado para ${newStatus}.`,
        user_name: "Super Admin"
      });
    } catch {}

    return true;
  },

  async getSaasMetrics(): Promise<SaaSMetrics> {
    try {
      // 1. Total Tenants
      const { count: total, error: e1 } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true });

      // 2. Active Tenants
      const { count: active, error: e2 } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("status", "ATIVO");

      // 3. Blocked Tenants
      const { count: blocked, error: e3 } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("status", "BLOQUEADO");

      // 4. Total Users
      const { count: users, error: e4 } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // 5. New Tenants in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: newTenants, error: e5 } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (e1 || e2 || e3 || e4 || e5) {
        console.warn("[tenantsAdminService] Warning: Some metrics queries failed.");
      }

      return {
        totalTenants: total || 0,
        activeTenants: active || 0,
        blockedTenants: blocked || 0,
        totalUsers: users || 0,
        newTenants30Days: newTenants || 0
      };
    } catch (e: any) {
      console.warn("[tenantsAdminService] Failed to calculate metrics:", e.message);
      return {
        totalTenants: 0,
        activeTenants: 0,
        blockedTenants: 0,
        totalUsers: 0,
        newTenants30Days: 0
      };
    }
  }
};
