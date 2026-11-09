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
import { TrialBlockedScreen } from "@/components/ui/TrialBlockedScreen";
import { SubscriptionStatusResult } from "@/lib/subscription-guard";
import {
  Home,
  UsersRound,
  Headphones,
  Tag,
  FileText,
  CreditCard,
  DollarSign,
  Receipt,
  AlertTriangle,
  ChartColumnIncreasing,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
} from "@/components/icons/AdminIcons";

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
  const [subStatus, setSubStatus] = useState<SubscriptionStatusResult | null>(null);
  const [subLoading, setSubLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

      // Validação Server-Side da Assinatura do Tenant
      if (userProfile.role === "SUPER_ADMIN") {
        setTimeout(() => {
          setSubStatus({ allowed: true, isSuperAdmin: true, status: "ATIVO" });
          setSubLoading(false);
        }, 0);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token;
          fetch("/api/dashboard/subscription-status", {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          })
            .then((res) => res.json())
            .then((data: SubscriptionStatusResult) => {
              setSubStatus(data);
            })
            .catch((err) => {
              console.warn("Failed to check subscription status:", err);
              // Fallback gracioso: não bloqueia em caso de falha transitória de rede
              setSubStatus({ allowed: true, isSuperAdmin: false, status: "TRIAL" });
            })
            .finally(() => {
              setSubLoading(false);
            });
        });
      }
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

  if (loading || (userProfile?.role !== "SUPER_ADMIN" && subLoading)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Carregando...
      </div>
    );
  }

  // Se o período de teste expirou ou a assinatura estiver suspensa, renderiza a tela amigável de bloqueio
  if (subStatus && !subStatus.allowed && !subStatus.isSuperAdmin) {
    return (
      <TrialBlockedScreen
        status={subStatus.status}
        message={subStatus.message}
        dataVencimento={subStatus.dataVencimento}
        onLogout={handleLogout}
      />
    );
  }

  const isAuthorized = hasPermission(pathname);

  // Layout Tokens: 228px no desktop para paridade total com o Super Admin
  const sidebarWidth = sidebarCollapsed ? "68px" : "228px";

  const renderMenuItem = (
    href: string,
    IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>,
    label: string,
    isHomeDashboard?: boolean
  ) => {
    if (!hasPermission(href)) return null;
    const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href);

    if (isHomeDashboard && isActive) {
      return (
        <li style={{ listStyle: "none", margin: "0 0 10px 0" }}>
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
            className="tenant-menu-active-pill"
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
          className="tenant-sidebar-item-link"
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", flexShrink: 0, opacity: isActive ? 1 : 0.85 }}>
            <IconComponent size={17} color="currentColor" strokeWidth={1.9} />
          </span>
          {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
        </Link>
      </li>
    );
  };

  const userInitials = (userProfile?.nome || "Usuário")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
      {/* Estilos Globais Escopados para o Layout do Tenant */}
      <style jsx global>{`
        .tenant-sidebar-item-link:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        .tenant-sidebar-item-link:hover span {
          opacity: 1 !important;
        }
        .tenant-btn-collapse:hover {
          background-color: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }
        .tenant-logout-btn:hover {
          background-color: rgba(239, 68, 68, 0.18) !important;
          color: #ff8080 !important;
          border-color: rgba(239, 68, 68, 0.35) !important;
        }
        .tenant-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .tenant-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .tenant-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 99px;
        }
        .tenant-hamburger-btn {
          display: none;
        }
        .tenant-mobile-backdrop {
          display: none;
        }

        @media (max-width: 1023px) {
          .tenant-header-company-subtitle {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .tenant-hamburger-btn {
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
          .tenant-sidebar-root {
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
          .tenant-sidebar-root.mobile-open {
            transform: translateX(0) !important;
          }
          .tenant-mobile-backdrop {
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
          .tenant-main-wrap {
            margin-left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Backdrop para Drawer Mobile */}
      {mobileMenuOpen && (
        <div
          className="tenant-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 2. SIDEBAR DO TENANT (Verde-Escuro Oficial: 228px desktop / 68px recolhido, Altura: 100dvh) */}
      <aside
        className={`tenant-sidebar-root ${mobileMenuOpen ? "mobile-open" : ""}`}
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
        {/* Brand Area Superior (Altura: 56px) */}
        <div
          style={{
            height: "56px",
            minHeight: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            padding: sidebarCollapsed ? "0 8px" : "0 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {!sidebarCollapsed && (
            <Link
              href="/dashboard"
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
            className="tenant-btn-collapse"
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

        {/* Menu Navegável com Scroll Suave */}
        <nav
          className="tenant-sidebar-scroll"
          style={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "14px 10px 10px 10px",
          }}
        >
          {/* Dashboard Home Ativo no Topo */}
          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
            {renderMenuItem("/dashboard", Home, "Início", true)}
          </ul>

          {/* Grupo 1: OPERACIONAL */}
          {(hasPermission("/dashboard/clientes") ||
            hasPermission("/dashboard/planos") ||
            hasPermission("/dashboard/contratos") ||
            hasPermission("/dashboard/agregados") ||
            hasPermission("/dashboard/atendimento") ||
            hasPermission("/dashboard/suporte")) && (
            <div style={{ marginBottom: "12px" }}>
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
                  Operacional
                </div>
              )}
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {renderMenuItem("/dashboard/clientes", UsersRound, "Clientes")}
                {renderMenuItem("/dashboard/atendimento", Headphones, "Atendimento")}
                {renderMenuItem("/dashboard/planos", Tag, "Planos")}
                {renderMenuItem("/dashboard/contratos", FileText, "Contratos")}
                {renderMenuItem("/dashboard/agregados", UsersRound, "Agregados")}
                {renderMenuItem("/dashboard/suporte", Headphones, "Suporte")}
              </ul>
            </div>
          )}

          {/* Divisória Fina */}
          <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.10)", margin: "6px 8px 10px 8px" }} />

          {/* Grupo 2: FINANCEIRO */}
          {(hasPermission("/dashboard/financeiro") ||
            hasPermission("/dashboard/recebimentos") ||
            hasPermission("/dashboard/cobrancas") ||
            hasPermission("/dashboard/mensalidades") ||
            hasPermission("/dashboard/inadimplentes")) && (
            <div style={{ marginBottom: "12px" }}>
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
                {renderMenuItem("/dashboard/financeiro", ChartColumnIncreasing, "Dashboard Financeiro")}
                {renderMenuItem("/dashboard/recebimentos", DollarSign, "Recebimentos")}
                {renderMenuItem("/dashboard/cobrancas", CreditCard, "Cobranças")}
                {renderMenuItem("/dashboard/mensalidades", Receipt, "Mensalidades")}
                {renderMenuItem("/dashboard/inadimplentes", AlertTriangle, "Inadimplentes")}
              </ul>
            </div>
          )}

          {/* Divisória Fina */}
          <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.10)", margin: "6px 8px 10px 8px" }} />

          {/* Grupo 3: GESTÃO & ADMINISTRAÇÃO */}
          {(hasPermission("/dashboard/relatorios") ||
            hasPermission("/dashboard/auditoria") ||
            hasPermission("/dashboard/usuarios") ||
            hasPermission("/dashboard/configuracoes")) && (
            <div style={{ marginBottom: "12px" }}>
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
                  Gestão & Admin
                </div>
              )}
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {renderMenuItem("/dashboard/relatorios", FileText, "Relatórios")}
                {renderMenuItem("/dashboard/auditoria", FileText, "Auditoria")}
                {renderMenuItem("/dashboard/usuarios", UsersRound, "Usuários")}
                {renderMenuItem("/dashboard/configuracoes", Settings, "Configurações")}
              </ul>
            </div>
          )}
        </nav>

        {/* Rodapé da Sidebar (Ação Sair) */}
        <div
          style={{
            padding: sidebarCollapsed ? "10px 8px" : "10px 12px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            onClick={handleLogout}
            className="tenant-logout-btn"
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

      {/* 3. ÁREA PRINCIPAL FLUIDA (min-width: 0, flex: 1) */}
      <div
        className="tenant-main-wrap"
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
        {/* Header Compacto (Altura: 56px, Fundo: #FFFFFF, Borda: #E7EBF0) */}
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
            padding: "0 clamp(16px, 2vw, 36px)",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxSizing: "border-box",
            gap: "16px",
          }}
        >
          {/* Lado Esquerdo: Botão Hambúrguer Mobile + Logo/Nome da Empresa */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="tenant-hamburger-btn"
              title="Abrir Menu"
              aria-label="Abrir Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {config?.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={config.logoUrl}
                alt="Logo Empresa"
                style={{
                  height: "28px",
                  width: "auto",
                  maxHeight: "28px",
                  objectFit: "contain",
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              />
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 750,
                  color: "#0C1837",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {config?.nomeFantasia || config?.razaoSocial || tenant.empresa || "Empresa"}
              </span>
              <span
                className="tenant-header-company-subtitle"
                style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}
              >
                Painel do Assinante • Memorius
              </span>
            </div>
          </div>

          {/* Centro: Busca Global Existente */}
          <div style={{ flex: "0 1 420px", minWidth: 0 }}>
            <GlobalSearch />
          </div>

          {/* Lado Direito: Usuário Logado + Notificações */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
            <div
              title="Notificações"
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
              <Bell size={18} color="#52627B" strokeWidth={1.9} />
              <span
                style={{
                  position: "absolute",
                  top: "7px",
                  right: "7px",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#00A86B",
                  border: "2px solid #FFFFFF",
                }}
              />
            </div>

            {/* Avatar 36px Circular Verde #008A6B + Nome */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#008A6B",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 750,
                  boxShadow: "0 2px 6px rgba(0, 138, 107, 0.25)",
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>

              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0C1837",
                    lineHeight: 1.2,
                    maxWidth: "150px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userProfile?.nome || "Usuário"}
                </span>
                <span style={{ fontSize: "11px", color: "#007A5E", fontWeight: 600 }}>
                  {roleName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            backgroundColor: "#F7F9FC",
            padding: "clamp(16px, 2vh, 24px) clamp(16px, 2vw, 36px)",
            boxSizing: "border-box",
          }}
        >
          {isAuthorized ? (
            children
          ) : (
            <div
              style={{
                padding: "2.5rem",
                background: "white",
                borderRadius: "16px",
                border: "1px solid #E5EAF0",
                boxShadow: "0 4px 12px rgba(15, 35, 55, 0.04)",
                textAlign: "center",
                maxWidth: "480px",
                margin: "40px auto",
              }}
            >
              <h2 style={{ color: "#EF4444", marginBottom: "0.75rem", fontSize: "1.4rem", fontWeight: 800 }}>
                Acesso Restrito
              </h2>
              <p style={{ color: "#64748B", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                Você não possui privilégios para acessar a página ({pathname}).
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "0.65rem 1.4rem",
                  backgroundColor: "#003D33",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
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
