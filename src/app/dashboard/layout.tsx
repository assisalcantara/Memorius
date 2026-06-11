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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

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
        <Link href={href} title={label}>
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
        <div className={`sidebar-brand ${sidebarCollapsed ? "sidebar-brand-collapsed" : ""}`}>
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
            className="sidebar-toggle"
          >
            {sidebarCollapsed ? "☰" : "◀"}
          </button>
        </div>

        <nav>
          {/* OPERACIONAL */}
          <div>
            {!sidebarCollapsed && (
              <div className="sidebar-group-title">
                Operacional
              </div>
            )}
            <ul className="sidebar-menu">
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
          <div>
            {!sidebarCollapsed && (
              <div className="sidebar-group-title">
                Financeiro
              </div>
            )}
            <ul className="sidebar-menu">
              {renderMenuItem("/dashboard/mensalidades", "💰", "Mensalidades")}
            </ul>
          </div>

          {/* GESTÃO */}
          <div>
            {!sidebarCollapsed && (
              <div className="sidebar-group-title">
                Gestão
              </div>
            )}
            <ul className="sidebar-menu">
              {renderMenuItem("/dashboard/relatorios", "📊", "Relatórios")}
              {renderMenuItem("/dashboard/auditoria", "🛡️", "Auditoria")}
            </ul>
          </div>

          {/* ADMINISTRAÇÃO */}
          <div>
            {!sidebarCollapsed && (
              <div className="sidebar-group-title">
                Administração
              </div>
            )}
            <ul className="sidebar-menu">
              {renderMenuItem("/dashboard/usuarios", "👥", "Usuários")}
              {renderMenuItem("/dashboard/configuracoes", "⚙️", "Configurações")}
            </ul>
          </div>
        </nav>

        <div className="sidebar-footer">
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

          <div className="header-user-wrapper" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500, lineHeight: 1.2 }}>
              {getGreeting()},
            </span>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {(userProfile?.nome || "Usuário").toUpperCase()} 
              <span style={{ fontSize: "0.7rem", color: "#0b4f59", background: "rgba(11, 79, 89, 0.08)", padding: "0.15rem 0.45rem", borderRadius: "6px", fontWeight: 700 }}>
                {roleName}
              </span>
            </span>
          </div>
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
