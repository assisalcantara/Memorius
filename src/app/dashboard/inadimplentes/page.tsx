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

export default function InadimplentesPage() {
  const { data: mensalidades, loading: loadingMensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: cobrancas, loading: loadingCobrancas, refresh: reloadCobrancas } = useStorage<Cobranca>(cobrancasSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  const loading = loadingMensalidades || loadingCobrancas;

  // Selected PIX modal state
  const [activePixCobranca, setActivePixCobranca] = useState<Cobranca | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [generatingPixId, setGeneratingPixId] = useState<string | number | null>(null);

  // Filters state
  const [nomeFilter, setNomeFilter] = useState("");
  const [competenciaFilter, setCompetenciaFilter] = useState("");
  const [faixaFilter, setFaixaFilter] = useState("TODAS");
  const [statusCobFilter, setStatusCobFilter] = useState("TODOS");

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper map to locate client info (phone, natural ID, etc)
  const clientMap = new Map(clientes.map((c) => [String(c.id), c]));
  const getClientInfo = (cId: string | number) => {
    return clientMap.get(String(cId));
  };

  // Helper to map cobrancas status tolerantly
  const mapCobrancaStatus = (status: string) => {
    const st = String(status || "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "PAGO"].includes(st)) return "Pago";
    if (["PENDING", "PIX_GERADO", "AWAITING_PAYMENT"].includes(st)) return "Pendente";
    if (["CANCELLED", "CANCELED"].includes(st)) return "Cancelado";
    return "Sem Cobrança";
  };

  const getActiveCobranca = (mId: string | number) => {
    return cobrancas.find(
      (c) => String(c.mensalidadeId) === String(mId) && mapCobrancaStatus(c.gatewayStatus || "") !== "Cancelado"
    );
  };

  if (loading) {
    return (
      <div>
        <PageTitle title="Central de Inadimplentes" icon="⚠️" />
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

  // Overdue monthly payments (EM_ABERTO and vencimento in the past)
  const overdueMensalidadesRaw = mensalidades.filter((m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr);

  const parsedOverdueList = overdueMensalidadesRaw.map((m) => {
    const overdueDays = Math.floor(
      (new Date(todayStr).getTime() - new Date(m.dataVencimento).getTime()) / (1000 * 60 * 60 * 24)
    );

    let ageBand = "";
    let bandColor = "";
    let textHexColor = "";
    if (overdueDays <= 30) {
      ageBand = "0-30 dias";
      bandColor = "#fef3c7"; // yellow background
      textHexColor = "#92400e";
    } else if (overdueDays <= 60) {
      ageBand = "31-60 dias";
      bandColor = "#ffedd5"; // orange background
      textHexColor = "#c2410c";
    } else {
      ageBand = "61+ dias";
      bandColor = "#fee2e2"; // red background
      textHexColor = "#b91c1c";
    }

    // Attempt to locate related client
    const client = getClientInfo(m.contratoId ? m.contratoId : "");

    // Get active cobranca
    const activeCobranca = getActiveCobranca(m.id!);

    return {
      mensalidade: m,
      client,
      overdueDays,
      ageBand,
      bandColor,
      textHexColor,
      activeCobranca,
    };
  });

  // Calculate KPIs
  const totalInadimplentes = new Set(parsedOverdueList.map((item) => String(item.mensalidade.clienteNome || item.mensalidade.contratoId))).size;
  const totalValorEmAberto = parsedOverdueList.reduce((acc, curr) => acc + Number(curr.mensalidade.valor || 0), 0);
  const maiorAtrasoDias = parsedOverdueList.length > 0 ? Math.max(...parsedOverdueList.map((item) => item.overdueDays)) : 0;
  const pixPendentesQtd = parsedOverdueList.filter(
    (item) => item.activeCobranca && item.activeCobranca.gatewayMethod === "PIX" && mapCobrancaStatus(item.activeCobranca.gatewayStatus || "") === "Pendente"
  ).length;

  // Apply filters
  const filteredList = parsedOverdueList.filter((item) => {
    const nomeLower = (item.mensalidade.clienteNome || "").toLowerCase();
    const matchesNome = nomeLower.includes(nomeFilter.toLowerCase());

    const compLower = (item.mensalidade.competencia || "").toLowerCase();
    const matchesCompetencia = compLower.includes(competenciaFilter.toLowerCase());

    const matchesFaixa =
      faixaFilter === "TODAS" ||
      (faixaFilter === "0-30 dias" && item.overdueDays <= 30) ||
      (faixaFilter === "31-60 dias" && item.overdueDays > 30 && item.overdueDays <= 60) ||
      (faixaFilter === "61-90 dias" && item.overdueDays > 60 && item.overdueDays <= 90) ||
      (faixaFilter === "90+" && item.overdueDays > 90);

    const mappedStatus = item.activeCobranca ? mapCobrancaStatus(item.activeCobranca.gatewayStatus || "") : "Sem Cobrança";
    const matchesStatus = statusCobFilter === "TODOS" || mappedStatus === statusCobFilter;

    return matchesNome && matchesCompetencia && matchesFaixa && matchesStatus;
  });

  const handleGeneratePix = async (mId: string | number) => {
    setGeneratingPixId(mId);
    try {
      const result = await cobrancasSupabaseService.createPixFromMensalidade(mId);
      if (result) {
        toast.success("PIX gerado com sucesso no gateway!");
        await reloadCobrancas();
        setActivePixCobranca(result);
        setIsPixModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
      setGeneratingPixId(null);
    }
  };

  const getCleanWhatsappLink = (telefone: string) => {
    if (!telefone) return null;
    const cleanNum = telefone.replace(/\D/g, "");
    if (cleanNum.length < 8) return null;
    
    // Add country code if not present (assuming Brazilian numbers if length is 10 or 11)
    const formatted = cleanNum.startsWith("55") ? cleanNum : `55${cleanNum}`;
    return `https://wa.me/${formatted}`;
  };

  return (
    <div>
      <PageTitle title="Central de Inadimplentes" icon="⚠️" />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #eb5757" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Total Inadimplentes</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#eb5757", fontSize: "1.6rem" }}>{totalInadimplentes} clientes</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #c2410c" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Valor Total em Aberto</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#0f172a", fontSize: "1.6rem" }}>{formatCurrency(totalValorEmAberto)}</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #92400e" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Maior Atraso</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#92400e", fontSize: "1.6rem" }}>{maiorAtrasoDias} dias</h3>
        </div>
        <div style={{ padding: "1.25rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #2f80ed" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>PIX Pendentes</span>
          <h3 style={{ margin: "0.4rem 0 0 0", color: "#2f80ed", fontSize: "1.6rem" }}>{pixPendentesQtd}</h3>
        </div>
      </div>

      {/* Filters Card */}
      <Card title="Filtros de Cobrança" icon="⏬">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <Input
            label="Cliente"
            placeholder="Nome do titular"
            value={nomeFilter}
            onChange={(e) => setNomeFilter(e.target.value)}
          />
          <Input
            label="Competência"
            placeholder="Ex: 06/2026"
            value={competenciaFilter}
            onChange={(e) => setCompetenciaFilter(e.target.value)}
          />
          <div className="form-group">
            <label>Faixa de Atraso</label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={faixaFilter}
              onChange={(e) => setFaixaFilter(e.target.value)}
            >
              <option value="TODAS">TODAS</option>
              <option value="0-30 dias">0-30 dias</option>
              <option value="31-60 dias">31-60 dias</option>
              <option value="61-90 dias">61-90 dias</option>
              <option value="90+">90+ dias</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status Cobrança</label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={statusCobFilter}
              onChange={(e) => setStatusCobFilter(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="Pendente">PENDENTE</option>
              <option value="Pago">PAGO</option>
              <option value="Cancelado">CANCELADO</option>
              <option value="Sem Cobrança">SEM COBRANÇA ATIVA</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <Button
            variant="cancel"
            onClick={() => {
              setNomeFilter("");
              setCompetenciaFilter("");
              setFaixaFilter("TODAS");
              setStatusCobFilter("TODOS");
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Listing Container */}
      <TableContainer title="Central de Cobrança de Inadimplentes" count={filteredList.length}>
        {filteredList.length === 0 ? (
          <EmptyState
            message="Nenhuma mensalidade inadimplente encontrada."
            description="Todos os clientes estão adimplentes ou com os filtros selecionados nada foi encontrado."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Cliente</th>
                <th style={{ padding: "0.8rem" }}>Contrato/Plano</th>
                <th style={{ padding: "0.8rem" }}>Competência</th>
                <th style={{ padding: "0.8rem" }}>Valor</th>
                <th style={{ padding: "0.8rem" }}>Dias em atraso</th>
                <th style={{ padding: "0.8rem" }}>Status Cobrança</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(({ mensalidade, client, overdueDays, ageBand, bandColor, textHexColor, activeCobranca }) => {
                const isPaid = activeCobranca && (mapCobrancaStatus(activeCobranca.gatewayStatus || "") === "Pago");
                const cleanPhone = client?.telefone || "";
                const whatsappUrl = getCleanWhatsappLink(cleanPhone);

                return (
                  <tr key={mensalidade.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.8rem" }}>
                      <div style={{ fontWeight: "bold" }}>{mensalidade.clienteNome}</div>
                      {cleanPhone && <div style={{ fontSize: "0.8rem", color: "#666" }}>📞 {cleanPhone}</div>}
                    </td>
                    <td style={{ padding: "0.8rem" }}>
                      <div style={{ fontWeight: "500" }}>{mensalidade.numeroContrato}</div>
                      <div style={{ fontSize: "0.8rem", color: "#777" }}>{mensalidade.planoNome}</div>
                    </td>
                    <td style={{ padding: "0.8rem" }}>{mensalidade.competencia}</td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{formatCurrency(Number(mensalidade.valor))}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        backgroundColor: bandColor,
                        color: textHexColor
                      }}>
                        ⚠️ {overdueDays} dias ({ageBand})
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem" }}>
                      <StatusBadge status={activeCobranca ? activeCobranca.gatewayStatus || "PENDING" : "SEM_COBRANCA"} />
                    </td>
                    <td style={{ padding: "0.8rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        
                        {/* WhatsApp Link redirect */}
                        {whatsappUrl && (
                          <Button
                            onClick={() => window.open(whatsappUrl, "_blank")}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#27ae60" }}
                          >
                            💬 WhatsApp
                          </Button>
                        )}

                        {/* PIX Generation / Viewing actions */}
                        {!activeCobranca ? (
                          <Button
                            onClick={() => handleGeneratePix(mensalidade.id!)}
                            disabled={generatingPixId === mensalidade.id}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#f2994a" }}
                          >
                            {generatingPixId === mensalidade.id ? "Gerando..." : "⚡ Gerar PIX"}
                          </Button>
                        ) : (
                          <>
                            {activeCobranca.pixCopyPaste && !isPaid && (
                              <Button
                                onClick={() => {
                                  setActivePixCobranca(activeCobranca);
                                  setIsPixModalOpen(true);
                                }}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#2f80ed" }}
                              >
                                🔍 Ver PIX
                              </Button>
                            )}

                            {activeCobranca.pixCopyPaste && !isPaid && (
                              <Button
                                onClick={() => {
                                  navigator.clipboard.writeText(activeCobranca.pixCopyPaste || "");
                                  toast.success("PIX copiado!");
                                }}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#9b5de5" }}
                              >
                                📋 Copiar
                              </Button>
                            )}

                            {activeCobranca.invoiceUrl && (
                              <Button
                                onClick={() => window.open(activeCobranca.invoiceUrl || "", "_blank")}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "#64748b" }}
                              >
                                🔗 Abrir Cobrança
                              </Button>
                            )}
                          </>
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

      {/* PIX Modal */}
      <Modal isOpen={isPixModalOpen} onClose={() => setIsPixModalOpen(false)} title="PIX de Recuperação - Gateway ASAAS">
        {activePixCobranca && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", padding: "1rem" }}>
            <div style={{ width: "100%", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <p style={{ margin: "0.25rem 0" }}>💰 <strong>Valor:</strong> {formatCurrency(activePixCobranca.valor)}</p>
              <p style={{ margin: "0.25rem 0" }}>📅 <strong>Vencimento:</strong> {formatDate(activePixCobranca.vencimento)}</p>
              {activePixCobranca.descricao && (
                <p style={{ margin: "0.25rem 0" }}>📝 <strong>Descrição:</strong> {activePixCobranca.descricao}</p>
              )}
            </div>

            {/* QR Code */}
            {activePixCobranca.pixQrCode && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${activePixCobranca.pixQrCode}`}
                  alt="QR Code PIX"
                  style={{ width: "220px", height: "220px", border: "1px solid #ddd", borderRadius: "8px", padding: "0.5rem", backgroundColor: "#fff" }}
                />
                <span style={{ fontSize: "0.8rem", color: "#666" }}>Escaneie com o app do seu banco</span>
              </div>
            )}

            {/* PIX Copia e Cola */}
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
                      if (activePixCobranca.pixCopyPaste) {
                        navigator.clipboard.writeText(activePixCobranca.pixCopyPaste);
                        toast.success("Código PIX copiado!");
                      }
                    }}
                    style={{ padding: "0 0.75rem", fontSize: "0.85rem" }}
                  >
                    📋 Copiar
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "1rem", width: "100%", justifyContent: "flex-end", marginTop: "1rem" }}>
              {activePixCobranca.invoiceUrl && (
                <Button
                  onClick={() => window.open(activePixCobranca.invoiceUrl || "", "_blank")}
                  style={{ backgroundColor: "#2f80ed" }}
                >
                  🔗 Abrir Fatura ASAAS
                </Button>
              )}
              <Button variant="cancel" onClick={() => setIsPixModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
