/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

export default function RecebimentosPage() {
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: cobrancas, loading: loadingCobrancas } = useStorage<Cobranca>(cobrancasSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  const loading = loadingMensalidades || loadingCobrancas;

  // Modals state
  const [selectedRecebimento, setSelectedRecebimento] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activePixCobranca, setActivePixCobranca] = useState<Cobranca | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  // Filters state
  const [periodoFilter, setPeriodoFilter] = useState("TODOS"); // HOJE, 7_DIAS, 30_DIAS, PERSONALIZADO, TODOS
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");
  const [metodoFilter, setMetodoFilter] = useState("TODOS");

  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefixMonthStr = `${currentYear}-${currentMonthStr}`;

  // Helper map to locate client names
  const clientMap = new Map(clientes.map((c) => [String(c.id), c.nomeCompleto]));
  const getClientName = (clienteId: string | number) => {
    return clientMap.get(String(clienteId)) || `Cliente #${clienteId}`;
  };

  if (loading) {
    return (
      <div>
        <PageTitle title="Central de Recebimentos" icon="💵" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable cols={7} rows={6} />
      </div>
    );
  }

  // Base list of receipts: mensalidades status === PAGO
  const paidMensalidades = mensalidades.filter((m) => m.status === "PAGO");

  // Enrich paid mensalidades with cobrancas data
  const enrichedReceipts = paidMensalidades.map((m) => {
    // Find linked non-cancelled cobranca
    const linkedCobranca = cobrancas.find(
      (c) => String(c.mensalidadeId) === String(m.id) && c.gatewayStatus !== "CANCELLED" && c.gatewayStatus !== "CANCELED"
    );

    const valorRecebido = Number(m.valorRecebido || m.valor || 0);
    const dataPagamento = m.dataPagamento || "";
    const cleanMethod = linkedCobranca ? linkedCobranca.gatewayMethod || "Gateway" : "Manual";

    return {
      id: m.id,
      mensalidade: m,
      cobranca: linkedCobranca,
      valor: valorRecebido,
      data: dataPagamento,
      metodo: cleanMethod,
      clienteNome: getClientName(m.contratoId ? m.contratoId : ""),
    };
  });

  // Calculate stats based on all receipts (before user filters)
  const recebidosHoje = enrichedReceipts
    .filter((r) => r.data === todayStr)
    .reduce((acc, curr) => acc + curr.valor, 0);

  const qtdRecebidosHoje = enrichedReceipts.filter((r) => r.data === todayStr).length;

  const recebidosNoMes = enrichedReceipts
    .filter((r) => r.data.startsWith(prefixMonthStr))
    .reduce((acc, curr) => acc + curr.valor, 0);

  const qtdRecebidosNoMes = enrichedReceipts.filter((r) => r.data.startsWith(prefixMonthStr)).length;

  const ticketMedioMes = qtdRecebidosNoMes > 0 ? recebidosNoMes / qtdRecebidosNoMes : 0;

  // Apply filters on the enriched receipts list
  const filteredReceipts = enrichedReceipts.filter((r) => {
    // 1. Cliente Filter
    const matchesCliente = r.clienteNome.toLowerCase().includes(clienteFilter.toLowerCase());

    // 2. Método Filter
    const matchesMetodo = metodoFilter === "TODOS" || r.metodo === metodoFilter;

    // 3. Period Filter
    let matchesPeriod = true;
    if (periodoFilter === "HOJE") {
      matchesPeriod = r.data === todayStr;
    } else if (periodoFilter === "7_DIAS") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
      matchesPeriod = r.data >= sevenDaysAgoStr && r.data <= todayStr;
    } else if (periodoFilter === "30_DIAS") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
      matchesPeriod = r.data >= thirtyDaysAgoStr && r.data <= todayStr;
    } else if (periodoFilter === "PERSONALIZADO") {
      if (startDate && endDate) {
        matchesPeriod = r.data >= startDate && r.data <= endDate;
      } else if (startDate) {
        matchesPeriod = r.data >= startDate;
      } else if (endDate) {
        matchesPeriod = r.data <= endDate;
      }
    }

    return matchesCliente && matchesMetodo && matchesPeriod;
  });

  // Sort: most recent payment first
  const sortedReceipts = filteredReceipts.sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      <PageTitle title="Central de Recebimentos" icon="💵" />

      {/* Stats KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #27ae60" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Recebido Hoje</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#27ae60", fontSize: "1.6rem" }}>{formatCurrency(recebidosHoje)}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #2f80ed" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Recebido no Mês</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#0f172a", fontSize: "1.6rem" }}>{formatCurrency(recebidosNoMes)}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #f2994a" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Qtd Recebimentos Hoje</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#0f172a", fontSize: "1.6rem" }}>{qtdRecebidosHoje} pagamentos</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #8b5cf6" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Ticket Médio (Mês)</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#8b5cf6", fontSize: "1.6rem" }}>{formatCurrency(ticketMedioMes)}</h3>
        </div>
      </div>

      {/* Filters Card */}
      <Card title="Filtros de Busca" icon="⏬">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <Input
            label="Cliente"
            placeholder="Filtrar por titular"
            value={clienteFilter}
            onChange={(e) => setClienteFilter(e.target.value)}
          />
          <div className="form-group">
            <label>Período</label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={periodoFilter}
              onChange={(e) => setPeriodoFilter(e.target.value)}
            >
              <option value="TODOS">TODOS OS REGISTROS</option>
              <option value="HOJE">HOJE</option>
              <option value="7_DIAS">ÚLTIMOS 7 DIAS</option>
              <option value="30_DIAS">ÚLTIMOS 30 DIAS</option>
              <option value="PERSONALIZADO">PERÍODO PERSONALIZADO</option>
            </select>
          </div>
          <div className="form-group">
            <label>Método de Recebimento</label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={metodoFilter}
              onChange={(e) => setMetodoFilter(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="PIX">PIX</option>
              <option value="Manual">MANUAL</option>
              <option value="BOLETO">BOLETO</option>
              <option value="CREDIT_CARD">CARTÃO DE CRÉDITO</option>
            </select>
          </div>

          {periodoFilter === "PERSONALIZADO" && (
            <>
              <Input
                label="Data Inicial"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Data Final"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <Button
            variant="cancel"
            onClick={() => {
              setClienteFilter("");
              setMetodoFilter("TODOS");
              setPeriodoFilter("TODOS");
              setStartDate("");
              setEndDate("");
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Timeline Section */}
      <TableContainer title="Linha do Tempo de Recebimentos" count={sortedReceipts.length}>
        {sortedReceipts.length === 0 ? (
          <EmptyState
            message="Nenhum recebimento encontrado para o período selecionado."
            description="Tente alterar os filtros de busca ou o período selecionado acima."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Data/Hora</th>
                <th style={{ padding: "0.8rem" }}>Cliente</th>
                <th style={{ padding: "0.8rem" }}>Plano</th>
                <th style={{ padding: "0.8rem" }}>Competência</th>
                <th style={{ padding: "0.8rem" }}>Método</th>
                <th style={{ padding: "0.8rem" }}>Valor</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedReceipts.map((r) => {
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.8rem", color: "#64748b" }}>
                      {formatDate(r.data)}
                    </td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>
                      {r.clienteNome}
                    </td>
                    <td style={{ padding: "0.8rem" }}>{r.mensalidade.planoNome}</td>
                    <td style={{ padding: "0.8rem" }}>{r.mensalidade.competencia}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        backgroundColor: r.metodo === "Manual" ? "#f1f5f9" : "#e0f2fe",
                        color: r.metodo === "Manual" ? "#475569" : "#0369a1",
                        textTransform: "uppercase"
                      }}>
                        {r.metodo}
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold", color: "#27ae60" }}>
                      {formatCurrency(r.valor)}
                    </td>
                    <td style={{ padding: "0.8rem" }}>
                      <StatusBadge status="PAGO" />
                    </td>
                    <td style={{ padding: "0.8rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <Button
                          onClick={() => {
                            setSelectedRecebimento(r);
                            setIsViewModalOpen(true);
                          }}
                          style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#64748b" }}
                        >
                          🔍 Ver Detalhes
                        </Button>
                        {r.cobranca?.pixQrCode && (
                          <Button
                            onClick={() => {
                              setActivePixCobranca(r.cobranca || null);
                              setIsPixModalOpen(true);
                            }}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#2f80ed" }}
                          >
                            🖼️ Ver PIX
                          </Button>
                        )}
                        {r.cobranca?.invoiceUrl && (
                          <Button
                            onClick={() => window.open(r.cobranca?.invoiceUrl || "", "_blank")}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#3b82f6" }}
                          >
                            🔗 Abrir ASAAS
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Details View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detalhes do Recebimento">
        {selectedRecebimento && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "0.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", backgroundColor: "#f8f9fa", padding: "1rem", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Cliente</span>
                <strong>{selectedRecebimento.clienteNome}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Contrato</span>
                <strong>{selectedRecebimento.mensalidade.numeroContrato}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Valor Recebido</span>
                <strong style={{ color: "#27ae60" }}>{formatCurrency(selectedRecebimento.valor)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Método</span>
                <strong>{selectedRecebimento.metodo}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Data do Recebimento</span>
                <strong>{formatDate(selectedRecebimento.data)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Competência</span>
                <strong>{selectedRecebimento.mensalidade.competencia}</strong>
              </div>
              {selectedRecebimento.cobranca && (
                <>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Gateway Status</span>
                    <strong>{selectedRecebimento.cobranca.gatewayStatus}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Gateway Payment ID</span>
                    <strong>{selectedRecebimento.cobranca.gatewayPaymentId}</strong>
                  </div>
                </>
              )}
            </div>

            {selectedRecebimento.mensalidade.observacao && (
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#555" }}>Observações</label>
                <p style={{ margin: "0.25rem 0", padding: "0.5rem", backgroundColor: "#f1f5f9", borderRadius: "6px" }}>
                  {selectedRecebimento.mensalidade.observacao}
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", width: "100%", justifyContent: "flex-end" }}>
              {selectedRecebimento.cobranca?.invoiceUrl && (
                <Button
                  onClick={() => window.open(selectedRecebimento.cobranca.invoiceUrl || "", "_blank")}
                  style={{ backgroundColor: "#2f80ed" }}
                >
                  🔗 Abrir no ASAAS
                </Button>
              )}
              <Button variant="cancel" onClick={() => setIsViewModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* PIX View Modal */}
      <Modal isOpen={isPixModalOpen} onClose={() => setIsPixModalOpen(false)} title="QR Code PIX Vinculado">
        {activePixCobranca && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center", padding: "1rem" }}>
            {activePixCobranca.pixQrCode && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${activePixCobranca.pixQrCode}`}
                  alt="QR Code PIX"
                  style={{ width: "200px", height: "200px", border: "1px solid #ddd", borderRadius: "8px", padding: "0.5rem", backgroundColor: "#fff" }}
                />
              </div>
            )}

            {activePixCobranca.pixCopyPaste && (
              <div style={{ width: "100%" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", color: "#555", marginBottom: "0.25rem" }}>
                  Código PIX (Copia e Cola)
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    readOnly
                    value={activePixCobranca.pixCopyPaste}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      backgroundColor: "#f1f5f9"
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(activePixCobranca.pixCopyPaste || "");
                      toast.success("Código PIX copiado!");
                    }}
                    style={{ padding: "0 0.75rem", fontSize: "0.85rem" }}
                  >
                    📋 Copiar
                  </Button>
                </div>
              </div>
            )}

            <Button variant="cancel" style={{ width: "100%" }} onClick={() => setIsPixModalOpen(false)}>
              Fechar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
