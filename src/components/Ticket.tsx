/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Headphones,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Zap,
  X,
  MessageSquare,
  Tag,
  User,
} from "@/components/icons/AdminIcons";

export interface Message {
  id: string;
  sender: "CLIENTE" | "SUPORTE";
  senderName: string;
  content: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  protocol: string;
  title: string;
  department: "Suporte Técnico" | "Financeiro" | "Comercial" | "Dúvidas Gerais";
  priority: "BAIXA" | "MÉDIA" | "ALTA";
  status: "ABERTO" | "EM_PROGRESSO" | "FECHADO";
  createdAt: string;
  lastActivity: string;
  description: string;
  messages: Message[];
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "1",
    protocol: "TK-2026-0001",
    title: "Instabilidade no sistema de mensalidades",
    department: "Suporte Técnico",
    priority: "ALTA",
    status: "EM_PROGRESSO",
    createdAt: "2026-06-08T10:00:00.000Z",
    lastActivity: "2026-06-08T14:30:00.000Z",
    description: "Estamos enfrentando lentidão ao tentar gerar as mensalidades da competência de junho.",
    messages: [
      {
        id: "m1",
        sender: "CLIENTE",
        senderName: "Usuário do Sistema",
        content: "Estamos enfrentando lentidão ao tentar gerar as mensalidades da competência de junho.",
        timestamp: "2026-06-08T10:00:00.000Z",
      },
      {
        id: "m2",
        sender: "SUPORTE",
        senderName: "Suporte Técnico (Memorius)",
        content: "Olá! Nossa equipe de infraestrutura já identificou uma sobrecarga momentânea e está trabalhando na otimização. O serviço deve voltar à velocidade normal em alguns minutos.",
        timestamp: "2026-06-08T14:30:00.000Z",
      },
    ],
  },
  {
    id: "2",
    protocol: "TK-2026-0002",
    title: "Dúvida sobre reajuste anual de planos",
    department: "Financeiro",
    priority: "MÉDIA",
    status: "FECHADO",
    createdAt: "2026-06-05T09:15:00.000Z",
    lastActivity: "2026-06-05T16:00:00.000Z",
    description: "Gostaria de saber qual o índice utilizado para o reajuste anual das mensalidades dos planos SaaS.",
    messages: [
      {
        id: "m3",
        sender: "CLIENTE",
        senderName: "Usuário do Sistema",
        content: "Gostaria de saber qual o índice utilizado para o reajuste anual das mensalidades dos planos SaaS.",
        timestamp: "2026-06-05T09:15:00.000Z",
      },
      {
        id: "m4",
        sender: "SUPORTE",
        senderName: "Atendimento Financeiro",
        content: "Olá! O reajuste anual é calculado com base no IGPM acumulado dos últimos 12 meses, conforme consta na cláusula 4.2 do contrato de prestação de serviços.",
        timestamp: "2026-06-05T16:00:00.000Z",
      },
    ],
  },
  {
    id: "3",
    protocol: "TK-2026-0003",
    title: "Dificuldade ao cadastrar novos agregados",
    department: "Suporte Técnico",
    priority: "BAIXA",
    status: "ABERTO",
    createdAt: "2026-06-08T20:10:00.000Z",
    lastActivity: "2026-06-08T20:10:00.000Z",
    description: "Estou tentando cadastrar um novo dependente/agregado mas o sistema apresenta erro de validação de CPF inválido, mesmo o CPF estando correto.",
    messages: [
      {
        id: "m5",
        sender: "CLIENTE",
        senderName: "Usuário do Sistema",
        content: "Estou tentando cadastrar um novo dependente/agregado mas o sistema apresenta erro de validação de CPF inválido, mesmo o CPF estando correto.",
        timestamp: "2026-06-08T20:10:00.000Z",
      },
    ],
  },
];

