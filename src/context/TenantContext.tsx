/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { TenantConfig, FALLBACK_TENANT } from "@/config/tenant";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/context/ToastContext";
import { Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  tenant_id: string | null;
  nome: string | null;
  email: string | null;
  role: string | null;
  role_id: string | null;
  role_name?: string | null;
  ativo: boolean;
}

interface TenantContextProps {
  tenant: TenantConfig;
  setTenant: (tenant: TenantConfig) => void;
  loading: boolean;
  userProfile: UserProfile | null;
}

const TenantContext = createContext<TenantContextProps | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig>(FALLBACK_TENANT);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let active = true;

    async function loadSessionAndProfile(session: Session | null) {
      if (!session?.user) {
        if (active) {
          setTenant(FALLBACK_TENANT);
          setUserProfile(null);
          localStorage.removeItem("legacyflow_user");
          setLoading(false);
        }
        return;
      }

      try {
        const userId = session.user.id;
        const userEmail = session.user.email;
        
        // 1. Fetch user profile with role name
        let { data: profileData, error: profileErr } = await (supabase.from("profiles") as any)
          .select("*, roles(nome)")
          .eq("id", userId)
          .maybeSingle();

        // If not found by ID, search for a pending invite by email
        if (!profileData && userEmail) {
          const { data: inviteProfile } = await (supabase.from("profiles") as any)
            .select("*, roles(nome)")
            .eq("email", userEmail)
            .maybeSingle();

          if (inviteProfile) {
            const { data: updatedProfile, error: updateErr } = await (supabase.from("profiles") as any)
              .update({ id: userId, status: "ATIVO" })
              .eq("email", userEmail)
              .select("*, roles(nome)")
              .maybeSingle();

            if (!updateErr && updatedProfile) {
              profileData = updatedProfile;
              profileErr = null;
            }
          }
        }

        const profileRaw = profileData as unknown as {
          id: string;
          tenant_id: string | null;
          nome: string | null;
          email: string | null;
          role: string | null;
          role_id: string | null;
          ativo: boolean;
          created_at: string;
          roles: { nome: string } | null | { nome: string }[];
        } | null;

        const profile: UserProfile | null = profileRaw
          ? {
              id: profileRaw.id,
              tenant_id: profileRaw.tenant_id,
              nome: profileRaw.nome,
              email: profileRaw.email,
              role: profileRaw.role,
              role_id: profileRaw.role_id,
              ativo: profileRaw.ativo,
              role_name: (Array.isArray(profileRaw.roles) ? profileRaw.roles[0]?.nome : profileRaw.roles?.nome) || profileRaw.role || null,
            }
          : null;

        if (profileErr || !profile) {
          console.error("Error loading user profile:", profileErr);
          toast.error("Erro: Perfil de usuário não encontrado.");
          await supabase.auth.signOut();
          localStorage.removeItem("legacyflow_user");
          if (active) {
            setTenant(FALLBACK_TENANT);
            setUserProfile(null);
            setLoading(false);
          }
          return;
        }

        // 2. Check if profile is active
        if (!profile.ativo) {
          toast.error("Acesso bloqueado: Este usuário está inativo.");
          await supabase.auth.signOut();
          localStorage.removeItem("legacyflow_user");
          if (active) {
            setTenant(FALLBACK_TENANT);
            setUserProfile(null);
            setLoading(false);
          }
          return;
        }

        // 3. Fetch tenant details
        let tenantInfo = FALLBACK_TENANT;
        if (profile.tenant_id) {
          const { data: tenantDataResult, error: tenantErr } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", profile.tenant_id)
            .single();

          const tenantData = tenantDataResult as { id: string; empresa: string; responsavel: string; tipo: string } | null;

          if (!tenantErr && tenantData) {
            tenantInfo = {
              tenantId: tenantData.id,
              empresa: tenantData.empresa,
              responsavel: tenantData.responsavel,
              tipo: tenantData.tipo
            };
          }
        }

        if (active) {
          setTenant(tenantInfo);
          setUserProfile(profile as UserProfile);
          
          // Cache combined data for session/tenant usage
          localStorage.setItem("legacyflow_user", JSON.stringify({
            email: session.user.email,
            empresa: tenantInfo.empresa,
            responsavel: profile.nome || tenantInfo.responsavel,
            tipo: profile.role_name || profile.role || tenantInfo.tipo,
            tenant_id: tenantInfo.tenantId
          }));
          
          setLoading(false);
        }

      } catch (err) {
        console.error("Unexpected error in auth listener:", err);
        if (active) setLoading(false);
      }
    }

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionAndProfile(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionAndProfile(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  return (
    <TenantContext.Provider value={{ tenant, setTenant, loading, userProfile }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
