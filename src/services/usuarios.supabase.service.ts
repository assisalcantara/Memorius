/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Profile | null {
  if (!db) return null;
  return {
    id: db.id,
    tenant_id: db.tenant_id,
    nome: db.nome || "",
    email: db.email || "",
    role: db.role || "",
    role_id: db.role_id || "",
    role_name: (Array.isArray(db.roles) ? db.roles[0]?.nome : db.roles?.nome) || db.role || null,
    ativo: db.ativo !== false,
    status: db.status || "ATIVO",
    created_at: db.created_at,
  };
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

export const usuariosSupabaseService = {
  async getAll(): Promise<Profile[]> {
    const { data, error } = await (supabase.from("profiles") as any)
      .select("*, roles(nome)")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Error fetching users from Supabase:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((p: Profile | null): p is Profile => p !== null);
  },

  async createPendingInvite(email: string, nome: string, roleId: string): Promise<Profile | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }

    // Generate a new random UUID for the pending profile invitation
    const newId = crypto.randomUUID ? crypto.randomUUID() : "invite-" + Math.random().toString(36).substring(2, 15);

    // Get role name for fallback
    const { data: roleData } = await (supabase.from("roles") as any)
      .select("nome")
      .eq("id", roleId)
      .single();
    const roleName = roleData?.nome || "";

    const dbPayload = {
      id: newId,
      tenant_id: tenantId,
      nome,
      email,
      role_id: roleId,
      role: roleName,
      ativo: true,
      status: "CONVIDADO",
    };

    const { data: inserted, error } = await (supabase.from("profiles") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating profile invite:", error);
      throw new Error(error.message || "Erro ao criar perfil de convite.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      // Trigger Supabase Auth Reset Link as invitation flow
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/dashboard",
        });
      } catch (err) {
        console.warn("Failed to send reset/invite email via Auth:", err);
      }

      await auditLogSupabaseService.logActivity(
        "Usuários",
        "CREATE_INVITE",
        result.id,
        `Convite enviado para ${nome} (${email}) com perfil ${roleName}`
      );
    }

    return result;
  },

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile | null> {
    const dbPayload: any = {};
    if (data.nome !== undefined) dbPayload.nome = data.nome;
    if (data.role_id !== undefined) {
      dbPayload.role_id = data.role_id;
      // Fetch role name for compatibility role column
      const { data: roleData } = await (supabase.from("roles") as any)
        .select("nome")
        .eq("id", data.role_id)
        .single();
      if (roleData) {
        dbPayload.role = roleData.nome;
      }
    }
    if (data.status !== undefined) dbPayload.status = data.status;

    const { data: updated, error } = await (supabase.from("profiles") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user profile in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar perfil do usuário.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity(
        "Usuários",
        "UPDATE_USER",
        result.id,
        `Dados do usuário ${result.nome} atualizados`
      );
    }
    return result;
  },

  async toggleStatus(id: string, active: boolean): Promise<Profile | null> {
    const dbPayload = {
      ativo: active,
      status: active ? "ATIVO" : "INATIVO",
    };

    const { data: updated, error } = await (supabase.from("profiles") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling user status in Supabase:", error);
      throw new Error(error.message || "Erro ao alterar status do usuário.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      const action = active ? "ENABLE_USER" : "DISABLE_USER";
      const phrase = active ? "ativado" : "desativado";
      await auditLogSupabaseService.logActivity(
        "Usuários",
        action,
        result.id,
        `Usuário ${result.nome} foi ${phrase}`
      );
    }
    return result;
  },

  async resetPasswordByEmail(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/dashboard",
    });

    if (error) {
      console.error("Error sending reset password link:", error);
      throw new Error(error.message || "Erro ao enviar e-mail de redefinição de senha.");
    }

    // Try to find the profile to log the activity correctly
    const { data: profileData } = await (supabase.from("profiles") as any)
      .select("id, nome")
      .eq("email", email)
      .single();

    const targetId = profileData?.id || "N/A";
    const targetName = profileData?.nome || email;

    await auditLogSupabaseService.logActivity(
      "Usuários",
      "RESET_PASSWORD_EMAIL",
      targetId,
      `Solicitada redefinição de senha para ${targetName} (${email})`
    );

    return true;
  },

  async resendInvite(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/dashboard",
    });

    if (error) {
      console.error("Error resending invite link:", error);
      throw new Error(error.message || "Erro ao reenviar convite.");
    }

    const { data: profileData } = await (supabase.from("profiles") as any)
      .select("id, nome")
      .eq("email", email)
      .single();

    const targetId = profileData?.id || "N/A";
    const targetName = profileData?.nome || email;

    await auditLogSupabaseService.logActivity(
      "Usuários",
      "RESEND_INVITE",
      targetId,
      `Reenviado convite de acesso para ${targetName} (${email})`
    );

    return true;
  }
};
