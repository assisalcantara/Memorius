/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useStorage } from "@/hooks/useStorage";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Cobranca, Mensalidade, Cliente } from "@/types";
import { PageTitle } from "@/components/ui/PageTitle";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableContainer } from "@/components/ui/TableContainer";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardFinanceiroPage() {
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: cobrancas, loading: loadingCobrancas } = useStorage<Cobranca>(cobrancasSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);

  const loading = loadingMensalidades || loadingCobrancas;

  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const currentCompetencia = `${String(currentMonthNum).padStart(2, "0")}/${currentYearNum}`;

  // Helper map to locate client names
  const clientMap = new Map(clientes.map((c) => [String(c.id), c.nomeCompleto]));
  const getClientName = (clienteId: string | number) => {
    return clientMap.get(String(clienteId)) || `Cliente #${clienteId}`;
  };

  // Helper to map cobrancas status tolerantly
  const mapCobrancaStatus = (status: string) => {
    const st = String(status || "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "PAGO"].includes(st)) return "Pago";
    if (["PENDING", "PIX_GERADO", "AWAITING_PAYMENT"].includes(st)) return "Pendente";
    if (["CANCELLED", "CANCELED"].includes(st)) return "Cancelado";
    return "Outro";
  };

  if (loading) {
    return (
      <div>
        <PageTitle title="Dashboard Financeiro" icon="📊" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable cols={5} rows={5} />
      </div>
    );
  }

  const hasData = mensalidades.length > 0 || cobrancas.length > 0;

  if (!hasData) {
    return (
      <div>
        <PageTitle title="Dashboard Financeiro" icon="📊" />
        <EmptyState
          message="Quando existirem cobranças e mensalidades, os indicadores financeiros aparecerão aqui."
          description="Monitore suas faturas, taxas de adimplência e evolução financeira."
        />
      </div>
    );
  }

  // --- Calculations for Main Cards (Current Month) ---
  // Prevista: EM_ABERTO + PAGO for the current month
  const mensalidadesMesAtual = mensalidades.filter((m) => m.competencia === currentCompetencia);

  const receitaPrevista = mensalidadesMesAtual
    .filter((m) => m.status === "EM_ABERTO" || m.status === "PAGO")
    .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  const receitaRecebida = mensalidadesMesAtual
    .filter((m) => m.status === "PAGO")
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);

  const receitaEmAberto = mensalidadesMesAtual
    .filter((m) => m.status === "EM_ABERTO")
    .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  // PIX Pendentes: all time unpaid PIX charges
  const pixPendentesQtd = cobrancas.filter(
    (c) => c.gatewayMethod === "PIX" && mapCobrancaStatus(c.gatewayStatus || "") === "Pendente"
  ).length;

  // Adimplência
  const taxaAdimplencia = receitaPrevista > 0 ? (receitaRecebida / receitaPrevista) * 100 : 0;

  // Recebimentos Hoje
  const recebidosHoje = mensalidades
    .filter((m) => m.status === "PAGO" && m.dataPagamento === todayStr)
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);


  // --- Graph 1: Last 6 Months Revenue ---
  const last6Months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYearNum, currentMonthNum - 1 - i, 1);
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const value = mensalidades
      .filter((m) => m.competencia === label && m.status === "PAGO")
      .reduce((sum, m) => sum + Number(m.valorRecebido || m.valor || 0), 0);
    last6Months.push({ label, value });
  }

  const maxVal = Math.max(...last6Months.map((m) => m.value), 100);


  // --- Graph 2: Donut Status Distribution ---
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

  // Donut values logic
  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~219.9
  const pPago = totalCobrancas > 0 ? pagoCount / totalCobrancas : 0;
  const pPendente = totalCobrancas > 0 ? pendenteCount / totalCobrancas : 0;
  const pCancelado = totalCobrancas > 0 ? canceladoCount / totalCobrancas : 0;

  const dashPago = pPago * circumference;
  const dashPendente = pPendente * circumference;
  const dashCancelado = pCancelado * circumference;


  // --- Lists & Alerts ---
  // Últimos Recebimentos
  const ultimosRecebimentos = mensalidades
    .filter((m) => m.status === "PAGO")
    .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
    .slice(0, 5);

  // Alertas
  // 1. Cobranças vencidas
  const cobrancasVencidas = cobrancas.filter(
    (c) => c.gatewayStatus === "OVERDUE" || (mapCobrancaStatus(c.gatewayStatus || "") === "Pendente" && c.vencimento < todayStr)
  );

  // 2. Mensalidades vencidas sem cobrança
  const mensalidadesVencidasSemCobranca = mensalidades.filter((m) => {
    if (m.status !== "EM_ABERTO" || m.dataVencimento >= todayStr) return false;
    const hasCobranca = cobrancas.some(
      (c) => String(c.mensalidadeId) === String(m.id) && mapCobrancaStatus(c.gatewayStatus || "") !== "Cancelado"
    );
    return !hasCobranca;
  });

  // 3. PIX aguardando pagamento
  const pixAguardandoPagamento = cobrancas.filter(
    (c) => c.gatewayMethod === "PIX" && mapCobrancaStatus(c.gatewayStatus || "") === "Pendente"
  );

  return (
    <div>
      <PageTitle title="Dashboard Financeiro" icon="📊" />

      {/* Main KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #2f80ed" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Receita Prevista (Mês)</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#0f172a", fontSize: "1.4rem" }}>{formatCurrency(receitaPrevista)}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #27ae60" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Receita Recebida (Mês)</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#27ae60", fontSize: "1.4rem" }}>{formatCurrency(receitaRecebida)}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #e2b93b" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Receita em Aberto (Mês)</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#e2b93b", fontSize: "1.4rem" }}>{formatCurrency(receitaEmAberto)}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #06b6d4" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>PIX Pendentes (Qtd)</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#0f172a", fontSize: "1.4rem" }}>{pixPendentesQtd}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #8b5cf6" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Taxa de Adimplência</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#8b5cf6", fontSize: "1.4rem" }}>{taxaAdimplencia.toFixed(1)}%</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #ec4899" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Recebido Hoje</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#ec4899", fontSize: "1.4rem" }}>{formatCurrency(recebidosHoje)}</h3>
        </div>
      </div>

      {/* Graphs Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        
        {/* Bar Chart SVG */}
        <Card title="Evolução de Receita (Últimos 6 meses)" icon="📈">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "230px", justifyContent: "center" }}>
            <svg width="100%" height="180" style={{ overflow: "visible" }} viewBox="0 0 400 180">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="380" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="70" x2="380" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="120" x2="380" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="150" x2="380" y2="150" stroke="#cbd5e1" strokeWidth="1" />

              {/* Bars */}
              {last6Months.map((m, i) => {
                const barWidth = 32;
                const spacing = 50;
                const x = 55 + i * spacing;
                const barHeight = (m.value / maxVal) * 120;
                const y = 150 - barHeight;

                return (
                  <g key={`bar-${i}`}>
                    {/* Bar Rect */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="#2f80ed"
                      rx="4"
                      style={{ transition: "all 0.3s" }}
                    />
                    {/* Value label on top */}
                    {m.value > 0 && (
                      <text x={x + barWidth / 2} y={y - 6} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">
                        R$ {Math.round(m.value)}
                      </text>
                    )}
                    {/* Competence Label below */}
                    <text x={x + barWidth / 2} y="166" fill="#64748b" fontSize="10" textAnchor="middle">
                      {m.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        {/* Donut Chart SVG */}
        <Card title="Status das Cobranças" icon="🍩">
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", height: "230px", justifyContent: "center" }}>
            {totalCobrancas > 0 ? (
              <>
                <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  {/* Background Track */}
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />

                  {/* Pago Segment */}
                  {pPago > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#27ae60"
                      strokeWidth="12"
                      strokeDasharray={`${dashPago} ${circumference}`}
                      strokeDashoffset={0}
                    />
                  )}

                  {/* Pendente Segment */}
                  {pPendente > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#f2994a"
                      strokeWidth="12"
                      strokeDasharray={`${dashPendente} ${circumference}`}
                      strokeDashoffset={-dashPago}
                    />
                  )}

                  {/* Cancelado Segment */}
                  {pCancelado > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#eb5757"
                      strokeWidth="12"
                      strokeDasharray={`${dashCancelado} ${circumference}`}
                      strokeDashoffset={-(dashPago + dashPendente)}
                    />
                  )}
                </svg>

                {/* Legends */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#27ae60" }} />
                    <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                      <strong>Pago:</strong> {pagoCount} ({((pPago) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#f2994a" }} />
                    <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                      <strong>Pendente:</strong> {pendenteCount} ({((pPendente) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#eb5757" }} />
                    <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                      <strong>Cancelado:</strong> {canceladoCount} ({((pCancelado) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.4rem" }}>
                    Total: {totalCobrancas} cobranças
                  </div>
                </div>
              </>
            ) : (
              <span style={{ color: "#64748b", fontSize: "0.95rem" }}>Nenhuma cobrança registrada</span>
            )}
          </div>
        </Card>
      </div>

      {/* Two Columns: Receipts and Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
        
        {/* Table Container for Latest Receipts */}
        <TableContainer title="Últimos Recebimentos" count={ultimosRecebimentos.length}>
          {ultimosRecebimentos.length === 0 ? (
            <div style={{ padding: "1.5rem", color: "#64748b", textAlign: "center" }}>Nenhum recebimento registrado.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.6rem" }}>Cliente</th>
                  <th style={{ padding: "0.6rem" }}>Valor</th>
                  <th style={{ padding: "0.6rem" }}>Data</th>
                  <th style={{ padding: "0.6rem" }}>Método</th>
                  <th style={{ padding: "0.6rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimosRecebimentos.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.6rem", fontWeight: "500" }}>{getClientName(m.contratoId ? m.contratoId : "")}</td>
                    <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{formatCurrency(Number(m.valorRecebido || m.valor))}</td>
                    <td style={{ padding: "0.6rem" }}>{formatDate(m.dataPagamento || "")}</td>
                    <td style={{ padding: "0.6rem" }}>{m.gatewayMethod || "Manual"}</td>
                    <td style={{ padding: "0.6rem" }}>
                      <StatusBadge status="PAGO" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableContainer>

        {/* Alerts Section Card */}
        <Card title="Alertas Financeiros" icon="⚠️">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Alert 1: Cobranças vencidas */}
            {cobrancasVencidas.length > 0 && (
              <div style={{ padding: "0.85rem", backgroundColor: "#fef2f2", borderRadius: "8px", borderLeft: "4px solid #eb5757", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontWeight: "bold", color: "#991b1b", fontSize: "0.9rem" }}>🚨 Cobranças Vencidas ({cobrancasVencidas.length})</span>
                <span style={{ fontSize: "0.8rem", color: "#7f1d1d" }}>
                  Existem cobranças que ultrapassaram a data de vencimento e não foram liquidadas no gateway.
                </span>
              </div>
            )}

            {/* Alert 2: Mensalidades vencidas sem cobrança */}
            {mensalidadesVencidasSemCobranca.length > 0 && (
              <div style={{ padding: "0.85rem", backgroundColor: "#fffbeb", borderRadius: "8px", borderLeft: "4px solid #d97706", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontWeight: "bold", color: "#92400e", fontSize: "0.9rem" }}>⚠️ Mensalidades Vencidas Sem Cobrança Gateway ({mensalidadesVencidasSemCobranca.length})</span>
                <span style={{ fontSize: "0.8rem", color: "#78350f" }}>
                  Mensalidades vencidas em aberto que não possuem nenhuma cobrança ativa correspondente.
                </span>
              </div>
            )}

            {/* Alert 3: PIX aguardando pagamento */}
            {pixAguardandoPagamento.length > 0 && (
              <div style={{ padding: "0.85rem", backgroundColor: "#eff6ff", borderRadius: "8px", borderLeft: "4px solid #2f80ed", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontWeight: "bold", color: "#1e40af", fontSize: "0.9rem" }}>💬 PIX Aguardando Pagamento ({pixAguardandoPagamento.length})</span>
                <span style={{ fontSize: "0.8rem", color: "#1e3a8a" }}>
                  Cobranças via PIX que foram emitidas e estão pendentes de liquidação.
                </span>
              </div>
            )}

            {cobrancasVencidas.length === 0 && mensalidadesVencidasSemCobranca.length === 0 && pixAguardandoPagamento.length === 0 && (
              <div style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
                ✅ Nenhum alerta pendente. A saúde financeira está em dia!
              </div>
            )}

          </div>
        </Card>

      </div>
    </div>
  );
}
