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
import {
  FormContainer,
  FormSection,
  FormGrid,
  FormField,
  ModalFooter,
} from "@/components/ui/FormSystem";

export default function ClientesPage() {
  const { data: clientes, loading, create, update, remove } = useStorage<Cliente>(clientesSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<"DADOS" | "ENDERECO" | "CONTATOS">("DADOS");

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
    setActiveFormTab("DADOS");
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
    setActiveFormTab("DADOS");
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

    if (name === "cep") {
      const cleanCep = value.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.erro) {
              setFormData((prev) => ({
                ...prev,
                logradouro: data.logradouro || prev.logradouro,
                bairro: data.bairro || prev.bairro,
                cidade: data.localidade || prev.cidade,
                estado: data.uf || prev.estado,
              }));
            }
          })
          .catch((err) => console.error("Erro ao buscar CEP:", err));
      }
    }

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
        {/* Tab Selector inside Modal Form */}
        <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e2e8f0", marginBottom: "1.25rem", paddingBottom: "2px" }}>
          {(["DADOS", "ENDERECO", "CONTATOS"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFormTab(tab)}
              style={{
                padding: "4px 0",
                border: "none",
                borderBottom: activeFormTab === tab ? "2.5px solid #0b4f59" : "2.5px solid transparent",
                background: "transparent",
                color: activeFormTab === tab ? "#0b4f59" : "#64748b",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
                transition: "all 0.2s"
              }}
            >
              {tab === "DADOS" && "👤 Dados Pessoais"}
              {tab === "ENDERECO" && "📍 Endereço"}
              {tab === "CONTATOS" && "📞 Contato & Status"}
            </button>
          ))}
        </div>

        <FormContainer onSubmit={handleSubmit}>
          {activeFormTab === "DADOS" && (
            <>
              <FormSection title="Dados Pessoais" icon="👤" subtitle="Informações básicas de identificação do cliente">
                <FormGrid columns={3}>
                  <FormField label="Nome Completo" required className="lf-full-width" fullWidth>
                    <Input
                      name="nomeCompleto"
                      value={formData.nomeCompleto}
                      onChange={handleInputChange}
                      required
                      autoFocus
                    />
                  </FormField>
                  <FormField label="Sexo">
                    <select
                      className="auth-input"
                      name="sexo"
                      value={formData.sexo}
                      onChange={handleInputChange}
                    >
                      <option value="MASCULINO">MASCULINO</option>
                      <option value="FEMININO">FEMININO</option>
                    </select>
                  </FormField>
                  <FormField label="CPF">
                    <Input
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      placeholder="Somente números"
                    />
                  </FormField>
                  <FormField label="RG">
                    <Input
                      name="rg"
                      value={formData.rg}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField label="Data Nascimento" required>
                    <Input
                      name="dataNascimento"
                      type="date"
                      value={formData.dataNascimento}
                      onChange={handleInputChange}
                      required
                    />
                  </FormField>
                  <FormField label="Estado Civil">
                    <select
                      className="auth-input"
                      name="estadoCivil"
                      value={formData.estadoCivil}
                      onChange={handleInputChange}
                    >
                      <option value="Solteiro">Solteiro</option>
                      <option value="Casado">Casado</option>
                      <option value="Divorciado">Divorciado</option>
                      <option value="Viúvo">Viúvo</option>
                    </select>
                  </FormField>
                  <FormField label="Nome do Cônjuge">
                    <Input
                      name="nomeConjuge"
                      value={formData.nomeConjuge}
                      onChange={handleInputChange}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title="Filiação & Outros" icon="👨" subtitle="Informações familiares e profissionais">
                <FormGrid columns={2}>
                  <FormField label="Nome do Pai">
                    <Input
                      name="nomePai"
                      value={formData.nomePai}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField label="Nome da Mãe">
                    <Input
                      name="nomeMae"
                      value={formData.nomeMae}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField label="Naturalidade">
                    <Input
                      name="naturalidade"
                      value={formData.naturalidade}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField label="Profissão">
                    <Input
                      name="profissao"
                      value={formData.profissao}
                      onChange={handleInputChange}
                    />
                  </FormField>
                  <FormField label="Local de Trabalho" fullWidth>
                    <Input
                      name="localTrabalho"
                      value={formData.localTrabalho}
                      onChange={handleInputChange}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>
            </>
          )}

          {activeFormTab === "ENDERECO" && (
            <FormSection title="Endereço Residencial" icon="📍" subtitle="Localização física do cliente">
              <FormGrid columns={3}>
                <FormField label="CEP">
                  <Input
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    placeholder="00000-000"
                  />
                </FormField>
                <FormField label="Logradouro" fullWidth>
                  <Input
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleInputChange}
                  />
                </FormField>
                <FormField label="Número">
                  <Input
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                  />
                </FormField>
                <FormField label="Bairro">
                  <Input
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                  />
                </FormField>
                <FormField label="Complemento">
                  <Input
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleInputChange}
                  />
                </FormField>
                <FormField label="Cidade">
                  <Input
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                  />
                </FormField>
                <FormField label="UF">
                  <select
                    className="auth-input"
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                  >
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {activeFormTab === "CONTATOS" && (
            <FormSection title="Contato & Status" icon="📞" subtitle="Informações de comunicação e situação cadastral">
              <FormGrid columns={3}>
                <FormField label="E-mail" fullWidth>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="exemplo@email.com"
                  />
                </FormField>
                <FormField label="Telefone / Celular">
                  <Input
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(00) 90000-0000"
                  />
                </FormField>
                <FormField label="Status">
                  <select
                    className="auth-input"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            saveText={editingCliente ? "Salvar Alterações" : "Cadastrar Cliente"}
          />
        </FormContainer>
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
