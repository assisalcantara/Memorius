/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Headphones,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Zap,
  X,
  MessageSquare,
  Tag,
} from "@/components/icons/AdminIcons";
import { Modal } from "@/components/ui/Modal";

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
    department: "Comercial",
    priority: "BAIXA",
    status: "ABERTO",
    createdAt: "2026-06-07T11:40:00.000Z",
    lastActivity: "2026-06-07T11:40:00.000Z",
    description: "O botão de inclusão não respondeu na primeira tentativa ao vincular 3 dependentes.",
    messages: [
      {
        id: "m5",
        sender: "CLIENTE",
        senderName: "Usuário do Sistema",
        content: "O botão de inclusão não respondeu na primeira tentativa ao vincular 3 dependentes.",
        timestamp: "2026-06-07T11:40:00.000Z",
      },
    ],
  },
];

export function Ticket() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("legacyflow_support_tickets");
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn("Failed to load tickets:", err);
      }
    }
    return INITIAL_TICKETS;
  });

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [deptFilter, setDeptFilter] = useState<string>("TODOS");

  // Modal Novo Chamado
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState<SupportTicket["department"]>("Suporte Técnico");
  const [newPriority, setNewPriority] = useState<SupportTicket["priority"]>("MÉDIA");
  const [newMessage, setNewMessage] = useState("");

  // Campo de Resposta
  const [replyText, setReplyText] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Inicializa localStorage caso vazio
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

  // Scroll automático para a última mensagem
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
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedTicket]);

  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    localStorage.setItem("legacyflow_support_tickets", JSON.stringify(updated));
    if (selectedTicket) {
      const match = updated.find((t) => t.id === selectedTicket.id);
      setSelectedTicket(match || null);
    }
  };

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

    setNewTitle("");
    setNewDept("Suporte Técnico");
    setNewPriority("MÉDIA");
    setNewMessage("");
    setShowCreateModal(false);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const dateStr = new Date().toISOString();
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: "CLIENTE",
      senderName: "Você (Tenant)",
      content: replyText.trim(),
      timestamp: dateStr,
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          lastActivity: dateStr,
          messages: [...t.messages, newMsg],
        };
      }
      return t;
    });

    saveTickets(updatedTickets);
    setReplyText("");
  };

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

  const handleSimulateResponse = () => {
    if (!selectedTicket) return;

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

  const totalTickets = tickets.length;
  const ticketsAbertos = tickets.filter((t) => t.status === "ABERTO").length;
  const ticketsEmProgresso = tickets.filter((t) => t.status === "EM_PROGRESSO").length;
  const ticketsFechados = tickets.filter((t) => t.status === "FECHADO").length;

  return (
    <div className="suporte-root-container">
      {/* Estilos Escopados para o Módulo Suporte (Design System MEMORIUS) */}
      <style jsx global>{`
        .suporte-root-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 2rem;
        }

        /* Cabeçalho Institucional */
        .suporte-header-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          flex-wrap: wrap;
        }

        .suporte-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .suporte-gold-bar {
          width: 5px;
          height: 42px;
          border-radius: 4px;
          background: #F5BD22;
          flex-shrink: 0;
        }

        .suporte-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #E6F4F0;
          color: #008C66;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0, 140, 102, 0.08);
        }

        .suporte-title-wrap h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .suporte-title-wrap p {
          font-size: 13px;
          color: #64748B;
          margin: 2px 0 0 0;
        }

        .suporte-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: linear-gradient(135deg, #008C66 0%, #006D50 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 140, 102, 0.2);
          transition: all 0.15s ease;
        }
        .suporte-btn-primary:hover {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }

        /* Faixa de KPIs (4 Cards Responsivos) */
        .suporte-kpis-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
        }

        .suporte-kpi-card {
          background: #FFFFFF;
          border: 1px solid #E1E9EC;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(15, 35, 55, 0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .suporte-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 35, 55, 0.08);
        }

        .suporte-kpi-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .suporte-kpi-value {
          font-size: 24px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.1;
        }

        .suporte-kpi-desc {
          font-size: 11px;
          color: #94A3B8;
          margin-top: 4px;
        }

        .suporte-kpi-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Estrutura Principal de Duas Colunas */
        .suporte-workspace-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          width: 100%;
          min-height: 640px;
          height: calc(100vh - 280px);
          align-items: stretch;
        }

        /* Coluna Esquerda: Lista de Chamados e Filtros */
        .suporte-list-panel {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          height: 100%;
        }

        .suporte-search-filter-box {
          padding: 14px 16px;
          background: #F8FAFC;
          border-bottom: 1px solid #E5EAF0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .suporte-search-input-wrap {
          position: relative;
          width: 100%;
        }

        .suporte-search-input-wrap input {
          width: 100%;
          height: 38px;
          padding: 0 12px 0 34px;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          font-size: 12.5px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: all 0.15s ease;
        }
        .suporte-search-input-wrap input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.12);
        }

        .suporte-status-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #E2E8F0;
          padding: 3px;
          border-radius: 8px;
        }

        .suporte-status-tab-btn {
          flex: 1;
          padding: 6px 4px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .suporte-status-tab-btn.active {
          background: #FFFFFF;
          color: #008C66;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        .suporte-dept-select-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          color: #64748B;
        }

        .suporte-dept-select-wrap select {
          height: 32px;
          padding: 0 8px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          font-size: 11.5px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
        }

        .suporte-tickets-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .suporte-ticket-item {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #E5EAF0;
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .suporte-ticket-item:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }
        .suporte-ticket-item.selected {
          background: #F0FDF8;
          border-color: #008C66;
          box-shadow: 0 2px 8px rgba(0, 140, 102, 0.1);
        }

        .suporte-ticket-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .suporte-ticket-protocol {
          font-family: monospace;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          background: #F1F5F9;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .suporte-ticket-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
        }

        .suporte-ticket-title {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 6px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .suporte-ticket-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #64748B;
          padding-top: 6px;
          border-top: 1px solid #F1F5F9;
        }

        /* Coluna Direita: Conversa & Timeline */
        .suporte-chat-panel {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(15, 35, 55, 0.03);
          height: 100%;
        }

        .suporte-chat-header {
          padding: 16px 20px;
          background: #F8FAFC;
          border-bottom: 1px solid #E5EAF0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .suporte-chat-header-title {
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        .suporte-chat-header-meta {
          font-size: 12px;
          color: #64748B;
          margin: 2px 0 0 0;
        }

        .suporte-chat-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .suporte-btn-simulate {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          color: #008C66;
          background: #E6F4F0;
          border: 1px solid #C2E7DE;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .suporte-btn-simulate:hover {
          background: #D1EFE7;
        }

        .suporte-btn-conclude {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          color: #475569;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .suporte-btn-conclude:hover {
          background: #FEE2E2;
          color: #DC2626;
          border-color: #FECACA;
        }

        .suporte-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #FAFCFE;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .suporte-initial-desc-box {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          margin-bottom: 6px;
        }

        .suporte-desc-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #008C66;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .suporte-desc-text {
          font-size: 13px;
          color: #334155;
          line-height: 1.5;
          white-space: pre-wrap;
          margin: 0;
        }

        .suporte-msg-row {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .suporte-msg-row.client {
          align-items: flex-end;
        }
        .suporte-msg-row.support {
          align-items: flex-start;
        }

        .suporte-msg-sender {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748B;
          margin-bottom: 4px;
          padding: 0 4px;
        }

        .suporte-msg-bubble {
          max-width: 75%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.5;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .suporte-msg-bubble.client {
          background: linear-gradient(135deg, #008C66 0%, #006D50 100%);
          color: #FFFFFF;
          border-top-right-radius: 4px;
        }
        .suporte-msg-bubble.support {
          background: #FFFFFF;
          color: #0F172A;
          border: 1px solid #E2E8F0;
          border-top-left-radius: 4px;
        }

        .suporte-msg-time {
          font-size: 10px;
          color: #94A3B8;
          margin-top: 4px;
          padding: 0 4px;
          font-family: monospace;
        }

        .suporte-reply-form {
          padding: 12px 16px;
          background: #FFFFFF;
          border-top: 1px solid #E5EAF0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .suporte-reply-input {
          flex: 1;
          height: 42px;
          padding: 0 14px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 13px;
          color: #0F172A;
          background: #F8FAFC;
          outline: none;
          transition: all 0.15s ease;
        }
        .suporte-reply-input:focus {
          border-color: #008C66;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.12);
        }

        .suporte-btn-send {
          height: 42px;
          padding: 0 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: linear-gradient(135deg, #008C66 0%, #006D50 100%);
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .suporte-btn-send:hover {
          filter: brightness(1.06);
        }
        .suporte-btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .suporte-closed-banner {
          padding: 14px 20px;
          background: #F0FDF4;
          border-top: 1px solid #BBF7D0;
          text-align: center;
          font-size: 12.5px;
          font-weight: 700;
          color: #166534;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* Responsividade para Tablet e Mobile */
        @media (max-width: 1024px) {
          .suporte-kpis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .suporte-workspace-grid {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 0;
          }
          .suporte-list-panel {
            max-height: 420px;
          }
          .suporte-chat-panel {
            min-height: 520px;
          }
        }

        @media (max-width: 640px) {
          .suporte-kpis-grid {
            grid-template-columns: 1fr;
          }
          .suporte-header-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .suporte-msg-bubble {
            max-width: 90%;
          }
        }
      `}</style>

      {/* CABEÇALHO DO MÓDULO COM BARRA DOURADA MEMORIUS */}
      <div className="suporte-header-card">
        <div className="suporte-header-left">
          <div className="suporte-gold-bar" />
          <div className="suporte-icon-box">
            <Headphones size={22} strokeWidth={2.2} />
          </div>
          <div className="suporte-title-wrap">
            <h1>Central de Suporte & Chamados</h1>
            <p>Abertura de chamados, suporte técnico, dúvidas operacionais e acompanhamento em tempo real.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="suporte-btn-primary"
        >
          <PlusCircle size={16} strokeWidth={2.2} />
          <span>Novo Chamado</span>
        </button>
      </div>

      {/* FAIXA DE KPIS (4 CARDS RESPONSIVOS) */}
      <div className="suporte-kpis-grid">
        {/* KPI 1: Total */}
        <div className="suporte-kpi-card">
          <div>
            <div className="suporte-kpi-label">Total de Chamados</div>
            <div className="suporte-kpi-value">{totalTickets}</div>
            <div className="suporte-kpi-desc">Histórico completo</div>
          </div>
          <div className="suporte-kpi-icon-box" style={{ background: "#E6F4F0", color: "#008C66" }}>
            <Headphones size={22} strokeWidth={2.2} />
          </div>
        </div>

        {/* KPI 2: Abertos */}
        <div className="suporte-kpi-card">
          <div>
            <div className="suporte-kpi-label">Aguardando Resposta</div>
            <div className="suporte-kpi-value" style={{ color: "#D97706" }}>{ticketsAbertos}</div>
            <div className="suporte-kpi-desc">Fila inicial de atendimento</div>
          </div>
          <div className="suporte-kpi-icon-box" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <Clock size={22} strokeWidth={2.2} />
          </div>
        </div>

        {/* KPI 3: Em Atendimento */}
        <div className="suporte-kpi-card">
          <div>
            <div className="suporte-kpi-label">Em Atendimento</div>
            <div className="suporte-kpi-value" style={{ color: "#2563EB" }}>{ticketsEmProgresso}</div>
            <div className="suporte-kpi-desc">Em tratativa com a equipe</div>
          </div>
          <div className="suporte-kpi-icon-box" style={{ background: "#DBEAFE", color: "#2563EB" }}>
            <MessageSquare size={22} strokeWidth={2.2} />
          </div>
        </div>

        {/* KPI 4: Concluídos */}
        <div className="suporte-kpi-card">
          <div>
            <div className="suporte-kpi-label">Resolvidos / Fechados</div>
            <div className="suporte-kpi-value" style={{ color: "#008C66" }}>{ticketsFechados}</div>
            <div className="suporte-kpi-desc">
              {totalTickets > 0 ? `${Math.round((ticketsFechados / totalTickets) * 100)}% de resolução` : "0% de resolução"}
            </div>
          </div>
          <div className="suporte-kpi-icon-box" style={{ background: "#DCFCE7", color: "#16A34A" }}>
            <CheckCircle2 size={22} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* ÁREA DE TRABALHO EM DUAS COLUNAS (LISTAGEM + CHAT) */}
      <div className="suporte-workspace-grid">
        {/* COLUNA ESQUERDA: LISTAGEM DE CHAMADOS E FILTROS */}
        <div className="suporte-list-panel">
          <div className="suporte-search-filter-box">
            <div className="suporte-search-input-wrap">
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94A3B8",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Buscar por protocolo ou assunto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="suporte-status-tabs">
              {(["TODOS", "ABERTO", "EM_PROGRESSO", "FECHADO"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`suporte-status-tab-btn ${statusFilter === st ? "active" : ""}`}
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

            <div className="suporte-dept-select-wrap">
              <span>Filtrar Setor:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="TODOS">Todos os Setores</option>
                <option value="Suporte Técnico">Suporte Técnico</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Comercial">Comercial</option>
                <option value="Dúvidas Gerais">Dúvidas Gerais</option>
              </select>
            </div>
          </div>

          <div className="suporte-tickets-scroll">
            {filtered.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8" }}>
                <Headphones size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", margin: 0 }}>
                  Nenhum chamado encontrado
                </p>
                <p style={{ fontSize: "11px", color: "#94A3B8", margin: "4px 0 0 0" }}>
                  Ajuste seus filtros ou crie uma nova solicitação.
                </p>
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const isAberto = t.status === "ABERTO";
                const isProgresso = t.status === "EM_PROGRESSO";

                const badgeBg = isAberto ? "#FEF3C7" : isProgresso ? "#DBEAFE" : "#DCFCE7";
                const badgeColor = isAberto ? "#B45309" : isProgresso ? "#1D4ED8" : "#15803D";
                const badgeDot = isAberto ? "#F59E0B" : isProgresso ? "#3B82F6" : "#22C55E";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`suporte-ticket-item ${isSelected ? "selected" : ""}`}
                  >
                    <div className="suporte-ticket-header">
                      <span className="suporte-ticket-protocol">{t.protocol}</span>
                      <span
                        className="suporte-ticket-badge"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: badgeDot,
                          }}
                        />
                        {isAberto ? "Aberto" : isProgresso ? "Em Processo" : "Concluído"}
                      </span>
                    </div>

                    <h4 className="suporte-ticket-title">{t.title}</h4>

                    <div className="suporte-ticket-footer">
                      <span>📁 {t.department}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            t.priority === "ALTA"
                              ? "#FEE2E2"
                              : t.priority === "MÉDIA"
                              ? "#FEF3C7"
                              : "#F1F5F9",
                          color:
                            t.priority === "ALTA"
                              ? "#B91C1C"
                              : t.priority === "MÉDIA"
                              ? "#B45309"
                              : "#475569",
                        }}
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

        {/* COLUNA DIREITA: CONVERSA, LINHA DO TEMPO E RESPOSTA */}
        <div className="suporte-chat-panel">
          {selectedTicket ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Cabeçalho do Ticket Selecionado */}
              <div className="suporte-chat-header">
                <div>
                  <h3 className="suporte-chat-header-title">
                    {selectedTicket.title}{" "}
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                      ({selectedTicket.protocol})
                    </span>
                  </h3>
                  <p className="suporte-chat-header-meta">
                    Aberto em {new Date(selectedTicket.createdAt).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(selectedTicket.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • Setor: <strong>{selectedTicket.department}</strong>
                  </p>
                </div>

                <div className="suporte-chat-actions">
                  {selectedTicket.status !== "FECHADO" && (
                    <>
                      <button
                        type="button"
                        onClick={handleSimulateResponse}
                        className="suporte-btn-simulate"
                        title="Simular resposta automática da central"
                      >
                        <Zap size={13} />
                        <span>Simular Resposta</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseTicket}
                        className="suporte-btn-conclude"
                        title="Finalizar e concluir chamado"
                      >
                        <CheckCircle2 size={13} />
                        <span>Concluir Chamado</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Linha do Tempo e Mensagens */}
              <div className="suporte-messages-container">
                {/* Descrição Inicial */}
                <div className="suporte-initial-desc-box">
                  <div className="suporte-desc-title">
                    <Tag size={13} />
                    <span>Descrição da Solicitação:</span>
                  </div>
                  <p className="suporte-desc-text">{selectedTicket.description}</p>
                </div>

                {/* Histórico das Mensagens */}
                {selectedTicket.messages.map((m) => {
                  const isClient = m.sender === "CLIENTE";
                  return (
                    <div
                      key={m.id}
                      className={`suporte-msg-row ${isClient ? "client" : "support"}`}
                    >
                      <span className="suporte-msg-sender">
                        {isClient ? "Você (Tenant)" : m.senderName}
                      </span>
                      <div className={`suporte-msg-bubble ${isClient ? "client" : "support"}`}>
                        {m.content}
                      </div>
                      <span className="suporte-msg-time">
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

              {/* Formulário de Resposta ou Banner Concluído */}
              {selectedTicket.status !== "FECHADO" ? (
                <form onSubmit={handleSendReply} className="suporte-reply-form">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Digite sua resposta ou esclarecimento..."
                    className="suporte-reply-input"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="suporte-btn-send"
                  >
                    <Send size={14} />
                    <span>Enviar</span>
                  </button>
                </form>
              ) : (
                <div className="suporte-closed-banner">
                  <CheckCircle2 size={16} />
                  <span>Este chamado foi finalizado e concluído pela equipe de atendimento.</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px", textAlign: "center", color: "#94A3B8" }}>
              <Headphones size={44} style={{ opacity: 0.35, marginBottom: "12px", color: "#008C66" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#334155", margin: 0 }}>
                Selecione um chamado da lista ao lado
              </h3>
              <p style={{ fontSize: "12px", color: "#64748B", maxWidth: "300px", margin: "6px 0 0 0" }}>
                Acompanhe o histórico de mensagens ou clique em &quot;Novo Chamado&quot; para abrir um chamado com a central.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL INSTITUCIONAL: NOVO CHAMADO */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Abrir Novo Chamado de Suporte"
      >
        <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Assunto / Título da Solicitação *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Dúvida sobre conciliação PIX..."
              style={{
                width: "100%",
                height: "38px",
                padding: "0 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                color: "#0F172A",
                outline: "none",
              }}
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Departamento / Setor *
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value as any)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  color: "#0F172A",
                  backgroundColor: "#FFFFFF",
                  outline: "none",
                }}
              >
                <option value="Suporte Técnico">Suporte Técnico</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Comercial">Comercial</option>
                <option value="Dúvidas Gerais">Dúvidas Gerais</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Prioridade *
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  color: "#0F172A",
                  backgroundColor: "#FFFFFF",
                  outline: "none",
                }}
              >
                <option value="BAIXA">BAIXA</option>
                <option value="MÉDIA">MÉDIA</option>
                <option value="ALTA">ALTA</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Descrição Detalhada do Problema ou Dúvida *
            </label>
            <textarea
              required
              rows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Descreva detalhadamente a situação para agilizar o atendimento..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                color: "#0F172A",
                outline: "none",
                resize: "vertical",
                minHeight: "90px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid #F1F5F9" }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#F1F5F9",
                color: "#475569",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #008C66 0%, #006D50 100%)",
                color: "#FFFFFF",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 140, 102, 0.2)",
              }}
            >
              Abrir Chamado
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
