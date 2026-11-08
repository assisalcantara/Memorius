"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase/client";
import { PermissionProvider, usePermission } from "@/context/PermissionContext";
import {
  Home,
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
  Bell,
  Search
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              backgroundColor: "#003D33",
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

  const sidebarWidth = sidebarCollapsed ? "68px" : "228px";
  const userInitials = (userProfile?.nome || "Super Admin")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const renderMenuItem = (
    href: string,
    IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>,
    label: string,
    isHomeDashboard?: boolean
  ) => {
    const isActive = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href);

    if (isHomeDashboard && isActive) {
      return (
        <li style={{ listStyle: "none", margin: "0 0 14px 0" }}>
          <Link
            href={href}
            onClick={() => setMobileMenuOpen(false)}
            title={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              height: "36px",
              padding: sidebarCollapsed ? "0" : "0 14px",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              borderRadius: "9px",
              textDecoration: "none",
              color: "#FFFFFF",
              background: "linear-gradient(100deg, #A88618 0%, #0A9476 100%)",
              border: "1px solid #CBAA2B",
              boxShadow: "0 3px 10px rgba(10, 148, 118, 0.35)",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 150ms ease",
            }}
            className="admin-menu-active-pill"
          >
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", flexShrink: 0, color: "#F5BD22" }}>
              <IconComponent size={19} color="#F5BD22" strokeWidth={2} />
            </span>
            {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
          </Link>
        </li>
      );
    }

    return (
      <li style={{ listStyle: "none", margin: "0 0 2px 0" }}>
        <Link
          href={href}
          onClick={() => setMobileMenuOpen(false)}
          title={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            height: "32px",
            padding: sidebarCollapsed ? "0" : "0 10px",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            borderRadius: "7px",
            textDecoration: "none",
            color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.72)",
            background: isActive ? "rgba(255, 255, 255, 0.10)" : "transparent",
            fontSize: "12px",
            fontWeight: isActive ? 600 : 500,
            transition: "all 150ms ease",
          }}
          className="admin-sidebar-item-link"
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", flexShrink: 0, opacity: isActive ? 1 : 0.85 }}>
            <IconComponent size={17} color="currentColor" strokeWidth={1.9} />
          </span>
          {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        backgroundColor: "#F7F9FC",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Scoped Global Styles for Admin UI */}
      <style jsx global>{`
        .admin-sidebar-item-link:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        .admin-sidebar-item-link:hover span {
          opacity: 1 !important;
        }
        .admin-btn-collapse:hover {
          background-color: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }
        .admin-logout-btn:hover {
          background-color: rgba(239, 68, 68, 0.18) !important;
          color: #ff8080 !important;
          border-color: rgba(239, 68, 68, 0.35) !important;
        }
        .admin-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 99px;
        }
        .admin-hamburger-btn {
          display: none;
        }
        .admin-mobile-backdrop {
          display: none;
        }

        @media (max-width: 1023px) {
          .admin-header-subtitle {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .admin-hamburger-btn {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #F7F9FC;
            border: 1px solid #E4EAF0;
            color: #0C1837;
            cursor: pointer;
            margin-right: 10px;
          }
          .admin-sidebar-root {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 250px !important;
            z-index: 9999 !important;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25) !important;
          }
          .admin-sidebar-root.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-mobile-backdrop {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(12, 24, 55, 0.45);
            backdrop-filter: blur(2px);
            z-index: 9998;
          }
          .admin-main-wrap {
            margin-left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 2. SIDEBAR (Width: 228px desktop / 68px recolhido, Height: 100dvh, Position: Fixed) */}
      <aside
        className={`admin-sidebar-root ${mobileMenuOpen ? "mobile-open" : ""}`}
        style={{
          width: sidebarWidth,
          height: "100dvh",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          background: "linear-gradient(160deg, #003D33 0%, #00352C 48%, #002D27 100%)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "2px 0 16px rgba(0, 0, 0, 0.12)",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
          transition: "width 0.2s ease, transform 0.25s ease",
          overflowX: "hidden",
        }}
      >
        {/* Top Header / Brand Area (Height: 56px, Border-bottom: rgba(255,255,255,0.12)) */}
        <div
          style={{
            height: "56px",
            minHeight: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            padding: sidebarCollapsed ? "0 8px" : "0 18px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {!sidebarCollapsed && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Memorius"
                style={{
                  height: "28px",
                  maxWidth: "135px",
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
              width: "27px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#D1E5DF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 150ms ease",
              flexShrink: 0,
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <nav
          className="admin-sidebar-scroll"
          style={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px 12px 12px 12px",
          }}
        >
          {/* Item Dashboard Ativo no Topo */}
          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
            {renderMenuItem("/admin", Home, "Dashboard", true)}
          </ul>

          {/* Grupo 1: GERAL */}
          <div style={{ marginBottom: "14px" }}>
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: "0 10px 6px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#D1E5DF",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                Geral
              </div>
            )}
            <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin/tenants", Building2, "Tenants")}
              {renderMenuItem("/admin/tenants/novo", PlusCircle, "Novo Tenant")}
              {renderMenuItem("/admin/usuarios-globais", UsersRound, "Usuários Globais")}
              {renderMenuItem("/admin/suporte", Headphones, "Atendimento")}
            </ul>
          </div>

          {/* Divisória fina */}
          <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.10)", margin: "8px 8px 12px 8px" }} />

          {/* Grupo 2: COMERCIAL */}
          <div style={{ marginBottom: "14px" }}>
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: "0 10px 6px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#D1E5DF",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
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

          {/* Divisória fina */}
          <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.10)", margin: "8px 8px 12px 8px" }} />

          {/* Grupo 3: FINANCEIRO */}
          <div style={{ marginBottom: "14px" }}>
            {!sidebarCollapsed && (
              <div
                style={{
                  padding: "0 10px 6px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#D1E5DF",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                Financeiro
              </div>
            )}
            <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {renderMenuItem("/admin/configuracoes-financeiras", Settings, "Configurações")}
            </ul>
          </div>
        </nav>

        {/* Rodapé da Sidebar (Ação Sair) */}
        <div
          style={{
            padding: sidebarCollapsed ? "12px 8px" : "12px 14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            onClick={handleLogout}
            className="admin-logout-btn"
            style={{
              width: "100%",
              height: "36px",
              display: "flex",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              alignItems: "center",
              gap: "10px",
              padding: sidebarCollapsed ? "0" : "0 12px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.75)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
            title="Sair do Sistema"
          >
            <LogOut size={16} color="currentColor" strokeWidth={1.9} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* 3. ÁREA PRINCIPAL (width: calc(100% - sidebarWidth), min-width: 0, fluida vertical e horizontalmente) */}
      <div
        className="admin-main-wrap"
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100% - ${sidebarWidth})`,
          minWidth: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          transition: "margin-left 0.2s ease, width 0.2s ease",
        }}
      >
        {/* Header Superior (Height: 56px, Background: #FFFFFF, Border-bottom: 1px solid #E7EBF0, width: 100%) */}
        <header
          style={{
            flex: "0 0 56px",
            height: "56px",
            minHeight: "56px",
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #E7EBF0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(20px, 2vw, 40px)",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxSizing: "border-box",
          }}
        >
          {/* Marca textual à esquerda + Hambúrguer Mobile */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="admin-hamburger-btn"
              title="Abrir Menu"
              aria-label="Abrir Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 750, color: "#0C1837", lineHeight: 1.2 }}>
                Memorius Admin
              </h1>
              <span className="admin-header-subtitle" style={{ fontSize: "11px", color: "#52627B", marginTop: "2px", fontWeight: 500 }}>
                Gestão de Planos de Assistência Familiar
              </span>
            </div>
          </div>

          {/* Lado Direito: Notificações & Identificação Super Admin */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Ícone de Notificações com badge amarelo */}
            <div
              title="Notificações da Plataforma"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F7F9FC",
                border: "1px solid #E4EAF0",
                color: "#52627B",
                position: "relative",
                cursor: "pointer",
              }}
            >
              <Bell size={19} color="#52627B" strokeWidth={1.9} />
              <span
                style={{
                  position: "absolute",
                  top: "7px",
                  right: "7px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#F5BD22",
                  border: "2px solid #FFFFFF",
                }}
              />
            </div>

            {/* Avatar 37px Circular Verde #008A6B + Nome */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "37px",
                  height: "37px",
                  borderRadius: "50%",
                  backgroundColor: "#008A6B",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                  boxShadow: "0 2px 6px rgba(0, 138, 107, 0.25)",
                }}
              >
                {userInitials}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#0C1837", lineHeight: 1.2 }}>
                  {userProfile?.nome || "Super Admin"}
                </span>
                <span style={{ fontSize: "11px", color: "#52627B", fontWeight: 500 }}>
                  Administrador
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Main Container (flex: 1, min-height: 0, padding responsivo vertical e horizontal) */}
        <main
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            backgroundColor: "#F7F9FC",
            padding: "clamp(16px, 2vh, 28px) clamp(20px, 2vw, 40px)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
