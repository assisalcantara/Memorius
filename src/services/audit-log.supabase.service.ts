/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { AuditLog } from "@/types";

export const auditLogSupabaseService = {
  async logActivity(modulo: string, acao: string, registroId: string | number, descricao: string): Promise<void> {
    try {
      let tenantId = null;
      let userName = null;
      let roleName = null;

      if (typeof window !== "undefined") {
        try {
          const storedUser = window.localStorage.getItem("legacyflow_user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            tenantId = user.tenant_id || null;
            userName = user.responsavel || user.email || null;
            roleName = user.tipo || null;
          }
        } catch {}
      }

      if (!tenantId) return;

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const { error } = await (supabase.from("audit_logs") as any)
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          user_name: userName,
          role_name: roleName,
          modulo,
          acao,
          registro_id: String(registroId),
          descricao,
          ip: null
        });

      if (error) {
        console.warn("Failed to write audit log:", error.message);
      }
    } catch (err: any) {
      console.warn("Exception in audit log service:", err.message || err);
    }
  },

  async getLogs(): Promise<AuditLog[]> {
    const { data, error } = await (supabase.from("audit_logs") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(`[AuditLog Service] Failed to fetch audit logs: message="${error.message}", code="${error.code}", details="${error.details}"`);
      return [];
    }

    return (data || []) as AuditLog[];
  }
};
