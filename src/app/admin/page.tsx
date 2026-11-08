"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { invoicesSupabaseService } from "@/services/invoices.supabase.service";
import { leadsSaasSupabaseService } from "@/services/leads-saas.supabase.service";
import { propostasSaasSupabaseService } from "@/services/propostas-saas.supabase.service";
import { auditLogSupabaseService } from "@/services/audit-log.supabase.service";
import { TenantSubscription, SaaSInvoice, LeadSaas, PropostaSaas, AuditLog } from "@/types";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Calendar,
  ChartColumnIncreasing,
  FileText,
  Bell,
  AlertCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingUp
} from "@/components/icons/AdminIcons";

interface DashboardData {
  tenants: TenantAdminData[];
  subscriptions: TenantSubscription[];
  invoices: SaaSInvoice[];
  leads: LeadSaas[];
  proposals: PropostaSaas[];
  logs: AuditLog[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [tenants, subscriptions, invoices, leads, proposals, logs] = await Promise.all([
          tenantsAdminSupabaseService.getAllTenants(),
          subscriptionsSupabaseService.getAll(),
          invoicesSupabaseService.getAll(),
          leadsSaasSupabaseService.getAll(),
          propostasSaasSupabaseService.getAll(),
          auditLogSupabaseService.getLogs()
        ]);
        setData({ tenants, subscriptions, invoices, leads, proposals, logs });
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getFormattedDate = () => {
    const now = new Date();
    const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
    const day = now.getDate();
    const month = now.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const year = now.getFullYear();
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalizedWeekday}, ${day} de ${month} de ${year}`;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "40px" }}>
          <div style={{ width: "5px", height: "40px", backgroundColor: "#F5BD22", borderRadius: "3px" }} />
          <div style={{ width: "240px", height: "24px", backgroundColor: "#E2E8F0", borderRadius: "6px" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: "92px", backgroundColor: "#FFFFFF", borderRadius: "15px", border: "1px solid #E1E9EC" }} />
          ))}
        </div>
      </div>
    );
  }

  const tenants = data?.tenants || [];
  const subscriptions = data?.subscriptions || [];
  const invoices = data?.invoices || [];

  // Cálculos Reais
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ATIVO").length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "ATIVO").length;

  let mrr = 0;
  subscriptions.forEach((sub) => {
    if (sub.status === "ATIVO" || sub.status === "TRIAL") {
      const monthlyVal = sub.ciclo === "ANUAL" ? sub.valor / 12 : sub.valor;
      mrr += monthlyVal;
    }
  });

  // Alertas Reais
  const expiredInvoicesList = invoices.filter((i) => i.status === "VENCIDO");
  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);
  const expiringTrials = subscriptions.filter((s) => {
    if (s.status !== "TRIAL") return false;
    const vencDate = new Date(s.dataVencimento);
    return vencDate >= today && vencDate <= next7Days;
  });
  const suspendedSubs = subscriptions.filter((s) => s.status === "SUSPENSO");

  // Distribuição de Assinaturas por Plano SaaS para o Donut
  const planDistMap: Record<string, { nome: string; count: number }> = {};
  subscriptions.forEach((sub) => {
    if (sub.status === "ATIVO" || sub.status === "TRIAL") {
      const name = sub.saasPlanNome || "Plano SaaS";
      if (!planDistMap[name]) {
        planDistMap[name] = { nome: name, count: 0 };
      }
      planDistMap[name].count += 1;
    }
  });

  const rawPlanDist = Object.values(planDistMap);
  const totalSubCount = rawPlanDist.reduce((acc, p) => acc + p.count, 0) || 1;

  // Paleta Donut do Mockup: Verde #00B885, Azul #3185FF, Amarelo #FFCA26, Roxo #A94BEB
  const donutColors = ["#00B885", "#3185FF", "#FFCA26", "#A94BEB"];
  const planDistribution = (rawPlanDist.length > 0 ? rawPlanDist : [
    { nome: "Essencial", count: 0 },
    { nome: "Profissional", count: 0 },
    { nome: "Enterprise", count: 0 },
  ]).map((p, idx) => ({
    ...p,
    color: donutColors[idx % donutColors.length],
    percentage: rawPlanDist.length > 0 ? ((p.count / totalSubCount) * 100).toFixed(1) : "0.0"
  }));

  // Faturamento Últimos 6/12 Meses
  const last6Months: { label: string; key: string; value: number }[] = [];
  const tempDate = new Date();
  tempDate.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const label = `${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}/${String(year).slice(-2)}`;
    last6Months.push({ label, key: `${year}-${month}`, value: 0 });
  }

  invoices.forEach((inv) => {
    if (inv.status === "PAGO" && inv.pagamentoEm) {
      const pDate = new Date(inv.pagamentoEm);
      const yStr = pDate.getFullYear();
      const mStr = String(pDate.getMonth() + 1).padStart(2, "0");
      const key = `${yStr}-${mStr}`;
      const found = last6Months.find((m) => m.key === key);
      if (found) {
        found.value += inv.valor;
      }
    }
  });

  const maxVal = Math.max(...last6Months.map((m) => m.value), mrr, 100);
  const last4Invoices = invoices.slice(0, 4);

  return (
    <div className="admin-dashboard-root-grid">
      {/* Scoped CSS for Bidimensional Fluid Layout & Responsiveness */}
      <style jsx global>{`
        .admin-dashboard-root-grid {
          display: grid;
          grid-template-rows: auto auto minmax(220px, 1.15fr) minmax(210px, 1fr);
          gap: clamp(12px, 1.5vh, 20px);
          width: 100%;
          min-width: 0;
          flex: 1 1 auto;
          box-sizing: border-box;
        }

        .kpi-row-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(12px, 1vw, 20px);
          width: 100%;
        }

