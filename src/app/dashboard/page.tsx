/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useStorage } from "@/hooks/useStorage";
import { useTenant } from "@/context/TenantContext";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { Cliente, Contrato, Mensalidade, Atendimento, Cobranca } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

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

  // Formatted date string for greeting header
  const formattedToday = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
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
      <div style={{ padding: "1.5rem" }}>
        <div className="skeleton" style={{ height: "80px", width: "300px", borderRadius: "12px", marginBottom: "2rem", backgroundColor: "#eee" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable cols={6} rows={6} />
      </div>
    );
  }

  // --- Calculations for KPIs ---
  const clientesAtivos = clientes.filter((c) => c.status === "Ativo").length;
  const contratosAtivos = contratos.filter((c) => c.status === "Ativo").length;

  // Receita do mês: Monthly payments paid that belong to this competence
  const receitaMes = mensalidades
    .filter((m) => m.competencia === currentCompetencia && m.status === "PAGO")
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);

  // Recebimentos hoje
  const recebidosHoje = mensalidades
    .filter((m) => m.status === "PAGO" && m.dataPagamento === todayStr)
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);

  // Inadimplentes (Overdue mensalidades)
  const inadimplentesCount = mensalidades.filter((m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr).length;

  // Tickets abertos
  const ticketsAbertosCount = atendimentos.filter((a) => a.status === "Aberto").length;


  // --- Calculations for SVG charts (Bar and Donut) ---
  const last6Months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYearNum, currentMonthNum - 1 - i, 1);
    const comp = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const value = mensalidades
      .filter((m) => m.competencia === comp && m.status === "PAGO")
      .reduce((sum, m) => sum + Number(m.valorRecebido || m.valor || 0), 0);
    last6Months.push({ label: comp, value });
  }

  const maxRevenueVal = Math.max(...last6Months.map((m) => m.value), 100);

  // Cobranças por status chart
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
  const radius = 30;
  const circumference = 2 * Math.PI * radius; // ~188.4
  const pPago = totalCobrancas > 0 ? pagoCount / totalCobrancas : 0;
  const pPendente = totalCobrancas > 0 ? pendenteCount / totalCobrancas : 0;
  const pCancelado = totalCobrancas > 0 ? canceladoCount / totalCobrancas : 0;

  const dashPago = pPago * circumference;
  const dashPendente = pPendente * circumference;
  const dashCancelado = pCancelado * circumference;


  // --- Lists & Timelines ---
  // Últimos Recebimentos
  const ultimosRecebimentos = mensalidades
    .filter((m) => m.status === "PAGO")
    .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
    .slice(0, 5);

  // Últimos Atendimentos
  const ultimosAtendimentos = atendimentos
    .sort((a, b) => {
      const dateA = `${a.data}T${a.hora || "00:00"}`;
      const dateB = `${b.data}T${b.hora || "00:00"}`;
      return dateB.localeCompare(dateA);
    })
    .slice(0, 5);


  // --- Calculations for Third Row (Cards Rápidos) ---
  // Clientes Novos: registered in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  const clientesNovosCount = clientes.filter((c) => c.dataCadastro && c.dataCadastro >= thirtyDaysAgoStr).length;

  // Contratos Novos: signed in last 30 days
  const contratosNovosCount = contratos.filter((c) => c.dataInicio && c.dataInicio >= thirtyDaysAgoStr).length;

  // PIX aguardando pagamento
  const pixAguardandoCount = cobrancas.filter(
    (c) => c.gatewayMethod === "PIX" && mapCobrancaStatus(c.gatewayStatus || "") === "Pendente"
  ).length;

  // Mensalidades vencidas
  const mensalidadesVencidasCount = mensalidades.filter((m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr).length;


  // --- Fourth Row: Activities Recent Timeline ---
  const buildRecentActivities = () => {
    const events: any[] = [];
    
    // Client registrations
    clientes.slice(-4).forEach((c) => {
      if (c.dataCadastro) {
        events.push({
          date: c.dataCadastro,
          type: "CLIENT_CREATED",
          title: "Cliente Cadastrado",
          desc: `${c.nomeCompleto} cadastrado como novo titular no sistema.`,
          icon: "👤",
        });
      }
    });

    // Contracts signed
    contratos.slice(-4).forEach((c) => {
      if (c.dataInicio) {
        events.push({
          date: c.dataInicio,
          type: "CONTRACT_CREATED",
          title: "Contrato Assinado",
          desc: `Contrato Nº ${c.numeroContrato} de titular ${c.clienteNome} foi ativado.`,
          icon: "📄",
        });
      }
    });

    // PIX Cobrancas generated
    cobrancas.slice(-4).forEach((c) => {
      if (c.createdAt) {
        events.push({
          date: c.createdAt.split("T")[0],
          type: "COBRANCA_GENERATED",
          title: "Cobrança PIX Gerada",
          desc: `Cobrança no valor de ${formatCurrency(c.valor)} gerada via gateway ASAAS.`,
          icon: "💳",
        });
      }
    });

    // Payments received
    mensalidades.filter((m) => m.status === "PAGO" && m.dataPagamento).slice(-4).forEach((m) => {
      events.push({
        date: m.dataPagamento!,
        type: "PAYMENT_RECEIVED",
        title: "Pagamento Recebido",
        desc: `Mensalidade Ref: ${m.competencia} quitada. Valor: ${formatCurrency(Number(m.valorRecebido || m.valor))}.`,
        icon: "✅",
      });
    });

    // Tickets opened
    atendimentos.slice(-4).forEach((a) => {
      if (a.data) {
        events.push({
          date: a.data,
          type: "TICKET",
          title: `Atendimento Aberto (${a.tipo})`,
          desc: `Declarante: ${a.responsavel} | Local: ${a.local} | Status: ${a.status}.`,
          icon: "📞",
        });
      }
    });

    // Sort by date descending
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  };

  const recentActivities = buildRecentActivities();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "0.5rem" }}>
      <style>{`
        /* Glassmorphism utility card */
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: var(--border-radius);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.8);
        }
        .kpi-label {
          font-size: 0.8rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 0.05em;
        }
        .kpi-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0.3rem;
          letter-spacing: -0.02em;
        }
        .grid-2x2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }
        @media (max-width: 768px) {
          .grid-2x2 {
            grid-template-columns: 1fr;
          }
        }
        .grid-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 1rem;
        }
        .grid-quick {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }
        .timeline-line::before {
          content: '';
          position: absolute;
          left: 17px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: #e2e8f0;
        }
      `}</style>

      {/* ── FIRST ROW: HEADER & GREETINGS ── */}
      <div className="glass-card" style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "bold" }}>
            {getGreeting()},
          </span>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: "0.2rem 0", letterSpacing: "-0.02em" }}>
            Olá, {userProfile?.nome || "Proprietário"}
          </h2>
          <span style={{ fontSize: "0.85rem", color: "#0b4f59", fontWeight: "bold" }}>
            📅 {formattedToday}
          </span>
        </div>
        <div style={{ textAlign: "right", borderLeft: "2px solid #e2e8f0", paddingLeft: "1.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold", display: "block" }}>Empresa Logada</span>
          <strong style={{ fontSize: "1.1rem", color: "#0b4f59" }}>{tenant?.empresa || "Legado Flow"}</strong>
        </div>
      </div>

      {/* ── KPIS CARDS ROW ── */}
      <div className="grid-kpis">
        <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid #3b82f6" }}>
          <div className="kpi-label">Clientes Ativos</div>
          <div className="kpi-value" style={{ color: "#3b82f6" }}>{clientesAtivos}</div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid #6366f1" }}>
          <div className="kpi-label">Contratos Ativos</div>
          <div className="kpi-value" style={{ color: "#6366f1" }}>{contratosAtivos}</div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid #27ae60" }}>
          <div className="kpi-label">Receita do Mês</div>
          <div className="kpi-value" style={{ color: "#27ae60" }}>{formatCurrency(receitaMes)}</div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid #ec4899" }}>
          <div className="kpi-label">Recebimentos Hoje</div>
          <div className="kpi-value" style={{ color: "#ec4899" }}>{formatCurrency(recebidosHoje)}</div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid #ef4444" }}>
          <div className="kpi-label">Inadimplentes</div>
          <div className="kpi-value" style={{ color: "#ef4444" }}>{inadimplentesCount}</div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid #f2994a" }}>
          <div className="kpi-label">Tickets Abertos</div>
          <div className="kpi-value" style={{ color: "#f2994a" }}>{ticketsAbertosCount}</div>
        </div>
      </div>

      {/* ── SECOND ROW: GRID 2x2 ── */}
      <div className="grid-2x2">
        {/* 1. Receita Últimos Meses */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontWeight: "bold", fontSize: "1.05rem" }}>📊 Evolução de Receita</h4>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "180px" }}>
            <svg width="100%" height="150" style={{ overflow: "visible" }} viewBox="0 0 350 150">
              {last6Months.map((m, i) => {
                const barWidth = 24;
                const spacing = 50;
                const x = 30 + i * spacing;
                const barHeight = (m.value / maxRevenueVal) * 90;
                const y = 120 - barHeight;

                return (
                  <g key={m.label}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} fill="#0b4f59" rx="3" />
                    {m.value > 0 && (
                      <text x={x + barWidth / 2} y={y - 5} fill="#475569" fontSize="8" fontWeight="bold" textAnchor="middle">
                        {Math.round(m.value)}
                      </text>
                    )}
                    <text x={x + barWidth / 2} y="136" fill="#64748b" fontSize="9" textAnchor="middle">
                      {m.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 2. Cobranças por Status */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontWeight: "bold", fontSize: "1.05rem" }}>💳 Cobranças por Status</h4>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center", height: "180px" }}>
            {totalCobrancas > 0 ? (
              <>
                <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                  {pPago > 0 && (
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#27ae60" strokeWidth="10" strokeDasharray={`${dashPago} ${circumference}`} strokeDashoffset={0} />
                  )}
                  {pPendente > 0 && (
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f2994a" strokeWidth="10" strokeDasharray={`${dashPendente} ${circumference}`} strokeDashoffset={-dashPago} />
                  )}
                  {pCancelado > 0 && (
                    <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#eb5757" strokeWidth="10" strokeDasharray={`${dashCancelado} ${circumference}`} strokeDashoffset={-(dashPago + dashPendente)} />
                  )}
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#27ae60" }} />
                    <span>Pago: {pagoCount}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f2994a" }} />
                    <span>Pendente: {pendenteCount}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#eb5757" }} />
                    <span>Cancelado: {canceladoCount}</span>
                  </div>
                </div>
              </>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Sem faturas geradas</span>
            )}
          </div>
        </div>

        {/* 3. Últimos Recebimentos */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontWeight: "bold", fontSize: "1.05rem" }}>💵 Últimos Recebimentos</h4>
          {ultimosRecebimentos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Sem recebimentos</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569" }}>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Método</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {ultimosRecebimentos.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ fontWeight: "bold", padding: "0.45rem 0" }}>{r.clienteNome}</td>
                    <td>{formatDate(r.dataPagamento || "")}</td>
                    <td>{r.gatewayMethod || "Manual"}</td>
                    <td style={{ textAlign: "right", fontWeight: "bold", color: "#27ae60" }}>{formatCurrency(Number(r.valorRecebido || r.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Últimos Atendimentos */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h4 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontWeight: "bold", fontSize: "1.05rem" }}>📞 Últimos Atendimentos</h4>
          {ultimosAtendimentos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Sem atendimentos</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569" }}>
                  <th>Data</th>
                  <th>Paciente</th>
                  <th>Operador</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimosAtendimentos.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.45rem 0" }}>{formatDate(a.data)} {a.hora}</td>
                    <td style={{ fontWeight: "bold" }}>{a.clienteNome}</td>
                    <td>{a.operador}</td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                        backgroundColor: a.status === "Aberto" ? "#fffbeb" : "#e6f4ea",
                        color: a.status === "Aberto" ? "#d97706" : "#137333"
                      }}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── THIRD ROW: CARDS RÁPIDOS ── */}
      <div className="grid-quick">
        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ fontSize: "1.8rem" }}>👥</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block" }}>Clientes Novos (30d)</span>
            <strong style={{ fontSize: "1.2rem", color: "#0f172a" }}>+{clientesNovosCount}</strong>
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ fontSize: "1.8rem" }}>📄</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block" }}>Contratos Novos (30d)</span>
            <strong style={{ fontSize: "1.2rem", color: "#0f172a" }}>+{contratosNovosCount}</strong>
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ fontSize: "1.8rem" }}>💬</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block" }}>PIX Aguardando Pgto</span>
            <strong style={{ fontSize: "1.2rem", color: "#f2994a" }}>{pixAguardandoCount} pendentes</strong>
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ fontSize: "1.8rem" }}>⚠️</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block" }}>Mensalidades Vencidas</span>
            <strong style={{ fontSize: "1.2rem", color: "#ef4444" }}>{mensalidadesVencidasCount} abertas</strong>
          </div>
        </div>
      </div>

      {/* ── FOURTH ROW: ACTIVITIES TIMELINE ── */}
      <div className="glass-card" style={{ padding: "1.5rem 2rem" }}>
        <h4 style={{ margin: "0 0 1.5rem 0", color: "#0f172a", fontWeight: "bold", fontSize: "1.1rem" }}>⚡ Atividades Recentes</h4>
        {recentActivities.length === 0 ? (
          <EmptyState
            message="Nenhuma atividade recente encontrada."
            description="As ações de cadastro, contratos, cobranças, mensalidades e suporte aparecerão organizadas neste log de auditoria simplificado."
          />
        ) : (
          <div className="timeline-line" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative", paddingLeft: "1.5rem" }}>
            {recentActivities.map((act, index) => (
              <div key={index} style={{ position: "relative", display: "flex", flexDirection: "column" }}>
                {/* Dot marker */}
                <div style={{
                  position: "absolute",
                  left: "-33px",
                  top: "2px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  border: "2px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  zIndex: 2
                }}>
                  {act.icon}
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "bold" }}>
                    {formatDate(act.date)}
                  </span>
                  <h5 style={{ margin: "0.1rem 0", fontSize: "0.9rem", color: "#1e293b", fontWeight: "700" }}>
                    {act.title}
                  </h5>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                    {act.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
