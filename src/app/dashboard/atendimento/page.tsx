/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Modal } from "@/components/ui/Modal";
import {
  Headphones,
  Search,
  UsersRound,
  FileText,
  DollarSign,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ExternalLink,
  PlusCircle,
  X,
  User,
  Tag,
} from "@/components/icons/AdminIcons";

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

  // Estados de Busca e Seleção
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Contrato[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [selectedAgregados, setSelectedAgregados] = useState<Agregado[]>([]);
  const [selectedMensalidades, setSelectedMensalidades] = useState<Mensalidade[]>([]);
  const [selectedCobrancas, setSelectedCobrancas] = useState<Cobranca[]>([]);
  const [selectedAtendimentos, setSelectedAtendimentos] = useState<Atendimento[]>([]);

  // Aba ativa
  const [activeTab, setActiveTab] = useState<"resumo" | "dependentes" | "mensalidades" | "cobrancas" | "recebimentos" | "tickets" | "historico">("resumo");

  // Modal de Abertura de Atendimento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  // Formulário do Atendimento
  const [tipoAtendimento, setTipoAtendimento] = useState<"TITULAR" | "DEPENDENTE">("TITULAR");
  const [selectedAgregadoId, setSelectedAgregadoId] = useState<string>("");
  const [beneficiarioNome, setBeneficiarioNome] = useState("");
  const [responsavelAtendimento, setResponsavelAtendimento] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [localAtendimento, setLocalAtendimento] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [horaAtendimento, setHoraAtendimento] = useState("");
  const [observacoesAtendimento, setObservacoesAtendimento] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Lógica de Busca Unificada
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const termLower = term.toLowerCase().trim();
    const cleanNum = termLower.replace(/\D/g, "");

    const matchingClientes = clientes.filter((cl) => {
      const nomeMatch = cl.nomeCompleto.toLowerCase().includes(termLower);
      const cpfMatch = cleanNum && cl.cpf && cl.cpf.replace(/\D/g, "").includes(cleanNum);
      const phoneMatch = cleanNum && cl.telefone && cl.telefone.replace(/\D/g, "").includes(cleanNum);
      return nomeMatch || cpfMatch || phoneMatch;
    });

    const clientIds = new Set(matchingClientes.map((c) => String(c.id)));

    const filtered = contratos.filter((c) => {
      const numContratoMatch = c.numeroContrato.toLowerCase().includes(termLower);
      const nomeMatch = c.clienteNome.toLowerCase().includes(termLower);
      const clientMatch = clientIds.has(String(c.clienteId));
      const matricula = getClienteMatricula(c.clienteId, clientes);
      const matriculaMatch = String(c.clienteId) === termLower || matricula.toLowerCase() === termLower;

      return numContratoMatch || nomeMatch || clientMatch || matriculaMatch;
    });

    setSearchResults(filtered);
  };

  const handleSelectContrato = (contrato: Contrato) => {
    setSelectedContrato(contrato);

    const cli = clientes.find((cl) => String(cl.id) === String(contrato.clienteId)) || null;
    setSelectedCliente(cli);

    const pla = planos.find((p) => String(p.id) === String(contrato.planoId)) || null;
    setSelectedPlano(pla);

    const agr = agregados.filter((a) => String(a.contratoId) === String(contrato.id));
    setSelectedAgregados(agr);

    const mens = mensalidades.filter((m) => String(m.contratoId) === String(contrato.id));
    setSelectedMensalidades(mens);

    const cobs = cobrancas.filter((c) => String(c.clienteId) === String(contrato.clienteId));
    setSelectedCobrancas(cobs);

    const atends = atendimentos.filter((a) => String(a.contratoId) === String(contrato.id));
    setSelectedAtendimentos(atends);

    setSearchResults([]);
    setSearchTerm("");
    setActiveTab("resumo");
  };

  const getFinancialStatus = (contrato: Contrato, contratoMensalidades: Mensalidade[]) => {
    if (contrato.status.toLowerCase() === "cancelado") {
      return { label: "CANCELADO", color: "#DC2626", bgColor: "#FEE2E2" };
    }
    const hasEmAberto = contratoMensalidades.some((m) => m.status === "EM_ABERTO" && m.dataVencimento < todayStr);
    if (hasEmAberto) {
      return { label: "INADIMPLENTE", color: "#D97706", bgColor: "#FEF3C7" };
    }
    return { label: "EM DIA", color: "#008C66", bgColor: "#E8F8F2" };
  };

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

    if (!beneficiarioNome?.trim() || !responsavelAtendimento?.trim() || !localAtendimento?.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);

    const payload: Omit<Atendimento, "id"> = {
      contratoId: selectedContrato.id!,
      clienteNome: beneficiarioNome.trim().toUpperCase(),
      planoNome: selectedContrato.planoNome,
      data: dataAtendimento,
      hora: horaAtendimento,
      local: localAtendimento.trim().toUpperCase(),
      tipo: tipoAtendimento,
      responsavel: responsavelAtendimento.trim().toUpperCase(),
      telefone: telefoneContato.trim(),
      observacoes: observacoesAtendimento.trim(),
      status: "Aberto",
      operador: operadorName,
    };

    try {
      const newItem = await createAtendimento(payload);
      toast.success("Atendimento registrado com sucesso!");
      setIsModalOpen(false);
      if (newItem) {
        setSelectedAtendimentos((prev) => [newItem, ...prev]);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir atendimento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string | number, newStatus: string) => {
    try {
      await updateAtendimento(id, { status: newStatus });
      toast.success(`Status do atendimento atualizado para ${newStatus}.`);
      setSelectedAtendimentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do atendimento.");
    }
  };

  const getCleanWhatsappLink = (telefone: string | undefined | null) => {
    if (!telefone) return null;
    const cleanNum = telefone.replace(/\D/g, "");
    if (cleanNum.length < 8) return null;
    const formatted = cleanNum.startsWith("55") ? cleanNum : `55${cleanNum}`;
    return `https://wa.me/${formatted}`;
  };

  // Cálculos da Aba Resumo
  const openMensalidades = selectedMensalidades.filter((m) => m.status === "EM_ABERTO");
  const openMensalidadesCount = openMensalidades.length;
  const openMensalidadesSum = openMensalidades.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  const lastPayment = selectedMensalidades
    .filter((m) => m.status === "PAGO" && m.dataPagamento)
    .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))[0];

  // Timeline Unificada
  const buildHistoryTimeline = () => {
    const events: any[] = [];
    if (!selectedCliente) return [];

    if (selectedCliente.dataCadastro) {
      events.push({
        date: selectedCliente.dataCadastro,
        type: "CLIENT_CREATED",
        title: "Cliente Cadastrado",
        desc: `O associado titular ${selectedCliente.nomeCompleto} foi cadastrado no sistema.`,
        icon: <UsersRound size={16} color="#3185FF" />,
      });
    }

    if (selectedContrato && selectedContrato.dataInicio) {
      events.push({
        date: selectedContrato.dataInicio,
        type: "CONTRACT_CREATED",
        title: "Contrato Ativado",
        desc: `Contrato Nº ${selectedContrato.numeroContrato} vinculado ao plano ${selectedContrato.planoNome}.`,
        icon: <FileText size={16} color="#008C66" />,
      });
    }

    selectedMensalidades.forEach((m) => {
      events.push({
        date: m.dataVencimento,
        type: "MENSALIDADE_GENERATED",
        title: `Mensalidade Gerada • Ref: ${m.competencia}`,
        desc: `Fatura de ${formatCurrency(Number(m.valor))} gerada para vencimento em ${formatDate(m.dataVencimento)}.`,
        icon: <Receipt size={16} color="#F59E0B" />,
      });
      if (m.status === "PAGO" && m.dataPagamento) {
        events.push({
          date: m.dataPagamento,
          type: "MENSALIDADE_PAID",
          title: `Pagamento Liquidado • Ref: ${m.competencia}`,
          desc: `Mensalidade quitada com sucesso. Valor recebido: ${formatCurrency(Number(m.valorRecebido || m.valor))}.`,
          icon: <CheckCircle2 size={16} color="#008C66" />,
        });
      }
    });

    selectedCobrancas.forEach((c) => {
      if (c.createdAt) {
        events.push({
          date: c.createdAt.split("T")[0],
          type: "COBRANCA_GENERATED",
          title: `Cobrança Gateway (${c.gatewayMethod || "ASAAS"})`,
          desc: `Cobrança de ${formatCurrency(c.valor)} gerada. Status: ${c.gatewayStatus}.`,
          icon: <CreditCard size={16} color="#8B5CF6" />,
        });
      }
    });

    selectedAtendimentos.forEach((a) => {
      if (a.data) {
        events.push({
          date: a.data,
          type: "TICKET",
          title: `Atendimento ${a.status} (${a.tipo})`,
          desc: `Declarante: ${a.responsavel} | Local: ${a.local} | Operador: ${a.operador}.`,
          icon: <Headphones size={16} color="#EF4444" />,
        });
      }
    });

    return events.sort((a, b) => b.date.localeCompare(a.date));
  };

  const timelineHistory = buildHistoryTimeline();

  // KPIs Resumo do Atendimento Ativo
  const totalAtendimentosGerais = atendimentos.length;
  const atendimentosAbertosGerais = atendimentos.filter((a) => a.status === "Aberto").length;
  const atendimentosConcluidosGerais = atendimentos.filter((a) => a.status === "Finalizado").length;

  return (
    <div className="atendimento-root-container">
      {/* Estilos Escopados para o Módulo Atendimento */}
      <style jsx global>{`
        .atendimento-root-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .atendimento-panel-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          box-sizing: border-box;
          width: 100%;
        }

        .atendimento-search-input {
          width: 100%;
          height: 44px;
          padding: 0 16px 0 44px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 14px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: all 0.15s ease;
        }
        .atendimento-search-input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.12);
        }

        .atendimento-search-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(15, 35, 55, 0.1);
          z-index: 100;
          max-height: 280px;
          overflow-y: auto;
        }

        .atendimento-search-item {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #F1F5F9;
          transition: background-color 0.15s ease;
        }
        .atendimento-search-item:last-child {
          border-bottom: none;
        }
        .atendimento-search-item:hover {
          background-color: #F8FAFC;
        }

        .atendimento-layout-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          align-items: start;
        }

        .atendimento-profile-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          padding: 24px 20px;
          box-shadow: 0 4px 12px rgba(15, 35, 55, 0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: sticky;
          top: 76px;
        }

        .atendimento-tab-btn {
          padding: 10px 16px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border-bottom: 2.5px solid transparent;
          color: #64748B;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
          transition: all 0.18s ease;
        }
        .atendimento-tab-btn.active {
          color: #008C66;
          border-bottom-color: #008C66;
        }

        .atendimento-action-btn {
          width: 100%;
          height: 38px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s ease;
          text-decoration: none;
          box-sizing: border-box;
        }

        .atendimento-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          text-align: left;
        }
        .atendimento-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.04em;
          padding: 10px 12px;
          border-bottom: 1px solid #E2E8F0;
        }
        .atendimento-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
        }

        @media (max-width: 1024px) {
          .atendimento-layout-grid {
            grid-template-columns: 1fr;
          }
          .atendimento-profile-card {
            position: static;
          }
        }
      `}</style>

      {/* ==================================================
          1. CABEÇALHO DO MÓDULO COM BARRA DOURADA & KPIS
          ================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          minHeight: "44px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
          <div
            style={{
              width: "5px",
              height: "40px",
              backgroundColor: "#F5BD22",
              borderRadius: "3px",
              flexShrink: 0,
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 800,
                lineHeight: "26px",
                color: "#0B1536",
                letterSpacing: "-0.01em",
              }}
            >
              Central de Atendimento 360°
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "18px",
                color: "#52627B",
                fontWeight: 500,
              }}
            >
              Consulta instantânea de contratos, agregados, faturamento, histórico e abertura de tickets
            </p>
          </div>
        </div>

        {/* Indicadores Compactos do Módulo Atendimento */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <Headphones size={17} color="#008C66" />
            <span style={{ fontSize: "12px", color: "#64748B" }}>Total de Chamados:</span>
            <strong style={{ fontSize: "13px", color: "#0F172A" }}>{totalAtendimentosGerais}</strong>
          </div>

          <div
            style={{
              backgroundColor: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "10px",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Clock size={16} color="#D97706" />
            <span style={{ fontSize: "12px", color: "#92400E" }}>Abertos:</span>
            <strong style={{ fontSize: "13px", color: "#B45309" }}>{atendimentosAbertosGerais}</strong>
          </div>

          <div
            style={{
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: "10px",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <span style={{ fontSize: "12px", color: "#065F46" }}>Finalizados:</span>
            <strong style={{ fontSize: "13px", color: "#047857" }}>{atendimentosConcluidosGerais}</strong>
          </div>
        </div>
      </div>

      {/* ==================================================
          2. CAMPO DE PESQUISA RÁPIDA (AUTOCOMPLETE)
          ================================================== */}
      <div className="atendimento-panel-card" style={{ padding: "16px 20px" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "14px", top: "13px", color: "#94A3B8", display: "flex" }}>
            <Search size={18} color="#94A3B8" strokeWidth={2} />
          </span>
          <input
            type="text"
            className="atendimento-search-input"
            placeholder="Digite o Nome do Cliente, CPF, Telefone, Matrícula ou Nº do Contrato..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
              }}
              style={{
                position: "absolute",
                right: "12px",
                top: "13px",
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                display: "flex",
              }}
              title="Limpar pesquisa"
            >
              <X size={18} />
            </button>
          )}

          {searchResults.length > 0 && (
            <div className="atendimento-search-dropdown">
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectContrato(c)}
                  className="atendimento-search-item"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "13.5px" }}>
                      {c.clienteNome}
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor: c.status?.toLowerCase() === "ativo" ? "#E8F8F2" : "#FEE2E2",
                        color: c.status?.toLowerCase() === "ativo" ? "#008C66" : "#DC2626",
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                    Contrato: <strong>#{c.numeroContrato}</strong> • Plano: {c.planoNome} • Matrícula:{" "}
                    <strong>{getClienteMatricula(c.clienteId, clientes)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================
          3. ÁREA DE VISUALIZAÇÃO: ESTADO VAZIO OU DETALHES 360°
          ================================================== */}
      {!selectedContrato || !selectedCliente ? (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            background: "#FFFFFF",
            border: "1px dashed #CBD5E1",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#E8F8F2",
              color: "#008C66",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <Headphones size={28} color="#008C66" />
          </div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 750, color: "#0F172A" }}>
            Nenhum contrato selecionado para atendimento
          </h3>
          <p style={{ margin: 0, fontSize: "13.5px", color: "#64748B", maxWidth: "440px", marginInline: "auto" }}>
            Utilize a barra de pesquisa acima para localizar o associado por nome, CPF, telefone ou número de contrato e carregar sua visão completa 360°.
          </p>
        </div>
      ) : (
        <div className="atendimento-layout-grid">
          {/* COLUNA ESQUERDA: PROFILE CARD DO CLIENTE */}
          <div className="atendimento-profile-card">
            {/* Avatar Inicial */}
            <div
              style={{
                width: "74px",
                height: "74px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #008C66 0%, #005A42 100%)",
                color: "#FFFFFF",
                fontSize: "26px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 140, 102, 0.25)",
                marginBottom: "14px",
              }}
            >
              {selectedCliente.nomeCompleto.charAt(0).toUpperCase()}
            </div>

            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 800, color: "#0C1837" }}>
              {selectedCliente.nomeCompleto}
            </h3>

            {/* Badge de Status do Contrato */}
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: selectedContrato.status.toLowerCase() === "ativo" ? "#E8F8F2" : "#FEE2E2",
                color: selectedContrato.status.toLowerCase() === "ativo" ? "#008C66" : "#DC2626",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              Contrato: {selectedContrato.status}
            </span>

            {/* Detalhes Rápidos */}
            <div
              style={{
                width: "100%",
                borderTop: "1px solid #F1F5F9",
                paddingTop: "14px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12.5px",
                color: "#334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Tag size={15} color="#008C66" />
                <span>Plano: <strong>{selectedContrato.planoNome}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={15} color="#008C66" />
                <span>Contrato: <strong>#{selectedContrato.numeroContrato}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={15} color="#008C66" />
                <span>Telefone: <strong>{selectedCliente.telefone || "Não cadastrado"}</strong></span>
              </div>
            </div>

            {/* Botões de Ação Imediata */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px" }}>
              <button
                onClick={handleOpenNovoAtendimento}
                className="atendimento-action-btn"
                style={{
                  background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 2px 6px rgba(0, 140, 102, 0.25)",
                }}
              >
                <PlusCircle size={16} color="#FFFFFF" />
                <span>Novo Atendimento</span>
              </button>

              {getCleanWhatsappLink(selectedCliente.telefone) && (
                <button
                  onClick={() => window.open(getCleanWhatsappLink(selectedCliente.telefone) || "", "_blank")}
                  className="atendimento-action-btn"
                  style={{
                    backgroundColor: "#22C55E",
                    color: "#FFFFFF",
                  }}
                >
                  <MessageSquare size={16} color="#FFFFFF" />
                  <span>WhatsApp</span>
                </button>
              )}

              {selectedCliente.telefone && (
                <button
                  onClick={() => window.open(`tel:${selectedCliente.telefone}`, "_self")}
                  className="atendimento-action-btn"
                  style={{
                    backgroundColor: "#F1F5F9",
                    color: "#334155",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <Phone size={16} color="#475569" />
                  <span>Ligar para Cliente</span>
                </button>
              )}

              <Link
                href="/dashboard/clientes"
                className="atendimento-action-btn"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#0F766E",
                  border: "1px solid #CCFBF1",
                }}
              >
                <User size={16} color="#0F766E" />
                <span>Ver Ficha Cadastral</span>
              </Link>
            </div>
          </div>

          {/* COLUNA DIREITA: TABS & CONTEÚDOS DETALHADOS */}
          <div className="atendimento-panel-card" style={{ padding: "0 20px 20px 20px" }}>
            {/* Barra de Abas */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #E2E8F0",
                gap: "4px",
                overflowX: "auto",
                marginBottom: "20px",
              }}
            >
              {[
                { key: "resumo", label: "Resumo Geral", icon: <FileText size={15} /> },
                { key: "dependentes", label: `Dependentes (${selectedAgregados.length})`, icon: <UsersRound size={15} /> },
                { key: "mensalidades", label: `Mensalidades (${selectedMensalidades.length})`, icon: <Receipt size={15} /> },
                { key: "cobrancas", label: `Cobranças (${selectedCobrancas.length})`, icon: <CreditCard size={15} /> },
                { key: "recebimentos", label: "Recebimentos", icon: <DollarSign size={15} /> },
                { key: "tickets", label: `Atendimentos (${selectedAtendimentos.length})`, icon: <Headphones size={15} /> },
                { key: "historico", label: "Histórico Unificado", icon: <Clock size={15} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`atendimento-tab-btn ${activeTab === t.key ? "active" : ""}`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* ABA: RESUMO */}
            {activeTab === "resumo" && (
              <div>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                  Visão Financeira & Cadastral do Contrato
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom: "22px",
                  }}
                >
                  <div style={{ padding: "12px 14px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Mensalidades em Aberto</span>
                    <h4 style={{ margin: "4px 0 0 0", fontSize: "16px", color: openMensalidadesCount > 0 ? "#D97706" : "#0F172A" }}>
                      {openMensalidadesCount} ({formatCurrency(openMensalidadesSum)})
                    </h4>
                  </div>

                  <div style={{ padding: "12px 14px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Último Pagamento</span>
                    <h4 style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#008C66" }}>
                      {lastPayment ? formatCurrency(lastPayment.valorRecebido || lastPayment.valor) : "Nenhum"}
                    </h4>
                    {lastPayment?.dataPagamento && (
                      <span style={{ fontSize: "10.5px", color: "#64748B" }}>
                        Liquidado em {formatDate(lastPayment.dataPagamento)}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: "12px 14px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Mensalidade do Plano</span>
                    <h4 style={{ margin: "4px 0 0 0", fontSize: "16px", color: "#0F172A" }}>
                      {selectedPlano ? formatCurrency(selectedPlano.valorMensal || 0) : "—"}
                    </h4>
                  </div>

                  <div style={{ padding: "12px 14px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Situação Financeira</span>
                    <div style={{ marginTop: "6px" }}>
                      {(() => {
                        const status = getFinancialStatus(selectedContrato, selectedMensalidades);
                        return (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              backgroundColor: status.bgColor,
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 750, color: "#334155" }}>
                  Dados do Titular
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "10px",
                    fontSize: "12.5px",
                    background: "#FAFCFE",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <p style={{ margin: 0 }}><strong>CPF:</strong> {selectedCliente.cpf || "—"}</p>
                  <p style={{ margin: 0 }}><strong>Nascimento:</strong> {formatDate(selectedCliente.dataNascimento)}</p>
                  <p style={{ margin: 0 }}><strong>E-mail:</strong> {selectedCliente.email || "—"}</p>
                  <p style={{ margin: 0 }}><strong>Estado Civil:</strong> {selectedCliente.estadoCivil || "—"}</p>
                  <p style={{ margin: 0, gridColumn: "1 / -1" }}>
                    <strong>Endereço:</strong> {selectedCliente.logradouro ? `${selectedCliente.logradouro}, ${selectedCliente.numero || ""} - ${selectedCliente.bairro || ""} (${selectedCliente.cidade || ""}/${selectedCliente.estado || ""})` : "—"}
                  </p>
                </div>
              </div>
            )}

            {/* ABA: DEPENDENTES */}
            {activeTab === "dependentes" && (
              <div>
                <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                  Agregados & Dependentes Vinculados
                </h4>
                {selectedAgregados.length === 0 ? (
                  <p style={{ color: "#64748B", fontSize: "13px" }}>Nenhum dependente cadastrado para este contrato.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="atendimento-table">
                      <thead>
                        <tr>
                          <th>Nome do Dependente</th>
                          <th>CPF</th>
                          <th>Nascimento</th>
                          <th>Parentesco</th>
                          <th>Liberação / Carência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAgregados.map((a) => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 700, color: "#0F172A" }}>{a.nome}</td>
                            <td>{a.cpf || "—"}</td>
                            <td>{a.dataNascimento ? formatDate(a.dataNascimento) : "—"}</td>
                            <td>{a.parentesco || "—"}</td>
                            <td>{a.liberacao ? formatDate(a.liberacao) : "Liberado"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ABA: MENSALIDADES */}
            {activeTab === "mensalidades" && (
              <div>
                <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                  Histórico de Mensalidades Emitidas
                </h4>
                {selectedMensalidades.length === 0 ? (
                  <p style={{ color: "#64748B", fontSize: "13px" }}>Nenhuma mensalidade emitida até o momento.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedMensalidades
                      .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
                      .map((m) => {
                        const isPago = m.status === "PAGO";
                        const isAtrasado = !isPago && m.dataVencimento < todayStr;
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 14px",
                              backgroundColor: "#FFFFFF",
                              border: "1px solid #E2E8F0",
                              borderRadius: "8px",
                              borderLeft: `4px solid ${isPago ? "#008C66" : isAtrasado ? "#DC2626" : "#F59E0B"}`,
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: "13px", color: "#0F172A" }}>Competência: {m.competencia}</strong>
                              <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "12px" }}>
                                Vencimento: {formatDate(m.dataVencimento)}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                              <strong style={{ fontSize: "13.5px", color: "#0F172A" }}>{formatCurrency(Number(m.valor))}</strong>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  backgroundColor: isPago ? "#E8F8F2" : isAtrasado ? "#FEE2E2" : "#FEF3C7",
                                  color: isPago ? "#008C66" : isAtrasado ? "#DC2626" : "#D97706",
                                }}
                              >
                                {isPago ? "✓ Pago" : isAtrasado ? "⚠ Vencido" : "⏳ Em Aberto"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ABA: COBRANÇAS GATEWAY */}
            {activeTab === "cobrancas" && (
              <div>
                <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                  Cobranças Geradas via Gateway ASAAS
                </h4>
                {selectedCobrancas.length === 0 ? (
                  <p style={{ color: "#64748B", fontSize: "13px" }}>Nenhuma cobrança ASAAS registrada para este cliente.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedCobrancas.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "13px", color: "#0F172A" }}>Método: {c.gatewayMethod}</strong>
                          <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2px" }}>
                            Vencimento: {formatDate(c.vencimento)} • ID Gateway: {c.gatewayPaymentId || "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <strong style={{ fontSize: "13.5px", color: "#0F172A" }}>{formatCurrency(c.valor)}</strong>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              backgroundColor: "#F1F5F9",
                              color: "#334155",
                            }}
                          >
                            {c.gatewayStatus || "PENDENTE"}
                          </span>
                          {c.invoiceUrl && (
                            <button
                              onClick={() => window.open(c.invoiceUrl || "", "_blank")}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #CBD5E1",
                                borderRadius: "6px",
                                background: "#FFFFFF",
                                color: "#008C66",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>Fatura</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: RECEBIMENTOS */}
            {activeTab === "recebimentos" && (
              <div>
                <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                  Recebimentos e Baixas Concluídas
                </h4>
                {selectedMensalidades.filter((m) => m.status === "PAGO").length === 0 ? (
                  <p style={{ color: "#64748B", fontSize: "13px" }}>Nenhum pagamento registrado no momento.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedMensalidades
                      .filter((m) => m.status === "PAGO")
                      .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || ""))
                      .map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            backgroundColor: "#F0FDF4",
                            border: "1px solid #BBF7D0",
                            borderRadius: "8px",
                            borderLeft: "4px solid #008C66",
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: "13px", color: "#166534" }}>Competência: {m.competencia}</strong>
                            <div style={{ fontSize: "11.5px", color: "#15803D", marginTop: "2px" }}>
                              Liquidado em: {m.dataPagamento ? formatDate(m.dataPagamento) : "—"}
                            </div>
                          </div>
                          <strong style={{ fontSize: "14px", color: "#008C66" }}>
                            {formatCurrency(Number(m.valorRecebido || m.valor))}
                          </strong>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: TICKETS / ATENDIMENTOS */}
            {activeTab === "tickets" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                    Histórico de Chamados do Contrato
                  </h4>
                  <button
                    onClick={handleOpenNovoAtendimento}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#008C66",
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <PlusCircle size={15} color="#FFFFFF" />
                    <span>Abrir Chamado</span>
                  </button>
                </div>

                {selectedAtendimentos.length === 0 ? (
                  <p style={{ color: "#64748B", fontSize: "13px" }}>Nenhum atendimento registrado para este contrato.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="atendimento-table">
                      <thead>
                        <tr>
                          <th>Data / Hora</th>
                          <th>Beneficiário</th>
                          <th>Tipo</th>
                          <th>Operador</th>
                          <th>Local</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAtendimentos.map((a) => (
                          <tr key={a.id}>
                            <td>{formatDate(a.data)} {a.hora || ""}</td>
                            <td style={{ fontWeight: 700, color: "#0F172A" }}>{a.clienteNome}</td>
                            <td>{a.tipo}</td>
                            <td>{a.operador}</td>
                            <td>{a.local || "—"}</td>
                            <td>
                              <select
                                value={a.status}
                                onChange={(e) => handleStatusChange(a.id!, e.target.value)}
                                style={{
                                  padding: "3px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  borderRadius: "6px",
                                  border: "1px solid #CBD5E1",
                                  backgroundColor: a.status === "Aberto" ? "#FEF3C7" : a.status === "Finalizado" ? "#E8F8F2" : "#FEE2E2",
                                  color: a.status === "Aberto" ? "#D97706" : a.status === "Finalizado" ? "#008C66" : "#DC2626",
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
                  </div>
                )}
              </div>
            )}

            {/* ABA: HISTÓRICO UNIFICADO */}
            {activeTab === "historico" && (
              <div>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 750, color: "#0F172A" }}>
                  Linha do Tempo da Relação com o Cliente
                </h4>

                {timelineHistory.length === 0 ? (
                  <p style={{ color: "#64748B", fontSize: "13px" }}>Sem histórico disponível.</p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "18px",
                      position: "relative",
                      paddingLeft: "24px",
                      borderLeft: "2px solid #E2E8F0",
                      marginLeft: "8px",
                    }}
                  >
                    {timelineHistory.map((item, idx) => (
                      <div key={idx} style={{ position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: "-37px",
                            top: "0",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#FFFFFF",
                            border: "2px solid #CBD5E1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700 }}>
                            {formatDate(item.date)}
                          </span>
                          <h5 style={{ margin: "2px 0 3px 0", color: "#0F172A", fontSize: "13px", fontWeight: 750 }}>
                            {item.title}
                          </h5>
                          <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
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
      )}

      {/* ==================================================
          4. MODAL DE ABERTURA DE ATENDIMENTO
          ================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Abertura de Chamado de Atendimento"
      >
        <form onSubmit={handleSubmitAtendimento}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Seletor Titular ou Dependente */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 700, fontSize: "12px", color: "#334155", textTransform: "uppercase" }}>
                Beneficiário do Atendimento
              </label>
              <div style={{ display: "flex", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="tipoAtendimento"
                    value="TITULAR"
                    checked={tipoAtendimento === "TITULAR"}
                    onChange={() => handleTipoChange("TITULAR")}
                  />
                  Titular do Contrato
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="tipoAtendimento"
                    value="DEPENDENTE"
                    checked={tipoAtendimento === "DEPENDENTE"}
                    onChange={() => handleTipoChange("DEPENDENTE")}
                  />
                  Dependente / Agregado
                </label>
              </div>
            </div>

            {tipoAtendimento === "DEPENDENTE" && (
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                  Selecionar Dependente *
                </label>
                <select
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#0F172A",
                    outline: "none",
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
            )}

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                Nome do Beneficiário *
              </label>
              <input
                type="text"
                value={beneficiarioNome}
                onChange={(e) => setBeneficiarioNome(e.target.value)}
                required
                disabled={tipoAtendimento === "DEPENDENTE" && !!selectedAgregadoId}
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  color: "#0F172A",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                  Responsável / Declarante *
                </label>
                <input
                  type="text"
                  value={responsavelAtendimento}
                  onChange={(e) => setResponsavelAtendimento(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                  Telefone de Contato
                </label>
                <input
                  type="text"
                  value={telefoneContato}
                  onChange={(e) => setTelefoneContato(e.target.value)}
                  placeholder="(00) 00000-0000"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                Local do Atendimento (Hospital, Residência, IML...) *
              </label>
              <input
                type="text"
                value={localAtendimento}
                onChange={(e) => setLocalAtendimento(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  color: "#0F172A",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                  Data do Chamado *
                </label>
                <input
                  type="date"
                  value={dataAtendimento}
                  onChange={(e) => setDataAtendimento(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                  Hora do Chamado *
                </label>
                <input
                  type="time"
                  value={horaAtendimento}
                  onChange={(e) => setHoraAtendimento(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                Observações
              </label>
              <textarea
                value={observacoesAtendimento}
                onChange={(e) => setObservacoesAtendimento(e.target.value)}
                placeholder="Detalhes relevantes sobre o atendimento..."
                style={{
                  width: "100%",
                  minHeight: "70px",
                  padding: "10px 12px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#0F172A",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #E2E8F0",
            }}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: "0 16px",
                height: "38px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "0 20px",
                height: "38px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 140, 102, 0.25)",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Abrindo..." : "Registrar Atendimento"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
