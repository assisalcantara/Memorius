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
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { Mensalidade, Contrato, Plano } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function MensalidadesPage() {
  const { data: mensalidades, loading, create, update } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const toast = useToast();

  // Filters state
  const [searchTitular, setSearchTitular] = useState("");
  const [searchContrato, setSearchContrato] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [competenciaFilter, setCompetenciaFilter] = useState("");

  // Modals visibility
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | number | null>(null);

  // Generate Form State
  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  // Derived contract details for generation
  const selectedContrato = contratos.find((c) => String(c.id) === String(selectedContratoId));
  const selectedPlano = selectedContrato
    ? planos.find((p) => String(p.id) === String(selectedContrato.planoId))
    : null;
  const valorPlano = selectedPlano ? Number(selectedPlano.valorMensal || 0) : 0;

  // Pay Form State
  const [payingMensalidade, setPayingMensalidade] = useState<Mensalidade | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleOpenGenerate = () => {
    if (contratos.length === 0) {
      toast.error("É necessário ter pelo menos um Contrato cadastrado para gerar mensalidades.");
      return;
    }
    setSelectedContratoId(String(contratos[0].id));
    
    // Set default competence to current month/year (ex: "06/2026")
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentYear = now.getFullYear();
    setCompetencia(`${currentMonth}/${currentYear}`);
    
    // Set default due date to 10 days from now
    const due = new Date();
    due.setDate(due.getDate() + 10);
    setDataVencimento(due.toISOString().split("T")[0]);

    setIsGenerateModalOpen(true);
  };

  const handleOpenPay = (m: Mensalidade) => {
    if (m.status !== "EM_ABERTO") {
      toast.error("Apenas mensalidades EM ABERTO podem ser recebidas.");
      return;
    }
    setPayingMensalidade(m);
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setValorRecebido(String(m.valor));
    setObservacao("");
    setIsPayModalOpen(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContrato || !competencia || !dataVencimento) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const payload: Omit<Mensalidade, "id"> = {
      contratoId: selectedContrato.id!,
      numeroContrato: selectedContrato.numeroContrato,
      clienteNome: selectedContrato.clienteNome,
      planoNome: selectedContrato.planoNome,
      competencia,
      dataVencimento,
      valor: valorPlano,
      status: "EM_ABERTO",
    };

    try {
      await create(payload);
      toast.success("Mensalidade gerada com sucesso!");
      setIsGenerateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar mensalidade.");
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payingMensalidade || !payingMensalidade.id || !dataPagamento || !valorRecebido) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    try {
      await update(payingMensalidade.id, {
        status: "PAGO",
        dataPagamento,
        valorRecebido: Number(valorRecebido),
        observacao,
      });

      toast.success("Pagamento recebido com sucesso!");
      setIsPayModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao receber pagamento.");
    }
  };

  const handleCancel = (id: string | number) => {
    setConfirmCancelId(id);
  };

  // Filter list
  const filteredMensalidades = mensalidades.filter((m) => {
    const matchesTitular = m.clienteNome.toLowerCase().includes(searchTitular.toLowerCase());
    const matchesContrato = m.numeroContrato.toLowerCase().includes(searchContrato.toLowerCase());
    const matchesStatus = statusFilter === "TODOS" || m.status === statusFilter;
    const matchesCompetencia = m.competencia.toLowerCase().includes(competenciaFilter.toLowerCase());

    return matchesTitular && matchesContrato && matchesStatus && matchesCompetencia;
  });

  // Totals calculations
  const totalEmAberto = filteredMensalidades
    .filter((m) => m.status === "EM_ABERTO")
    .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  const totalPago = filteredMensalidades
    .filter((m) => m.status === "PAGO")
    .reduce((acc, curr) => acc + Number(curr.valorRecebido || curr.valor || 0), 0);

  const qtdEmAberto = filteredMensalidades.filter((m) => m.status === "EM_ABERTO").length;
  const qtdPago = filteredMensalidades.filter((m) => m.status === "PAGO").length;

  const canCreate = contratos.length > 0;

  return (
    <div>
      <PageTitle
        title="Gerenciar Mensalidades"
        icon="💰"
        actions={
          <Button onClick={handleOpenGenerate} disabled={!canCreate} style={{ opacity: canCreate ? 1 : 0.6 }}>
            ➕ Gerar Mensalidade
          </Button>
        }
      />

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.5rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #f2994a" }}>
          <span style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Total em Aberto</span>
          <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{formatCurrency(totalEmAberto)}</h2>
        </div>
        <div style={{ padding: "1.5rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #27ae60" }}>
          <span style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Total Recebido</span>
          <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{formatCurrency(totalPago)}</h2>
        </div>
        <div style={{ padding: "1.5rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #f2994a" }}>
          <span style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Qtd. em Aberto</span>
          <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{qtdEmAberto}</h2>
        </div>
        <div style={{ padding: "1.5rem", background: "white", borderRadius: "var(--border-radius)", boxShadow: "var(--shadow)", borderLeft: "4px solid #27ae60" }}>
          <span style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Qtd. Pagas</span>
          <h2 style={{ margin: "0.5rem 0 0 0", color: "#333" }}>{qtdPago}</h2>
        </div>
      </div>

      {/* Filters Card */}
      <Card title="Filtro de Busca" icon="⏬">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          <Input
            label="Titular"
            placeholder="Nome do titular"
            value={searchTitular}
            onChange={(e) => setSearchTitular(e.target.value)}
          />
          <Input
            label="Contrato"
            placeholder="Nº Contrato"
            value={searchContrato}
            onChange={(e) => setSearchContrato(e.target.value)}
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
              <option value="EM_ABERTO">EM ABERTO</option>
              <option value="PAGO">PAGO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
          </div>
          <Input
            label="Competência"
            placeholder="Ex: 06/2026"
            value={competenciaFilter}
            onChange={(e) => setCompetenciaFilter(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <Button
            variant="cancel"
            onClick={() => {
              setSearchTitular("");
              setSearchContrato("");
              setStatusFilter("TODOS");
              setCompetenciaFilter("");
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Table List */}
      <TableContainer title="Listagem de Mensalidades" count={filteredMensalidades.length}>
        {loading ? (
          <SkeletonTable cols={8} rows={6} />
        ) : filteredMensalidades.length === 0 ? (
          <EmptyState
            message="Nenhuma mensalidade gerada ou encontrada nos filtros."
            description="Gere mensalidades em lote ou manualmente a partir de contratos ativos."
            actionLabel="Gerar Mensalidade"
            onAction={() => setIsGenerateModalOpen(true)}
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Nº Contrato</th>
                <th style={{ padding: "0.8rem" }}>Titular</th>
                <th style={{ padding: "0.8rem" }}>Plano</th>
                <th style={{ padding: "0.8rem" }}>Competência</th>
                <th style={{ padding: "0.8rem" }}>Vencimento</th>
                <th style={{ padding: "0.8rem" }}>Valor</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredMensalidades.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{m.numeroContrato}</td>
                  <td style={{ padding: "0.8rem" }}>{m.clienteNome}</td>
                  <td style={{ padding: "0.8rem" }}>{m.planoNome}</td>
                  <td style={{ padding: "0.8rem" }}>{m.competencia}</td>
                  <td style={{ padding: "0.8rem" }}>{formatDate(m.dataVencimento)}</td>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{formatCurrency(m.valor)}</td>
                  <td style={{ padding: "0.8rem" }}>
                    <StatusBadge status={m.status} />
                  </td>
                  <td style={{ padding: "0.8rem", textAlign: "right" }}>
                    {m.status === "EM_ABERTO" && (
                      <>
                        <Button
                          onClick={() => handleOpenPay(m)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.8rem",
                            marginRight: "0.5rem",
                            backgroundColor: "#27ae60",
                          }}
                        >
                          Receber
                        </Button>
                        <Button
                          variant="cancel"
                          onClick={() => handleCancel(m.id!)}
                          style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {m.status === "PAGO" && (
                      <span style={{ fontSize: "0.85rem", color: "#666", fontStyle: "italic" }}>
                        Pago em {formatDate(m.dataPagamento || "")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Generate Modal */}
      <Modal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} title="Gerar Mensalidade Manual">
        <form onSubmit={handleGenerate}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Contrato / Titular <span style={{ color: "#d32f2f" }}>*</span></label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              autoFocus
              value={selectedContratoId}
              onChange={(e) => setSelectedContratoId(e.target.value)}
              required
            >
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numeroContrato} - {c.clienteNome}
                </option>
              ))}
            </select>
          </div>

          {selectedContrato && (
            <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "6px", marginBottom: "1rem", border: "1px solid #e9ecef" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.95rem" }}>
                <li>👤 <strong>Titular:</strong> {selectedContrato.clienteNome}</li>
                <li>📋 <strong>Plano:</strong> {selectedContrato.planoNome}</li>
                <li>💰 <strong>Valor Mensal:</strong> {formatCurrency(valorPlano)}</li>
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Competência (MM/AAAA)"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="Ex: 06/2026"
                requiredMark
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Data Vencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                requiredMark
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsGenerateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Gerar Mensalidade</Button>
          </div>
        </form>
      </Modal>

      {/* Pay Modal (Baixa Manual) */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Confirmar Recebimento">
        <form onSubmit={handlePaySubmit}>
          {payingMensalidade && (
            <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "6px", marginBottom: "1rem", border: "1px solid #e9ecef" }}>
              <p style={{ margin: 0 }}><strong>Contrato:</strong> {payingMensalidade.numeroContrato}</p>
              <p style={{ margin: 0 }}><strong>Titular:</strong> {payingMensalidade.clienteNome}</p>
              <p style={{ margin: 0 }}><strong>Competência:</strong> {payingMensalidade.competencia}</p>
              <p style={{ margin: 0 }}><strong>Valor da Mensalidade:</strong> {formatCurrency(payingMensalidade.valor)}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Data de Pagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                requiredMark
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Valor Recebido (R$)"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                requiredMark
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label>Observações</label>
            <textarea
              className="auth-input"
              rows={2}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
                fontFamily: "inherit",
              }}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pagamento recebido em dinheiro"
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsPayModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" style={{ backgroundColor: "#27ae60" }}>
              Confirmar Recebimento
            </Button>
          </div>
        </form>
      </Modal>

      <ModalConfirm
        isOpen={confirmCancelId !== null}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={async () => {
          if (confirmCancelId !== null) {
            try {
              await update(confirmCancelId, { status: "CANCELADO" });
              toast.success("Mensalidade cancelada com sucesso!");
              setConfirmCancelId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao cancelar mensalidade.");
            }
          }
        }}
        title="Cancelar Mensalidade"
        message="Tem certeza que deseja cancelar esta mensalidade?"
        confirmText="Confirmar Cancelamento"
        variant="danger"
      />
    </div>
  );
}
