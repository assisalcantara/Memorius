"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { propostasSaasSupabaseService } from "@/services/propostas-saas.supabase.service";
import { saasPlansSupabaseService } from "@/services/saas-plans.supabase.service";
import { leadsSaasSupabaseService } from "@/services/leads-saas.supabase.service";
import { tenantsAdminSupabaseService } from "@/services/tenants-admin.supabase.service";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { PropostaSaas, SaasPlan, LeadSaas, TenantSubscription } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";

const PROPOSTA_STATUSES: PropostaSaas["status"][] = [
  "RASCUNHO",
  "ENVIADA",
  "NEGOCIACAO",
  "APROVADA",
  "RECUSADA",
  "EXPIRADA"
];

export default function AdminPropostasPage() {
  const [proposals, setProposals] = useState<PropostaSaas[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [leads, setLeads] = useState<LeadSaas[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterLeadId, setFilterLeadId] = useState("TODOS");
  const [filterPlanId, setFilterPlanId] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<PropostaSaas | null>(null);

  // Form States
  const [leadId, setLeadId] = useState("");
  const [planoSaasId, setPlanoSaasId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorProposto, setValorProposto] = useState("");
  const [validade, setValidade] = useState("");
  const [status, setStatus] = useState<PropostaSaas["status"]>("RASCUNHO");
  const [observacoes, setObservacoes] = useState("");

  // Conversion Modal States
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingProposal, setConvertingProposal] = useState<PropostaSaas | null>(null);

  // Conversion Form States
  const [cEmpresa, setCEmpresa] = useState("");
  const [cNomeFantasia, setCNomeFantasia] = useState("");
  const [cCNPJ, setCCNPJ] = useState("");
  const [cTelefone, setCTelefone] = useState("");
  const [cCelular, setCCelular] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCidade, setCCidade] = useState("");
  const [cUf, setCUf] = useState("");
  const [cResponsavel, setCResponsavel] = useState("");
  const [cPlanoSaas, setCPlanoSaas] = useState("");
  const [cStatus, setCStatus] = useState("ATIVO");
  const [cLimiteUsuarios, setCLimiteUsuarios] = useState("10");
  const [cObservacoes, setCObservacoes] = useState("");

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toast = useToast();

  async function loadData() {
    const [propData, plansData, leadsData] = await Promise.all([
      propostasSaasSupabaseService.getAll(),
      saasPlansSupabaseService.getAll(),
      leadsSaasSupabaseService.getAll()
    ]);
    setProposals(propData);
    setPlans(plansData);
    setLeads(leadsData);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const [propData, plansData, leadsData] = await Promise.all([
        propostasSaasSupabaseService.getAll(),
        saasPlansSupabaseService.getAll(),
        leadsSaasSupabaseService.getAll()
      ]);
      if (active) {
        setProposals(propData);
        setPlans(plansData);
        setLeads(leadsData);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingProposal(null);
    setLeadId(leads.length > 0 ? leads[0].id : "");
    setPlanoSaasId(plans.length > 0 ? plans[0].id : "");
    setTitulo("");
    setDescricao("");
    setValorProposto("");
    setValidade("");
    setStatus("RASCUNHO");
    setObservacoes("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: PropostaSaas) => {
    setEditingProposal(p);
    setLeadId(p.leadId);
    setPlanoSaasId(p.planoSaasId || "");
    setTitulo(p.titulo);
    setDescricao(p.descricao || "");
    setValorProposto(p.valorProposto !== undefined ? String(p.valorProposto) : "");
    setValidade(p.validade || "");
    setStatus(p.status);
    setObservacoes(p.observacoes || "");
    setIsModalOpen(true);
  };

  const openConvertModal = (p: PropostaSaas) => {
    if (!p.planoSaasId) {
      toast.error("Bloqueado: Esta proposta não possui um plano SaaS associado.");
      return;
    }

    const lead = leads.find((l) => l.id === p.leadId);
    const plan = plans.find((pl) => pl.id === p.planoSaasId);

    setConvertingProposal(p);
    setCEmpresa(lead?.nomeEmpresa || "");
    setCNomeFantasia(lead?.nomeEmpresa || "");
    setCCNPJ("");
    setCTelefone(lead?.whatsapp || lead?.telefone || "");
    setCCelular(lead?.whatsapp || lead?.telefone || "");
    setCEmail(lead?.email || "");
    setCCidade(lead?.cidade || "");
    setCUf(lead?.uf || "");
    setCResponsavel(lead?.responsavel || "");
    setCPlanoSaas(p.planoNome || plan?.nome || "");
    setCStatus("ATIVO");
    setCLimiteUsuarios(plan?.limiteUsuarios !== undefined ? String(plan.limiteUsuarios) : "10");
    setCObservacoes(p.observacoes || "");
    setIsConvertModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      toast.error("O lead associado é obrigatório.");
      return;
    }
    if (!titulo.trim()) {
      toast.error("O título da proposta é obrigatório.");
      return;
    }

    const proposalData = {
      leadId,
      titulo,
      descricao: descricao || undefined,
      valorProposto: valorProposto ? Number(valorProposto) : undefined,
      planoSaasId: planoSaasId || undefined,
      validade: validade || undefined,
      status,
      observacoes: observacoes || undefined
    };

    try {
      if (editingProposal) {
        await propostasSaasSupabaseService.update(editingProposal.id, proposalData);
        toast.success("Proposta comercial atualizada!");
      } else {
        await propostasSaasSupabaseService.create(proposalData);
        toast.success("Proposta comercial criada!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Erro ao salvar proposta: ${error.message}`);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingProposal) return;
    if (!convertingProposal.planoSaasId) {
      toast.error("Bloqueado: Esta proposta não possui um plano SaaS associado.");
      return;
    }
    if (!cCNPJ.trim()) {
      toast.error("O CNPJ é obrigatório para a criação do tenant.");
      return;
    }

    try {
      // 1. Create Tenant using existing flow
      const response = await tenantsAdminSupabaseService.createTenant({
        empresa: cEmpresa,
        nomeFantasia: cNomeFantasia,
        cnpj: cCNPJ,
        telefone: cTelefone,
        celular: cCelular,
        email: cEmail,
        cidade: cCidade,
        uf: cUf,
        adminNome: cResponsavel,
        adminEmail: cEmail,
        adminTelefone: cTelefone,
        planoSaas: cPlanoSaas,
        status: cStatus,
        limiteUsuarios: Number(cLimiteUsuarios) || 10,
        observacoes: cObservacoes
      });

      if (!response.success || !response.tenantId) {
        toast.error(`Falha ao criar Tenant: ${response.message || "Erro desconhecido"}`);
        return;
      }

      // 2. Create Initial Subscription
      let subCreated = false;
      try {
        const plan = plans.find((pl) => pl.id === convertingProposal.planoSaasId);
        const trialDays = plan?.trialDias || 30;
        const daysToAdd = cStatus === "TRIAL" ? trialDays : 30;
        const dataVencimentoDate = new Date();
        dataVencimentoDate.setDate(dataVencimentoDate.getDate() + daysToAdd);
        const dataVencimentoStr = dataVencimentoDate.toISOString().split("T")[0];

        const val = convertingProposal.valorProposto !== undefined && convertingProposal.valorProposto !== null
          ? convertingProposal.valorProposto
          : (plan?.valorMensal || 0);

        await subscriptionsSupabaseService.create({
          tenantId: response.tenantId,
          saasPlanId: convertingProposal.planoSaasId,
          status: cStatus as TenantSubscription["status"],
          ciclo: 'MENSAL',
          valor: val,
          dataInicio: new Date().toISOString().split("T")[0],
          dataVencimento: dataVencimentoStr,
          observacoes: `Assinatura inicial criada via conversão da proposta: ${convertingProposal.titulo}`
        });
        subCreated = true;
      } catch (subErr: unknown) {
        console.error("Erro ao criar assinatura:", subErr);
        toast.warning("Tenant criado, mas assinatura não foi criada.");
      }

      // 3. Try to bind proposal to the newly created tenant
      const bindSuccess = await propostasSaasSupabaseService.convertToTenant(convertingProposal.id, response.tenantId);
      if (bindSuccess) {
        if (subCreated) {
          toast.success("Proposta convertida em Tenant com assinatura criada com sucesso!");
        } else {
          toast.warning("Proposta vinculada ao Tenant criado, mas sem assinatura.");
        }
      } else {
        toast.warning("Tenant criado com sucesso, mas a proposta não pôde ser vinculada no banco.");
      }

      setIsConvertModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Erro na conversão: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: PropostaSaas["status"]) => {
    const ok = await propostasSaasSupabaseService.updateStatus(id, newStatus);
    if (ok) {
      toast.success("Status da proposta atualizado!");
      loadData();
    } else {
      toast.error("Erro ao atualizar status da proposta.");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await propostasSaasSupabaseService.remove(id);
    if (ok) {
      toast.success("Proposta comercial excluída!");
      setConfirmDeleteId(null);
      loadData();
    } else {
      toast.error("Erro ao excluir proposta comercial.");
    }
  };

  // Filter list
  const filteredProposals = proposals.filter((p) => {
    const matchesLead = filterLeadId === "TODOS" || p.leadId === filterLeadId;
    const matchesPlan = filterPlanId === "TODOS" || p.planoSaasId === filterPlanId;
    const matchesStatus = filterStatus === "TODOS" || p.status === filterStatus;
    return matchesLead && matchesPlan && matchesStatus;
  });

  const getStatusColor = (s: PropostaSaas["status"]) => {
    switch (s) {
      case "RASCUNHO": return "#6b7280";
      case "ENVIADA": return "#3b82f6";
      case "NEGOCIACAO": return "#f59e0b";
      case "APROVADA": return "#10b981";
      case "RECUSADA": return "#ef4444";
      case "EXPIRADA": return "#7f1d1d";
      default: return "#374151";
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle
        title="Propostas Comerciais SaaS"
        icon="📄"
        actions={
          <Button onClick={openCreateModal} disabled={leads.length === 0}>
            ➕ Nova Proposta
          </Button>
        }
      />

      {leads.length === 0 && (
        <div style={{
          backgroundColor: "#fef2f2",
          color: "#991b1b",
          padding: "1rem",
          borderRadius: "6px",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
          fontWeight: 600,
          border: "1px solid #fee2e2"
        }}>
          ⚠️ Você precisa cadastrar ao menos um **Lead SaaS** comercial antes de criar propostas.
        </div>
      )}

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
          <select
            value={filterLeadId}
            onChange={(e) => setFilterLeadId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              background: "white"
            }}
          >
            <option value="TODOS">Todos os Leads</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.nomeEmpresa}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <select
            value={filterPlanId}
            onChange={(e) => setFilterPlanId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              background: "white"
            }}
          >
            <option value="TODOS">Todos os Planos</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
            {PROPOSTA_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <TableContainer title="Propostas Comerciais" count={filteredProposals.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando propostas...</div>
        ) : filteredProposals.length === 0 ? (
          <EmptyState message="Nenhuma proposta cadastrada ou correspondente aos filtros." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lead / Empresa</th>
                <th>Título / Plano SaaS</th>
                <th>Valor Proposto</th>
                <th>Validade</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((p) => (
                <tr key={p.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {p.leadNomeEmpresa || "Lead Excluído"}
                    </div>
                    {p.convertedTenantId && (
                      <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>
                        ✓ Convertido (ID: {p.convertedTenantId.substring(0, 8)}...)
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.titulo}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Plano: {p.planoNome || "Nenhum plano associado"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      {p.valorProposto !== undefined ? `R$ ${p.valorProposto.toFixed(2)}` : "-"}
                    </div>
                  </td>
                  <td>{p.validade ? formatDate(p.validade) : "Sem validade"}</td>
                  <td>
                    <select
                      value={p.status}
                      onChange={(e) => handleUpdateStatus(p.id, e.target.value as PropostaSaas["status"])}
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "white",
                        backgroundColor: getStatusColor(p.status),
                        border: "none",
                        padding: "0.3rem 0.5rem",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      {PROPOSTA_STATUSES.map((s) => (
                        <option key={s} value={s} style={{ color: "black", backgroundColor: "white" }}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {p.status === "APROVADA" && !p.convertedTenantId && (
                        <Button
                          onClick={() => openConvertModal(p)}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#0b4f59", color: "white" }}
                        >
                          💼 Converter em Tenant
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => openEditModal(p)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDeleteId(p.id)}
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
              {editingProposal ? "Editar Proposta" : "Nova Proposta Comercial"}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Lead / Empresa Associada *
                  </label>
                  <select
                    required
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                  >
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.nomeEmpresa} ({l.responsavel})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Título da Proposta *
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Descrição
                  </label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Plano SaaS
                    </label>
                    <select
                      value={planoSaasId}
                      onChange={(e) => setPlanoSaasId(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      <option value="">Nenhum plano</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Valor Proposto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorProposto}
                      onChange={(e) => setValorProposto(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Validade da Proposta
                    </label>
                    <input
                      type="date"
                      value={validade}
                      onChange={(e) => setValidade(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PropostaSaas["status"])}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      {PROPOSTA_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Observações
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
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

      {/* Convert to Tenant Modal */}
      {isConvertModalOpen && convertingProposal && (
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
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0b4f59", marginBottom: "1.5rem" }}>
              💼 Converter Proposta em Tenant
            </h3>

            <form onSubmit={handleConvertSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={cEmpresa}
                    onChange={(e) => setCEmpresa(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    value={cNomeFantasia}
                    onChange={(e) => setCNomeFantasia(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    CNPJ (Obrigatório) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Somente números ou formatado"
                    value={cCNPJ}
                    onChange={(e) => setCCNPJ(e.target.value)}
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
                      value={cTelefone}
                      onChange={(e) => setCTelefone(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Celular
                    </label>
                    <input
                      type="text"
                      value={cCelular}
                      onChange={(e) => setCCelular(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    E-mail do Tenant / Admin *
                  </label>
                  <input
                    type="email"
                    required
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
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
                      value={cCidade}
                      onChange={(e) => setCCidade(e.target.value)}
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
                      value={cUf}
                      onChange={(e) => setCUf(e.target.value.toUpperCase())}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Responsável / Admin *
                    </label>
                    <input
                      type="text"
                      required
                      value={cResponsavel}
                      onChange={(e) => setCResponsavel(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Plano SaaS Selecionado
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={cPlanoSaas}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "#f1f5f9" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Status do Tenant
                    </label>
                    <select
                      value={cStatus}
                      onChange={(e) => setCStatus(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="TRIAL">TRIAL</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Limite de Usuários
                    </label>
                    <input
                      type="number"
                      required
                      value={cLimiteUsuarios}
                      onChange={(e) => setCLimiteUsuarios(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Observações
                  </label>
                  <textarea
                    value={cObservacoes}
                    onChange={(e) => setCObservacoes(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <Button type="button" variant="cancel" onClick={() => setIsConvertModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  💼 Confirmar Conversão
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
              Tem certeza que deseja excluir permanentemente esta Proposta? Esta ação não poderá ser desfeita.
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