        .analytics-row-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
          gap: clamp(12px, 1vw, 18px);
          width: 100%;
          min-height: 0;
          height: 100%;
        }

        .operations-row-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(12px, 1vw, 18px);
          width: 100%;
          min-height: 0;
          height: 100%;
        }

        .kpi-card-mockup {
          background: #FFFFFF;
          border: 1px solid #E1E9EC;
          border-radius: 14px;
          padding: clamp(12px, 1.5vh, 18px) clamp(14px, 1.2vw, 20px);
          min-height: 84px;
          max-height: 100px;
          height: 100%;
          width: 100%;
          box-shadow: 0 4px 12px rgba(15, 35, 55, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          box-sizing: border-box;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .kpi-card-mockup:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 35, 55, 0.08);
        }

        .admin-panel-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: clamp(14px, 1.8vh, 22px);
          width: 100%;
          height: 100%;
          min-height: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          overflow: hidden;
        }

        .revenue-chart-container {
          flex: 1 1 auto;
          width: 100%;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          min-width: 0;
          margin-top: 6px;
        }

        .donut-content-layout {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(12px, 1.5vw, 24px);
          flex: 1 1 auto;
          min-height: 0;
          margin-top: 4px;
        }

        .donut-circle-wrap {
          position: relative;
          width: clamp(110px, 14vh, 150px);
          height: clamp(110px, 14vh, 150px);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1 / 1;
        }

        .faturas-list-wrap {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 0.8vh, 8px);
          flex: 1 1 auto;
          justify-content: space-around;
          min-height: 0;
          margin-top: 8px;
        }

        .alertas-list-wrap {
          display: flex;
          flex-direction: column;
          gap: clamp(6px, 1vh, 10px);
          flex: 1 1 auto;
          justify-content: space-around;
          min-height: 0;
          margin-top: 8px;
        }

        .alerta-item-mockup {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(6px, 0.8vh, 10px) 12px;
          border-radius: 10px;
          box-sizing: border-box;
          flex: 1 1 auto;
          max-height: 58px;
        }

        /* Viewport Height Adjustments */
        @media (min-height: 900px) {
          .admin-dashboard-root-grid {
            grid-template-rows: auto auto minmax(260px, 1.2fr) minmax(240px, 1.05fr);
            gap: 20px;
          }
        }

        @media (max-height: 700px) {
          .admin-dashboard-root-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            height: auto;
          }
          .kpi-card-mockup {
            min-height: 78px;
          }
          .admin-panel-card {
            height: auto;
            min-height: 220px;
          }
        }

        /* Responsive Breakpoints Width */
        @media (max-width: 1279px) {
          .kpi-row-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .analytics-row-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .admin-panel-card {
            min-height: 230px;
          }
          .admin-dashboard-root-grid {
            display: flex;
            flex-direction: column;
            height: auto;
          }
        }

        @media (max-width: 900px) {
          .operations-row-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
        }

        @media (max-width: 640px) {
          .kpi-row-grid {
            grid-template-columns: 1fr;
          }
          .donut-content-layout {
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>

      {/* ==================================================
          4. SAUDAÇÃO / TÍTULO (y=82–126px)
          ================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: "44px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Barra vertical dourada + Textos */}
        <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
          <div
            style={{
              width: "5px",
              height: "40px",
              backgroundColor: "#F5BD22",
              borderRadius: "3px",
              flexShrink: 0,
            }}
          />
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "23px",
                fontWeight: 800,
                lineHeight: "28px",
                color: "#0B1536",
                letterSpacing: "-0.01em",
              }}
            >
              Olá, Super Admin!
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "18px",
                color: "#34435E",
                fontWeight: 500,
              }}
            >
              Aqui está o resumo da sua operação hoje.
            </p>
          </div>
        </div>

        {/* Data no canto direito */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E4EAF0",
            padding: "0 14px",
            height: "35px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#34435E",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            whiteSpace: "nowrap",
          }}
        >
          <Calendar size={15} color="#0B1536" />
          <span>{getFormattedDate()}</span>
        </div>
      </div>

      {/* ==================================================
          5. PRIMEIRA LINHA — EXATAMENTE QUATRO KPIs (y=146–238px)
          ================================================== */}
      <div className="kpi-row-grid">
        {/* KPI 1: TOTAL DE TENANTS (Ícone Building2 #E8A900) */}
        <div className="kpi-card-mockup">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#E8A900", display: "flex", alignItems: "center" }}>
              <Building2 size={27} color="#E8A900" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Total de Tenants
              </span>
              <span style={{ fontSize: "25px", fontWeight: 800, color: "#0C1738", lineHeight: 1 }}>
                {totalTenants}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#E8A900" }}>
            <Building2 size={44} color="#E8A900" strokeWidth={1.5} />
          </div>
        </div>

        {/* KPI 2: TENANTS ATIVOS (Ícone CircleCheck #00A86B) */}
        <div className="kpi-card-mockup">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#00A86B", display: "flex", alignItems: "center" }}>
              <CheckCircle2 size={27} color="#00A86B" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Tenants Ativos
              </span>
              <span style={{ fontSize: "25px", fontWeight: 800, color: "#0C1738", lineHeight: 1 }}>
                {activeTenants}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#00A86B" }}>
            <CheckCircle2 size={44} color="#00A86B" strokeWidth={1.5} />
          </div>
        </div>

        {/* KPI 3: ASSINATURAS ATIVAS (Ícone CreditCard #E5A400) */}
        <div className="kpi-card-mockup">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#E5A400", display: "flex", alignItems: "center" }}>
              <CreditCard size={27} color="#E5A400" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Assinaturas Ativas
              </span>
              <span style={{ fontSize: "25px", fontWeight: 800, color: "#0C1738", lineHeight: 1 }}>
                {activeSubscriptions}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#E5A400" }}>
            <CreditCard size={44} color="#E5A400" strokeWidth={1.5} />
          </div>
        </div>

        {/* KPI 4: RECEITA RECORRENTE / MRR (Ícone DollarSign #8056E8) */}
        <div className="kpi-card-mockup">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#8056E8", display: "flex", alignItems: "center" }}>
              <DollarSign size={27} color="#8056E8" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Receita Recorrente (MRR)
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {formatBRL(mrr)}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#8056E8" }}>
            <DollarSign size={44} color="#8056E8" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* ==================================================
          6. SEGUNDA LINHA — DOIS PAINÉIS ANALÍTICOS (y=252–489px)
          ================================================== */}
      <div className="analytics-row-grid">
        {/* Painel Esquerdo: Evolução da Receita (MRR) */}
        <div className="admin-panel-card">
          {/* Topo do Card */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ChartColumnIncreasing size={22} color="#F5BD22" strokeWidth={2} />
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37", lineHeight: 1.2 }}>
                  Evolução da Receita (MRR)
                </h3>
                <span style={{ fontSize: "11px", color: "#53637B" }}>
                  Receita mensal recorrente nos últimos 6 meses
                </span>
              </div>
            </div>

            {/* Pill de Valor no Topo Direita (Fundo Verde-Escuro #005842, Texto Branco) */}
            <div
              style={{
                backgroundColor: "#005842",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "6px",
                boxShadow: "0 2px 4px rgba(0, 88, 66, 0.2)",
              }}
            >
              {formatBRL(mrr)}
            </div>
          </div>

          {/* Gráfico SVG Responsivo com Linha Verde #008C66, Pontos e Gradiente */}
          <div className="revenue-chart-container">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 540 135"
              preserveAspectRatio="none"
              style={{ overflow: "visible", display: "block", flex: 1, minHeight: 0 }}
            >
              <defs>
                <linearGradient id="areaGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A86B" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#00A86B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade Horizontais #E9EEF2 */}
              <line x1="50" y1="20" x2="525" y2="20" stroke="#E9EEF2" strokeWidth="1" />
              <line x1="50" y1="50" x2="525" y2="50" stroke="#E9EEF2" strokeWidth="1" />
              <line x1="50" y1="80" x2="525" y2="80" stroke="#E9EEF2" strokeWidth="1" />
              <line x1="50" y1="110" x2="525" y2="110" stroke="#CBD5E1" strokeWidth="1" />

              {/* Rótulos Eixo Y */}
              <text x="44" y="24" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">R$ 50 mil</text>
              <text x="44" y="54" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">R$ 30 mil</text>
              <text x="44" y="84" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">R$ 10 mil</text>
              <text x="44" y="114" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">R$ 0</text>

              {/* Série de Pontos (Últimos 6 Meses) */}
              {(() => {
                const points = last6Months.map((m, idx) => {
                  const x = 75 + idx * 85;
                  const simulatedProgress = (idx + 1) / 6;
                  const currentVal = m.value > 0 ? m.value : mrr * (0.65 + simulatedProgress * 0.35);
                  const h = Math.min((currentVal / (maxVal * 1.2 || 1)) * 90, 85);
                  const y = 110 - Math.max(h, 15);
                  return { x, y, label: m.label, val: currentVal };
                });

                const pathD = points.reduce((acc, p, idx) => {
                  return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                }, "");

                const areaD = `${pathD} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;

                return (
                  <g>
                    <path d={areaD} fill="url(#areaGreenGrad)" />
                    <path d={pathD} fill="none" stroke="#008C66" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3.5" fill="#FFFFFF" stroke="#008C66" strokeWidth="2.5" />
                        <text x={p.x} y="125" textAnchor="middle" fontSize="9" fill="#64748B" fontWeight="600">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Painel Direito: Assinaturas por Plano (Donut) */}
        <div className="admin-panel-card">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div style={{ color: "#F5BD22" }}>
              <CreditCard size={20} color="#F5BD22" strokeWidth={2} />
            </div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37" }}>
              Assinaturas por Plano
            </h3>
          </div>

          {/* Gráfico Donut + Legenda */}
          <div className="donut-content-layout">
            {/* SVG Donut */}
            <div className="donut-circle-wrap">
              <svg width="100%" height="100%" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                {/* SVG Conic/Arcs Representation */}
                <circle cx="70" cy="70" r="50" fill="none" stroke="#E9EFF3" strokeWidth="22" />
                <circle
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke="#00B885"
                  strokeWidth="22"
                  strokeDasharray="140 314"
                  strokeDashoffset="0"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke="#3185FF"
                  strokeWidth="22"
                  strokeDasharray="90 314"
                  strokeDashoffset="-140"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke="#FFCA26"
                  strokeWidth="22"
                  strokeDasharray="50 314"
                  strokeDashoffset="-230"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke="#A94BEB"
                  strokeWidth="22"
                  strokeDasharray="34 314"
                  strokeDashoffset="-280"
                />
              </svg>
              {/* Centro do Donut: Total de Assinaturas */}
              <div style={{ position: "absolute", textAlign: "center" }}>
                <span style={{ fontSize: "19px", fontWeight: 800, color: "#101A37", display: "block", lineHeight: 1 }}>
                  {activeSubscriptions || totalTenants}
                </span>
                <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>
                  Assinaturas
                </span>
              </div>
            </div>

            {/* Legenda com Círculos e Percentuais Alinhados */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1, minWidth: "130px" }}>
              {planDistribution.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: item.color }} />
                    <span style={{ color: "#34435E", fontWeight: 600 }}>{item.nome}</span>
                  </div>
                  <span style={{ color: "#101A37", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          7. TERCEIRA LINHA — DOIS PAINÉIS OPERACIONAIS (y=500–717px)
          ================================================== */}
      <div className="operations-row-grid">
        {/* Painel Esquerdo: Últimas Faturas */}
        <div className="admin-panel-card">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <FileText size={20} color="#F5BD22" strokeWidth={2} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37" }}>
                Últimas Faturas
              </h3>
            </div>
            <Link
              href="/admin/faturas"
              style={{
                fontSize: "11px",
                color: "#006D53",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              Ver todas →
            </Link>
          </div>

          {/* Lista de Registros */}
          <div className="faturas-list-wrap">
            {last4Invoices.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#64748B", fontSize: "12px", padding: "16px" }}>
                Nenhuma fatura gerada no sistema.
              </div>
            ) : (
              last4Invoices.map((inv, idx) => {
                const isPaid = inv.status === "PAGO";
                const isPending = inv.status === "PENDENTE";

                return (
                  <div
                    key={idx}
                    style={{
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 10px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E4EAF0",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={15} color="#8898AA" strokeWidth={1.8} />
                      <span style={{ fontWeight: 700, color: "#0C1837" }}>
                        FAT-{String(idx + 1).padStart(5, "0")}
                      </span>
                    </div>

                    <span style={{ color: "#34435E", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inv.tenantEmpresa || inv.descricao || "Tenant Memorius"}
                    </span>

                    <span style={{ fontWeight: 700, color: "#0C1837", fontVariantNumeric: "tabular-nums" }}>
                      {formatBRL(inv.valor)}
                    </span>

                    {/* Status Pill */}
                    <span
                      style={{
                        height: "22px",
                        padding: "0 10px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 650,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        backgroundColor: isPaid ? "#E8F8F2" : isPending ? "#FFF7E6" : "#FEECEC",
                        color: isPaid ? "#00A86B" : isPending ? "#E6A400" : "#EF4444",
                      }}
                    >
                      {isPaid ? "✓ Pago" : isPending ? "⏳ Em aberto" : "⚠ Vencida"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Alertas e Pendências */}
        <div className="admin-panel-card">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <Bell size={20} color="#F5BD22" strokeWidth={2} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37" }}>
                Alertas e Pendências
              </h3>
            </div>
            <Link
              href="/admin/assinaturas"
              style={{
                fontSize: "11px",
                color: "#006D53",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ver todos →
            </Link>
          </div>

          {/* Três Alertas Empilhados */}
          <div className="alertas-list-wrap">
            {/* Alerta 1: Faturas Vencidas */}
            <div
              className="alerta-item-mockup"
              style={{
                backgroundColor: "#FFF0F0",
                border: "1px solid #FFCACA",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertCircle size={20} color="#EF4444" strokeWidth={2} />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#991B1B", display: "block", lineHeight: 1.2 }}>
                    {expiredInvoicesList.length} faturas vencidas
                  </span>
                  <span style={{ fontSize: "10px", color: "#65748B" }}>
                    Faturas que ultrapassaram a data de vencimento
                  </span>
                </div>
              </div>
              <ChevronRight size={16} color="#EF4444" />
            </div>

            {/* Alerta 2: Trials Vencendo */}
            <div
              className="alerta-item-mockup"
              style={{
                backgroundColor: "#FFF9E9",
                border: "1px solid #FBE5AE",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={20} color="#E6A400" strokeWidth={2} />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400E", display: "block", lineHeight: 1.2 }}>
                    {expiringTrials.length} trials expirando em 7 dias
                  </span>
                  <span style={{ fontSize: "10px", color: "#65748B" }}>
                    Tenants em período experimental próximo do fim
                  </span>
                </div>
              </div>
              <ChevronRight size={16} color="#E6A400" />
            </div>

            {/* Alerta 3: Assinaturas Suspensas */}
            <div
              className="alerta-item-mockup"
              style={{
                backgroundColor: "#EAF4FF",
                border: "1px solid #CDE2FF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={20} color="#3185FF" strokeWidth={2} />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", display: "block", lineHeight: 1.2 }}>
                    {suspendedSubs.length} assinaturas suspensas
                  </span>
                  <span style={{ fontSize: "10px", color: "#65748B" }}>
                    Aguardando regularização comercial
                  </span>
                </div>
              </div>
              <ChevronRight size={16} color="#3185FF" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
