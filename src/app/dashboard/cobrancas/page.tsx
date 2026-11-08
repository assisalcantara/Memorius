/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useStorage } from "@/hooks/useStorage";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { Cobranca, Cliente, Mensalidade } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function CobrancasPage() {
  const { data: cobrancas, loading, refresh: reloadCobrancas } = useStorage<Cobranca>(cobrancasSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: mensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const toast = useToast();

  // Selected cobranca details modal state
  const [selectedCobranca, setSelectedCobranca] = useState<Cobranca | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [metodoFilter, setMetodoFilter] = useState("TODOS");
  const [competenciaFilter, setCompetenciaFilter] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");

  // Cancel confirmation state
  const [confirmCancelId, setConfirmCancelId] = useState<string | number | null>(null);

  // Helper map to locate client names
  const clientMap = new Map(clientes.map((c) => [String(c.id), c.nomeCompleto]));

  // Helper map to locate monthly payment details
  const mensalidadeMap = new Map(
    mensalidades.map((m) => [String(m.id), { competencia: m.competencia, numeroContrato: m.numeroContrato }])
  );

  const getClientName = (clienteId: string | number) => {
    return clientMap.get(String(clienteId)) || `Cliente #${clienteId}`;
  };

  const getMensalidadeInfo = (mId: string | number | undefined) => {
    if (!mId) return "N/A";
    const info = mensalidadeMap.get(String(mId));
    return info ? `Ref: ${info.competencia} (Contrato: ${info.numeroContrato})` : `Mensalidade #${mId}`;
  };

  const getCompetenciaText = (mId: string | number | undefined) => {
    if (!mId) return "";
    const info = mensalidadeMap.get(String(mId));
    return info ? info.competencia : "";
  };

  const handleCancelClick = (id: string | number) => {
    setConfirmCancelId(id);
  };

  const handleConfirmCancel = async () => {
    if (confirmCancelId !== null) {
      try {
        await cobrancasSupabaseService.cancel(confirmCancelId);
        toast.success("Cobrança cancelada com sucesso no banco local!");
        await reloadCobrancas();
        setConfirmCancelId(null);
      } catch (err: any) {
        toast.error(err.message || "Erro ao cancelar cobrança.");
      }
    }
  };

  const handleCopyPix = (pixPayload: string) => {
    navigator.clipboard.writeText(pixPayload);
    toast.success("Código PIX copiado com sucesso!");
  };

  // Filters application
  const filteredCobrancas = cobrancas.filter((c) => {
    const clientName = getClientName(c.clienteId).toLowerCase();
    const matchesClient = clientName.includes(clienteFilter.toLowerCase());

    const competencia = getCompetenciaText(c.mensalidadeId).toLowerCase();
    const matchesCompetencia = competencia.includes(competenciaFilter.toLowerCase());

    const matchesStatus =
      statusFilter === "TODOS" ||
      c.gatewayStatus === statusFilter ||
      (statusFilter === "RECEIVED" && c.gatewayStatus === "RECEIVED") ||
      (statusFilter === "CONFIRMED" && c.gatewayStatus === "CONFIRMED") ||
      (statusFilter === "PAGO" && (c.gatewayStatus === "RECEIVED" || c.gatewayStatus === "CONFIRMED"));

    const matchesMetodo = metodoFilter === "TODOS" || c.gatewayMethod === metodoFilter;

    return matchesClient && matchesCompetencia && matchesStatus && matchesMetodo;
  });

  return (
    <div>
      <PageTitle title="Central de Cobranças" icon="💳" />

      {/* Filters Card */}
      <Card title="Filtros de Busca" icon="⏬">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <Input
            label="Cliente"
            placeholder="Nome do cliente"
            value={clienteFilter}
            onChange={(e) => setClienteFilter(e.target.value)}
          />
          <Input
            label="Competência"
            placeholder="Ex: 06/2026"
            value={competenciaFilter}
            onChange={(e) => setCompetenciaFilter(e.target.value)}
          />
          <div className="form-group">
            <label>Status</label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="PENDING">PENDENTE</option>
              <option value="PAGO">PAGO</option>
              <option value="OVERDUE">VENCIDO</option>
              <option value="CANCELLED">CANCELADO</option>
              <option value="REFUNDED">ESTORNADO</option>
            </select>
          </div>
          <div className="form-group">
            <label>Método</label>
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
              <option value="BOLETO">BOLETO</option>
              <option value="CREDIT_CARD">CARTÃO DE CRÉDITO</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <Button
            variant="cancel"
            onClick={() => {
              setClienteFilter("");
              setCompetenciaFilter("");
              setStatusFilter("TODOS");
              setMetodoFilter("TODOS");
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Table Listing */}
      <TableContainer title="Histórico de Cobranças" count={filteredCobrancas.length}>
        {loading ? (
          <SkeletonTable cols={8} rows={6} />
        ) : filteredCobrancas.length === 0 ? (
          <EmptyState
            message="Nenhuma cobrança gerada ainda."
            description="As cobranças geradas pelo motor financeiro ou gateway ASAAS aparecerão nesta listagem."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Cliente</th>
                <th style={{ padding: "0.8rem" }}>Mensalidade</th>
                <th style={{ padding: "0.8rem" }}>Método</th>
                <th style={{ padding: "0.8rem" }}>Valor</th>
                <th style={{ padding: "0.8rem" }}>Vencimento</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem" }}>Pago Em</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCobrancas.map((c) => {
                const isPaid = c.gatewayStatus === "RECEIVED" || c.gatewayStatus === "CONFIRMED";
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.8rem", fontWeight: "500" }}>{getClientName(c.clienteId)}</td>
                    <td style={{ padding: "0.8rem" }}>{getMensalidadeInfo(c.mensalidadeId)}</td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold", color: "#666" }}>{c.gatewayMethod || "N/A"}</td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{formatCurrency(c.valor)}</td>
                    <td style={{ padding: "0.8rem" }}>{formatDate(c.vencimento)}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <StatusBadge status={c.gatewayStatus || "PENDING"} />
                    </td>
                    <td style={{ padding: "0.8rem" }}>{c.paidAt ? formatDate(c.paidAt) : "-"}</td>
                    <td style={{ padding: "0.8rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <Button
                          onClick={() => {
                            setSelectedCobranca(c);
                            setIsViewModalOpen(true);
                          }}
                          style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#64748b" }}
                        >
                          🔍 Ver
                        </Button>
                        {c.pixCopyPaste && !isPaid && (
                          <Button
                            onClick={() => handleCopyPix(c.pixCopyPaste || "")}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#f2994a" }}
                          >
                            📋 Copiar PIX
                          </Button>
                        )}
                        {c.invoiceUrl && (
                          <Button
                            onClick={() => window.open(c.invoiceUrl || "", "_blank")}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#2f80ed" }}
                          >
                            🔗 Link ASAAS
                          </Button>
                        )}
                        {!isPaid && c.gatewayStatus !== "CANCELLED" && (
                          <Button
                            variant="cancel"
                            onClick={() => handleCancelClick(c.id!)}
                            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          >
                            🚫 Cancelar
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
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detalhes da Cobrança">
        {selectedCobranca && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", backgroundColor: "#f8f9fa", padding: "1rem", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Cliente</span>
                <strong>{getClientName(selectedCobranca.clienteId)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Vínculo</span>
                <strong>{getMensalidadeInfo(selectedCobranca.mensalidadeId)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Método</span>
                <strong>{selectedCobranca.gatewayMethod}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Valor</span>
                <strong>{formatCurrency(selectedCobranca.valor)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Vencimento</span>
                <strong>{formatDate(selectedCobranca.vencimento)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Status do Gateway</span>
                <strong>{selectedCobranca.gatewayStatus}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Criado em</span>
                <strong>{selectedCobranca.createdAt ? formatDate(selectedCobranca.createdAt) : "N/A"}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Pago em</span>
                <strong>{selectedCobranca.paidAt ? formatDate(selectedCobranca.paidAt) : "Não pago"}</strong>
              </div>
              {selectedCobranca.cancelledAt && (
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ fontSize: "0.8rem", color: "#666", display: "block" }}>Cancelado em</span>
                  <strong>{formatDate(selectedCobranca.cancelledAt)}</strong>
                </div>
              )}
            </div>

            {selectedCobranca.descricao && (
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#555" }}>Descrição / Observações</label>
                <p style={{ margin: "0.25rem 0", padding: "0.5rem", backgroundColor: "#f1f5f9", borderRadius: "6px" }}>
                  {selectedCobranca.descricao}
                </p>
              </div>
            )}

            {/* QR Code display */}
            {selectedCobranca.pixQrCode && selectedCobranca.gatewayStatus !== "RECEIVED" && selectedCobranca.gatewayStatus !== "CONFIRMED" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#555" }}>QR Code PIX</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${selectedCobranca.pixQrCode}`}
                  alt="QR Code PIX"
                  style={{ width: "200px", height: "200px", border: "1px solid #ddd", borderRadius: "8px", padding: "0.5rem", backgroundColor: "#fff" }}
                />
              </div>
            )}

            {selectedCobranca.pixCopyPaste && selectedCobranca.gatewayStatus !== "RECEIVED" && selectedCobranca.gatewayStatus !== "CONFIRMED" && (
              <div style={{ width: "100%" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", color: "#555", marginBottom: "0.25rem" }}>
                  Código PIX (Copia e Cola)
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    readOnly
                    value={selectedCobranca.pixCopyPaste}
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
                    onClick={() => handleCopyPix(selectedCobranca.pixCopyPaste || "")}
                    style={{ padding: "0 0.75rem", fontSize: "0.85rem" }}
                  >
                    📋 Copiar
                  </Button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", width: "100%", justifyContent: "flex-end", marginTop: "1rem" }}>
              {selectedCobranca.invoiceUrl && (
                <Button
                  onClick={() => window.open(selectedCobranca.invoiceUrl || "", "_blank")}
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

      {/* Cancel Confirmation Modal */}
      <ModalConfirm
        isOpen={confirmCancelId !== null}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={handleConfirmCancel}
        title="Cancelar Cobrança"
        message="Tem certeza que deseja cancelar esta cobrança no banco de dados local? O status será alterado para CANCELADO."
        confirmText="Confirmar Cancelamento"
        variant="danger"
      />
    </div>
  );
}
