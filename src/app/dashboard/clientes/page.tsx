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
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { Cliente } from "@/types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModalConfirm } from "@/components/ui/ModalConfirm";

export default function ClientesPage() {
  const { data: clientes, loading, create, update, remove } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nomeCompleto: "",
    cpf: "",
    rg: "",
    dataNascimento: "",
    sexo: "MASCULINO",
    nomePai: "",
    nomeMae: "",
    naturalidade: "",
    estadoCivil: "Solteiro",
    nomeConjuge: "",
    profissao: "",
    localTrabalho: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "SP",
    telefone: "",
    email: "",
    status: "Ativo",
  });

  const handleOpenNew = () => {
    setEditingCliente(null);
    setFormData({
      nomeCompleto: "",
      cpf: "",
      rg: "",
      dataNascimento: "",
      sexo: "MASCULINO",
      nomePai: "",
      nomeMae: "",
      naturalidade: "",
      estadoCivil: "Solteiro",
      nomeConjuge: "",
      profissao: "",
      localTrabalho: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "SP",
      telefone: "",
      email: "",
      status: "Ativo",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDeleteId(id);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomeCompleto || !formData.dataNascimento) {
      toast.error("Por favor, preencha os campos obrigatórios (*).");
      return;
    }

    const payload: Omit<Cliente, "id"> = {
      nomeCompleto: formData.nomeCompleto,
      cpf: formData.cpf || "",
      rg: formData.rg || "",
      dataNascimento: formData.dataNascimento,
      sexo: formData.sexo || "MASCULINO",
      nomePai: formData.nomePai || "",
      nomeMae: formData.nomeMae || "",
      naturalidade: formData.naturalidade || "",
      estadoCivil: formData.estadoCivil || "Solteiro",
      nomeConjuge: formData.nomeConjuge || "",
      profissao: formData.profissao || "",
      localTrabalho: formData.localTrabalho || "",
      cep: formData.cep || "",
      logradouro: formData.logradouro || "",
      numero: formData.numero || "",
      complemento: formData.complemento || "",
      bairro: formData.bairro || "",
      cidade: formData.cidade || "",
      estado: formData.estado || "SP",
      telefone: formData.telefone || "",
      email: formData.email || "",
      status: formData.status || "Ativo",
      dataCadastro: editingCliente?.dataCadastro || new Date().toISOString().split("T")[0],
    };

    try {
      if (editingCliente && editingCliente.id !== undefined) {
        await update(editingCliente.id, payload);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await create(payload);
        toast.success("Cliente cadastrado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cliente.");
    }
  };

  // Filtering list
  const filteredClientes = clientes.filter((c) => {
    const matchesSearch =
      c.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cpf && c.cpf.includes(searchTerm)) ||
      (c.telefone && c.telefone.includes(searchTerm));

    const matchesStatus =
      statusFilter === "TODOS" || c.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageTitle
        title="Gerenciar Clientes"
        icon="👥"
        actions={
          <Button onClick={handleOpenNew}>
            ➕ Inserir Cliente
          </Button>
        }
      />

      {/* Filter Card */}
      <Card title="Filtro de Busca" icon="⏬">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <Input
              placeholder="Digite sua busca (Nome, CPF ou Telefone)"
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
      <TableContainer title="Listagem de Clientes" count={filteredClientes.length}>
        {loading ? (
          <SkeletonTable cols={7} rows={6} />
        ) : filteredClientes.length === 0 ? (
          <EmptyState
            message="Nenhum cliente cadastrado ou encontrado nos filtros."
            description="Cadastre um novo cliente para começar a gerar contratos e mensalidades."
            actionLabel="Inserir Cliente"
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
                <th style={{ padding: "0.8rem" }}>Matrícula</th>
                <th style={{ padding: "0.8rem" }}>Nome</th>
                <th style={{ padding: "0.8rem" }}>CPF</th>
                <th style={{ padding: "0.8rem" }}>Cidade/UF</th>
                <th style={{ padding: "0.8rem" }}>Telefone</th>
                <th style={{ padding: "0.8rem" }}>Cadastro</th>
                <th style={{ padding: "0.8rem" }}>Status</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <td style={{ padding: "0.8rem" }}>{c.id}</td>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{c.nomeCompleto}</td>
                  <td style={{ padding: "0.8rem" }}>{c.cpf || "-"}</td>
                  <td style={{ padding: "0.8rem" }}>
                    {c.cidade ? `${c.cidade}/${c.estado || ""}` : "-"}
                  </td>
                  <td style={{ padding: "0.8rem" }}>{c.telefone || "-"}</td>
                  <td style={{ padding: "0.8rem" }}>{formatDate(c.dataCadastro)}</td>
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
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCliente ? "Editar Cliente" : "Novo Cliente"}
      >
        <form onSubmit={handleSubmit} style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "10px" }}>
          <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "0.3rem", marginBottom: "1rem", color: "var(--brand)" }}>
            Dados Cadastrais
          </h4>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 2 }}>
              <Input
                label="Nome Completo"
                name="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={handleInputChange}
                requiredMark
                required
                autoFocus
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="form-group">
                <label>Sexo</label>
                <select
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "1rem",
                  }}
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleInputChange}
                >
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMININO">FEMININO</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="CPF"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                placeholder="Somente números"
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="RG"
                name="rg"
                value={formData.rg}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="Data Nascimento"
                name="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={handleInputChange}
                requiredMark
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Nome do Pai"
                name="nomePai"
                value={formData.nomePai}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Nome da Mãe"
                name="nomeMae"
                value={formData.nomeMae}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Naturalidade"
                name="naturalidade"
                value={formData.naturalidade}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="form-group">
                <label>Estado Civil</label>
                <select
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "1rem",
                  }}
                  name="estadoCivil"
                  value={formData.estadoCivil}
                  onChange={handleInputChange}
                >
                  <option value="Solteiro">Solteiro</option>
                  <option value="Casado">Casado</option>
                  <option value="Divorciado">Divorciado</option>
                  <option value="Viúvo">Viúvo</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Nome do Cônjuge"
                name="nomeConjuge"
                value={formData.nomeConjuge}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Profissão"
                name="profissao"
                value={formData.profissao}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Local de Trabalho"
                name="localTrabalho"
                value={formData.localTrabalho}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "0.3rem", margin: "1.5rem 0 1rem 0", color: "var(--brand)" }}>
            Endereço Residencial
          </h4>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <Input
                label="CEP"
                name="cep"
                value={formData.cep}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <Input
                label="Logradouro"
                name="logradouro"
                value={formData.logradouro}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "80px" }}>
              <Input
                label="Número"
                name="numero"
                value={formData.numero}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="Bairro"
                name="bairro"
                value={formData.bairro}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="Complemento"
                name="complemento"
                value={formData.complemento}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="Cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ width: "90px" }}>
              <div className="form-group">
                <label>UF</label>
                <select
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "1rem",
                  }}
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                >
                  <option value="SP">SP</option>
                  <option value="RJ">RJ</option>
                  <option value="MG">MG</option>
                  <option value="BA">BA</option>
                </select>
              </div>
            </div>
          </div>

          <h4 style={{ borderBottom: "1px solid #eee", paddingBottom: "0.3rem", margin: "1.5rem 0 1rem 0", color: "var(--brand)" }}>
            Contato & Status
          </h4>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <Input
                label="Telefone / Celular"
                name="telefone"
                value={formData.telefone}
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
              {editingCliente ? "Salvar Alterações" : "Cadastrar Cliente"}
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
              toast.success("Cliente excluído com sucesso!");
              setConfirmDeleteId(null);
            } catch (err: any) {
              toast.error(err.message || "Erro ao excluir cliente.");
            }
          }
        }}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? Essa ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
}
