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
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { agregadosSupabaseService } from "@/services/agregados.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { Cliente, Contrato, Plano, Mensalidade, Agregado, Atendimento } from "@/types";
import { formatCurrency, formatDate, getClienteMatricula } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AtendimentoPage() {
  // Load data via hooks
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const { data: mensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: agregados } = useStorage<Agregado>(agregadosSupabaseService as any);
  const { data: atendimentos, loading, create: createAtendimento, update: updateAtendimento } = useStorage<Atendimento>(atendimentosSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Contrato[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [selectedAgregados, setSelectedAgregados] = useState<Agregado[]>([]);
  const [selectedMensalidades, setSelectedMensalidades] = useState<Mensalidade[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operadorName] = useState(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("legacyflow_user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          return user.responsavel || "Operador";
        } catch {}
      }
    }
    return "Operador";
  });

  // Novo Atendimento Form State
  const [tipoAtendimento, setTipoAtendimento] = useState<"TITULAR" | "DEPENDENTE">("TITULAR");
  const [selectedAgregadoId, setSelectedAgregadoId] = useState<string>("");
  const [beneficiarioNome, setBeneficiarioNome] = useState("");
  const [responsavelAtendimento, setResponsavelAtendimento] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [localAtendimento, setLocalAtendimento] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [horaAtendimento, setHoraAtendimento] = useState("");
  const [observacoesAtendimento, setObservacoesAtendimento] = useState("");

  // Search logic
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const termLower = term.toLowerCase();
    const filtered = contratos.filter((c) => {
      // Find cliente
      const cli = clientes.find((cl) => String(cl.id) === String(c.clienteId));
      
      const numContratoMatch = c.numeroContrato.toLowerCase().includes(termLower);
      const nomeMatch = c.clienteNome.toLowerCase().includes(termLower);
      const cpfMatch = cli?.cpf?.includes(termLower);
      const matricula = getClienteMatricula(c.clienteId, clientes);
      const matriculaMatch = String(c.clienteId) === termLower || matricula === termLower;

      return numContratoMatch || nomeMatch || cpfMatch || matriculaMatch;
    });

    setSearchResults(filtered);
  };

  const handleSelectContrato = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    
    // Load associated client
    const cli = clientes.find((cl) => String(cl.id) === String(contrato.clienteId)) || null;
    setSelectedCliente(cli);

    // Load associated plano
    const pla = planos.find((p) => String(p.id) === String(contrato.planoId)) || null;
    setSelectedPlano(pla);

    // Load associated dependentes (agregados)
    const agr = agregados.filter((a) => String(a.contratoId) === String(contrato.id));
    setSelectedAgregados(agr);

    // Load associated mensalidades
    const mens = mensalidades.filter((m) => String(m.contratoId) === String(contrato.id));
    setSelectedMensalidades(mens);

    // Clear search list
    setSearchResults([]);
    setSearchTerm("");
  };

  // Status financeiro logic
  const getFinancialStatus = (contrato: Contrato, contratoMensalidades: Mensalidade[]) => {
    if (contrato.status.toLowerCase() === "cancelado") {
      return { label: "CANCELADO", color: "#c5221f", bgColor: "#fce8e6" };
    }
    const hasEmAberto = contratoMensalidades.some((m) => m.status === "EM_ABERTO");
    if (hasEmAberto) {
      return { label: "PENDENTE", color: "#b06000", bgColor: "#fef7e0" };
    }
    return { label: "EM DIA", color: "#137333", bgColor: "#e6f4ea" };
  };

  const handleOpenNovoAtendimento = () => {
    if (!selectedContrato) return;
    
    // Default form fields
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    setTipoAtendimento("TITULAR");
    setSelectedAgregadoId("");
    setBeneficiarioNome(selectedContrato.clienteNome);
    setResponsavelAtendimento(selectedContrato.clienteNome);
    setTelefoneContato(selectedCliente?.telefone || "");
    setLocalAtendimento("");
    setDataAtendimento(today);
    setHoraAtendimento(now);
    setObservacoesAtendimento("");
    
    setIsModalOpen(true);
  };

  const handleTipoChange = (tipo: "TITULAR" | "DEPENDENTE") => {
    setTipoAtendimento(tipo);
    if (tipo === "TITULAR" && selectedContrato) {
      setBeneficiarioNome(selectedContrato.clienteNome);
    } else {
      setBeneficiarioNome("");
      setSelectedAgregadoId("");
    }
  };

  const handleAgregadoSelect = (id: string) => {
    setSelectedAgregadoId(id);
    const agr = selectedAgregados.find((a) => String(a.id) === String(id));
    if (agr) {
      setBeneficiarioNome(agr.nome);
    } else {
      setBeneficiarioNome("");
    }
  };

  const handleSubmitAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContrato) return;

    if (!beneficiarioNome || !responsavelAtendimento || !localAtendimento) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    const payload: Omit<Atendimento, "id"> = {
      contratoId: selectedContrato.id!,
      clienteNome: beneficiarioNome,
      planoNome: selectedContrato.planoNome,
      data: dataAtendimento,
      hora: horaAtendimento,
      local: localAtendimento,
      tipo: tipoAtendimento,
      responsavel: responsavelAtendimento,
      telefone: telefoneContato,
      observacoes: observacoesAtendimento,
      status: "Aberto",
      operador: operadorName,
    };

    try {
      await createAtendimento(payload);
      toast.success("Atendimento aberto com sucesso!");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir atendimento.");
    }
  };

  const handleStatusChange = async (id: string | number, newStatus: string) => {
    try {
      await updateAtendimento(id, { status: newStatus });
      toast.success(`Status do atendimento alterado para ${newStatus}.`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do atendimento.");
    }
  };

  // Today's atendimentos filter
  const todayStr = new Date().toISOString().split("T")[0];
  const atendimentosHoje = atendimentos.filter((a) => a.data === todayStr);

  return (
    <div>
      <PageTitle title="Central de Atendimento" icon="🏥" />

      {/* BLOCO 01: LOCALIZAR CLIENTE / CONTRATO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <Card title="Localizar Cliente / Contrato" icon="🔍">
          <div style={{ position: "relative" }}>
            <Input
              placeholder="Digite o Nome, CPF, Matrícula ou Nº do Contrato..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--border-radius)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 100,
                  maxHeight: "250px",
                  overflowY: "auto",
                  marginTop: "4px",
                }}
              >
                {searchResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectContrato(c)}
                    style={{
                      padding: "0.8rem 1.2rem",
                      cursor: "pointer",
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <div style={{ fontWeight: "bold", color: "#333" }}>{c.clienteNome}</div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      Contrato: <strong>{c.numeroContrato}</strong> | Plano: {c.planoNome} | Matrícula: {getClienteMatricula(c.clienteId, clientes)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedContrato && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                borderRadius: "var(--border-radius)",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e9ecef",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>
                  Contrato Selecionado
                </span>
                <h3 style={{ margin: "0.2rem 0", color: "var(--brand)" }}>
                  {selectedContrato.clienteNome} ({selectedContrato.numeroContrato})
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {(() => {
                  const finStatus = getFinancialStatus(selectedContrato, selectedMensalidades);
                  return (
                    <div
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        backgroundColor: finStatus.bgColor,
                        color: finStatus.color,
                        border: `1px solid ${finStatus.color}40`,
                      }}
                    >
                      SITUAÇÃO FINANCEIRA: {finStatus.label}
                    </div>
                  );
                })()}

                <Button onClick={handleOpenNovoAtendimento}>
                  ➕ Abrir Atendimento
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* BLOCO 02: RESUMO DO TITULAR */}
      {selectedContrato && selectedCliente && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <Card title="Resumo do Titular & Dependentes" icon="👤">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
              {/* Dados do Titular */}
              <div style={{ padding: "1rem", border: "1px solid #eee", borderRadius: "var(--border-radius)", backgroundColor: "#fff" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                  Dados do Titular
                </h4>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Nome:</strong> {selectedCliente.nomeCompleto}</p>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>CPF:</strong> {selectedCliente.cpf || "-"}</p>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Nascimento:</strong> {formatDate(selectedCliente.dataNascimento)}</p>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Telefone:</strong> {selectedCliente.telefone || "-"}</p>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}>
                  <strong>Endereço:</strong> {selectedCliente.logradouro ? `${selectedCliente.logradouro}, ${selectedCliente.numero || ""} - ${selectedCliente.bairro || ""} (${selectedCliente.cidade || ""}/${selectedCliente.estado || ""})` : "-"}
                </p>
              </div>

              {/* Dados do Contrato e Plano */}
              <div style={{ padding: "1rem", border: "1px solid #eee", borderRadius: "var(--border-radius)", backgroundColor: "#fff" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                  Contrato & Plano
                </h4>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Nº Contrato:</strong> {selectedContrato.numeroContrato}</p>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Início do Contrato:</strong> {formatDate(selectedContrato.dataInicio)}</p>
                <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Plano:</strong> {selectedContrato.planoNome}</p>
                {selectedPlano && (
                  <>
                    <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Valor Mensal:</strong> {formatCurrency(selectedPlano.valorMensal || 0)}</p>
                    <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Carência:</strong> {selectedPlano.diasCarencia || 0} dias</p>
                    <p style={{ margin: "0.4rem 0", fontSize: "0.9rem" }}><strong>Limite Dependentes:</strong> {selectedPlano.limiteDependentes || 0}</p>
                  </>
                )}
              </div>
            </div>

            {/* Dependentes / Agregados */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--brand)" }}>Dependentes (Agregados)</h4>
              {selectedAgregados.length === 0 ? (
                <p style={{ fontStyle: "italic", color: "#666", fontSize: "0.9rem" }}>Nenhum dependente cadastrado para este contrato.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "#555" }}>
                      <th style={{ padding: "0.6rem" }}>Nome</th>
                      <th style={{ padding: "0.6rem" }}>CPF</th>
                      <th style={{ padding: "0.6rem" }}>Data Nascimento</th>
                      <th style={{ padding: "0.6rem" }}>Parentesco</th>
                      <th style={{ padding: "0.6rem" }}>Carência / Liberação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAgregados.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{a.nome}</td>
                        <td style={{ padding: "0.6rem" }}>{a.cpf || "-"}</td>
                        <td style={{ padding: "0.6rem" }}>{a.dataNascimento ? formatDate(a.dataNascimento) : "-"}</td>
                        <td style={{ padding: "0.6rem" }}>{a.parentesco || "-"}</td>
                        <td style={{ padding: "0.6rem" }}>{a.liberacao ? formatDate(a.liberacao) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mensalidades / Faturas */}
            <div>
              <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--brand)" }}>Histórico de Mensalidades</h4>
              {selectedMensalidades.length === 0 ? (
                <p style={{ fontStyle: "italic", color: "#666", fontSize: "0.9rem" }}>Nenhuma mensalidade registrada para este contrato.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "#555" }}>
                      <th style={{ padding: "0.6rem" }}>Competência</th>
                      <th style={{ padding: "0.6rem" }}>Vencimento</th>
                      <th style={{ padding: "0.6rem" }}>Valor</th>
                      <th style={{ padding: "0.6rem" }}>Pagamento</th>
                      <th style={{ padding: "0.6rem" }}>Valor Pago</th>
                      <th style={{ padding: "0.6rem", textAlign: "right" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMensalidades.map((m) => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{m.competencia}</td>
                        <td style={{ padding: "0.6rem" }}>{formatDate(m.dataVencimento)}</td>
                        <td style={{ padding: "0.6rem" }}>{formatCurrency(m.valor)}</td>
                        <td style={{ padding: "0.6rem" }}>{m.dataPagamento ? formatDate(m.dataPagamento) : "-"}</td>
                        <td style={{ padding: "0.6rem" }}>{m.valorRecebido ? formatCurrency(m.valorRecebido) : "-"}</td>
                        <td style={{ padding: "0.6rem", textAlign: "right" }}>
                          <StatusBadge status={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* BLOCO 04: ATENDIMENTOS DO DIA */}
      <TableContainer title="Atendimentos do Dia" count={atendimentosHoje.length}>
        {loading ? (
          <SkeletonTable cols={8} rows={6} />
        ) : atendimentosHoje.length === 0 ? (
          <EmptyState
            message="Nenhum atendimento aberto no dia de hoje."
            description="Use a busca acima para localizar um contrato e iniciar um novo atendimento."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem" }}>Hora</th>
                <th style={{ padding: "0.8rem" }}>Contrato</th>
                <th style={{ padding: "0.8rem" }}>Beneficiário</th>
                <th style={{ padding: "0.8rem" }}>Tipo</th>
                <th style={{ padding: "0.8rem" }}>Responsável</th>
                <th style={{ padding: "0.8rem" }}>Local</th>
                <th style={{ padding: "0.8rem" }}>Operador</th>
                <th style={{ padding: "0.8rem", textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {atendimentosHoje.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{a.hora}</td>
                  <td style={{ padding: "0.8rem" }}>{a.contratoId}</td>
                  <td style={{ padding: "0.8rem", fontWeight: "bold" }}>{a.clienteNome}</td>
                  <td style={{ padding: "0.8rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        backgroundColor: a.tipo === "TITULAR" ? "#e8f0fe" : "#f1f3f4",
                        color: a.tipo === "TITULAR" ? "#1a73e8" : "#5f6368",
                      }}
                    >
                      {a.tipo}
                    </span>
                  </td>
                  <td style={{ padding: "0.8rem" }}>{a.responsavel}</td>
                  <td style={{ padding: "0.8rem" }}>{a.local}</td>
                  <td style={{ padding: "0.8rem", fontSize: "0.85rem", color: "#666" }}>{a.operador}</td>
                  <td style={{ padding: "0.8rem", textAlign: "right" }}>
                    <select
                      className="auth-input"
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id!, e.target.value)}
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "0.85rem",
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        backgroundColor: a.status === "Aberto" ? "#fef7e0" : a.status === "Finalizado" ? "#e6f4ea" : "#fce8e6",
                        color: a.status === "Aberto" ? "#b06000" : a.status === "Finalizado" ? "#137333" : "#c5221f",
                        cursor: "pointer",
                      }}
                    >
                      <option value="Aberto">Aberto</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* BLOCO 03: MODAL ABERTURA DE ATENDIMENTO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Abertura de Atendimento">
        <form onSubmit={handleSubmitAtendimento}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.9rem" }}>
              Tipo de Atendimento
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="tipoAtendimento"
                  value="TITULAR"
                  checked={tipoAtendimento === "TITULAR"}
                  onChange={() => handleTipoChange("TITULAR")}
                  autoFocus
                />
                Titular
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="tipoAtendimento"
                  value="DEPENDENTE"
                  checked={tipoAtendimento === "DEPENDENTE"}
                  onChange={() => handleTipoChange("DEPENDENTE")}
                />
                Dependente
              </label>
            </div>
          </div>

          {tipoAtendimento === "DEPENDENTE" ? (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.9rem" }}>
                Selecionar Dependente *
              </label>
              <select
                className="auth-input"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--border-radius)",
                  fontSize: "1rem",
                }}
                value={selectedAgregadoId}
                onChange={(e) => handleAgregadoSelect(e.target.value)}
                required
              >
                <option value="">-- Escolha um Dependente --</option>
                {selectedAgregados.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.nome} ({a.parentesco || "Agregado"})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={{ marginBottom: "1rem" }}>
            <Input
              label="Nome do Beneficiário *"
              value={beneficiarioNome}
              onChange={(e) => setBeneficiarioNome(e.target.value)}
              required
              disabled={tipoAtendimento === "DEPENDENTE" && !!selectedAgregadoId}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Responsável/Declarante *"
                value={responsavelAtendimento}
                onChange={(e) => setResponsavelAtendimento(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Telefone de Contato"
                value={telefoneContato}
                onChange={(e) => setTelefoneContato(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <Input
              label="Local do Atendimento (ex: Residência, Hospital, IML) *"
              value={localAtendimento}
              onChange={(e) => setLocalAtendimento(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Data *"
                type="date"
                value={dataAtendimento}
                onChange={(e) => setDataAtendimento(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Hora *"
                type="time"
                value={horaAtendimento}
                onChange={(e) => setHoraAtendimento(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "0.9rem" }}>
              Observações
            </label>
            <textarea
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "1rem",
                minHeight: "80px",
                fontFamily: "inherit",
              }}
              value={observacoesAtendimento}
              onChange={(e) => setObservacoesAtendimento(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button type="button" variant="cancel" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Abrir Atendimento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
