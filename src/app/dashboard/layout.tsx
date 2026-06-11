"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase/client";
import { PermissionProvider, usePermission } from "@/context/PermissionContext";
import { empresaConfigSupabaseService } from "@/services/empresa-config.supabase.service";
import { uiPreferences } from "@/lib/ui-preferences";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </PermissionProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, userProfile, loading } = useTenant();
  const { hasPermission, roleName } = usePermission();
  const [config, setConfig] = useState<import("@/types").EmpresaConfig | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return uiPreferences.getPreferences().sidebarCollapsed;
    }
    return false;
  });

  useEffect(() => {
    if (!loading && userProfile) {
      empresaConfigSupabaseService.getConfig().then((res) => {
        if (res) setConfig(res);
      });
    }
  }, [loading, userProfile, tenant]);

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/");
    }
  }, [userProfile, loading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("legacyflow_user");
    router.push("/");
  };

  const toggleSidebar = () => {
    const newVal = !sidebarCollapsed;
    setSidebarCollapsed(newVal);
    uiPreferences.updatePreference("sidebarCollapsed", newVal);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Carregando...
      </div>
    );
  }

  const isAuthorized = hasPermission(pathname);

  // Group items by context
  const sidebarWidth = sidebarCollapsed ? "70px" : "260px";

  const renderMenuItem = (href: string, icon: string, label: string) => {
    if (!hasPermission(href)) return null;
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <li className={`sidebar-menu-item ${isActive ? "active" : ""}`}>
        <Link href={href} title={label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem" }}>
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{icon}</span>
          {!sidebarCollapsed && <span style={{ transition: "opacity 0.2s" }}>{label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside 
        className="sidebar sidebar-transition" 
        style={{ 
          width: sidebarWidth,
          overflowX: "hidden"
        }}
      >
        <div 
          className="sidebar-brand" 
          style={{ 
            height: "70px",
            display: "flex", 
            alignItems: "center", 
            justifyContent: sidebarCollapsed ? "center" : "space-between", 
            padding: "0 1rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
          }}
        >
          {!sidebarCollapsed && (
            <img
              src="/logo.png"
              alt="Memorius"
              style={{
                height: "42px",
                maxWidth: "160px",
                objectFit: "contain",
              }}
            />
          )}
          <button 
            onClick={toggleSidebar} 
            style={{ 
              background: "none", 
              border: "none", 
              color: "white", 
              cursor: "pointer", 
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.25rem"
            }}
          >
            {sidebarCollapsed ? "☰" : "◀"}
          </button>
        </div>

        <nav style={{ flexGrow: 1, overflowY: "auto", padding: "1rem 0" }}>
          {/* OPERACIONAL */}
          <div style={{ marginBottom: "1.5rem" }}>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Operacional
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/dashboard", "🏠", "Início")}
              {renderMenuItem("/dashboard/clientes", "👥", "Clientes")}
              {renderMenuItem("/dashboard/planos", "📋", "Planos")}
              {renderMenuItem("/dashboard/contratos", "📄", "Contratos")}
              {renderMenuItem("/dashboard/agregados", "👥", "Agregados")}
              {renderMenuItem("/dashboard/atendimento", "🏥", "Atendimento")}
              {renderMenuItem("/dashboard/suporte", "🎫", "Suporte")}
            </ul>
          </div>

          {/* FINANCEIRO */}
          <div style={{ marginBottom: "1.5rem" }}>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Financeiro
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/dashboard/mensalidades", "💰", "Mensalidades")}
            </ul>
          </div>

          {/* GESTÃO */}
          <div style={{ marginBottom: "1.5rem" }}>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Gestão
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/dashboard/relatorios", "📊", "Relatórios")}
              {renderMenuItem("/dashboard/auditoria", "🛡️", "Auditoria")}
            </ul>
          </div>

          {/* ADMINISTRAÇÃO */}
          <div>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Administração
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/dashboard/usuarios", "👥", "Usuários")}
              {renderMenuItem("/dashboard/configuracoes", "⚙️", "Configurações")}
            </ul>
          </div>
        </nav>

        <div className="sidebar-footer" style={{ padding: sidebarCollapsed ? "1rem 0.5rem" : "1.25rem 1.5rem" }}>
          <button 
            onClick={handleLogout} 
            className="logout-button" 
            style={{ 
              width: "100%", 
              display: "flex", 
              justifyContent: sidebarCollapsed ? "center" : "flex-start", 
              alignItems: "center",
              gap: "0.5rem" 
            }}
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div 
        className="right-section right-section-transition" 
        style={{ 
          marginLeft: sidebarWidth 
        }}
      >
        {/* Header */}
        <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" style={{ height: "32px", width: "auto", maxHeight: "32px", objectFit: "contain", borderRadius: "4px" }} />
            ) : null}
            <span className="header-title" style={{ display: "inline" }}>
              {config?.nomeFantasia || config?.razaoSocial || tenant.empresa || "Empresa"}
            </span>
          </div>

          <GlobalSearch />

          <span className="header-user">
            Olá, <strong>{userProfile?.nome || "Usuário"}</strong> ({roleName})
          </span>
        </header>

        {/* Page Content */}
        <main className="main-content">
          <Breadcrumb />
          {isAuthorized ? (
            children
          ) : (
            <div style={{ padding: "2rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", textAlign: "center" }}>
              <h2 style={{ color: "#d9534f", marginBottom: "1rem" }}>Acesso Negado</h2>
              <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                Você não tem permissão para acessar esta área ({pathname}).
              </p>
              <button 
                onClick={() => router.push("/dashboard")} 
                style={{ 
                  padding: "0.5rem 1rem", 
                  backgroundColor: "var(--brand)", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                Voltar ao Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