export function Ticket() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("legacyflow_support_tickets");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return INITIAL_TICKETS;
        }
      }
    }
    return INITIAL_TICKETS;
  });

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ABERTO" | "EM_PROGRESSO" | "FECHADO">("TODOS");
  const [deptFilter, setDeptFilter] = useState<string>("TODOS");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState<SupportTicket["department"]>("Suporte Técnico");
  const [newPriority, setNewPriority] = useState<SupportTicket["priority"]>("MÉDIA");
  const [newMessage, setNewMessage] = useState("");

  // Reply Message Field
  const [replyText, setReplyText] = useState("");

  // Set initial localStorage if not set
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("legacyflow_support_tickets");
      if (!saved) {
        localStorage.setItem("legacyflow_support_tickets", JSON.stringify(INITIAL_TICKETS));
      }
    }
  }, []);

  // Seleciona automaticamente o primeiro ticket se nenhum estiver selecionado
  useEffect(() => {
    if (!selectedTicket && tickets.length > 0) {
      setSelectedTicket(tickets[0]);
    }
  }, [tickets, selectedTicket]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages]);

  // Sincronização entre abas/janelas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "legacyflow_support_tickets" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setTickets(parsed);
          if (selectedTicket) {
            const match = parsed.find((t: SupportTicket) => t.id === selectedTicket.id);
            setSelectedTicket(match || null);
          }
        } catch {
          // ignore parsing issues
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedTicket]);

  // Save helper
  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    localStorage.setItem("legacyflow_support_tickets", JSON.stringify(updated));
    if (selectedTicket) {
      const match = updated.find((t) => t.id === selectedTicket.id);
      setSelectedTicket(match || null);
    }
  };

  // Create Ticket handler
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const protocolNum = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString();

    const newTicket: SupportTicket = {
      id: Date.now().toString(),
      protocol: `TK-2026-${protocolNum}`,
      title: newTitle.trim(),
      department: newDept,
      priority: newPriority,
      status: "ABERTO",
      createdAt: dateStr,
      lastActivity: dateStr,
      description: newMessage.trim(),
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: "CLIENTE",
          senderName: "Usuário do Sistema",
          content: newMessage.trim(),
          timestamp: dateStr,
        },
      ],
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);
    setSelectedTicket(newTicket);

    // Reset fields
    setNewTitle("");
    setNewDept("Suporte Técnico");
    setNewPriority("MÉDIA");
    setNewMessage("");
    setShowCreateModal(false);
  };

  // Reply handler
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const dateStr = new Date().toISOString();
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: "CLIENTE",
      senderName: "Usuário do Sistema",
      content: replyText.trim(),
      timestamp: dateStr,
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: "ABERTO" as const,
          lastActivity: dateStr,
          messages: [...t.messages, newMsg],
        };
      }
      return t;
    });

    saveTickets(updatedTickets);
    setReplyText("");
  };

  // Close Ticket handler
  const handleCloseTicket = () => {
    if (!selectedTicket) return;
    const dateStr = new Date().toISOString();

    const updatedTickets = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: "FECHADO" as const,
          lastActivity: dateStr,
        };
      }
      return t;
    });

    saveTickets(updatedTickets);
  };

  // Simulação de Resposta do Suporte (UX interativa)
  const handleSimulateResponse = () => {
    if (!selectedTicket || selectedTicket.status === "FECHADO") return;
    const dateStr = new Date().toISOString();

    const supportAnswers = [
      "Olá! Agradecemos o contato. Estamos verificando sua solicitação no sistema.",
      "Perfeito, compreendi o cenário. Já direcionei para a nossa equipe técnica analisar com prioridade.",
      "Identificamos a origem do problema. Poderia testar novamente e nos dizer se foi resolvido?",
      "Nossos servidores passaram por uma atualização de segurança, mas agora a operação já está 100% normalizada.",
      "Olá! Suas mensalidades foram recalculadas e já constam atualizadas na aba Financeiro.",
    ];

    const randomAnswer = supportAnswers[Math.floor(Math.random() * supportAnswers.length)];

    const newMsg: Message = {
      id: `m-support-${Date.now()}`,
      sender: "SUPORTE",
      senderName: "Suporte Técnico Memorius",
      content: randomAnswer,
      timestamp: dateStr,
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: "EM_PROGRESSO" as const,
          lastActivity: dateStr,
          messages: [...t.messages, newMsg],
        };
      }
      return t;
    });

    saveTickets(updatedTickets);
  };

  // Filtros
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.protocol.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "TODOS" || t.status === statusFilter;
      const matchesDept = deptFilter === "TODOS" || t.department === deptFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [tickets, search, statusFilter, deptFilter]);

  // Indicadores de KPIs
  const totalTickets = tickets.length;
  const ticketsAbertos = tickets.filter((t) => t.status === "ABERTO").length;
  const ticketsEmProgresso = tickets.filter((t) => t.status === "EM_PROGRESSO").length;
  const ticketsFechados = tickets.filter((t) => t.status === "FECHADO").length;

  return (
    <div className="space-y-6 pb-6">
      {/* Cabeçalho do Módulo com Barra Dourada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#F5BD22] rounded-full flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <Headphones className="text-[#008C66]" size={26} strokeWidth={2.2} />
              Central de Suporte & Chamados
            </h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">
              Abertura de chamados, suporte técnico, dúvidas operacionais e acompanhamento em tempo real
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008C66]/30 cursor-pointer"
        >
          <PlusCircle size={18} strokeWidth={2.2} />
          <span>Novo Chamado</span>
        </button>
      </div>

      {/* Faixa de KPIs (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total de Chamados
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#008C66]">
              <Headphones size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{totalTickets}</span>
            <span className="text-xs text-[#64748B]">tickets</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Histórico completo de solicitações</p>
        </div>

        {/* KPI 2: Abertos */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Aguardando Resposta
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{ticketsAbertos}</span>
            <span className="text-xs text-amber-700 font-medium">pendentes</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Aguardando atendimento inicial</p>
        </div>

        {/* KPI 3: Em Progresso */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Em Atendimento
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <MessageSquare size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{ticketsEmProgresso}</span>
            <span className="text-xs text-blue-700 font-medium">em análise</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Chamados em tratativa com suporte</p>
        </div>

        {/* KPI 4: Concluídos */}
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 md:p-5 shadow-sm hover:border-[#008C66]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Resolvidos / Fechados
            </span>
            <div className="p-2 bg-green-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{ticketsFechados}</span>
            <span className="text-xs text-emerald-700 font-medium">
              {totalTickets > 0 ? `${Math.round((ticketsFechados / totalTickets) * 100)}%` : "0%"} taxa
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">Demandas finalizadas</p>
        </div>
      </div>

      {/* Painel Principal de Suporte: Grid Lista + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-320px)] min-h-[580px]">
        {/* Coluna Esquerda: Listagem de Chamados com Busca e Filtros */}
        <div className="lg:col-span-4 xl:col-span-5 bg-white rounded-xl border border-[#E5EAF0] shadow-sm flex flex-col overflow-hidden">
          {/* Barra de Filtros e Busca */}
          <div className="p-4 border-b border-[#E5EAF0] space-y-3 bg-[#F8FAFC]">
            {/* Input de Busca */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por protocolo, título ou assunto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
              />
            </div>

            {/* Pílulas de Filtro por Status */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(["TODOS", "ABERTO", "EM_PROGRESSO", "FECHADO"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-md transition-all text-center ${
                    statusFilter === st
                      ? "bg-white text-[#008C66] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st === "TODOS"
                    ? "Todos"
                    : st === "ABERTO"
                    ? "Abertos"
                    : st === "EM_PROGRESSO"
                    ? "Em Fila"
                    : "Fechados"}
                </button>
              ))}
            </div>

            {/* Seletor de Departamento */}
            <div className="flex items-center justify-between text-xs text-[#64748B] pt-0.5">
              <span className="font-medium text-[11px]">Setor:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-[#0F172A] focus:outline-none focus:border-[#008C66]"
              >
                <option value="TODOS">Todos os Setores</option>
                <option value="Suporte Técnico">Suporte Técnico</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Comercial">Comercial</option>
                <option value="Dúvidas Gerais">Dúvidas Gerais</option>
              </select>
            </div>
          </div>

          {/* Lista de Chamados Scrollável */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Headphones size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-600">Nenhum chamado encontrado</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ajuste seus filtros ou abra um novo ticket.
                </p>
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const isAberto = t.status === "ABERTO";
                const isProgresso = t.status === "EM_PROGRESSO";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-emerald-50/70 border-[#008C66] shadow-xs"
                        : "bg-white border-[#E5EAF0] hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {t.protocol}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isAberto
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : isProgresso
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAberto
                              ? "bg-amber-500"
                              : isProgresso
                              ? "bg-blue-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {isAberto ? "Aberto" : isProgresso ? "Em Processo" : "Concluído"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#0F172A] line-clamp-1 mb-1">
                      {t.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>📁 {t.department}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                          t.priority === "ALTA"
                            ? "bg-rose-50 text-rose-700"
                            : t.priority === "MÉDIA"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Detalhes do Chamado & Conversa em Linha do Tempo */}
        <div className="lg:col-span-8 xl:col-span-7 bg-white rounded-xl border border-[#E5EAF0] shadow-sm flex flex-col overflow-hidden">
          {selectedTicket ? (
            <div className="flex flex-col h-full">
              {/* Cabeçalho do Ticket Selecionado */}
              <div className="p-4 md:p-5 border-b border-[#E5EAF0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                      {selectedTicket.title}
                    </h3>
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      ({selectedTicket.protocol})
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Aberto em {new Date(selectedTicket.createdAt).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(selectedTicket.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • Setor: <strong>{selectedTicket.department}</strong>
                  </p>
                </div>

                {/* Ações Rápidas no Cabeçalho */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTicket.status !== "FECHADO" && (
                    <>
                      <button
                        onClick={handleSimulateResponse}
                        title="Simular resposta da equipe técnica Memorius"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-[#008C66] border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <Zap size={14} />
                        <span>Simular Resposta</span>
                      </button>

                      <button
                        onClick={handleCloseTicket}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 transition-all"
                      >
                        <CheckCircle2 size={14} />
                        <span>Concluir Chamado</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Mensagens / Histórico da Conversa */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#F8FAFC]/50">
                {/* Descrição Inicial */}
                <div className="max-w-2xl mx-auto p-4 bg-white border border-[#E5EAF0] rounded-xl shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#008C66]">
                    <Tag size={14} />
                    <span>Descrição Original da Demanda:</span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Mensagens Trocadas */}
                <div className="space-y-3 pt-2">
                  {selectedTicket.messages.map((m) => {
                    const isClient = m.sender === "CLIENTE";

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${
                          isClient ? "items-end" : "items-start"
                        }`}
                      >
                        <span className="text-[10px] font-semibold text-slate-500 mb-1 px-1">
                          {isClient ? "Você (Tenant)" : m.senderName}
                        </span>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-2xs ${
                            isClient
                              ? "bg-gradient-to-r from-[#008C66] to-[#006D50] text-white rounded-tr-none"
                              : "bg-white text-slate-800 border border-[#E5EAF0] rounded-tl-none"
                          }`}
                        >
                          {m.content}
                        </div>

                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Campo de Resposta ou Aviso de Fechado */}
              {selectedTicket.status !== "FECHADO" ? (
                <form
                  onSubmit={handleSendReply}
                  className="p-3 md:p-4 bg-white border-t border-[#E5EAF0] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Digite sua resposta ou esclarecimento..."
                    className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs md:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#008C66] focus:bg-white focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Send size={15} />
                    <span>Enviar</span>
                  </button>
                </form>
              ) : (
                <div className="p-3.5 bg-emerald-50 border-t border-emerald-200 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Este chamado foi finalizado e concluído pela equipe.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
              <Headphones size={44} className="opacity-40 mb-3 text-[#008C66]" />
              <h3 className="text-base font-bold text-slate-700">Selecione um chamado da lista</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Acompanhe o andamento das solicitações ou clique no botão acima para abrir um novo ticket.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Abertura de Novo Chamado */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5EAF0] max-w-lg w-full p-6 relative">
            {/* Fechar */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-[#008C66]">
                <Headphones size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Abrir Novo Chamado de Suporte</h3>
                <p className="text-xs text-slate-500">
                  Descreva sua solicitação e nossa equipe técnica retornará em breve.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Título / Assunto da Solicitação <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lentidão ao emitir contratos ou boletos"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Departamento
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value as SupportTicket["department"])}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
                  >
                    <option value="Suporte Técnico">Suporte Técnico</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Dúvidas Gerais">Dúvidas Gerais</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Prioridade
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as SupportTicket["priority"])}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#008C66]"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MÉDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Mensagem Detalhada <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva detalhadamente o cenário, mensagens de erro e etapas para reproduzir..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#008C66] focus:ring-2 focus:ring-[#008C66]/15 transition-all"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#008C66] to-[#006D50] hover:brightness-105 active:scale-[0.98] rounded-lg shadow-sm transition-all"
                >
                  <PlusCircle size={16} />
                  <span>Registrar Chamado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
