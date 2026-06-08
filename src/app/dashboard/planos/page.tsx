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
import { useStorage } from "@/hooks/useStorage";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { Plano } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function PlanosPage() {
  const { data: planos, create, update, remove } = useStorage<Plano>(planosSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Plano>>({
    nome: "",
    diasCarencia: "0",
    nMeses: "",
    limiteDependentes: "",
    valorMensal: "",
    status: "Ativo",
  });

  const handleOpenNew = () => {
    setEditingPlano(null);
    setFormData({
      nome: "",
      diasCarencia: "0",
      nMeses: "",
      limiteDependentes: "",
      valorMensal: "",
      status: "Ativo",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plano: Plano) => {
    setEditingPlano(plano);
    setFormData(plano);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      toast.error("Por favor, informe o Nome do Plano.");
      return;
    }

    const payload: Omit<Plano, "id"> = {
      nome: formData.nome,
      diasCarencia: formData.diasCarencia || "0",
      nMeses: formData.nMeses || "",
      limiteDependentes: formData.limiteDependentes || "",
      valorMensal: formData.valorMensal || "",
      status: formData.status || "Ativo",
    };

    try {
      if (editingPlano && editingPlano.id !== undefined) {
        await update(editingPlano.id, payload);
        toast.success("Plano atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Plano cadastrado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar plano.");
    }
  };

  // Filter plans
  const filteredPlanos = planos.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.id).includes(searchTerm);

    const matchesStatus =
      statusFilter === "TODOS" ||
      (p.status || "Ativo").toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageTitle
        title="Gerenciar Planos"
        icon="📋"
        actions={
          <Button onClick={handleOpenNew}>
            ➕ Inserir Plano
          </Button>
        }
      />

      {/* Filter Card */}
      <Card title="Filtro de Busca" icon="⏬">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <Input
              placeholder="Pesquisar por Nome ou Código"
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
      <TableContainer title="Listagem de Planos" count={filteredPlanos.length}>
        {filteredPlanos.length === 0 ? (
          <EmptyState message="Nenhum plano cadastrado ou encontrado nos filtros." />
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
                <th style={{ padding: "0.8rem" }}>Código</th>
                <th style={{ padding: "0.8rem" }}>Nome</th>
                <th style={{ padding: "0.8rem" }}>Nº Meses Contrato</th>
                <th style={{ padding: "0.8rem" }}>Nº Agregados</th>
                <th style={{ padding: "0.8rem" }}>Carência (Dias)</th>
                <th style={{ padding: "0.8rem" }}>Valor Mensal</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanos.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <td style={{ padding: "0.8rem" }}>{p.id}</td>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{p.nome}</td>
                  <td style={{ padding: "0.8rem" }}>{p.nMeses || "-"}</td>
                  <td style={{ padding: "0.8rem" }}>{p.limiteDependentes || 0}</td>
                  <td style={{ padding: "0.8rem" }}>{p.diasCarencia || 0}</td>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>
                    {formatCurrency(p.valorMensal || 0)}
                  </td>
                  <td style={{ padding: "0.8rem" }}>
                    <StatusBadge status={p.status || "Ativo"} />
                  </td>
                  <td style={{ padding: "0.8rem", textAlign: "right" }}>
                    <button
                      onClick={() => handleOpenEdit(p)}
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
                      onClick={() => handleDelete(p.id)}
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
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlano ? "Editar Plano" : "Novo Plano"}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Nome do Plano"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                requiredMark
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <Input
                label="Dias Carência"
                name="diasCarencia"
                type="number"
                value={formData.diasCarencia}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <Input
                label="Nº Meses Contrato"
                name="nMeses"
                type="number"
                value={formData.nMeses}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <Input
                label="Nº Máx. de Agregados"
                name="limiteDependentes"
                type="number"
                value={formData.limiteDependentes}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <Input
                label="Valor Mensal (R$)"
                name="valorMensal"
                placeholder="Ex: 150.00"
                value={formData.valorMensal}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ width: "120px" }}>
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
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingPlano ? "Salvar Alterações" : "Cadastrar Plano"}
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
              toast.success("Plano excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir plano.");
            }
          }
        }}
        title="Excluir Plano"
        message="Tem certeza que deseja excluir este plano? Essa ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
}
