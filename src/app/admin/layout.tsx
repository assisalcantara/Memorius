"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase/client";
import { PermissionProvider, usePermission } from "@/context/PermissionContext";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  UsersRound,
  Headphones,
  Tag,
  UserCheck,
  FileText,
  CreditCard,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell
} from "@/components/icons/AdminIcons";

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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#F7F9FC", color: "#64748B", fontFamily: "'Inter', sans-serif" }}>
        Carregando painel administrativo...
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
        backgroundColor: "#F7F9FC",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
        textAlign: "center"
      }}>
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "3rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
          maxWidth: "480px",
          width: "100%",
          border: "1px solid #E5EAF0"
        }}>
          <h2 style={{ color: "#EF4444", margin: "0 0 1rem 0", fontSize: "1.75rem", fontWeight: 800 }}>Acesso Negado</h2>
          <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Você não possui as credenciais administrativas necessárias para acessar a área do Super Administrador.
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#003F36",
              color: "white",
              border: "none",
              borderRadius: "10px",
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

  const sidebarWidth = sidebarCollapsed ? "76px" : "280px";
  const userInitials = (userProfile?.nome || "Super Admin")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const renderMenuItem = (
    href: string,
    IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>,
    label: string
  ) => {
    const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
    return (
      <li style={{ listStyle: "none", margin: "0 0 4px 0" }}>
        <Link
          href={href}
          title={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            height: "44px",
            padding: sidebarCollapsed ? "0 0" : "0 18px",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            borderRadius: "11px",
            textDecoration: "none",
            color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.72)",
            background: isActive ? "linear-gradient(90deg, #B28B21 0%, #0B8D76 100%)" : "transparent",
            border: isActive ? "1px solid #D8B33F" : "1px solid transparent",
            boxShadow: isActive ? "0 4px 14px rgba(11, 141, 118, 0.35)" : "none",
            fontSize: "14px",
            fontWeight: isActive ? 600 : 500,
            transition: "all 180ms ease",
            position: "relative",
          }}
          className="admin-sidebar-link"
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", flexShrink: 0 }}>
            <IconComponent size={19} color={isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)"} strokeWidth={isActive ? 2.2 : 1.9} />
          </span>
          {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#F7F9FC", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Dynamic CSS scoped for admin */}
      <style jsx global>{`
        .admin-sidebar-link:hover {
          background-color: rgba(255, 255, 255, 0.09) !important;
          color: #ffffff !important;
        }
        .admin-btn-collapse:hover {
          background-color: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }
        .admin-logout-btn:hover {
          background-color: rgba(239, 68, 68, 0.18) !important;
          color: #ff8080 !important;
          border-color: rgba(239, 68, 68, 0.4) !important;
        }
        .admin-sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .admin-sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 99px;
        }
        @media (max-width: 1023px) {
          .admin-header-subtitle {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .admin-sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }
          .admin-main-wrap {
            margin-left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Sidebar 280px */}
      <aside
        className="admin-sidebar"
        style={{
          width: sidebarWidth,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          background: "linear-gradient(160deg, #003F36 0%, #00352E 45%, #002A25 100%)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
          transition: "width 0.2s ease",
          overflowX: "hidden",
        }}
      >
        {/* Brand / Topbar (76px) */}
        <div
          style={{
            height: "76px",
            minHeight: "76px",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            padding: sidebarCollapsed ? "0 12px" : "0 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          {!sidebarCollapsed && (
            <Link href="/admin" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Memorius"
                style={{
                  height: "36px",
                  maxWidth: "160px",
                  objectFit: "contain",
                }}
              />
            </Link>
          )}

          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            className="admin-btn-collapse"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#A8C8C0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 180ms ease",
              flexShrink: 0,
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <nav
          className="admin-sidebar-nav"
          style={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px 14px",
          }}
        >
          {/* Categoria 1: GERAL */}
          <div style={{ marginBottom: "20px" }}>
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: "0 10px 8px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#A8C8C0",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Geral
              </div>
            )}
            <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin", LayoutDashboard, "Dashboard SaaS")}
              {renderMenuItem("/admin/tenants", Building2, "Tenants")}
              {renderMenuItem("/admin/tenants/novo", PlusCircle, "Novo Tenant")}
              {renderMenuItem("/admin/usuarios-globais", UsersRound, "Usuários Globais")}
              {renderMenuItem("/admin/suporte", Headphones, "Atendimento")}
            </ul>
          </div>

          {/* Categoria 2: COMERCIAL */}
          <div style={{ marginBottom: "20px" }}>
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: "0 10px 8px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#A8C8C0",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Comercial
              </div>
            )}
            <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin/planos-saas", Tag, "Planos SaaS")}
              {renderMenuItem("/admin/leads", UserCheck, "Leads SaaS")}
              {renderMenuItem("/admin/propostas", FileText, "Propostas")}
              {renderMenuItem("/admin/assinaturas", CreditCard, "Assinaturas")}
              {renderMenuItem("/admin/faturas", Receipt, "Faturas")}
            </ul>
          </div>

          {/* Categoria 3: FINANCEIRO */}
          <div style={{ marginBottom: "20px" }}>
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: "0 10px 8px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#A8C8C0",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Financeiro
              </div>
            )}
            <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin/configuracoes-financeiras", Settings, "Configurações Financeiras")}
            </ul>
          </div>
        </nav>

        {/* Rodapé da Sidebar (Ação Sair) */}
        <div
          style={{
            padding: sidebarCollapsed ? "16px 12px" : "16px 18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            onClick={handleLogout}
            className="admin-logout-btn"
            style={{
              width: "100%",
              height: "44px",
              display: "flex",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              alignItems: "center",
              gap: "12px",
              padding: sidebarCollapsed ? "0" : "0 14px",
              borderRadius: "11px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.75)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 180ms ease",
            }}
            title="Sair do Sistema"
          >
            <LogOut size={19} color="currentColor" strokeWidth={1.9} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className="admin-main-wrap"
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100% - ${sidebarWidth})`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.2s ease, width 0.2s ease",
        }}
      >
        {/* Header Superior (76px, Fundo Branco, Borda #E5EAF0) */}
        <header
          style={{
            height: "76px",
            minHeight: "76px",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #E5EAF0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
          }}
        >
          {/* Título & Subtítulo da Área */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 750, color: "#10213D", lineHeight: 1.2 }}>
              Memorius Admin
            </h1>
            <span className="admin-header-subtitle" style={{ fontSize: "13px", color: "#65748B", fontWeight: 500 }}>
              Gestão SaaS / Administração Global
            </span>
          </div>

          {/* Lado Direito: Notificações & Perfil */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Ícone de Notificações com badge */}
            <div
              title="Notificações da Plataforma"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F7F9FC",
                border: "1px solid #E5EAF0",
                color: "#64748B",
                position: "relative",
                cursor: "pointer",
              }}
            >
              <Bell size={20} color="#64748B" strokeWidth={1.9} />
              <span
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#E6A400",
                  border: "2px solid #FFFFFF",
                }}
              />
            </div>

            {/* Identificação Super Admin */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "#0B8D76",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(11, 141, 118, 0.25)",
                }}
              >
                {userInitials}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#10213D", lineHeight: 1.2 }}>
                  {userProfile?.nome || "Super Admin"}
                </span>
                <span style={{ fontSize: "12px", color: "#65748B", fontWeight: 500 }}>
                  Administrador Global
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container (Fundo #F7F9FC, Max-width 1500px, Padding 28px 32px 40px) */}
        <main
          style={{
            flexGrow: 1,
            backgroundColor: "#F7F9FC",
            padding: "28px 32px 40px",
          }}
        >
          <div style={{ maxWidth: "1500px", marginInline: "auto", width: "100%" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
