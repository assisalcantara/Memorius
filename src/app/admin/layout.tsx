"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase/client";
import { PermissionProvider, usePermission } from "@/context/PermissionContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </PermissionProvider>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile, loading } = useTenant();
  const { roleName } = usePermission();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("legacyflow_user");
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Carregando...
      </div>
    );
  }

  // Check if role is SUPER_ADMIN
  const isSuperAdmin = roleName === "SUPER_ADMIN";

  if (!isSuperAdmin) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
        textAlign: "center"
      }}>
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "3rem",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
          maxWidth: "500px",
          width: "100%",
          border: "1px solid #e2e8f0"
        }}>
          <h2 style={{ color: "#eb5757", margin: "0 0 1rem 0", fontSize: "1.75rem", fontWeight: 800 }}>Acesso Negado</h2>
          <p style={{ color: "#64748b", fontSize: "0.975rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Você não possui as credenciais administrativas necessárias para acessar a área do Super Administrador.
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#0b4f59",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  const sidebarWidth = sidebarCollapsed ? "70px" : "260px";

  const renderMenuItem = (href: string, icon: string, label: string) => {
    const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
    return (
      <li className={`sidebar-menu-item ${isActive ? "active" : ""}`}>
        <Link href={href} title={label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem" }}>
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{icon}</span>
          {!sidebarCollapsed && <span>{label}</span>}
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
          {!sidebarCollapsed && <span style={{ fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "1px" }}>LegacyFlow SaaS</span>}
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
          <div style={{ marginBottom: "1.5rem" }}>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Geral
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin", "📊", "Dashboard SaaS")}
              {renderMenuItem("/admin/tenants", "🏢", "Tenants")}
              {renderMenuItem("/admin/tenants/novo", "➕", "Novo Tenant")}
              {renderMenuItem("/admin/usuarios-globais", "👥", "Usuários Globais")}
            </ul>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Comercial
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin/planos-saas", "🏷️", "Planos SaaS")}
              {renderMenuItem("/admin/leads", "👥", "Leads SaaS")}
              {renderMenuItem("/admin/propostas", "📄", "Propostas")}
              {renderMenuItem("/admin/assinaturas", "💳", "Assinaturas")}
              {renderMenuItem("/admin/faturas", "🧾", "Faturas")}
            </ul>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            {!sidebarCollapsed && (
              <div style={{ padding: "0.25rem 1.25rem", fontSize: "0.75rem", fontWeight: "bold", color: "rgba(255, 255, 255, 0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Financeiro
              </div>
            )}
            <ul className="sidebar-menu" style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin/configuracoes-financeiras", "⚙️", "Configurações Financeiras")}
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
            <span className="header-title" style={{ display: "inline" }}>
              LegacyFlow Admin
            </span>
          </div>

          <span className="header-user">
            Super Admin: <strong>{userProfile?.nome || userProfile?.email || "Administrador"}</strong>
          </span>
        </header>

        {/* Page Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
