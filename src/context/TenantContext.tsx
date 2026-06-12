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

    // Load from cache on client mount to prevent flashing
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("legacyflow_user");
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.tenant_id && active) {
            setTimeout(() => {
              if (active) {
                setTenant({
                  tenantId: data.tenant_id,
                  empresa: data.empresa || "",
                  responsavel: data.responsavel || "",
                  tipo: data.tipo || ""
                });
                setUserProfile({
                  id: "",
                  tenant_id: data.tenant_id,
                  nome: data.responsavel,
                  email: data.email,
                  role: data.tipo,
                  role_id: null,
                  role_name: data.tipo,
                  ativo: true
                });
                setLoading(false);
              }
            }, 0);
          }
        } catch {}
      }
    }

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
        if (active) {
          setLoading(true);
        }
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

    let subscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (active) {
          await loadSessionAndProfile(session);
        }
      } catch (err) {
        console.error("Error in initAuth:", err);
        if (active) {
          setLoading(false);
        }
      }

      if (active) {
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
          if (active) {
            if (event === "SIGNED_OUT") {
              loadSessionAndProfile(null);
            } else if (session?.user) {
              setUserProfile(prev => {
                const emailChanged = !prev || prev.email !== session.user.email;
                if (emailChanged) {
                  setTimeout(() => {
                    if (active) {
                      loadSessionAndProfile(session);
                    }
                  }, 0);
                }
                return prev;
              });
            }
          }
        });
        subscription = sub;
      }
    }

    initAuth();

    return () => {
      active = false;
      if (subscription) {
        subscription.unsubscribe();
      }
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
