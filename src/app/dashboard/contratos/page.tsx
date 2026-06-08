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
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { Contrato, Cliente, Plano } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function ContratosPage() {
  const { data: contratos, loading, create, update, remove } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

  // Form State
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedPlanoId, setSelectedPlanoId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [status, setStatus] = useState("Ativo");

  // Selected Plano details derived state
  const selectedPlano = planos.find((p) => String(p.id) === String(selectedPlanoId));

  const handleOpenNew = () => {
    if (clientes.length === 0 || planos.length === 0) {
      toast.error("É necessário ter pelo menos um Cliente e um Plano cadastrados para criar um Contrato.");
      return;
    }
    setEditingContrato(null);
    setSelectedClienteId(String(clientes[0].id));
    setSelectedPlanoId(String(planos[0].id));
    setDataInicio(new Date().toISOString().split("T")[0]);
    setStatus("Ativo");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contrato: Contrato) => {
    setEditingContrato(contrato);
    setSelectedClienteId(String(contrato.clienteId));
    setSelectedPlanoId(String(contrato.planoId));
    setDataInicio(contrato.dataInicio);
    setStatus(contrato.status);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clienteObj = clientes.find((c) => String(c.id) === String(selectedClienteId));
    const planoObj = planos.find((p) => String(p.id) === String(selectedPlanoId));

    if (!clienteObj || !planoObj) {
      toast.error("Cliente ou Plano inválido.");
      return;
    }

    const payload: Omit<Contrato, "id"> = {
      numeroContrato: editingContrato?.numeroContrato || `CON-${Date.now().toString().slice(-6)}`,
      clienteId: clienteObj.id!,
      clienteNome: clienteObj.nomeCompleto,
      planoId: planoObj.id,
      planoNome: planoObj.nome,
      dataInicio,
      status,
    };

    try {
      if (editingContrato && editingContrato.id !== undefined) {
        await update(editingContrato.id, payload);
        toast.success("Contrato atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Contrato emitido com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar contrato.");
    }
  };

  // Filter Contracts
  const filteredContratos = contratos.filter((c) => {
    const matchesSearch =
      c.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numeroContrato.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "TODOS" || c.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const canCreate = clientes.length > 0 && planos.length > 0;

  return (
    <div>
      <PageTitle
        title="Gerenciar Contratos"
        icon="📄"
        actions={
          <Button onClick={handleOpenNew} disabled={!canCreate} style={{ opacity: canCreate ? 1 : 0.6 }}>
            ➕ Novo Contrato
          </Button>
        }
      />

      {!canCreate && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "1rem",
            borderRadius: "var(--border-radius)",
            marginBottom: "1.5rem",
            border: "1px solid #ffeeba",
          }}
        >
          ⚠️ <strong>Atenção:</strong> Você precisa cadastrar pelo menos um <strong>Cliente</strong> e um <strong>Plano</strong> antes de poder criar contratos.
        </div>
      )}

      {/* Filter Card */}
      <Card title="Filtro de Busca" icon="⏬">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <Input
              placeholder="Pesquisar por Cliente ou Nº de Contrato"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: "150px" }}>
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
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>
          </div>
          <Button
            variant="cancel"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("TODOS");
            }}
          >
            Limpar
          </Button>
        </div>
      </Card>

      {/* List Container */}
      <TableContainer title="Listagem de Contratos" count={filteredContratos.length}>
        {loading ? (
          <SkeletonTable cols={6} rows={6} />
        ) : filteredContratos.length === 0 ? (
          <EmptyState
            message="Nenhum contrato cadastrado ou encontrado nos filtros."
            description="Crie um novo contrato vinculando um cliente ativo a um plano cadastrado."
            actionLabel="Novo Contrato"
            onAction={handleOpenNew}
          />
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "1rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Nº Contrato</th>
                <th style={{ padding: "0.8rem" }}>Cliente</th>
                <th style={{ padding: "0.8rem" }}>Plano</th>
                <th style={{ padding: "0.8rem" }}>Data Adesão</th>
                <th style={{ padding: "0.8rem" }}>Valor Mensal</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContratos.map((c) => {
                // Find Plano details to show valor if not on Contract payload
                const plano = planos.find((p) => String(p.id) === String(c.planoId));
                const valor = plano?.valorMensal || 0;

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{c.numeroContrato}</td>
                    <td style={{ padding: "0.8rem" }}>{c.clienteNome}</td>
                    <td style={{ padding: "0.8rem" }}>{c.planoNome}</td>
                    <td style={{ padding: "0.8rem" }}>{formatDate(c.dataInicio)}</td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{formatCurrency(valor)}</td>
                    <td style={{ padding: "0.8rem" }}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: "0.8rem", textAlign: "right" }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          marginRight: "0.5rem",
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(c.id!)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                        }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContrato ? "Editar Contrato" : "Novo Contrato"}
      >
        <form onSubmit={handleSubmit}>
          {/* Cliente Selection */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Cliente <span style={{ color: "#d32f2f" }}>*</span></label>
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
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              required
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeCompleto} ({c.cpf || "Sem CPF"})
                </option>
              ))}
            </select>
          </div>

          {/* Plano Selection */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Plano <span style={{ color: "#d32f2f" }}>*</span></label>
            <select
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
              }}
              value={selectedPlanoId}
              onChange={(e) => setSelectedPlanoId(e.target.value)}
              required
            >
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Derived Fields - Read only display */}
          {selectedPlano && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                marginBottom: "1rem",
                border: "1px solid #e9ecef",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold", color: "var(--brand)" }}>
                Informações do Plano Selecionado:
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.95rem" }}>
                <li style={{ margin: "0.2rem 0" }}>💰 <strong>Valor Mensal:</strong> {formatCurrency(selectedPlano.valorMensal || 0)}</li>
                <li style={{ margin: "0.2rem 0" }}>⏱️ <strong>Dias Carência:</strong> {selectedPlano.diasCarencia || 0} dias</li>
                <li style={{ margin: "0.2rem 0" }}>📅 <strong>Duração do Contrato:</strong> {selectedPlano.nMeses || "-"} meses</li>
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Data Adesão"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                requiredMark
                required
              />
            </div>
            <div style={{ width: "150px" }}>
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingContrato ? "Salvar Alterações" : "Emitir Contrato"}
            </Button>
          </div>
        </form>
      </Modal>

      <ModalConfirm
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId !== null) {
            try {
              await remove(confirmDeleteId);
              toast.success("Contrato excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir contrato.");
            }
          }
        }}
        title="Excluir Contrato"
        message="Tem certeza que deseja excluir este contrato? Essa ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
}
