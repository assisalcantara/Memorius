"use client";

import React, { useState, useEffect, useRef } from "react";

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
        senderName: "Suporte Técnico (LegacyFlow)",
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

  // Save helper
  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    localStorage.setItem("legacyflow_support_tickets", JSON.stringify(updated));
    if (selectedTicket) {
      const match = updated.find(t => t.id === selectedTicket.id);
      if (match) {
        setSelectedTicket(match);
      } else {
        setSelectedTicket(null);
      }
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
      title: newTitle,
      department: newDept,
      priority: newPriority,
      status: "ABERTO",
      createdAt: dateStr,
      lastActivity: dateStr,
      description: newMessage,
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: "CLIENTE",
          senderName: "Usuário do Sistema",
          content: newMessage,
          timestamp: dateStr,
        }
      ]
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
      content: replyText,
      timestamp: dateStr,
    };

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: "ABERTO" as const,
          lastActivity: dateStr,
          messages: [...t.messages, newMsg]
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

    const updatedTickets = tickets.map(t => {
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

  // Simula Resposta do Suporte (UX premium de teste)
  const handleSimulateResponse = () => {
    if (!selectedTicket || selectedTicket.status === "FECHADO") return;
    const dateStr = new Date().toISOString();

    const supportAnswers = [
      "Olá! Agradecemos o contato. Estamos verificando sua solicitação no sistema.",
      "Perfeito, compreendi o cenário. Já direcionei para a nossa equipe técnica analisar com prioridade.",
      "Identificamos a origem do problema. Poderia testar novamente e nos dizer se foi resolvido?",
      "Nossos servidores passaram por uma atualização de segurança, mas agora a operação já está 100% normalizada.",
      "Olá! Suas mensalidades foram recalculadas e já constam atualizadas na aba Financeiro."
    ];

    const randomAnswer = supportAnswers[Math.floor(Math.random() * supportAnswers.length)];

    const newMsg: Message = {
      id: `m-support-${Date.now()}`,
      sender: "SUPORTE",
      senderName: "Suporte Tecnológico",
      content: randomAnswer,
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
        return { backgroundColor: "var(--warning-light)", color: "var(--warning)", border: "1px solid var(--warning)" };
      case "EM_PROGRESSO":
        return { backgroundColor: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--primary)" };
      case "FECHADO":
        return { backgroundColor: "var(--success-light)", color: "var(--success)", border: "1px solid var(--success)" };
    }
  };

  const getPriorityBadgeStyles = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "ALTA":
        return { backgroundColor: "var(--danger-light)", color: "var(--danger)" };
      case "MÉDIA":
        return { backgroundColor: "var(--warning-light)", color: "var(--warning)" };
      case "BAIXA":
        return { backgroundColor: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: "550px", gap: "1rem" }}>
      
      {/* Header com Ações */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Central de Suporte e Tickets</h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Abra chamados para suporte técnico, financeiro ou dúvidas comerciais.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "var(--border-radius)",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s"
          }}
        >
          <span>🎫</span> Novo Ticket
        </button>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem", flexGrow: 1, overflow: "hidden" }}>
        
        {/* Left Side: Tickets List */}
        <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: "var(--border-radius)", border: "1px solid var(--border-color)", overflow: "hidden" }}>
          
          {/* Busca e Filtros */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <input
              type="text"
              placeholder="Buscar por protocolo, título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-color)",
                fontSize: "0.9rem"
              }}
            />
            
            <div style={{ display: "flex", gap: "0.25rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "6px" }}>
              {(["TODOS", "ABERTO", "EM_PROGRESSO", "FECHADO"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    flex: 1,
                    padding: "0.35rem",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    backgroundColor: statusFilter === status ? "var(--primary)" : "transparent",
                    color: statusFilter === status ? "white" : "var(--text-secondary)",
                    transition: "all 0.15s"
                  }}
                >
                  {status === "TODOS" ? "Todos" : status === "EM_PROGRESSO" ? "Em Fila" : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Itens */}
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "0.75rem" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.9rem" }}>
                Nenhum chamado encontrado.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filtered.map(t => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      style={{
                        padding: "0.9rem",
                        borderRadius: "var(--border-radius)",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                        backgroundColor: isSelected ? "var(--primary-light)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                          {t.protocol}
                        </span>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          ...getStatusBadgeStyles(t.status)
                        }}>
                          {t.status === "EM_PROGRESSO" ? "EM PROCESSO" : t.status}
                        </span>
                      </div>
                      <h4 style={{ margin: "0 0 0.4rem 0", fontSize: "0.9rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                        {t.title}
                      </h4>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>
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
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat / Ticket View */}
        <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: "var(--border-radius)", border: "1px solid var(--border-color)", overflow: "hidden" }}>
          {selectedTicket ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              
              {/* Ticket Top Meta Info */}
              <div style={{ padding: "1.2rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fafbfc" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{selectedTicket.title}</h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>({selectedTicket.protocol})</span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Aberto em {new Date(selectedTicket.createdAt).toLocaleDateString("pt-BR")} às {new Date(selectedTicket.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {selectedTicket.status !== "FECHADO" && (
                    <>
                      <button
                        onClick={handleSimulateResponse}
                        style={{
                          padding: "0.4rem 0.8rem",
                          backgroundColor: "var(--primary-light)",
                          color: "var(--primary)",
                          border: "1px solid var(--primary)",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                        title="Simular uma resposta de um agente do suporte técnico"
                      >
                        ⚡ Simular Agente
                      </button>
                      
                      <button
                        onClick={handleCloseTicket}
                        style={{
                          padding: "0.4rem 0.8rem",
                          backgroundColor: "#fce8e6",
                          color: "var(--danger)",
                          border: "1px solid var(--danger)",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        ✔ Concluir Ticket
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flexGrow: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "#f8fafc" }}>
                
                {/* Description Box */}
                <div style={{ alignSelf: "center", maxWidth: "90%", padding: "1rem", background: "#f1f5f9", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "0.9rem", textAlign: "left", marginBottom: "1rem" }}>
                  <strong style={{ color: "var(--primary)", display: "block", marginBottom: "0.25rem" }}>Problema Inicial:</strong>
                  {selectedTicket.description}
                </div>

                {/* Timeline Messages */}
                {selectedTicket.messages.map(m => {
                  const isClient = m.sender === "CLIENTE";
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: isClient ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                        alignItems: isClient ? "flex-end" : "flex-start"
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem", fontWeight: "bold" }}>
                        {m.senderName}
                      </span>
                      <div
                        style={{
                          padding: "0.8rem 1rem",
                          borderRadius: "12px",
                          borderTopRightRadius: isClient ? "0px" : "12px",
                          borderTopLeftRadius: isClient ? "12px" : "0px",
                          backgroundColor: isClient ? "var(--primary)" : "white",
                          color: isClient ? "white" : "var(--text-primary)",
                          boxShadow: "var(--shadow-sm)",
                          fontSize: "0.9rem",
                          lineHeight: "1.4"
                        }}
                      >
                        {m.content}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-light)", marginTop: "0.25rem" }}>
                        {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Form Reply */}
              {selectedTicket.status !== "FECHADO" ? (
                <form
                  onSubmit={handleSendReply}
                  style={{
                    padding: "1rem",
                    borderTop: "1px solid var(--border-color)",
                    display: "flex",
                    gap: "0.75rem",
                    backgroundColor: "white"
                  }}
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Digite sua mensagem de resposta..."
                    style={{
                      flexGrow: 1,
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--border-radius)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.9rem"
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "0.6rem 1.2rem",
                      backgroundColor: "var(--primary)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--border-radius)",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Enviar ✉
                  </button>
                </form>
              ) : (
                <div style={{ padding: "1.2rem", backgroundColor: "var(--success-light)", color: "var(--success)", borderTop: "1px solid var(--border-color)", textAlign: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                  Este ticket foi encerrado e finalizado.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)" }}>
              <span style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎫</span>
              <h3>Selecione um chamado da lista para ver o andamento</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>Ou clique em &quot;Novo Ticket&quot; para abrir um novo chamado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Ticket Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "var(--border-radius)",
            width: "500px",
            maxWidth: "90%",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, color: "var(--primary)" }}>Abrir Novo Ticket de Suporte</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                  Assunto / Título do Problema
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Falha ao carregar relatório financeiro"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                    Departamento
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value as SupportTicket["department"])}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "var(--border-radius)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.9rem",
                      backgroundColor: "white"
                    }}
                  >
                    <option value="Suporte Técnico">Suporte Técnico</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Dúvidas Gerais">Dúvidas Gerais</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                    Prioridade
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as SupportTicket["priority"])}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "var(--border-radius)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.9rem",
                      backgroundColor: "white"
                    }}
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MÉDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                  Mensagem Detalhada
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva detalhadamente o ocorrido ou sua dúvida técnica..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.9rem",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#f8fafc",
                    color: "var(--text-secondary)",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--border-radius)",
                    border: "none",
                    backgroundColor: "var(--primary)",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Criar Ticket 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
