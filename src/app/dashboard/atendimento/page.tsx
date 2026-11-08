/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStorage } from "@/hooks/useStorage";
import { clientesSupabaseService } from "@/services/clientes.supabase.service";
import { contratosSupabaseService } from "@/services/contratos.supabase.service";
import { planosSupabaseService } from "@/services/planos.supabase.service";
import { mensalidadesSupabaseService } from "@/services/mensalidades.supabase.service";
import { agregadosSupabaseService } from "@/services/agregados.supabase.service";
import { atendimentosSupabaseService } from "@/services/atendimentos.supabase.service";
import { cobrancasSupabaseService } from "@/services/cobrancas.supabase.service";
import { Cliente, Contrato, Plano, Mensalidade, Agregado, Atendimento, Cobranca } from "@/types";
import { formatCurrency, formatDate, getClienteMatricula } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

export default function AtendimentoPage() {
  // Load data via hooks
  const { data: clientes } = useStorage<Cliente>(clientesSupabaseService as any);
  const { data: contratos } = useStorage<Contrato>(contratosSupabaseService as any);
  const { data: planos } = useStorage<Plano>(planosSupabaseService as any);
  const { data: mensalidades } = useStorage<Mensalidade>(mensalidadesSupabaseService as any);
  const { data: agregados } = useStorage<Agregado>(agregadosSupabaseService as any);
  const { data: atendimentos, create: createAtendimento, update: updateAtendimento } = useStorage<Atendimento>(atendimentosSupabaseService as any);
  const { data: cobrancas } = useStorage<Cobranca>(cobrancasSupabaseService as any);
  const toast = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Contrato[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [selectedAgregados, setSelectedAgregados] = useState<Agregado[]>([]);
  const [selectedMensalidades, setSelectedMensalidades] = useState<Mensalidade[]>([]);
  const [selectedCobrancas, setSelectedCobrancas] = useState<Cobranca[]>([]);
  const [selectedAtendimentos, setSelectedAtendimentos] = useState<Atendimento[]>([]);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<"resumo" | "dependentes" | "mensalidades" | "cobrancas" | "recebimentos" | "tickets" | "historico">("resumo");

  // Modal State for opening new atendimento
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

    // Matching clients first
    const matchingClientes = clientes.filter((cl) => {
      const nomeMatch = cl.nomeCompleto.toLowerCase().includes(termLower);
      const cpfMatch = cl.cpf && cl.cpf.replace(/\D/g, "").includes(termLower.replace(/\D/g, ""));
      const phoneMatch = cl.telefone && cl.telefone.replace(/\D/g, "").includes(termLower.replace(/\D/g, ""));
      return nomeMatch || cpfMatch || phoneMatch;
    });

    const clientIds = new Set(matchingClientes.map((c) => String(c.id)));

    const filtered = contratos.filter((c) => {
      const numContratoMatch = c.numeroContrato.toLowerCase().includes(termLower);
      const nomeMatch = c.clienteNome.toLowerCase().includes(termLower);
      const clientMatch = clientIds.has(String(c.clienteId));
      const matricula = getClienteMatricula(c.clienteId, clientes);
      const matriculaMatch = String(c.clienteId) === termLower || matricula === termLower;

      return numContratoMatch || nomeMatch || clientMatch || matriculaMatch;
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

    // Load associated cobrancas
    const cobs = cobrancas.filter((c) => String(c.clienteId) === String(contrato.clienteId));
    setSelectedCobrancas(cobs);

    // Load associated tickets/atendimentos
    const atends = atendimentos.filter((a) => String(a.contratoId) === String(contrato.id));
    setSelectedAtendimentos(atends);

    // Clear search list and term
    setSearchResults([]);
    setSearchTerm("");
    setActiveTab("resumo");
  };

  // Status financeiro logic
  const getFinancialStatus = (contrato: Contrato, contratoMensalidades: Mensalidade[]) => {
    if (contrato.status.toLowerCase() === "cancelado") {
      return { label: "CANCELADO", color: "#c5221f", bgColor: "#fce8e6" };
    }
    const hasEmAberto = contratoMensalidades.some((m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr);
    if (hasEmAberto) {
      return { label: "INADIMPLENTE", color: "#b06000", bgColor: "#fef7e0" };
    }
    return { label: "EM DIA", color: "#137333", bgColor: "#e6f4ea" };
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const handleOpenNovoAtendimento = () => {
    if (!selectedContrato) return;

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
      const newItem = await createAtendimento(payload);
      toast.success("Atendimento aberto com sucesso!");
      setIsModalOpen(false);
      if (newItem) {
        setSelectedAtendimentos((prev) => [newItem, ...prev]);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir atendimento.");
    }
  };

  const handleStatusChange = async (id: string | number, newStatus: string) => {
    try {
      await updateAtendimento(id, { status: newStatus });
      toast.success(`Status do atendimento alterado para ${newStatus}.`);
      setSelectedAtendimentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do atendimento.");
    }
  };

  // WhatsApp and call integration helpers
  const getCleanWhatsappLink = (telefone: string | undefined | null) => {
    if (!telefone) return null;
    const cleanNum = telefone.replace(/\D/g, "");
    if (cleanNum.length < 8) return null;
    const formatted = cleanNum.startsWith("55") ? cleanNum : `55${cleanNum}`;
    return `https://wa.me/${formatted}`;
  };

  // Resumo Tab calculations
  const openMensalidades = selectedMensalidades.filter((m) => m.status === "EM_ABERTO");
  const openMensalidadesCount = openMensalidades.length;
  const openMensalidadesSum = openMensalidades.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  const lastPayment = selectedMensalidades
    .filter((m) => m.status === "PAGO" && m.dataPagamento)
    .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))[0];

  // Timeline History Merge
  const buildHistoryTimeline = () => {
    const events: any[] = [];
    if (!selectedCliente) return [];

    // Client Creation
    if (selectedCliente.dataCadastro) {
      events.push({
        date: selectedCliente.dataCadastro,
        type: "CLIENT_CREATED",
        title: "Cliente Cadastrado",
        desc: `O cliente ${selectedCliente.nomeCompleto} foi cadastrado com sucesso.`,
        icon: "👤",
      });
    }

    // Contract Creation
    if (selectedContrato && selectedContrato.dataInicio) {
      events.push({
        date: selectedContrato.dataInicio,
        type: "CONTRACT_CREATED",
        title: "Contrato Assinado",
        desc: `Contrato Nº ${selectedContrato.numeroContrato} sob plano ${selectedContrato.planoNome} assinado.`,
        icon: "📄",
      });
    }

    // Monthly Payments (Generations & Payments)
    selectedMensalidades.forEach((m) => {
      events.push({
        date: m.dataVencimento,
        type: "MENSALIDADE_GENERATED",
        title: `Mensalidade Emitida - Ref: ${m.competencia}`,
        desc: `Mensalidade de R$ ${m.valor} gerada para vencimento em ${formatDate(m.dataVencimento)}.`,
        icon: "💵",
      });
      if (m.status === "PAGO" && m.dataPagamento) {
        events.push({
          date: m.dataPagamento,
          type: "MENSALIDADE_PAID",
          title: `Pagamento Recebido - Ref: ${m.competencia}`,
          desc: `Mensalidade de R$ ${m.valor} quitada. Recebido R$ ${m.valorRecebido || m.valor}.`,
          icon: "✅",
        });
      }
    });

    // Charges Generated
    selectedCobrancas.forEach((c) => {
      if (c.createdAt) {
        events.push({
          date: c.createdAt.split("T")[0],
          type: "COBRANCA_GENERATED",
          title: `Cobrança Gateway (${c.gatewayMethod})`,
          desc: `Cobrança ASAAS gerada. Valor: ${formatCurrency(c.valor)}. Status: ${c.gatewayStatus}.`,
          icon: "💳",
        });
      }
    });

    // Tickets
    selectedAtendimentos.forEach((a) => {
      if (a.data) {
        events.push({
          date: a.data,
          type: "TICKET",
          title: `Atendimento ${a.status} (${a.tipo})`,
          desc: `Declarante: ${a.responsavel} | Local: ${a.local} | Obs: ${a.observacoes || "N/A"}`,
          icon: "📞",
        });
      }
    });

    return events.sort((a, b) => b.date.localeCompare(a.date));
  };

  const timelineHistory = buildHistoryTimeline();

  return (
    <div>
      <PageTitle title="Atendimento 360°" icon="📞" />

      {/* SEARCH BAR */}
      <Card title="Pesquisar Cadastro do Cliente" icon="🔍">
        <div style={{ position: "relative" }}>
          <Input
            placeholder="Pesquisar por Nome, CPF, Telefone ou Matrícula/Nº do Contrato..."
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
      </Card>

      {!selectedContrato || !selectedCliente ? (
        <div style={{ marginTop: "2rem" }}>
          <EmptyState
            message="Pesquise um cliente para visualizar seu histórico completo."
            description="Use a barra de busca acima para localizar rapidamente o perfil executivo, faturas, dependentes, atendimentos e logs de auditoria."
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "1.5rem", marginTop: "1.5rem" }} className="responsive-grid">
          
          {/* COLUNA ESQUERDA: PROFILE INFO */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(12px)",
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              padding: "1.5rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              {/* Photo Avatar Placeholder */}
              <div style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                fontSize: "2.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                marginBottom: "1rem",
                border: "3px solid #bae6fd"
              }}>
                {selectedCliente.nomeCompleto.charAt(0).toUpperCase()}
              </div>

              <h3 style={{ margin: "0.25rem 0", color: "#0f172a", fontSize: "1.2rem", fontWeight: "bold" }}>
                {selectedCliente.nomeCompleto}
              </h3>
              
              <div style={{ margin: "0.5rem 0" }}>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  backgroundColor: selectedContrato.status.toLowerCase() === "ativo" ? "#d1fae5" : "#fee2e2",
                  color: selectedContrato.status.toLowerCase() === "ativo" ? "#065f46" : "#b91c1c",
                  textTransform: "uppercase"
                }}>
                  Contrato: {selectedContrato.status}
                </span>
              </div>

              <div style={{ width: "100%", borderTop: "1px solid #e2e8f0", margin: "1rem 0", paddingTop: "1rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  📋 <strong>Plano:</strong> {selectedContrato.planoNome}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  📄 <strong>Contrato:</strong> #{selectedContrato.numeroContrato}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  📞 <strong>Telefone:</strong> {selectedCliente.telefone || "Não cadastrado"}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                {selectedCliente.telefone && (
                  <Button
                    onClick={() => window.open(`tel:${selectedCliente.telefone}`, "_self")}
                    style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "#64748b" }}
                  >
                    📞 Ligar para Cliente
                  </Button>
                )}
                {getCleanWhatsappLink(selectedCliente.telefone) && (
                  <Button
                    onClick={() => window.open(getCleanWhatsappLink(selectedCliente.telefone) || "", "_blank")}
                    style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "#27ae60" }}
                  >
                    💬 WhatsApp
                  </Button>
                )}
                <Link href="/dashboard/clientes" style={{ textDecoration: "none" }}>
                  <Button style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "#2f80ed" }}>
                    👤 Editar Cliente
                  </Button>
                </Link>
                <Button
                  onClick={handleOpenNovoAtendimento}
                  style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "#f2994a" }}
                >
                  ➕ Novo Atendimento
                </Button>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: TABS DETAILS */}
          <div>
            <div style={{
              display: "flex",
              borderBottom: "2px solid #e2e8f0",
              gap: "0.5rem",
              marginBottom: "1rem",
              overflowX: "auto",
              paddingBottom: "4px"
            }}>
              {(["resumo", "dependentes", "mensalidades", "cobrancas", "recebimentos", "tickets", "historico"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "0.6rem 1rem",
                    border: "none",
                    background: "none",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    color: activeTab === tab ? "var(--brand)" : "#64748b",
                    borderBottom: activeTab === tab ? "3px solid var(--brand)" : "3px solid transparent",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap"
                  }}
                >
                  {tab === "cobrancas" ? "Cobranças" : tab === "historico" ? "Histórico" : tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div style={{
              background: "white",
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow)",
              padding: "1.5rem",
              minHeight: "350px"
            }}>
              
              {/* SUMMARY TAB */}
              {activeTab === "resumo" && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Resumo da Conta</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Mensalidades em Aberto</span>
                      <h4 style={{ margin: "0.25rem 0", color: openMensalidadesCount > 0 ? "#b06000" : "#0f172a" }}>
                        {openMensalidadesCount} faturas ({formatCurrency(openMensalidadesSum)})
                      </h4>
                    </div>
                    <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Último Pagamento</span>
                      <h4 style={{ margin: "0.25rem 0", color: "#27ae60" }}>
                        {lastPayment ? `${formatCurrency(lastPayment.valorRecebido || lastPayment.valor)} em ${formatDate(lastPayment.dataPagamento || "")}` : "Nenhum recebido"}
                      </h4>
                    </div>
                    <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Valor Mensal Plano</span>
                      <h4 style={{ margin: "0.25rem 0" }}>
                        {selectedPlano ? formatCurrency(selectedPlano.valorMensal || 0) : "N/A"}
                      </h4>
                    </div>
                    <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Situação do Cliente</span>
                      <div style={{ marginTop: "0.25rem" }}>
                        {(() => {
                          const status = getFinancialStatus(selectedContrato, selectedMensalidades);
                          return (
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              backgroundColor: status.bgColor,
                              color: status.color
                            }}>
                              {status.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <h4 style={{ margin: "1.5rem 0 0.5rem 0", color: "var(--brand)", fontSize: "1rem" }}>Dados do Cliente</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.9rem" }}>
                    <p style={{ margin: 0 }}>👤 <strong>CPF:</strong> {selectedCliente.cpf || "N/A"}</p>
                    <p style={{ margin: 0 }}>📅 <strong>Data de Nascimento:</strong> {formatDate(selectedCliente.dataNascimento)}</p>
                    <p style={{ margin: 0 }}>📧 <strong>Email:</strong> {selectedCliente.email || "Não informado"}</p>
                    <p style={{ margin: 0 }}>💑 <strong>Estado Civil:</strong> {selectedCliente.estadoCivil || "N/A"}</p>
                    <p style={{ margin: 0, gridColumn: "span 2" }}>📍 <strong>Endereço:</strong> {selectedCliente.logradouro ? `${selectedCliente.logradouro}, ${selectedCliente.numero || ""} - ${selectedCliente.bairro || ""} (${selectedCliente.cidade || ""}/${selectedCliente.estado || ""})` : "N/A"}</p>
                  </div>
                </div>
              )}

              {/* DEPENDENTES TAB */}
              {activeTab === "dependentes" && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Lista de Dependentes</h4>
                  {selectedAgregados.length === 0 ? (
                    <EmptyState
                      message="Nenhum dependente cadastrado."
                      description="Este cliente possui um plano sem agregados cadastrados atualmente."
                    />
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left", color: "#555" }}>
                          <th style={{ padding: "0.6rem" }}>Nome</th>
                          <th style={{ padding: "0.6rem" }}>CPF</th>
                          <th style={{ padding: "0.6rem" }}>Nascimento</th>
                          <th style={{ padding: "0.6rem" }}>Parentesco</th>
                          <th style={{ padding: "0.6rem" }}>Status/Liberação</th>
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
              )}

              {/* MENSALIDADES TAB */}
              {activeTab === "mensalidades" && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Timeline de Mensalidades</h4>
                  {selectedMensalidades.length === 0 ? (
                    <EmptyState message="Nenhuma faturamento registrado." description="Sem registros de mensalidade cadastrados." />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {selectedMensalidades
                        .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
                        .map((m) => (
                          <div key={m.id} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem 1rem",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "6px",
                            borderLeft: `4px solid ${m.status === "PAGO" ? "#27ae60" : m.dataVencimento < todayStr ? "#c5221f" : "#f2994a"}`
                          }}>
                            <div>
                              <strong>Competência: {m.competencia}</strong>
                              <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "1rem" }}>
                                Vencimento: {formatDate(m.dataVencimento)}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <strong style={{ fontSize: "0.95rem" }}>{formatCurrency(Number(m.valor))}</strong>
                              <StatusBadge status={m.status} />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* COBRANCAS TAB */}
              {activeTab === "cobrancas" && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Cobranças Gateway</h4>
                  {selectedCobrancas.length === 0 ? (
                    <EmptyState message="Nenhuma cobrança gateway." description="Nenhum registro emitido no ASAAS para este cliente." />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {selectedCobrancas.map((c) => (
                        <div key={c.id} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem 1rem",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "6px",
                          border: "1px solid #e9ecef"
                        }}>
                          <div>
                            <strong>Método: {c.gatewayMethod}</strong>
                            <div style={{ fontSize: "0.8rem", color: "#666" }}>
                              Vencimento: {formatDate(c.vencimento)} | ID Pagamento: {c.gatewayPaymentId}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <strong style={{ fontSize: "0.95rem" }}>{formatCurrency(c.valor)}</strong>
                            <StatusBadge status={c.gatewayStatus || "PENDING"} />
                            {c.invoiceUrl && (
                              <Button
                                onClick={() => window.open(c.invoiceUrl || "", "_blank")}
                                style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                              >
                                🔗 Fatura
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RECEBIMENTOS TAB */}
              {activeTab === "recebimentos" && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Timeline de Recebimentos</h4>
                  {selectedMensalidades.filter((m) => m.status === "PAGO").length === 0 ? (
                    <EmptyState message="Nenhum recebimento registrado." description="O cliente não realizou nenhum pagamento líquido até o momento." />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {selectedMensalidades
                        .filter((m) => m.status === "PAGO")
                        .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
                        .map((m) => (
                          <div key={m.id} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem 1rem",
                            backgroundColor: "#f0fdf4",
                            borderRadius: "6px",
                            borderLeft: "4px solid #27ae60"
                          }}>
                            <div>
                              <strong>Fatura Competência: {m.competencia}</strong>
                              <div style={{ fontSize: "0.8rem", color: "#15803d" }}>
                                Pago em: {m.dataPagamento ? formatDate(m.dataPagamento) : "-"}
                              </div>
                            </div>
                            <div>
                              <strong style={{ color: "#166534", fontSize: "1rem" }}>
                                {formatCurrency(Number(m.valorRecebido || m.valor))}
                              </strong>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* TICKETS TAB */}
              {activeTab === "tickets" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, color: "var(--brand)", fontSize: "1.1rem" }}>Histórico de Tickets</h4>
                    <Button onClick={handleOpenNovoAtendimento}>
                      ➕ Abrir Atendimento
                    </Button>
                  </div>
                  {selectedAtendimentos.length === 0 ? (
                    <EmptyState message="Nenhum ticket aberto." description="Sem registro de atendimentos de suporte." />
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                          <th style={{ padding: "0.6rem" }}>Data</th>
                          <th style={{ padding: "0.6rem" }}>Beneficiário</th>
                          <th style={{ padding: "0.6rem" }}>Tipo</th>
                          <th style={{ padding: "0.6rem" }}>Operador</th>
                          <th style={{ padding: "0.6rem" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAtendimentos.map((a) => (
                          <tr key={a.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "0.6rem" }}>{formatDate(a.data)} {a.hora}</td>
                            <td style={{ padding: "0.6rem", fontWeight: "bold" }}>{a.clienteNome}</td>
                            <td style={{ padding: "0.6rem" }}>{a.tipo}</td>
                            <td style={{ padding: "0.6rem" }}>{a.operador}</td>
                            <td style={{ padding: "0.6rem" }}>
                              <select
                                className="auth-input"
                                value={a.status}
                                onChange={(e) => handleStatusChange(a.id!, e.target.value)}
                                style={{
                                  padding: "0.2rem 0.4rem",
                                  fontSize: "0.8rem",
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
                </div>
              )}

              {/* UNIFIED TIMELINE TAB */}
              {activeTab === "historico" && (
                <div>
                  <h4 style={{ margin: "0 0 1.5rem 0", color: "var(--brand)", fontSize: "1.1rem" }}>Histórico Unificado</h4>
                  {timelineHistory.length === 0 ? (
                    <EmptyState message="Sem dados de histórico." description="Sem interações ou logs." />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative", paddingLeft: "1.5rem", borderLeft: "2px solid #e2e8f0" }}>
                      {timelineHistory.map((item, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          {/* Timeline dot */}
                          <div style={{
                            position: "absolute",
                            left: "-34px",
                            top: "2px",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#f1f5f9",
                            border: "2px solid #cbd5e1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.95rem"
                          }}>
                            {item.icon}
                          </div>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>
                              {formatDate(item.date)}
                            </span>
                            <h5 style={{ margin: "0.1rem 0", color: "#0f172a", fontSize: "0.95rem", fontWeight: "bold" }}>
                              {item.title}
                            </h5>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* MODAL: OPEN ATENDIMENTO */}
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
