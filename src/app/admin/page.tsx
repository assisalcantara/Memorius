"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { invoicesSupabaseService } from "@/services/invoices.supabase.service";
import { leadsSaasSupabaseService } from "@/services/leads-saas.supabase.service";
import { propostasSaasSupabaseService } from "@/services/propostas-saas.supabase.service";
import { auditLogSupabaseService } from "@/services/audit-log.supabase.service";
import { TenantSubscription, SaaSInvoice, LeadSaas, PropostaSaas, AuditLog } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

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

  if (loading) {
    return (
      <div>
        <PageTitle title="Dashboard SaaS" icon="📊" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
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

  // 1. Calculations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ATIVO").length;
  const trialTenants = subscriptions.filter((s) => s.status === "TRIAL").length;

  const activeSubscriptions = subscriptions.filter((s) => s.status === "ATIVO").length;
  const suspendedSubscriptions = subscriptions.filter((s) => s.status === "SUSPENSO").length;

  const pendingInvoices = invoices.filter((i) => i.status === "PENDENTE").length;
  const paidInvoices = invoices.filter((i) => i.status === "PAGO").length;
  const expiredInvoices = invoices.filter((i) => i.status === "VENCIDO").length;

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

  // 2. Alertas Operacionais
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

  // 3. Gráfico 1: Receita Mensal (Últimos 12 meses)
  // Determine last 12 months (e.g. YYYY-MM)
  const last12Months: { label: string; key: string; value: number }[] = [];
  const tempDate = new Date();
  tempDate.setDate(1); // avoid month overflow issues
  for (let i = 11; i >= 0; i--) {
    const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    last12Months.push({ label, key: `${year}-${month}`, value: 0 });
  }

  // Populate payments
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

  // 4. Gráfico 2: Faturas por Status
  const invoiceStatusCounts = {
    PAGO: invoices.filter((i) => i.status === "PAGO").length,
    PENDENTE: invoices.filter((i) => i.status === "PENDENTE").length,
    VENCIDO: invoices.filter((i) => i.status === "VENCIDO").length,
    CANCELADO: invoices.filter((i) => i.status === "CANCELADO").length
  };
  const totalInvoicesCount = invoices.length || 1;

  // 5. Gráfico 3: Funil Comercial
  const leadsCount = leads.length;
  const proposalsCount = proposals.length;
  const tenantsCount = tenants.length;

  const maxFunnel = Math.max(leadsCount, proposalsCount, tenantsCount, 1);
  const p2 = proposalsCount / maxFunnel;
  const p3 = tenantsCount / maxFunnel;

  // 6. Top Planos
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

  // 7. Últimas Atividades
  const lastLogs = logs.slice(0, 10);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle title="Dashboard Executivo SaaS" icon="📊" />

      {/* KPI Cards Section */}
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#475569", marginBottom: "1rem" }}>
        Indicadores Operacionais
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <MetricCard title="Total de Tenants" value={totalTenants} icon="🏢" color="#0b4f59" />
        <MetricCard title="Tenants Ativos" value={activeTenants} icon="🟢" color="#10b981" />
        <MetricCard title="Tenants em Trial" value={trialTenants} icon="🧪" color="#3b82f6" />
        <MetricCard title="Assinaturas Ativas" value={activeSubscriptions} icon="💳" color="#8b5cf6" />
        <MetricCard title="Assinaturas Suspensas" value={suspendedSubscriptions} icon="⚠️" color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <MetricCard title="Faturas Pendentes" value={pendingInvoices} icon="⏳" color="#f59e0b" />
        <MetricCard title="Faturas Pagas" value={paidInvoices} icon="✅" color="#10b981" />
        <MetricCard title="Faturas Vencidas" value={expiredInvoices} icon="🚨" color="#ef4444" />
      </div>

      {/* Financial Indicators */}
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#475569", marginBottom: "1rem" }}>
        Indicadores Financeiros (MRR / ARR)
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>MRR (Mensal Recorrente)</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0b4f59", marginTop: "0.5rem" }}>R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>ARR (Anual Projetada)</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#7c3aed", marginTop: "0.5rem" }}>R$ {arr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Valor Em Aberto</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.5rem" }}>R$ {totalOpen.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Recebido</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981", marginTop: "0.5rem" }}>R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Main Grid: Charts & Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* SVG Chart 1: Revenue last 12 months */}
        <Card title="Receita Mensal Recebida (Últimos 12 Meses)" icon="📈">
          {invoices.filter((i) => i.status === "PAGO").length === 0 ? (
            <EmptyState message="Sem faturamento recebido registrado para gerar o gráfico." />
          ) : (
            <div style={{ width: "100%", height: "260px" }}>
              <svg width="100%" height="220" viewBox="0 0 480 220" preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="40" y1="30" x2="460" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="80" x2="460" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="130" x2="460" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="180" x2="460" y2="180" stroke="#cbd5e1" strokeWidth="1" />

                {/* Bars */}
                {last12Months.map((m, idx) => {
                  const x = 45 + idx * 34;
                  const barHeight = (m.value / maxMonthlyRevenue) * 130;
                  const y = 180 - barHeight;
                  return (
                    <g key={m.key}>
                      <rect
                        x={x}
                        y={y}
                        width="20"
                        height={Math.max(barHeight, 2)}
                        rx="3"
                        fill="#0b4f59"
                      >
                        <title>{`R$ ${m.value.toFixed(2)}`}</title>
                      </rect>
                      <text
                        x={x + 10}
                        y="196"
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </Card>

        {/* Operational Alerts */}
        <Card title="Alertas Operacionais e Comerciais" icon="⚠️">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem",
              borderRadius: "8px",
              backgroundColor: expiredInvoicesList.length > 0 ? "#fef2f2" : "#f0fdf4",
              border: expiredInvoicesList.length > 0 ? "1px solid #fee2e2" : "1px solid #dcfce7"
            }}>
              <div>
                <strong style={{ color: expiredInvoicesList.length > 0 ? "#991b1b" : "#166534", fontSize: "0.9rem" }}>
                  Faturas Vencidas
                </strong>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Faturas que ultrapassaram a data de vencimento</div>
              </div>
              <span style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: expiredInvoicesList.length > 0 ? "#991b1b" : "#166534"
              }}>{expiredInvoicesList.length}</span>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem",
              borderRadius: "8px",
              backgroundColor: expiringTrials.length > 0 ? "#fffbeb" : "#f8fafc",
              border: expiringTrials.length > 0 ? "1px solid #fef3c7" : "1px solid #e2e8f0"
            }}>
              <div>
                <strong style={{ color: expiringTrials.length > 0 ? "#92400e" : "#475569", fontSize: "0.9rem" }}>
                  Trials Vencendo em até 7 dias
                </strong>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Tenants em período experimental expirando brevemente</div>
              </div>
              <span style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: expiringTrials.length > 0 ? "#92400e" : "#475569"
              }}>{expiringTrials.length}</span>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem",
              borderRadius: "8px",
              backgroundColor: suspendedSubs.length > 0 ? "#fef3c7" : "#f8fafc",
              border: suspendedSubs.length > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0"
            }}>
              <div>
                <strong style={{ color: suspendedSubs.length > 0 ? "#92400e" : "#475569", fontSize: "0.9rem" }}>
                  Assinaturas Suspensas
                </strong>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Acessos temporariamente bloqueados comercialmente</div>
              </div>
              <span style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: suspendedSubs.length > 0 ? "#92400e" : "#475569"
              }}>{suspendedSubs.length}</span>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem",
              borderRadius: "8px",
              backgroundColor: tenantsWithoutSub.length > 0 ? "#fff1f2" : "#f8fafc",
              border: tenantsWithoutSub.length > 0 ? "1px solid #ffe4e6" : "1px solid #e2e8f0"
            }}>
              <div>
                <strong style={{ color: tenantsWithoutSub.length > 0 ? "#9f1239" : "#475569", fontSize: "0.9rem" }}>
                  Tenants Sem Assinatura
                </strong>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Empresas criadas sem plano comercial ativo</div>
              </div>
              <span style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: tenantsWithoutSub.length > 0 ? "#9f1239" : "#475569"
              }}>{tenantsWithoutSub.length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* SVG Chart 2 & 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* Status Invoices Pie/Bar Chart */}
        <Card title="Distribuição de Faturas por Status" icon="📊">
          {invoices.length === 0 ? (
            <EmptyState message="Sem faturas geradas para exibir distribuição." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem" }}>
              {(["PAGO", "PENDENTE", "VENCIDO", "CANCELADO"] as const).map((status) => {
                const count = invoiceStatusCounts[status];
                const percentage = ((count / totalInvoicesCount) * 100).toFixed(0);
                const color = 
                  status === "PAGO" ? "#10b981" : 
                  status === "PENDENTE" ? "#f59e0b" : 
                  status === "VENCIDO" ? "#ef4444" : "#6b7280";

                return (
                  <div key={status} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700 }}>
                      <span style={{ color: "#475569" }}>{status}</span>
                      <span style={{ color: "#64748b" }}>{count} faturas ({percentage}%)</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", backgroundColor: color, borderRadius: "4px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Commercial Funnel Chart */}
        <Card title="Funil Comercial (Leads → Tenants)" icon="🌪️">
          {leadsCount === 0 && proposalsCount === 0 && tenantsCount === 0 ? (
            <EmptyState message="Sem dados suficientes para gerar o funil." />
          ) : (
            <div style={{ width: "100%", height: "220px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <svg width="280" height="200" viewBox="0 0 280 200">
                {/* Leads Stage */}
                <polygon points={`10,10 270,10 ${270 - (1 - p2) * 100},80 ${10 + (1 - p2) * 100},80`} fill="#3b82f6" fillOpacity="0.85" />
                <text x="140" y="35" textAnchor="middle" fill="white" fontWeight="800" fontSize="10">
                  LEADS: {leadsCount}
                </text>

                {/* Proposals Stage */}
                <polygon points={`${10 + (1 - p2) * 100},85 ${270 - (1 - p2) * 100},85 ${270 - (1 - p3) * 115},145 ${10 + (1 - p3) * 115},145`} fill="#7c3aed" fillOpacity="0.85" />
                <text x="140" y="110" textAnchor="middle" fill="white" fontWeight="800" fontSize="10">
                  PROPOSTAS: {proposalsCount}
                </text>

                {/* Tenants Stage */}
                <polygon points={`${10 + (1 - p3) * 115},150 ${270 - (1 - p3) * 115},150 160,195 120,195`} fill="#10b981" fillOpacity="0.85" />
                <text x="140" y="175" textAnchor="middle" fill="white" fontWeight="800" fontSize="10">
                  TENANTS: {tenantsCount}
                </text>
              </svg>
            </div>
          )}
        </Card>
      </div>

      {/* Plan Performance & Logs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
        
        {/* Top Plans Table */}
        <Card title="Performance de Planos SaaS (Top Planos)" icon="🏆">
          {topPlanos.length === 0 ? (
            <EmptyState message="Sem planos SaaS associados a assinaturas ativas." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Plano</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Quantidade de Assinantes</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Receita Mensal Gerada</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlanos.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0b4f59" }}>{p.nome}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{p.count} assinantes</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#10b981" }}>
                        R$ {p.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Global Audit Logs (Last 10 Actions) */}
        <Card title="Últimas Atividades do Sistema (Auditoria)" icon="🛡️">
          {lastLogs.length === 0 ? (
            <EmptyState message="Nenhum log de auditoria global registrado." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Data / Hora</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Usuário</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Módulo</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Ação</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {lastLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "#64748b" }}>
                        {log.created_at ? formatDate(log.created_at) : "-"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>{log.user_name || "Sistema"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, backgroundColor: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px", color: "#475569" }}>
                          {log.modulo}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0b4f59" }}>{log.acao}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>{log.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
