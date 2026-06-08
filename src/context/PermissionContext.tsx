"use client";

import React, { createContext, useContext } from "react";
import { useTenant } from "@/context/TenantContext";

interface PermissionContextProps {
  hasPermission: (path: string) => boolean;
  roleName: string;
}

const PermissionContext = createContext<PermissionContextProps | undefined>(undefined);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "/dashboard",
    "/dashboard/clientes",
    "/dashboard/planos",
    "/dashboard/contratos",
    "/dashboard/agregados",
    "/dashboard/mensalidades",
    "/dashboard/atendimento",
    "/dashboard/configuracoes",
    "/dashboard/relatorios",
    "/dashboard/auditoria",
    "/dashboard/usuarios"
  ],
  GERENTE: [
    "/dashboard",
    "/dashboard/clientes",
    "/dashboard/planos",
    "/dashboard/contratos",
    "/dashboard/agregados",
    "/dashboard/mensalidades",
    "/dashboard/atendimento",
    "/dashboard/configuracoes",
    "/dashboard/relatorios",
    "/dashboard/auditoria"
  ],
  ATENDENTE: [
    "/dashboard",
    "/dashboard/clientes",
    "/dashboard/atendimento",
    "/dashboard/relatorios",
    "/dashboard/configuracoes"
  ],
  FINANCEIRO: [
    "/dashboard",
    "/dashboard/mensalidades",
    "/dashboard/relatorios",
    "/dashboard/configuracoes"
  ],
  CONSULTA: [
    "/dashboard",
    "/dashboard/clientes",
    "/dashboard/relatorios",
    "/dashboard/configuracoes"
  ]
};

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useTenant();

  const roleNameRaw = userProfile?.role_name || userProfile?.role || "CONSULTA";
  const roleName = roleNameRaw.toUpperCase();

  const hasPermission = (path: string): boolean => {
    // ADMIN has bypass access to everything
    if (roleName === "ADMIN") return true;

    const allowedPaths = ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS["CONSULTA"];
    
    // Exact match or prefix match for subpaths (e.g. /dashboard matches everything under it if needed, but we do exact checks for pages here)
    // To be safe, we check if the path is in the allowed list or if it's the dashboard base.
    return allowedPaths.some(p => path === p || path.startsWith(p + "/"));
  };

  return (
    <PermissionContext.Provider value={{ hasPermission, roleName }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
}
