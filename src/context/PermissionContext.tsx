"use client";

import React, { createContext, useContext } from "react";
import { useTenant } from "@/context/TenantContext";

interface PermissionContextProps {
  hasPermission: (path: string) => boolean;
  roleName: string;
}

const PermissionContext = createContext<PermissionContextProps | undefined>(undefined);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "/admin",
    "/admin/tenants",
    "/admin/tenants/novo",
    "/admin/usuarios-globais",
    "/admin/planos-saas",
    "/admin/leads",
    "/admin/propostas",
    "/admin/assinaturas",
    "/admin/faturas",
    "/admin/configuracoes-financeiras"
  ],
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
    // 1. If path is /admin or subpaths, ONLY SUPER_ADMIN is allowed
    if (path.startsWith("/admin")) {
      return roleName === "SUPER_ADMIN";
    }

    // 2. If user is SUPER_ADMIN, they can ONLY access /admin paths
    if (roleName === "SUPER_ADMIN") {
      return path === "/admin" || path.startsWith("/admin/");
    }

    // 3. ADMIN role has full bypass to all non-admin dashboard paths
    if (roleName === "ADMIN") return true;

    // 4. Other roles are checked against their specific lists
    const allowedPaths = ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS["CONSULTA"];
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
