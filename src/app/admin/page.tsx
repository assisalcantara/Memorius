"use client";

import { useEffect, useState } from "react";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { invoicesSupabaseService } from "@/services/invoices.supabase.service";
import { leadsSaasSupabaseService } from "@/services/leads-saas.supabase.service";
import { propostasSaasSupabaseService } from "@/services/propostas-saas.supabase.service";
import { auditLogSupabaseService } from "@/services/audit-log.supabase.service";
import { TenantSubscription, SaaSInvoice, LeadSaas, PropostaSaas, AuditLog } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  CheckCircle2,
  FlaskConical,
  CreditCard,
  AlertTriangle,
  Clock,
  Receipt,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ChartColumnIncreasing,
  Bell,
  Calendar,
  ChevronRight,
  UserCheck,
  FileText
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
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Skeleton Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <div style={{ width: "5px", height: "48px", backgroundColor: "#D8B33F", borderRadius: "4px" }} />
          <div>
            <div style={{ width: "320px", height: "30px", backgroundColor: "#E2E8F0", borderRadius: "6px", marginBottom: "8px" }} />
            <div style={{ width: "240px", height: "16px", backgroundColor: "#EDEFEF", borderRadius: "4px" }} />
          </div>
        </div>

        {/* Skeleton Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: "116px", backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E5EAF0" }} />
          ))}
        </div>
      </div>
    );
  }

  const tenants = data?.tenants || [];
  const subscriptions = data?.subscriptions || [];
  const invoices = data?.invoices || [];
  const leads = data?.leads || [];
  const proposals = data?.proposals || [];
  const logs = data?.logs || [];

  // 1. Cálculos de Indicadores Operacionais
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ATIVO").length;
  const trialTenants = subscriptions.filter((s) => s.status === "TRIAL").length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "ATIVO").length;
  const suspendedSubscriptions = subscriptions.filter((s) => s.status === "SUSPENSO").length;

  const pendingInvoices = invoices.filter((i) => i.status === "PENDENTE").length;
  const paidInvoices = invoices.filter((i) => i.status === "PAGO").length;
  const expiredInvoices = invoices.filter((i) => i.status === "VENCIDO").length;

  // 2. Cálculos Financeiros
  // MRR: Somatório das assinaturas ATIVO e TRIAL. Se ciclo ANUAL, dividir valor por 12.
  let mrr = 0;
  subscriptions.forEach((sub) => {
    if (sub.status === "ATIVO" || sub.status === "TRIAL") {
      const monthlyVal = sub.ciclo === "ANUAL" ? sub.valor / 12 : sub.valor;
      mrr += monthlyVal;
    }
  });

  const arr = mrr * 12;

  // Em aberto = PENDENTE + VENCIDO
  let totalOpen = 0;
  invoices.forEach((i) => {
    if (i.status === "PENDENTE" || i.status === "VENCIDO") {
      totalOpen += i.valor;
    }
  });

  // Recebido = PAGO
  let totalReceived = 0;
  invoices.forEach((i) => {
    if (i.status === "PAGO") {
      totalReceived += i.valor;
    }
  });

  // 3. Alertas Operacionais
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
  const tenantIdsWithSub = new Set(subscriptions.map((s) => s.tenantId));
  const tenantsWithoutSub = tenants.filter((t) => t.id && !tenantIdsWithSub.has(t.id));

  // 4. Receita Mensal dos Últimos 12 Meses
  const last12Months: { label: string; key: string; value: number }[] = [];
  const tempDate = new Date();
  tempDate.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    last12Months.push({ label, key: `${year}-${month}`, value: 0 });
  }

  invoices.forEach((inv) => {
    if (inv.status === "PAGO" && inv.pagamentoEm) {
      const pDate = new Date(inv.pagamentoEm);
      const yStr = pDate.getFullYear();
      const mStr = String(pDate.getMonth() + 1).padStart(2, "0");
      const key = `${yStr}-${mStr}`;
      const found = last12Months.find((m) => m.key === key);
      if (found) {
        found.value += inv.valor;
      }
    }
  });

  const maxMonthlyRevenue = Math.max(...last12Months.map((m) => m.value), 100);
  const hasRevenueData = invoices.some((i) => i.status === "PAGO" && i.valor > 0);

  // 5. Planos e Auditoria
  const planStatsMap: Record<string, { nome: string; count: number; mrr: number }> = {};
  subscriptions.forEach((sub) => {
    if (sub.status === "ATIVO" || sub.status === "TRIAL") {
      const key = sub.saasPlanId;
      const nome = sub.saasPlanNome || "Plano Desconhecido";
      if (!planStatsMap[key]) {
        planStatsMap[key] = { nome, count: 0, mrr: 0 };
      }
      planStatsMap[key].count += 1;
      const monthlyVal = sub.ciclo === "ANUAL" ? sub.valor / 12 : sub.valor;
      planStatsMap[key].mrr += monthlyVal;
    }
  });
  const topPlanos = Object.values(planStatsMap).sort((a, b) => b.count - a.count);
  const lastLogs = logs.slice(0, 8);

  return (
    <div>
      {/* Dynamic Scoped CSS */}
      <style jsx global>{`
        .admin-kpi-card {
          background-color: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: 20px 22px;
          min-height: 116px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(15, 35, 50, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .admin-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 35, 50, 0.07);
          border-color: #D3DFE9;
        }
        .admin-finance-card {
          background-color: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: 22px;
          min-height: 112px;
          box-shadow: 0 1px 3px rgba(15, 35, 50, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .admin-finance-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 35, 50, 0.07);
        }
        .admin-grid-top-5 {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 18px;
          margin-bottom: 18px;
        }
        .admin-grid-top-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 28px;
        }
        .admin-grid-finance {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 28px;
        }
        .admin-grid-charts {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }

        @media (max-width: 1400px) {
          .admin-grid-top-5 {
            grid-template-columns: repeat(3, 1fr);
          }
          .admin-grid-top-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          .admin-grid-finance {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 1100px) {
          .admin-grid-charts {
            grid-template-columns: 1fr;
          }
          .admin-grid-top-5 {
            grid-template-columns: repeat(2, 1fr);
          }
          .admin-grid-top-3 {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .admin-grid-top-5,
          .admin-grid-top-3,
          .admin-grid-finance {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* 4. Cabeçalho da Dashboard */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "26px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "5px",
              height: "48px",
              backgroundColor: "#D8B33F",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          />
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 750,
                color: "#111D3A",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              Dashboard Executivo SaaS
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#61718A", fontWeight: 500 }}>
              Resumo operacional e financeiro da plataforma
            </p>
          </div>
        </div>

        {/* Data Dinâmica Canto Direito */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5EAF0",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#64748B",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <Calendar size={16} color="#0B8D76" />
          <span>{getFormattedDate()}</span>
        </div>
      </div>

      {/* 5. Seção Indicadores Operacionais */}
      <div style={{ marginBottom: "12px" }}>
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 14px 0",
          }}
        >
          Indicadores Operacionais
        </h3>

        {/* Linha 1: 5 Cards (Total Tenants, Ativos, Trial, Assinaturas Ativas, Suspensas) */}
        <div className="admin-grid-top-5">
          {/* Total Tenants (Teal #087D75) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #087D75" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Total de Tenants
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {totalTenants}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(8, 125, 117, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#087D75",
                flexShrink: 0,
              }}
            >
              <Building2 size={24} color="#087D75" strokeWidth={2} />
            </div>
          </div>

          {/* Tenants Ativos (Verde #0AAF73) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #0AAF73" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Tenants Ativos
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {activeTenants}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(10, 175, 115, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0AAF73",
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={24} color="#0AAF73" strokeWidth={2} />
            </div>
          </div>

          {/* Tenants em Trial (Azul #2F80ED) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #2F80ED" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Tenants em Trial
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {trialTenants}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(47, 128, 237, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2F80ED",
                flexShrink: 0,
              }}
            >
              <FlaskConical size={24} color="#2F80ED" strokeWidth={2} />
            </div>
          </div>

          {/* Assinaturas Ativas (Roxo #8056E8) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #8056E8" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Assinaturas Ativas
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {activeSubscriptions}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(128, 86, 232, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8056E8",
                flexShrink: 0,
              }}
            >
              <CreditCard size={24} color="#8056E8" strokeWidth={2} />
            </div>
          </div>

          {/* Assinaturas Suspensas (Âmbar #E6A400) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #E6A400" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Assinaturas Suspensas
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {suspendedSubscriptions}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(230, 164, 0, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E6A400",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={24} color="#E6A400" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Linha 2: 3 Cards (Faturas Pendentes, Faturas Pagas, Faturas Vencidas) */}
        <div className="admin-grid-top-3">
          {/* Faturas Pendentes (Âmbar #E6A400) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #E6A400" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Faturas Pendentes
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {pendingInvoices}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(230, 164, 0, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E6A400",
                flexShrink: 0,
              }}
            >
              <Clock size={24} color="#E6A400" strokeWidth={2} />
            </div>
          </div>

          {/* Faturas Pagas (Verde #0AAF73) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #0AAF73" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Faturas Pagas
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {paidInvoices}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(10, 175, 115, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0AAF73",
                flexShrink: 0,
              }}
            >
              <Receipt size={24} color="#0AAF73" strokeWidth={2} />
            </div>
          </div>

          {/* Faturas Vencidas (Vermelho #EF4444) */}
          <div className="admin-kpi-card" style={{ borderLeft: "4px solid #EF4444" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                Faturas Vencidas
              </span>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#111D3A", lineHeight: 1 }}>
                {expiredInvoices}
              </span>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EF4444",
                flexShrink: 0,
              }}
            >
              <AlertCircle size={24} color="#EF4444" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Indicadores Financeiros (MRR, ARR, Em Aberto, Total Recebido) */}
      <div style={{ marginBottom: "12px" }}>
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 14px 0",
          }}
        >
          Indicadores Financeiros
        </h3>

        <div className="admin-grid-finance">
          {/* MRR (#00695C) */}
          <div className="admin-finance-card" style={{ borderTop: "3px solid #00695C" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              MRR (Mensal Recorrente)
            </span>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#00695C", marginTop: "8px", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              {formatBRL(mrr)}
            </div>
          </div>

          {/* ARR (#8056E8) */}
          <div className="admin-finance-card" style={{ borderTop: "3px solid #8056E8" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              ARR (Anual Projetada)
            </span>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#8056E8", marginTop: "8px", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              {formatBRL(arr)}
            </div>
          </div>

          {/* Em Aberto (#E69A00) */}
          <div className="admin-finance-card" style={{ borderTop: "3px solid #E69A00" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              Valor em Aberto
            </span>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#E69A00", marginTop: "8px", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              {formatBRL(totalOpen)}
            </div>
          </div>

          {/* Total Recebido (#0AAF73) */}
          <div className="admin-finance-card" style={{ borderTop: "3px solid #0AAF73" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
              Total Recebido
            </span>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0AAF73", marginTop: "8px", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              {formatBRL(totalReceived)}
            </div>
          </div>
        </div>
      </div>

      {/* 7 & 8. Linha de Gráfico de Receita e Alertas Operacionais */}
      <div className="admin-grid-charts">
        {/* Gráfico de Receita Mensal */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            border: "1px solid #E5EAF0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(15, 35, 50, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header do Card */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ChartColumnIncreasing size={23} color="#E5AC16" strokeWidth={2} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111D3A" }}>
                Receita Mensal Recebida (Últimos 12 Meses)
              </h3>
            </div>
            {hasRevenueData && (
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#0AAF73", backgroundColor: "rgba(10, 175, 115, 0.10)", padding: "4px 10px", borderRadius: "99px" }}>
                Faturamento Real
              </span>
            )}
          </div>

          {/* Conteúdo / Gráfico */}
          {!hasRevenueData ? (
            <div
              style={{
                height: "240px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FBFDFF",
                borderRadius: "12px",
                border: "1px dashed #E2E8F0",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", color: "#94A3B8" }}>
                <TrendingUp size={24} color="#94A3B8" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Nenhum pagamento liquidado no período
              </span>
              <span style={{ fontSize: "12px", color: "#94A3B8", maxWidth: "340px" }}>
                Conforme as faturas forem liquidadas pelos tenants, a curva mensal de receita será plotada automaticamente.
              </span>
            </div>
          ) : (
            <div style={{ width: "100%", height: "260px" }}>
              <svg width="100%" height="240" viewBox="0 0 520 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0AAF73" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0AAF73" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Linhas de Grade Horizontal #E9EFF3 */}
                <line x1="30" y1="30" x2="500" y2="30" stroke="#E9EFF3" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="80" x2="500" y2="80" stroke="#E9EFF3" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="130" x2="500" y2="130" stroke="#E9EFF3" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="180" x2="500" y2="180" stroke="#CBD5E1" strokeWidth="1" />

                {/* Construção dos Pontos e Caminho SVG */}
                {(() => {
                  const points = last12Months.map((m, idx) => {
                    const x = 40 + idx * 40;
                    const h = (m.value / maxMonthlyRevenue) * 140;
                    const y = 180 - h;
                    return { x, y, value: m.value, label: m.label };
                  });

                  const pathD = points.reduce((acc, p, idx) => {
                    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, "");

                  const areaD = `${pathD} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

                  return (
                    <g>
                      {/* Área Sombreada Gradiente */}
                      <path d={areaD} fill="url(#revenueGradient)" />
                      {/* Linha Principal Verde #00896D */}
                      <path d={pathD} fill="none" stroke="#00896D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Pontos Destacados e Labels */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#00896D" strokeWidth="2" />
                          <text x={p.x} y="200" textAnchor="middle" fontSize="9" fill="#64748B" fontWeight="600">
                            {p.label}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>

        {/* Alertas Operacionais e Comerciais */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            border: "1px solid #E5EAF0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(15, 35, 50, 0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Bell size={22} color="#E5AC16" strokeWidth={2} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111D3A" }}>
                Alertas Operacionais e Comerciais
              </h3>
            </div>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Tempo Real</span>
          </div>

          {/* Lista de Alertas */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexGrow: 1, justifyContent: "center" }}>
            {/* Alerta 1: Faturas Vencidas */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "64px",
                padding: "14px 16px",
                borderRadius: "10px",
                backgroundColor: expiredInvoicesList.length > 0 ? "#FFF2F2" : "#F8FAF8",
                border: expiredInvoicesList.length > 0 ? "1px solid #FFD2D2" : "1px solid #E2E8F0",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ color: expiredInvoicesList.length > 0 ? "#EF4444" : "#64748B" }}>
                  <AlertCircle size={22} color="currentColor" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 650, color: expiredInvoicesList.length > 0 ? "#991B1B" : "#111D3A" }}>
                    Faturas Vencidas
                  </div>
                  <div style={{ fontSize: "12px", color: "#65748B" }}>
                    {expiredInvoicesList.length > 0 ? "Faturas que ultrapassaram a data limite" : "Nenhuma fatura em atraso na plataforma"}
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: expiredInvoicesList.length > 0 ? "#EF4444" : "#64748B",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {expiredInvoicesList.length}
              </span>
            </div>

            {/* Alerta 2: Trials Vencendo em até 7 dias */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "64px",
                padding: "14px 16px",
                borderRadius: "10px",
                backgroundColor: expiringTrials.length > 0 ? "#FFF9E9" : "#F8FAFC",
                border: expiringTrials.length > 0 ? "1px solid #FCE5A7" : "1px solid #E2E8F0",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ color: expiringTrials.length > 0 ? "#E6A400" : "#64748B" }}>
                  <Clock size={22} color="currentColor" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 650, color: expiringTrials.length > 0 ? "#92400E" : "#111D3A" }}>
                    Trials Vencendo em até 7 dias
                  </div>
                  <div style={{ fontSize: "12px", color: "#65748B" }}>
                    Períodos de experimentação gratuitos próximos do fim
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: expiringTrials.length > 0 ? "#E6A400" : "#64748B",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {expiringTrials.length}
              </span>
            </div>

            {/* Alerta 3: Assinaturas Suspensas */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "64px",
                padding: "14px 16px",
                borderRadius: "10px",
                backgroundColor: suspendedSubs.length > 0 ? "#EDF5FF" : "#F8FAFC",
                border: suspendedSubs.length > 0 ? "1px solid #D5E5FF" : "1px solid #E2E8F0",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ color: suspendedSubs.length > 0 ? "#2F80ED" : "#64748B" }}>
                  <AlertTriangle size={22} color="currentColor" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 650, color: suspendedSubs.length > 0 ? "#1E40AF" : "#111D3A" }}>
                    Assinaturas Suspensas
                  </div>
                  <div style={{ fontSize: "12px", color: "#65748B" }}>
                    Acessos com bloqueio preventivo de novos cadastros
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: suspendedSubs.length > 0 ? "#2F80ED" : "#64748B",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {suspendedSubs.length}
              </span>
            </div>

            {/* Alerta 4: Tenants sem assinatura */}
            {tenantsWithoutSub.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: "64px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  backgroundColor: "#FFF1F2",
                  border: "1px solid #FFE4E6",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ color: "#9F1239" }}>
                    <Building2 size={22} color="currentColor" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 650, color: "#9F1239" }}>
                      Tenants Sem Assinatura
                    </div>
                    <div style={{ fontSize: "12px", color: "#65748B" }}>
                      Empresas registradas sem plano SaaS vinculado
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: "18px", fontWeight: 800, color: "#9F1239", fontVariantNumeric: "tabular-nums" }}>
                  {tenantsWithoutSub.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 9. Performance de Planos SaaS & Auditoria Recente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {/* Performance dos Planos */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            border: "1px solid #E5EAF0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(15, 35, 50, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111D3A" }}>
              Performance de Planos SaaS
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
              Assinaturas Ativas e em Trial
            </span>
          </div>

          {topPlanos.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#64748B", fontSize: "14px", backgroundColor: "#F8FAFC", borderRadius: "12px" }}>
              Nenhum plano com assinaturas ativas no momento.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5EAF0", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 650, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plano</th>
                    <th style={{ padding: "12px 16px", fontWeight: 650, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assinantes</th>
                    <th style={{ padding: "12px 16px", fontWeight: 650, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>MRR Gerado</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlanos.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#003F36" }}>{p.nome}</td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{p.count} assinantes</td>
                      <td style={{ padding: "14px 16px", fontWeight: 750, color: "#0AAF73", fontVariantNumeric: "tabular-nums" }}>
                        {formatBRL(p.mrr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Últimas Atividades de Auditoria */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            border: "1px solid #E5EAF0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(15, 35, 50, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111D3A" }}>
              Últimas Atividades da Plataforma
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
              Auditoria Global
            </span>
          </div>

          {lastLogs.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#64748B", fontSize: "14px", backgroundColor: "#F8FAFC", borderRadius: "12px" }}>
              Nenhum registro de auditoria disponível no momento.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5EAF0", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "12px 14px", fontWeight: 650, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Data / Hora</th>
                    <th style={{ padding: "12px 14px", fontWeight: 650, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Usuário</th>
                    <th style={{ padding: "12px 14px", fontWeight: 650, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Módulo</th>
                    <th style={{ padding: "12px 14px", fontWeight: 650, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ação</th>
                    <th style={{ padding: "12px 14px", fontWeight: 650, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {lastLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#64748B" }}>
                        {log.created_at ? formatDate(log.created_at) : "-"}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 650, color: "#1E293B" }}>{log.user_name || "Sistema"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#F1F5F9", padding: "3px 8px", borderRadius: "6px", color: "#475569" }}>
                          {log.modulo}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 650, color: "#003F36" }}>{log.acao}</td>
                      <td style={{ padding: "12px 14px", color: "#64748B" }}>{log.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
