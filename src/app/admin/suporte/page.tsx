"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageTitle } from "@/components/ui/PageTitle";

interface Message {
  id: string;
  sender: "CLIENTE" | "SUPORTE";
  senderName: string;
  content: string;
  timestamp: string;
}

interface SupportTicket {
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

const DEFAULT_INITIAL_TICKETS: SupportTicket[] = [
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
      }
    ]
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
      }
    ]
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
      }
    ]
  }
];

export default function AdminSuportePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ABERTO" | "EM_PROGRESSO" | "FECHADO">("TODOS");
  const [replyText, setReplyText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load tickets from localstorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("legacyflow_support_tickets");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTickets(parsed);
        } catch {
          setTickets(DEFAULT_INITIAL_TICKETS);
        }
      } else {
        localStorage.setItem("legacyflow_support_tickets", JSON.stringify(DEFAULT_INITIAL_TICKETS));
        setTickets(DEFAULT_INITIAL_TICKETS);
      }
    }
  }, []);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages]);

  // Synchronize changes across multiple tabs/windows in real-time
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

  // Save updated tickets back to localstorage and state
  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    localStorage.setItem("legacyflow_support_tickets", JSON.stringify(updated));
    if (selectedTicket) {
      const match = updated.find(t => t.id === selectedTicket.id);
      setSelectedTicket(match || null);
    }
  };

  // Reply handler
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const dateStr = new Date().toISOString();
    const newMsg: Message = {
      id: `m-support-admin-${Date.now()}`,
      sender: "SUPORTE",
      senderName: "Suporte Técnico (LegacyFlow)",
      content: replyText,
      timestamp: dateStr,
    };

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: "EM_PROGRESSO" as const,
          lastActivity: dateStr,
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    });

    saveTickets(updatedTickets);
    setReplyText("");
  };

  // Status alteration handler
  const handleUpdateStatus = (status: SupportTicket["status"]) => {
    if (!selectedTicket) return;
    const dateStr = new Date().toISOString();

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status,
          lastActivity: dateStr,
        };
      }
      return t;
    });

    saveTickets(updatedTickets);
  };

  // Delete/Archive handler
  const handleDeleteTicket = () => {
    if (!selectedTicket) return;
    if (confirm("Tem certeza que deseja arquivar/excluir este chamado?")) {
      const updatedTickets = tickets.filter(t => t.id !== selectedTicket.id);
      saveTickets(updatedTickets);
      setSelectedTicket(null);
    }
  };

  // Filters
  const filtered = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.protocol.toLowerCase().includes(search.toLowerCase()) ||
                          t.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "TODOS" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeStyles = (status: SupportTicket["status"]) => {
    switch (status) {
      case "ABERTO":
        return { backgroundColor: "#fff7ed", color: "#ea580c", border: "1px solid #ffedd5" };
      case "EM_PROGRESSO":
        return { backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe" };
      case "FECHADO":
        return { backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #dcfce7" };
    }
  };

  const getPriorityBadgeStyles = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "ALTA":
        return { backgroundColor: "#fee2e2", color: "#dc2626" };
      case "MÉDIA":
        return { backgroundColor: "#fef3c7", color: "#d97706" };
      case "BAIXA":
        return { backgroundColor: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle title="Central de Atendimento ao Cliente" icon="🎫" />
      
      <p style={{ marginTop: "-1rem", marginBottom: "1.5rem", fontSize: "0.9rem", color: "#64748b" }}>
        Gerencie e responda os chamados de suporte técnico, financeiro ou comercial abertos pelos tenants.
      </p>

      {/* Main Grid Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.5rem", height: "calc(100vh - 220px)", minHeight: "600px" }}>
        
        {/* Left Side: Tickets List */}
        <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          
          {/* Search and Filters */}
          <div style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <input
              type="text"
              placeholder="Buscar por protocolo, título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
            
            <div style={{ display: "flex", gap: "0.25rem", background: "#f8fafc", padding: "0.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {(["TODOS", "ABERTO", "EM_PROGRESSO", "FECHADO"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    flex: 1,
                    padding: "0.4rem",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    backgroundColor: statusFilter === status ? "#0b4f59" : "transparent",
                    color: statusFilter === status ? "white" : "#64748b",
                    transition: "all 0.15s"
                  }}
                >
                  {status === "TODOS" ? "Todos" : status === "EM_PROGRESSO" ? "Em Fila" : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets items scrollable list */}
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontStyle: "italic", fontSize: "0.9rem" }}>
                Nenhum chamado pendente nesta categoria.
              </div>
            ) : (
              filtered.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid #0b4f59" : "1px solid #e2e8f0",
                      backgroundColor: isSelected ? "#eff6ff" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>
                        {t.protocol}
                      </span>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                        ...getStatusBadgeStyles(t.status)
                      }}>
                        {t.status === "EM_PROGRESSO" ? "ATENDIMENTO" : t.status}
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.title}
                    </h4>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        📁 {t.department}
                      </span>
                      <span style={{
                        padding: "1px 5px",
                        borderRadius: "3px",
                        fontWeight: "bold",
                        fontSize: "0.7rem",
                        ...getPriorityBadgeStyles(t.priority)
                      }}>
                        {t.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat / Ticket Management Details */}
        <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {selectedTicket ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              
              {/* Header Info Panel */}
              <div style={{ padding: "1.2rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>{selectedTicket.title}</h3>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>({selectedTicket.protocol})</span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    Criado em: {new Date(selectedTicket.createdAt).toLocaleDateString("pt-BR")} às {new Date(selectedTicket.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} | Última atividade: {new Date(selectedTicket.lastActivity).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {/* Dropdown status selector */}
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as SupportTicket["status"])}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      backgroundColor: "white",
                      cursor: "pointer"
                    }}
                  >
                    <option value="ABERTO">Status: Aberto</option>
                    <option value="EM_PROGRESSO">Status: Atendimento</option>
                    <option value="FECHADO">Status: Fechado</option>
                  </select>

                  <button
                    onClick={handleDeleteTicket}
                    style={{
                      padding: "0.4rem 0.8rem",
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                    title="Excluir ou Arquivar Ticket"
                  >
                    🗑️ Arquivar
                  </button>
                </div>
              </div>

              {/* Chat timeline messages list */}
              <div style={{ flexGrow: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem", backgroundColor: "#f1f5f9" }}>
                
                {/* Description Box */}
                <div style={{ alignSelf: "center", width: "100%", maxWidth: "800px", padding: "1.2rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.9rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                    <strong style={{ color: "#0b4f59" }}>Descrição Inicial do Problema:</strong>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>📁 Setor: {selectedTicket.department}</span>
                  </div>
                  <div style={{ color: "#334155", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Separator timeline */}
                <div style={{ textAlign: "center", position: "relative", margin: "0.5rem 0" }}>
                  <span style={{ background: "#f1f5f9", padding: "0 0.75rem", fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", zIndex: 2, position: "relative" }}>Histórico de Mensagens</span>
                  <hr style={{ position: "absolute", top: "50%", left: 0, right: 0, border: "0", borderTop: "1px solid #cbd5e1", zIndex: 1, margin: 0 }} />
                </div>

                {/* Timeline Messages */}
                {selectedTicket.messages.map(m => {
                  const isAdmin = m.sender === "SUPORTE";
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: isAdmin ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                        alignItems: isAdmin ? "flex-end" : "flex-start"
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem", fontWeight: "bold" }}>
                        {m.senderName} {isAdmin && "⭐"}
                      </span>
                      
                      <div
                        style={{
                          padding: "0.9rem 1.1rem",
                          borderRadius: "12px",
                          borderTopRightRadius: isAdmin ? "0px" : "12px",
                          borderTopLeftRadius: isAdmin ? "12px" : "0px",
                          backgroundColor: isAdmin ? "#0b4f59" : "white",
                          color: isAdmin ? "white" : "#1e293b",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          border: isAdmin ? "none" : "1px solid #e2e8f0",
                          fontSize: "0.9rem",
                          lineHeight: "1.4",
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {m.content}
                      </div>

                      <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>
                        {new Date(m.timestamp).toLocaleDateString("pt-BR")} às {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Reply Form */}
              {selectedTicket.status !== "FECHADO" ? (
                <form
                  onSubmit={handleSendReply}
                  style={{
                    padding: "1rem 1.5rem",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    gap: "0.75rem",
                    backgroundColor: "white",
                    alignItems: "center"
                  }}
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva uma resposta para o cliente..."
                    style={{
                      flexGrow: 1,
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  />
                  
                  <button
                    type="submit"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#0b4f59",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                  >
                    Responder ✉
                  </button>
                </form>
              ) : (
                <div style={{ padding: "1.2rem", backgroundColor: "#f0fdf4", color: "#16a34a", borderTop: "1px solid #e2e8f0", textAlign: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                  Este ticket foi finalizado. Altere o status no menu superior para reabrir e responder.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
              <span style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🎫</span>
              <h3 style={{ margin: 0, color: "#1e293b" }}>Central de Atendimento</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>Selecione um chamado da lista lateral para ver o histórico e responder.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
