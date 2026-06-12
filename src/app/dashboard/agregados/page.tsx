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
import { agregadosSupabaseService } from "@/services/agregados.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Agregado, Contrato, Plano, Cliente } from "@/types";
import { formatDate, getAgregadoMatricula } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function AgregadosPage() {
  const { data: agregados, loading, create, update, remove } = useStorage<Agregado>(agregadosSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgregado, setEditingAgregado] = useState<Agregado | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

  // Form State
  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [parentesco, setParentesco] = useState("Filho(a)");
  const [liberacao, setLiberacao] = useState("Sim");

  // Selected Contrato and Plano derived state
  const selectedContrato = contratos.find((c) => String(c.id) === String(selectedContratoId));
  const selectedPlano = selectedContrato
    ? planos.find((p) => String(p.id) === String(selectedContrato.planoId))
    : null;

  // Maximum allowed by the plan
  const maxAgregados = selectedPlano ? parseInt(String(selectedPlano.limiteDependentes || 0)) : 0;

  // Current count of aggregates for the selected contract (excluding currently edited item)
  const currentCount = agregados.filter(
    (a) =>
      String(a.contratoId) === String(selectedContratoId) &&
      (editingAgregado ? String(a.id) !== String(editingAgregado.id) : true)
  ).length;

  const isLimitReached = currentCount >= maxAgregados;

  const handleOpenNew = () => {
    if (contratos.length === 0) {
      toast.error("É necessário ter pelo menos um Contrato ativo para cadastrar um Agregado.");
      return;
    }
    setEditingAgregado(null);
    setSelectedContratoId(String(contratos[0].id));
    setNome("");
    setCpf("");
    setDataNascimento("");
    setParentesco("Filho(a)");
    setLiberacao("Sim");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agregado: Agregado) => {
    setEditingAgregado(agregado);
    setSelectedContratoId(String(agregado.contratoId));
    setNome(agregado.nome);
    setCpf(agregado.cpf || "");
    setDataNascimento(agregado.dataNascimento || "");
    setParentesco(agregado.parentesco || "Filho(a)");
    setLiberacao(agregado.liberacao || "Sim");
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContratoId || !nome) {
      toast.error("Por favor, preencha os campos obrigatórios (*).");
      return;
    }

    if (isLimitReached) {
      toast.error(`Limite máximo de agregados (${maxAgregados}) para este plano já foi atingido!`);
      return;
    }

    const payload: Omit<Agregado, "id"> = {
      contratoId: selectedContratoId,
      nome,
      cpf,
      dataNascimento,
      parentesco,
      liberacao,
    };

    try {
      if (editingAgregado && editingAgregado.id !== undefined) {
        await update(editingAgregado.id, payload);
        toast.success("Agregado atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Agregado adicionado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar agregado.");
    }
  };

  // Filtered aggregates
  const filteredAgregados = agregados.filter((a) => {
    const contrato = contratos.find((c) => String(c.id) === String(a.contratoId));
    const contratoNum = contrato?.numeroContrato || "";
    const titularNome = contrato?.clienteNome || "";

    const matchesSearch =
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.cpf && a.cpf.includes(searchTerm)) ||
      contratoNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      titularNome.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const canCreate = contratos.length > 0;

  return (
    <div>
      <PageTitle
        title="Gerenciar Agregados"
        icon="👥"
        actions={
          <Button onClick={handleOpenNew} disabled={!canCreate} style={{ opacity: canCreate ? 1 : 0.6 }}>
            ➕ Novo Agregado
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
          ⚠️ <strong>Atenção:</strong> Você precisa cadastrar pelo menos um <strong>Contrato</strong> antes de poder adicionar agregados.
        </div>
      )}

      {/* Filter Card */}
      <Card title="Filtro de Busca" icon="⏬">
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Pesquisar por Nome do Agregado, CPF, Titular ou Nº de Contrato"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="cancel" onClick={() => setSearchTerm("")}>
            Limpar
          </Button>
        </div>
      </Card>

      {/* List Container */}
      <TableContainer title="Listagem de Agregados/Dependentes" count={filteredAgregados.length}>
        {loading ? (
          <SkeletonTable cols={6} rows={6} />
        ) : filteredAgregados.length === 0 ? (
          <EmptyState
            message="Nenhum agregado cadastrado ou encontrado nos filtros."
            description="Cadastre um novo dependente associado a um dos contratos ativos."
            actionLabel="Novo Agregado"
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
                <th style={{ padding: "0.8rem" }}>Código</th>
                <th style={{ padding: "0.8rem" }}>Agregado</th>
                <th style={{ padding: "0.8rem" }}>CPF</th>
                <th style={{ padding: "0.8rem" }}>Nasc.</th>
                <th style={{ padding: "0.8rem" }}>Parentesco</th>
                <th style={{ padding: "0.8rem" }}>Contrato / Titular</th>
                <th style={{ padding: "0.8rem" }}>Liberação</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgregados.map((a) => {
                const contrato = contratos.find((c) => String(c.id) === String(a.contratoId));

                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <td style={{ padding: "0.8rem" }}>
                      {getAgregadoMatricula(a.id, a.contratoId, agregados, contrato, clientes)}
                    </td>
                    <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{a.nome}</td>
                    <td style={{ padding: "0.8rem" }}>{a.cpf || "-"}</td>
                    <td style={{ padding: "0.8rem" }}>{formatDate(a.dataNascimento || "")}</td>
                    <td style={{ padding: "0.8rem" }}>{a.parentesco || "-"}</td>
                    <td style={{ padding: "0.8rem" }}>
                      {contrato ? `${contrato.numeroContrato} - ${contrato.clienteNome}` : "-"}
                    </td>
                    <td style={{ padding: "0.8rem" }}>
                      <StatusBadge status={a.liberacao === "Sim" ? "Ativo" : "Inativo"} />
                    </td>
                    <td style={{ padding: "0.8rem", textAlign: "right" }}>
                      <button
                        onClick={() => handleOpenEdit(a)}
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
                        onClick={() => handleDelete(a.id!)}
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
        title={editingAgregado ? "Editar Agregado" : "Novo Agregado"}
      >
        <form onSubmit={handleSubmit}>
          {/* Contrato Selection */}
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

          {/* Derived Info */}
          {selectedContrato && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                marginBottom: "1rem",
                border: "1px solid #e9ecef",
              }}
            >
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.95rem" }}>
                <li>👤 <strong>Titular:</strong> {selectedContrato.clienteNome}</li>
                <li>📋 <strong>Plano:</strong> {selectedContrato.planoNome}</li>
                <li>
                  📊 <strong>Limite do Plano:</strong> {currentCount} de {maxAgregados} agregados cadastrados
                </li>
              </ul>
              {isLimitReached && (
                <div style={{ color: "#d32f2f", marginTop: "0.5rem", fontWeight: "bold" }}>
                  ❌ Limite máximo de dependentes deste plano foi atingido!
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Nome do Agregado"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                requiredMark
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="CPF"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="Data Nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1 }}>
              <div className="form-group">
                <label>Parentesco</label>
                <select
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "1rem",
                  }}
                  value={parentesco}
                  onChange={(e) => setParentesco(e.target.value)}
                >
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Pai/Mãe">Pai/Mãe</option>
                  <option value="Sogro(a)">Sogro(a)</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
            <div style={{ width: "150px" }}>
              <div className="form-group">
                <label>Liberação</label>
                <select
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "1rem",
                  }}
                  value={liberacao}
                  onChange={(e) => setLiberacao(e.target.value)}
                >
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLimitReached} style={{ opacity: isLimitReached ? 0.5 : 1 }}>
              {editingAgregado ? "Salvar Alterações" : "Adicionar Dependente"}
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
              toast.success("Agregado excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir agregado.");
            }
          }
        }}
        title="Excluir Agregado"
        message="Tem certeza que deseja excluir este agregado/dependente? Essa ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
}
