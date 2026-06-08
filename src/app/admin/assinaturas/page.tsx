"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { saasPlansSupabaseService } from "@/services/saas-plans.supabase.service";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { invoicesSupabaseService } from "@/services/invoices.supabase.service";
import { TenantSubscription, SaasPlan } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";

const SUBSCRIPTION_STATUSES: TenantSubscription["status"][] = [
  "ATIVO",
  "TRIAL",
  "SUSPENSO",
  "CANCELADO"
];

const SUBSCRIPTION_CYCLES: TenantSubscription["ciclo"][] = [
  "MENSAL",
  "ANUAL"
];

export default function AdminAssinaturasPage() {
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [tenants, setTenants] = useState<TenantAdminData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterTenantId, setFilterTenantId] = useState("TODOS");
  const [filterPlanId, setFilterPlanId] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<TenantSubscription | null>(null);

  // Form States
  const [tenantId, setTenantId] = useState("");
  const [saasPlanId, setSaasPlanId] = useState("");
  const [status, setStatus] = useState<TenantSubscription["status"]>("TRIAL");
  const [ciclo, setCiclo] = useState<TenantSubscription["ciclo"]>("MENSAL");
  const [valor, setValor] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataCancelamento, setDataCancelamento] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Generate Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoicingSubscription, setInvoicingSubscription] = useState<TenantSubscription | null>(null);
  const [invoiceCompetencia, setInvoiceCompetencia] = useState("");
  const [invoiceVencimento, setInvoiceVencimento] = useState("");

  const toast = useToast();

  async function loadData() {
    try {
      const [subsData, plansData, tenantsData] = await Promise.all([
        subscriptionsSupabaseService.getAll(),
        saasPlansSupabaseService.getAll(),
        tenantsAdminSupabaseService.getAllTenants()
      ]);
      setSubscriptions(subsData);
      setPlans(plansData);
      setTenants(tenantsData);
    } catch (err: unknown) {
      toast.error(`Erro ao carregar dados: ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [subsData, plansData, tenantsData] = await Promise.all([
          subscriptionsSupabaseService.getAll(),
          saasPlansSupabaseService.getAll(),
          tenantsAdminSupabaseService.getAllTenants()
        ]);
        if (active) {
          setSubscriptions(subsData);
          setPlans(plansData);
          setTenants(tenantsData);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          toast.error(`Erro ao carregar dados: ${(err as Error).message}`);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [toast]);

  const openCreateModal = () => {
    setEditingSubscription(null);
    setTenantId(tenants.length > 0 ? (tenants[0].id || "") : "");
    setSaasPlanId(plans.length > 0 ? plans[0].id : "");
    setStatus("TRIAL");
    setCiclo("MENSAL");
    setValor(plans.length > 0 ? String(plans[0].valorMensal || 0) : "");
    setDataInicio(new Date().toISOString().split("T")[0]);
    setDataVencimento(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setDataCancelamento("");
    setObservacoes("");
    setIsModalOpen(true);
  };

  const openEditModal = (sub: TenantSubscription) => {
    setEditingSubscription(sub);
    setTenantId(sub.tenantId);
    setSaasPlanId(sub.saasPlanId);
    setStatus(sub.status);
    setCiclo(sub.ciclo);
    setValor(String(sub.valor));
    setDataInicio(sub.dataInicio);
    setDataVencimento(sub.dataVencimento);
    setDataCancelamento(sub.dataCancelamento || "");
    setObservacoes(sub.observacoes || "");
    setIsModalOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    setSaasPlanId(planId);
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan) {
      if (ciclo === "ANUAL" && selectedPlan.valorAnual !== undefined) {
        setValor(String(selectedPlan.valorAnual));
      } else {
        setValor(String(selectedPlan.valorMensal || 0));
      }
      // If trial status, adjust due date to plan trial days
      if (status === "TRIAL") {
        const trialDays = selectedPlan.trialDias || 30;
        const devDate = new Date();
        devDate.setDate(devDate.getDate() + trialDays);
        setDataVencimento(devDate.toISOString().split("T")[0]);
      }
    }
  };

  const handleCycleChange = (newCiclo: TenantSubscription["ciclo"]) => {
    setCiclo(newCiclo);
    const selectedPlan = plans.find((p) => p.id === saasPlanId);
    if (selectedPlan) {
      if (newCiclo === "ANUAL" && selectedPlan.valorAnual !== undefined) {
        setValor(String(selectedPlan.valorAnual));
      } else {
        setValor(String(selectedPlan.valorMensal || 0));
      }
    }
  };

  const handleStatusChangeForm = (newStatus: TenantSubscription["status"]) => {
    setStatus(newStatus);
    if (newStatus === "TRIAL") {
      const selectedPlan = plans.find((p) => p.id === saasPlanId);
      const trialDays = selectedPlan?.trialDias || 30;
      const devDate = new Date();
      devDate.setDate(devDate.getDate() + trialDays);
      setDataVencimento(devDate.toISOString().split("T")[0]);
    } else if (newStatus === "CANCELADO" && !dataCancelamento) {
      setDataCancelamento(new Date().toISOString().split("T")[0]);
    } else if (newStatus !== "CANCELADO") {
      setDataCancelamento("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error("O Tenant associado é obrigatório.");
      return;
    }
    if (!saasPlanId) {
      toast.error("O Plano SaaS associado é obrigatório.");
      return;
    }
    if (!valor || isNaN(Number(valor))) {
      toast.error("O valor da assinatura é obrigatório e deve ser numérico.");
      return;
    }
    if (!dataInicio) {
      toast.error("A data de início é obrigatória.");
      return;
    }
    if (!dataVencimento) {
      toast.error("A data de vencimento é obrigatória.");
      return;
    }

    const payload = {
      tenantId,
      saasPlanId,
      status,
      ciclo,
      valor: Number(valor),
      dataInicio,
      dataVencimento,
      dataCancelamento: dataCancelamento || undefined,
      observacoes: observacoes || undefined
    };

    try {
      if (editingSubscription) {
        await subscriptionsSupabaseService.update(editingSubscription.id, payload);
        toast.success("Assinatura SaaS atualizada com sucesso!");
      } else {
        await subscriptionsSupabaseService.create(payload);
        toast.success("Assinatura SaaS criada com sucesso!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(`Erro ao salvar assinatura: ${(err as Error).message}`);
    }
  };

  const handleAction = async (id: string, action: "ativar" | "suspender" | "cancelar") => {
    let success = false;
    if (action === "ativar") {
      success = await subscriptionsSupabaseService.activate(id);
    } else if (action === "suspender") {
      success = await subscriptionsSupabaseService.suspend(id);
    } else if (action === "cancelar") {
      success = await subscriptionsSupabaseService.cancel(id);
    }

    if (success) {
      toast.success(`Assinatura alterada para ${action === "ativar" ? "Ativa" : action === "suspender" ? "Suspensa" : "Cancelada"} com sucesso!`);
      loadData();
    } else {
      toast.error(`Erro ao realizar ação na assinatura.`);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await subscriptionsSupabaseService.remove(id);
    if (ok) {
      toast.success("Assinatura SaaS excluída permanentemente!");
      setConfirmDeleteId(null);
      loadData();
    } else {
      toast.error("Erro ao excluir assinatura SaaS.");
    }
  };

  const openInvoiceModal = (sub: TenantSubscription) => {
    setInvoicingSubscription(sub);
    
    // Competencia (MM/YYYY) for current month
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    setInvoiceCompetencia(`${mm}/${yyyy}`);

    // Due date to the subscription's next due date (or 10 days from now)
    setInvoiceVencimento(sub.dataVencimento || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setIsInvoiceModalOpen(true);
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoicingSubscription) return;
    if (!invoiceCompetencia.trim() || !/^\d{2}\/\d{4}$/.test(invoiceCompetencia)) {
      toast.error("A competência é obrigatória e deve estar no formato MM/AAAA.");
      return;
    }
    if (!invoiceVencimento) {
      toast.error("O vencimento é obrigatória.");
      return;
    }

    try {
      // Proactive check for duplicates
      const isDuplicate = await invoicesSupabaseService.checkDuplicate(invoicingSubscription.id, invoiceCompetencia);
      if (isDuplicate) {
        toast.warning(`Esta assinatura já possui uma fatura gerada para a competência ${invoiceCompetencia}.`);
        return;
      }

      await invoicesSupabaseService.create({
        subscriptionId: invoicingSubscription.id,
        tenantId: invoicingSubscription.tenantId,
        valor: invoicingSubscription.valor,
        competencia: invoiceCompetencia,
        vencimento: invoiceVencimento,
        status: "PENDENTE",
        descricao: `Mensalidade SaaS - Plano ${invoicingSubscription.saasPlanNome || ""}`,
        observacoes: `Fatura gerada automaticamente via painel de Assinaturas.`
      });

      toast.success("Fatura SaaS gerada com sucesso!");
      setIsInvoiceModalOpen(false);
    } catch (err: unknown) {
      toast.error(`Erro ao gerar fatura: ${(err as Error).message}`);
    }
  };

  const handleRenewSubscription = async (id: string) => {
    if (!window.confirm("Deseja realizar a Renovação Manual desta assinatura? Uma nova fatura PENDENTE será gerada para a próxima competência.")) {
      return;
    }
    try {
      const res = await subscriptionsSupabaseService.renew(id);
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error("Erro ao renovar assinatura.");
      }
    } catch (err: unknown) {
      toast.error(`Erro: ${(err as Error).message}`);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesTenant = filterTenantId === "TODOS" || sub.tenantId === filterTenantId;
    const matchesPlan = filterPlanId === "TODOS" || sub.saasPlanId === filterPlanId;
    const matchesStatus = filterStatus === "TODOS" || sub.status === filterStatus;
    return matchesTenant && matchesPlan && matchesStatus;
  });

  const getStatusColor = (s: TenantSubscription["status"]) => {
    switch (s) {
      case "ATIVO": return "#10b981";
      case "TRIAL": return "#3b82f6";
      case "SUSPENSO": return "#f59e0b";
      case "CANCELADO": return "#ef4444";
      default: return "#374151";
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle
        title="Assinaturas SaaS"
        icon="💳"
        actions={
          <Button onClick={openCreateModal} disabled={tenants.length === 0 || plans.length === 0}>
            ➕ Nova Assinatura
          </Button>
        }
      />

      {tenants.length === 0 && (
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
          ⚠️ Você precisa cadastrar ao menos um **Tenant** antes de gerenciar assinaturas.
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
            value={filterTenantId}
            onChange={(e) => setFilterTenantId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              background: "white"
            }}
          >
            <option value="TODOS">Todos os Tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.empresa}</option>
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
            {SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <TableContainer title="Assinaturas SaaS" count={filteredSubscriptions.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando assinaturas...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <EmptyState message="Nenhuma assinatura cadastrada ou correspondente aos filtros." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tenant / Empresa</th>
                <th>Plano SaaS / Ciclo</th>
                <th>Valor</th>
                <th>Datas</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {sub.tenantEmpresa || "Tenant Desconhecido"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      ID: {sub.tenantId}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{sub.saasPlanNome || "Sem Plano"}</div>
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backgroundColor: "#f1f5f9",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "4px",
                      color: "#475569"
                    }}>
                      {sub.ciclo}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      R$ {sub.valor.toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Início:</strong> {formatDate(sub.dataInicio)}
                    </div>
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Próximo Vencimento:</strong> {formatDate(sub.dataVencimento)}
                    </div>
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Última Renovação:</strong> {sub.updatedAt && sub.createdAt && new Date(sub.updatedAt).getTime() - new Date(sub.createdAt).getTime() > 2000 ? formatDate(sub.updatedAt) : "Nunca"}
                    </div>
                    {sub.dataCancelamento && (
                      <div style={{ fontSize: "0.85rem", color: "#ef4444" }}>
                        <strong>Cancelado:</strong> {formatDate(sub.dataCancelamento)}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "white",
                      backgroundColor: getStatusColor(sub.status),
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px"
                    }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {sub.status !== "ATIVO" && sub.status !== "CANCELADO" && (
                        <Button
                          onClick={() => handleAction(sub.id, "ativar")}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#10b981", color: "white" }}
                        >
                          Ativar
                        </Button>
                      )}
                      {sub.status === "ATIVO" && (
                        <Button
                          onClick={() => handleAction(sub.id, "suspender")}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#f59e0b", color: "white" }}
                        >
                          Suspender
                        </Button>
                      )}
                      {sub.status !== "CANCELADO" && (
                        <Button
                          onClick={() => handleAction(sub.id, "cancelar")}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#ef4444", color: "white" }}
                        >
                          Cancelar
                        </Button>
                      )}
                       <Button
                        onClick={() => openInvoiceModal(sub)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#0b4f59", color: "white" }}
                      >
                        Gerar Fatura
                      </Button>
                      {(sub.status === "ATIVO" || sub.status === "TRIAL") && (
                        <Button
                          onClick={() => handleRenewSubscription(sub.id)}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#7c3aed", color: "white" }}
                        >
                          Renovar
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => openEditModal(sub)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDeleteId(sub.id)}
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
              {editingSubscription ? "Editar Assinatura SaaS" : "Nova Assinatura SaaS"}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Tenant / Empresa *
                  </label>
                  <select
                    required
                    disabled={!!editingSubscription}
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: editingSubscription ? "#f1f5f9" : "white" }}
                  >
                    <option value="">Selecione um Tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.empresa}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Plano SaaS *
                    </label>
                    <select
                      required
                      value={saasPlanId}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      <option value="">Selecione um Plano</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Ciclo de Faturamento *
                    </label>
                    <select
                      required
                      value={ciclo}
                      onChange={(e) => handleCycleChange(e.target.value as TenantSubscription["ciclo"])}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      {SUBSCRIPTION_CYCLES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Status da Assinatura *
                    </label>
                    <select
                      required
                      value={status}
                      onChange={(e) => handleStatusChangeForm(e.target.value as TenantSubscription["status"])}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      {SUBSCRIPTION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Valor da Assinatura (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      required
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={dataVencimento}
                      onChange={(e) => setDataVencimento(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                {status === "CANCELADO" && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Data de Cancelamento
                    </label>
                    <input
                      type="date"
                      value={dataCancelamento}
                      onChange={(e) => setDataCancelamento(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                )}

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
              Tem certeza que deseja excluir permanentemente esta Assinatura? Esta ação não poderá ser desfeita.
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

      {/* Generate Invoice Modal */}
      {isInvoiceModalOpen && invoicingSubscription && (
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
            maxWidth: "500px",
            padding: "2rem",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0b4f59", marginBottom: "1rem" }}>
              🧾 Gerar Fatura para Assinatura
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.5rem" }}>
              Você está gerando uma fatura para o tenant <strong>{invoicingSubscription.tenantEmpresa || invoicingSubscription.tenantId}</strong> no valor de <strong>R$ {invoicingSubscription.valor.toFixed(2)}</strong>.
            </p>

            <form onSubmit={handleGenerateInvoice}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Competência (MM/AAAA) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 06/2026"
                    value={invoiceCompetencia}
                    onChange={(e) => setInvoiceCompetencia(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceVencimento}
                    onChange={(e) => setInvoiceVencimento(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <Button type="button" variant="cancel" onClick={() => setIsInvoiceModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Confirmar e Gerar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
