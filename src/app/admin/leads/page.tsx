"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { leadsSaasSupabaseService } from "@/services/leads-saas.supabase.service";
import { LeadSaas } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";

const LEAD_STATUSES: LeadSaas["status"][] = [
  "NOVO",
  "CONTATO_REALIZADO",
  "PROPOSTA_ENVIADA",
  "NEGOCIACAO",
  "FECHADO",
  "PERDIDO"
];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadSaas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadSaas | null>(null);

  // Form States
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [origem, setOrigem] = useState("");
  const [interessePlano, setInteressePlano] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<LeadSaas["status"]>("NOVO");

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toast = useToast();

  async function loadLeads() {
    const data = await leadsSaasSupabaseService.getAll();
    setLeads(data);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await leadsSaasSupabaseService.getAll();
      if (active) {
        setLeads(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingLead(null);
    setNomeEmpresa("");
    setResponsavel("");
    setTelefone("");
    setWhatsapp("");
    setEmail("");
    setCidade("");
    setUf("");
    setOrigem("");
    setInteressePlano("");
    setObservacoes("");
    setStatus("NOVO");
    setIsModalOpen(true);
  };

  const openEditModal = (lead: LeadSaas) => {
    setEditingLead(lead);
    setNomeEmpresa(lead.nomeEmpresa);
    setResponsavel(lead.responsavel || "");
    setTelefone(lead.telefone || "");
    setWhatsapp(lead.whatsapp || "");
    setEmail(lead.email || "");
    setCidade(lead.cidade || "");
    setUf(lead.uf || "");
    setOrigem(lead.origem || "");
    setInteressePlano(lead.interessePlano || "");
    setObservacoes(lead.observacoes || "");
    setStatus(lead.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim()) {
      toast.error("O nome da empresa é obrigatório.");
      return;
    }

    const leadData = {
      nomeEmpresa,
      responsavel: responsavel || undefined,
      telefone: telefone || undefined,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      cidade: cidade || undefined,
      uf: uf || undefined,
      origem: origem || undefined,
      interessePlano: interessePlano || undefined,
      observacoes: observacoes || undefined,
      status
    };

    try {
      if (editingLead) {
        await leadsSaasSupabaseService.update(editingLead.id, leadData);
        toast.success("Lead atualizado com sucesso!");
      } else {
        await leadsSaasSupabaseService.create(leadData);
        toast.success("Lead cadastrado com sucesso!");
      }
      setIsModalOpen(false);
      loadLeads();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Erro ao salvar lead: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadSaas["status"]) => {
    const ok = await leadsSaasSupabaseService.updateStatus(leadId, newStatus);
    if (ok) {
      toast.success("Status do lead atualizado!");
      loadLeads();
    } else {
      toast.error("Erro ao atualizar status do lead.");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await leadsSaasSupabaseService.remove(id);
    if (ok) {
      toast.success("Lead excluído com sucesso!");
      setConfirmDeleteId(null);
      loadLeads();
    } else {
      toast.error("Erro ao excluir lead.");
    }
  };

  // Filter Leads
  const filteredLeads = leads.filter((l) => {
    const matchesEmpresa = l.nomeEmpresa.toLowerCase().includes(searchEmpresa.toLowerCase());
    const matchesResponsavel = (l.responsavel || "").toLowerCase().includes(searchResponsavel.toLowerCase());
    const matchesStatus = statusFilter === "TODOS" || l.status === statusFilter;

    return matchesEmpresa && matchesResponsavel && matchesStatus;
  });

  const getStatusColor = (s: LeadSaas["status"]) => {
    switch (s) {
      case "NOVO": return "#3b82f6";
      case "CONTATO_REALIZADO": return "#f59e0b";
      case "PROPOSTA_ENVIADA": return "#8b5cf6";
      case "NEGOCIACAO": return "#ec4899";
      case "FECHADO": return "#10b981";
      case "PERDIDO": return "#ef4444";
      default: return "#6b7280";
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle
        title="Leads Comerciais SaaS"
        icon="👥"
        actions={
          <Button onClick={openCreateModal}>
            ➕ Novo Lead SaaS
          </Button>
        }
      />

      {/* Filters Bar */}
      <div style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        background: "white",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Buscar por Empresa..."
            value={searchEmpresa}
            onChange={(e) => setSearchEmpresa(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem"
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Buscar por Responsável..."
            value={searchResponsavel}
            onChange={(e) => setSearchResponsavel(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem"
            }}
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              background: "white",
              minWidth: "150px"
            }}
          >
            <option value="TODOS">Todos os Status</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <TableContainer title="Leads Captados" count={filteredLeads.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando Leads...</div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState message="Nenhum lead comercial cadastrado ou correspondente aos filtros." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Responsável / Contatos</th>
                <th>Localização</th>
                <th>Interesse</th>
                <th>Status</th>
                <th>Cadastro</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((l) => (
                <tr key={l.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{l.nomeEmpresa}</div>
                    {l.origem && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Origem: {l.origem}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.responsavel || "-"}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {l.whatsapp ? `💬 ${l.whatsapp}` : l.telefone ? `📞 ${l.telefone}` : ""}
                    </div>
                    {l.email && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>📧 {l.email}</div>}
                  </td>
                  <td>
                    {l.cidade || l.uf ? `${l.cidade || ""}-${l.uf || ""}` : "-"}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.85rem", background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "4px", fontWeight: 500 }}>
                      {l.interessePlano || "Geral"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <select
                        value={l.status}
                        onChange={(e) => handleUpdateStatus(l.id, e.target.value as LeadSaas["status"])}
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "white",
                          backgroundColor: getStatusColor(l.status),
                          border: "none",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s} style={{ color: "black", backgroundColor: "white" }}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>{l.createdAt ? formatDate(l.createdAt) : "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <Button
                        variant="secondary"
                        onClick={() => openEditModal(l)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDeleteId(l.id)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Save Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "2rem",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>
              {editingLead ? "Editar Lead" : "Novo Lead SaaS"}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      UF
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={uf}
                      onChange={(e) => setUf(e.target.value.toUpperCase())}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Origem do Lead
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Google, Indicação, Instagram"
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Plano de Interesse
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Plano Bronze, Plano Ouro"
                      value={interessePlano}
                      onChange={(e) => setInteressePlano(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadSaas["status"])}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Observações
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <Button type="button" variant="cancel" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            width: "100%",
            maxWidth: "400px",
            padding: "2rem",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            textAlign: "center"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#eb5757", marginBottom: "1rem" }}>
              Confirmar Exclusão
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Tem certeza que deseja excluir permanentemente este Lead? Esta ação não poderá ser desfeita.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
              <Button variant="cancel" onClick={() => setConfirmDeleteId(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDeleteId)}>
                Sim, Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
