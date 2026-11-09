/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useStorage } from "@/hooks/useStorage";
import { useTenant } from "@/context/TenantContext";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { Cliente, Contrato, Mensalidade, Atendimento, Cobranca } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  UsersRound,
  FileText,
  DollarSign,
  AlertTriangle,
  ChartColumnIncreasing,
  CreditCard,
  Receipt,
  Headphones,
  Calendar,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "@/components/icons/AdminIcons";

export default function DashboardPage() {
  const { tenant, userProfile } = useTenant();
  const { data: clientes, loading: loadingClientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: contratos, loading: loadingContratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: atendimentos, loading: loadingAtendimentos } = useStorage<Atendimento>(atendimentosSupabaseService as any);
  const { data: cobrancas, loading: loadingCobrancas } = useStorage<Cobranca>(cobrancasSupabaseService as any);

  const loading = loadingClientes || loadingContratos || loadingMensalidades || loadingAtendimentos || loadingCobrancas;

  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const currentCompetencia = `${String(currentMonthNum).padStart(2, "0")}/${currentYearNum}`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
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

  const mapCobrancaStatus = (status: string) => {
    const st = String(status || "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "PAGO"].includes(st)) return "Pago";
    if (["PENDING", "PIX_GERADO", "AWAITING_PAYMENT"].includes(st)) return "Pendente";
    if (["CANCELLED", "CANCELED"].includes(st)) return "Cancelado";
    return "Outro";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "40px" }}>
          <div style={{ width: "5px", height: "40px", backgroundColor: "#F5BD22", borderRadius: "3px" }} />
          <div style={{ width: "240px", height: "24px", backgroundColor: "#E2E8F0", borderRadius: "6px" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: "92px", backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E1E9EC" }} />
          ))}
        </div>
      </div>
    );
  }

  // --- Cálculos Reais de KPIs Principais (Linha 1) ---
  const clientesAtivos = clientes.filter((c) => c.status === "Ativo").length;
  const contratosAtivos = contratos.filter((c) => c.status === "Ativo").length;
  const receitaMes = mensalidades
    .filter((m) => m.competencia === currentCompetencia && m.status === "PAGO")
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);
  const inadimplentesCount = mensalidades.filter((m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr).length;

  // --- Indicadores Secundários (Faixa Compacta) ---
  const recebidosHoje = mensalidades
    .filter((m) => m.status === "PAGO" && m.dataPagamento === todayStr)
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);
  const ticketsAbertosCount = atendimentos.filter((a) => a.status === "Aberto").length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  const clientesNovosCount = clientes.filter((c) => c.dataCadastro && c.dataCadastro >= thirtyDaysAgoStr).length;
  const contratosNovosCount = contratos.filter((c) => c.dataInicio && c.dataInicio >= thirtyDaysAgoStr).length;

  const pixAguardandoCount = cobrancas.filter(
    (c) => c.gatewayMethod === "PIX" && mapCobrancaStatus(c.gatewayStatus || "") === "Pendente"
  ).length;

  // --- Gráficos (Linha 2) ---
  // 1. Evolução da Receita (Últimos 6 Meses)
  const last6Months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYearNum, currentMonthNum - 1 - i, 1);
    const comp = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const value = mensalidades
      .filter((m) => m.competencia === comp && m.status === "PAGO")
      .reduce((sum, m) => sum + Number(m.valorRecebido || m.valor || 0), 0);
    last6Months.push({ label: comp, value });
  }
  const maxRevenueVal = Math.max(...last6Months.map((m) => m.value), receitaMes, 100);

  // 2. Cobranças por Status (Donut)
  let pagoCount = 0;
  let pendenteCount = 0;
  let canceladoCount = 0;
  cobrancas.forEach((c) => {
    const mapped = mapCobrancaStatus(c.gatewayStatus || "");
    if (mapped === "Pago") pagoCount++;
    else if (mapped === "Pendente") pendenteCount++;
    else if (mapped === "Cancelado") canceladoCount++;
  });
  const totalCobrancas = pagoCount + pendenteCount + canceladoCount;

  const pctPago = totalCobrancas > 0 ? Math.round((pagoCount / totalCobrancas) * 100) : 0;
  const pctPendente = totalCobrancas > 0 ? Math.round((pendenteCount / totalCobrancas) * 100) : 0;
  const pctCancelado = totalCobrancas > 0 ? Math.round((canceladoCount / totalCobrancas) * 100) : 0;

  // Circunferência de raio 50 = 2 * PI * 50 = ~314.16
  const circ = 314.16;
  const arcPago = (pctPago / 100) * circ;
  const arcPendente = (pctPendente / 100) * circ;
  const arcCancelado = (pctCancelado / 100) * circ;

  // --- Painéis Operacionais (Linha 3) ---
  const ultimosRecebimentos = mensalidades
    .filter((m) => m.status === "PAGO")
    .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
    .slice(0, 4);

  const ultimosAtendimentos = atendimentos
    .sort((a, b) => {
      const dateA = `${a.data}T${a.hora || "00:00"}`;
      const dateB = `${b.data}T${b.hora || "00:00"}`;
      return dateB.localeCompare(dateA);
    })
    .slice(0, 4);

  return (
    <div className="tenant-dashboard-root-grid">
      {/* Scoped CSS for Bidimensional Fluid Layout & Responsiveness */}
      <style jsx global>{`
        .tenant-dashboard-root-grid {
          display: grid;
          grid-template-rows: auto auto auto minmax(220px, 1.15fr) minmax(210px, 1fr);
          gap: clamp(12px, 1.5vh, 18px);
          width: 100%;
          min-width: 0;
          flex: 1 1 auto;
          box-sizing: border-box;
        }

        .tenant-kpi-row-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(12px, 1vw, 18px);
          width: 100%;
        }

        .tenant-analytics-row-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
          gap: clamp(12px, 1vw, 18px);
          width: 100%;
          min-height: 0;
          height: 100%;
        }

        .tenant-operations-row-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(12px, 1vw, 18px);
          width: 100%;
          min-height: 0;
          height: 100%;
        }

        .tenant-kpi-card {
          background: #FFFFFF;
          border: 1px solid #E1E9EC;
          border-radius: 14px;
          padding: clamp(12px, 1.5vh, 18px) clamp(14px, 1.2vw, 20px);
          min-height: 84px;
          max-height: 98px;
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
        .tenant-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 35, 55, 0.08);
        }

        .tenant-panel-card {
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

        .tenant-chart-container {
          flex: 1 1 auto;
          width: 100%;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          min-width: 0;
          margin-top: 6px;
        }

        .tenant-donut-layout {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(12px, 1.5vw, 24px);
          flex: 1 1 auto;
          min-height: 0;
          margin-top: 4px;
        }

        .tenant-donut-wrap {
          position: relative;
          width: clamp(110px, 14vh, 145px);
          height: clamp(110px, 14vh, 145px);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1 / 1;
        }

        .tenant-list-wrap {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 0.8vh, 8px);
          flex: 1 1 auto;
          justify-content: space-around;
          min-height: 0;
          margin-top: 8px;
        }

        .tenant-secondary-strip {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        .tenant-secondary-card {
          background: #FFFFFF;
          border: 1px solid #E4EAF0;
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(15, 35, 55, 0.03);
        }

        /* Viewport Height Adjustments */
        @media (min-height: 900px) {
          .tenant-dashboard-root-grid {
            grid-template-rows: auto auto auto minmax(260px, 1.2fr) minmax(240px, 1.05fr);
            gap: 18px;
          }
        }

        @media (max-height: 720px) {
          .tenant-dashboard-root-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            height: auto;
          }
          .tenant-kpi-card {
            min-height: 78px;
          }
          .tenant-panel-card {
            height: auto;
            min-height: 220px;
          }
        }

        /* Responsive Breakpoints Width */
        @media (max-width: 1279px) {
          .tenant-kpi-row-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .tenant-analytics-row-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .tenant-panel-card {
            min-height: 230px;
          }
          .tenant-dashboard-root-grid {
            display: flex;
            flex-direction: column;
            height: auto;
          }
          .tenant-secondary-strip {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .tenant-operations-row-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .tenant-secondary-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .tenant-kpi-row-grid {
            grid-template-columns: 1fr;
          }
          .tenant-secondary-strip {
            grid-template-columns: 1fr;
          }
          .tenant-donut-layout {
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>

      {/* ==================================================
          1. HEADER / SAUDAÇÃO ELEGANTE
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
              {getGreeting()}, {userProfile?.nome || "Gestor"}!
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "18px",
                color: "#52627B",
                fontWeight: 500,
              }}
            >
              Aqui está o panorama operacional de <strong>{tenant?.empresa || "sua empresa"}</strong> hoje.
            </p>
          </div>
        </div>

        {/* Badge de Data com Ícone Calendar */}
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
          2. PRIMEIRA LINHA — EXATAMENTE 4 KPIS PRINCIPAIS
          ================================================== */}
      <div className="tenant-kpi-row-grid">
        {/* KPI 1: Clientes Ativos (Azul #3185FF) */}
        <div className="tenant-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#3185FF", display: "flex", alignItems: "center" }}>
              <UsersRound size={27} color="#3185FF" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Clientes Ativos
              </span>
              <span style={{ fontSize: "25px", fontWeight: 800, color: "#0C1738", lineHeight: 1 }}>
                {clientesAtivos}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#3185FF" }}>
            <UsersRound size={44} color="#3185FF" strokeWidth={1.5} />
          </div>
        </div>

        {/* KPI 2: Contratos Ativos (Verde #00A86B) */}
        <div className="tenant-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#00A86B", display: "flex", alignItems: "center" }}>
              <FileText size={27} color="#00A86B" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Contratos Ativos
              </span>
              <span style={{ fontSize: "25px", fontWeight: 800, color: "#0C1738", lineHeight: 1 }}>
                {contratosAtivos}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#00A86B" }}>
            <FileText size={44} color="#00A86B" strokeWidth={1.5} />
          </div>
        </div>

        {/* KPI 3: Receita do Mês (Dourado/Âmbar #E5A400) */}
        <div className="tenant-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#E5A400", display: "flex", alignItems: "center" }}>
              <DollarSign size={27} color="#E5A400" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Receita do Mês ({currentCompetencia})
              </span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#0C1738", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(receitaMes)}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#E5A400" }}>
            <DollarSign size={44} color="#E5A400" strokeWidth={1.5} />
          </div>
        </div>

        {/* KPI 4: Inadimplentes (Vermelho #EF4444) */}
        <div className="tenant-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ color: "#EF4444", display: "flex", alignItems: "center" }}>
              <AlertTriangle size={27} color="#EF4444" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111B37", display: "block", marginBottom: "2px" }}>
                Inadimplentes
              </span>
              <span style={{ fontSize: "25px", fontWeight: 800, color: "#0C1738", lineHeight: 1 }}>
                {inadimplentesCount}
              </span>
            </div>
          </div>
          <div style={{ opacity: 0.08, color: "#EF4444" }}>
            <AlertTriangle size={44} color="#EF4444" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* ==================================================
          3. FAIXA COMPACTA DE INDICADORES SECUNDÁRIOS
          ================================================== */}
      <div className="tenant-secondary-strip">
        <div className="tenant-secondary-card">
          <div style={{ color: "#00A86B", display: "flex" }}>
            <DollarSign size={20} color="#00A86B" strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, display: "block" }}>Recebidos Hoje</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C1837" }}>{formatCurrency(recebidosHoje)}</span>
          </div>
        </div>

        <div className="tenant-secondary-card">
          <div style={{ color: "#F59E0B", display: "flex" }}>
            <Headphones size={20} color="#F59E0B" strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, display: "block" }}>Tickets Abertos</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C1837" }}>{ticketsAbertosCount}</span>
          </div>
        </div>

        <div className="tenant-secondary-card">
          <div style={{ color: "#3185FF", display: "flex" }}>
            <UsersRound size={20} color="#3185FF" strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, display: "block" }}>Clientes Novos (30d)</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C1837" }}>+{clientesNovosCount}</span>
          </div>
        </div>

        <div className="tenant-secondary-card">
          <div style={{ color: "#8B5CF6", display: "flex" }}>
            <FileText size={20} color="#8B5CF6" strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, display: "block" }}>Contratos Novos (30d)</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C1837" }}>+{contratosNovosCount}</span>
          </div>
        </div>

        <div className="tenant-secondary-card">
          <div style={{ color: "#F97316", display: "flex" }}>
            <CreditCard size={20} color="#F97316" strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600, display: "block" }}>PIX Aguardando Pgto</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C1837" }}>{pixAguardandoCount}</span>
          </div>
        </div>
      </div>

      {/* ==================================================
          4. SEGUNDA LINHA — DOIS PAINÉIS ANALÍTICOS (1.65fr / 1fr)
          ================================================== */}
      <div className="tenant-analytics-row-grid">
        {/* Painel Esquerdo: Evolução da Receita */}
        <div className="tenant-panel-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ChartColumnIncreasing size={22} color="#F5BD22" strokeWidth={2} />
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37", lineHeight: 1.2 }}>
                  Evolução da Receita
                </h3>
                <span style={{ fontSize: "11px", color: "#53637B" }}>
                  Recebimentos liquidados nos últimos 6 meses
                </span>
              </div>
            </div>

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
              {formatCurrency(receitaMes)}
            </div>
          </div>

          {/* Gráfico SVG Responsivo com Curva e Gradiente */}
          <div className="tenant-chart-container">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 540 135"
              preserveAspectRatio="none"
              style={{ overflow: "visible", display: "block", flex: 1, minHeight: 0 }}
            >
              <defs>
                <linearGradient id="tenantAreaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A86B" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#00A86B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade Horizontais */}
              <line x1="50" y1="20" x2="525" y2="20" stroke="#E9EEF2" strokeWidth="1" />
              <line x1="50" y1="50" x2="525" y2="50" stroke="#E9EEF2" strokeWidth="1" />
              <line x1="50" y1="80" x2="525" y2="80" stroke="#E9EEF2" strokeWidth="1" />
              <line x1="50" y1="110" x2="525" y2="110" stroke="#CBD5E1" strokeWidth="1" />

              {/* Rótulos Eixo Y */}
              <text x="44" y="24" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">
                {formatCurrency(maxRevenueVal)}
              </text>
              <text x="44" y="65" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">
                {formatCurrency(maxRevenueVal / 2)}
              </text>
              <text x="44" y="114" textAnchor="end" fontSize="9" fill="#8898AA" fontWeight="500">R$ 0</text>

              {/* Curva de Receita */}
              {(() => {
                const points = last6Months.map((m, idx) => {
                  const x = 75 + idx * 85;
                  const ratio = maxRevenueVal > 0 ? m.value / maxRevenueVal : 0;
                  const h = Math.min(ratio * 90, 85);
                  const y = 110 - Math.max(h, 10);
                  return { x, y, label: m.label, val: m.value };
                });

                const pathD = points.reduce((acc, p, idx) => {
                  return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                }, "");

                const areaD = `${pathD} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;

                return (
                  <g>
                    <path d={areaD} fill="url(#tenantAreaGreen)" />
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

        {/* Painel Direito: Cobranças por Status (Donut) */}
        <div className="tenant-panel-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div style={{ color: "#F5BD22" }}>
              <CreditCard size={20} color="#F5BD22" strokeWidth={2} />
            </div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37" }}>
              Cobranças por Status
            </h3>
          </div>

          <div className="tenant-donut-layout">
            <div className="tenant-donut-wrap">
              <svg width="100%" height="100%" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="70" cy="70" r="50" fill="none" stroke="#E9EFF3" strokeWidth="20" />
                {totalCobrancas > 0 && (
                  <>
                    {pctPago > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="none"
                        stroke="#00A86B"
                        strokeWidth="20"
                        strokeDasharray={`${arcPago} ${circ}`}
                        strokeDashoffset="0"
                      />
                    )}
                    {pctPendente > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="20"
                        strokeDasharray={`${arcPendente} ${circ}`}
                        strokeDashoffset={`-${arcPago}`}
                      />
                    )}
                    {pctCancelado > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="50"
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="20"
                        strokeDasharray={`${arcCancelado} ${circ}`}
                        strokeDashoffset={`-${arcPago + arcPendente}`}
                      />
                    )}
                  </>
                )}
              </svg>
              <div style={{ position: "absolute", textAlign: "center" }}>
                <span style={{ fontSize: "19px", fontWeight: 800, color: "#101A37", display: "block", lineHeight: 1 }}>
                  {totalCobrancas}
                </span>
                <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>
                  Cobranças
                </span>
              </div>
            </div>

            {/* Legenda com Alinhamento */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1, minWidth: "125px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#00A86B" }} />
                  <span style={{ color: "#34435E", fontWeight: 600 }}>Pago ({pagoCount})</span>
                </div>
                <span style={{ color: "#101A37", fontWeight: 700 }}>{pctPago}%</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                  <span style={{ color: "#34435E", fontWeight: 600 }}>Pendente ({pendenteCount})</span>
                </div>
                <span style={{ color: "#101A37", fontWeight: 700 }}>{pctPendente}%</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
                  <span style={{ color: "#34435E", fontWeight: 600 }}>Cancelado ({canceladoCount})</span>
                </div>
                <span style={{ color: "#101A37", fontWeight: 700 }}>{pctCancelado}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          5. TERCEIRA LINHA — DOIS PAINÉIS OPERACIONAIS
          ================================================== */}
      <div className="tenant-operations-row-grid">
        {/* Painel Esquerdo: Últimos Recebimentos */}
        <div className="tenant-panel-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <Receipt size={20} color="#F5BD22" strokeWidth={2} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37" }}>
                Últimos Recebimentos
              </h3>
            </div>
            <Link
              href="/dashboard/recebimentos"
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
              Ver todos →
            </Link>
          </div>

          <div className="tenant-list-wrap">
            {ultimosRecebimentos.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#64748B", fontSize: "12px", padding: "16px" }}>
                Nenhum recebimento registrado recentemente.
              </div>
            ) : (
              ultimosRecebimentos.map((r, idx) => (
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, maxWidth: "45%" }}>
                    <DollarSign size={15} color="#00A86B" strokeWidth={2} />
                    <span style={{ fontWeight: 700, color: "#0C1837", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.clienteNome || "Cliente"}
                    </span>
                  </div>

                  <span style={{ color: "#64748B", fontSize: "10px" }}>
                    {formatDate(r.dataPagamento || "")}
                  </span>

                  <span style={{ fontWeight: 750, color: "#008A6B", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(Number(r.valorRecebido || r.valor))}
                  </span>

                  <span
                    style={{
                      height: "22px",
                      padding: "0 8px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: 650,
                      display: "inline-flex",
                      alignItems: "center",
                      backgroundColor: "#E8F8F2",
                      color: "#00A86B",
                    }}
                  >
                    ✓ Pago
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel Direito: Últimos Atendimentos */}
        <div className="tenant-panel-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <Headphones size={20} color="#F5BD22" strokeWidth={2} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#101A37" }}>
                Últimos Atendimentos
              </h3>
            </div>
            <Link
              href="/dashboard/atendimento"
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
              Ver todos →
            </Link>
          </div>

          <div className="tenant-list-wrap">
            {ultimosAtendimentos.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#64748B", fontSize: "12px", padding: "16px" }}>
                Nenhum atendimento em andamento.
              </div>
            ) : (
              ultimosAtendimentos.map((a, idx) => {
                const isAberto = a.status === "Aberto";
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, maxWidth: "45%" }}>
                      <Clock size={15} color="#52627B" strokeWidth={1.8} />
                      <span style={{ fontWeight: 700, color: "#0C1837", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.clienteNome || "Titular"}
                      </span>
                    </div>

                    <span style={{ color: "#64748B", fontSize: "10px" }}>
                      {formatDate(a.data)} {a.hora || ""}
                    </span>

                    <span style={{ color: "#34435E", fontSize: "11px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.operador || "Central"}
                    </span>

                    <span
                      style={{
                        height: "22px",
                        padding: "0 8px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 650,
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: isAberto ? "#FFF7E6" : "#E8F8F2",
                        color: isAberto ? "#D97706" : "#00A86B",
                      }}
                    >
                      {isAberto ? "⏳ Aberto" : "✓ Concluído"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
