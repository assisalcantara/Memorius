"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { invoicesSupabaseService } from "@/services/invoices.supabase.service";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { asaasSaasService } from "@/services/asaas-saas.service";
import { SaaSInvoice, TenantSubscription } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";

const INVOICE_STATUSES: SaaSInvoice["status"][] = [
  "PENDENTE",
  "PAGO",
  "VENCIDO",
  "CANCELADO"
];

export default function AdminFaturasPage() {
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [tenants, setTenants] = useState<TenantAdminData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterTenantId, setFilterTenantId] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterCompetencia, setFilterCompetencia] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SaaSInvoice | null>(null);

  // Form States
  const [tenantId, setTenantId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [status, setStatus] = useState<SaaSInvoice["status"]>("PENDENTE");
  const [pagamentoEm, setPagamentoEm] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toast = useToast();

  async function loadData() {
    try {
      const [invData, subsData, tenantsData] = await Promise.all([
        invoicesSupabaseService.getAll(),
        subscriptionsSupabaseService.getAll(),
        tenantsAdminSupabaseService.getAllTenants()
      ]);
      setInvoices(invData);
      setSubscriptions(subsData);
      setTenants(tenantsData);
    } catch (err: unknown) {
      toast.error(`Erro ao carregar dados: ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [invData, subsData, tenantsData] = await Promise.all([
          invoicesSupabaseService.getAll(),
          subscriptionsSupabaseService.getAll(),
          tenantsAdminSupabaseService.getAllTenants()
        ]);
        if (active) {
          setInvoices(invData);
          setSubscriptions(subsData);
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
    const defaultTenantId = tenants.length > 0 ? (tenants[0].id || "") : "";
    setEditingInvoice(null);
    setTenantId(defaultTenantId);
    
    // Find first subscription for this tenant if any
    const tenantSubs = subscriptions.filter((s) => s.tenantId === defaultTenantId);
    const defaultSubId = tenantSubs.length > 0 ? tenantSubs[0].id : "";
    setSubscriptionId(defaultSubId);

    const defaultVal = tenantSubs.length > 0 ? String(tenantSubs[0].valor) : "0.00";
    setValor(defaultVal);

    const planName = tenantSubs.length > 0 ? ` - Plano ${tenantSubs[0].saasPlanNome || ""}` : "";
    setDescricao(`Mensalidade SaaS${planName}`);

    // Prefill Competencia (MM/YYYY) for current month
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    setCompetencia(`${mm}/${yyyy}`);

    // Prefill due date to 10 days from now or use subscription due date if available
    const dueDate = tenantSubs.length > 0 
      ? tenantSubs[0].dataVencimento 
      : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setVencimento(dueDate);

    setStatus("PENDENTE");
    setPagamentoEm("");
    setObservacoes("");
    setIsModalOpen(true);
  };

  const openEditModal = (inv: SaaSInvoice) => {
    setEditingInvoice(inv);
    setTenantId(inv.tenantId);
    setSubscriptionId(inv.subscriptionId || "");
    setDescricao(inv.descricao || "");
    setValor(String(inv.valor));
    setCompetencia(inv.competencia);
    setVencimento(inv.vencimento);
    setStatus(inv.status);
    setPagamentoEm(inv.pagamentoEm ? inv.pagamentoEm.substring(0, 16) : "");
    setObservacoes(inv.observacoes || "");
    setIsModalOpen(true);
  };

  const handleTenantChangeForm = (tId: string) => {
    setTenantId(tId);
    const tenantSubs = subscriptions.filter((s) => s.tenantId === tId);
    if (tenantSubs.length > 0) {
      setSubscriptionId(tenantSubs[0].id);
      setValor(String(tenantSubs[0].valor));
      setVencimento(tenantSubs[0].dataVencimento);
      setDescricao(`Mensalidade SaaS - Plano ${tenantSubs[0].saasPlanNome || ""}`);
    } else {
      setSubscriptionId("");
      setValor("");
      setDescricao("Mensalidade SaaS");
    }
  };

  const handleSubscriptionChangeForm = (subId: string) => {
    setSubscriptionId(subId);
    const selectedSub = subscriptions.find((s) => s.id === subId);
    if (selectedSub) {
      setValor(String(selectedSub.valor));
      setVencimento(selectedSub.dataVencimento);
      setDescricao(`Mensalidade SaaS - Plano ${selectedSub.saasPlanNome || ""}`);
    }
  };

  const handleStatusChangeForm = (newStatus: SaaSInvoice["status"]) => {
    setStatus(newStatus);
    if (newStatus === "PAGO") {
      setPagamentoEm(new Date().toISOString().substring(0, 16));
    } else {
      setPagamentoEm("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error("O Tenant associado é obrigatório.");
      return;
    }
    if (!valor || isNaN(Number(valor))) {
      toast.error("O valor é obrigatório e deve ser numérico.");
      return;
    }
    if (!competencia.trim() || !/^\d{2}\/\d{4}$/.test(competencia)) {
      toast.error("A competência é obrigatória e deve estar no formato MM/AAAA.");
      return;
    }
    if (!vencimento) {
      toast.error("A data de vencimento é obrigatória.");
      return;
    }

    const payload = {
      tenantId,
      subscriptionId: subscriptionId || null,
      descricao: descricao || undefined,
      valor: Number(valor),
      competencia,
      vencimento,
      status,
      pagamentoEm: pagamentoEm ? new Date(pagamentoEm).toISOString() : null,
      observacoes: observacoes || undefined
    };

    try {
      if (editingInvoice) {
        await invoicesSupabaseService.update(editingInvoice.id, payload);
        toast.success("Fatura atualizada com sucesso!");
      } else {
        await invoicesSupabaseService.create(payload);
        toast.success("Fatura criada com sucesso!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(`Erro ao salvar fatura: ${(err as Error).message}`);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const ok = await invoicesSupabaseService.markAsPaid(id);
      if (ok) {
        toast.success("Fatura marcada como PAGA com sucesso!");
        loadData();
      } else {
        toast.error("Erro ao marcar fatura como paga.");
      }
    } catch (err: unknown) {
      toast.error(`Erro: ${(err as Error).message}`);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const ok = await invoicesSupabaseService.cancel(id);
      if (ok) {
        toast.success("Fatura cancelada com sucesso!");
        loadData();
      } else {
        toast.error("Erro ao cancelar fatura.");
      }
    } catch (err: unknown) {
      toast.error(`Erro: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const ok = await invoicesSupabaseService.remove(id);
      if (ok) {
        toast.success("Fatura excluída permanentemente!");
        setConfirmDeleteId(null);
        loadData();
      } else {
        toast.error("Erro ao excluir fatura.");
      }
    } catch (err: unknown) {
      toast.error(`Erro ao excluir: ${(err as Error).message}`);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesTenant = filterTenantId === "TODOS" || inv.tenantId === filterTenantId;
    const matchesStatus = filterStatus === "TODOS" || inv.status === filterStatus;
    const matchesCompetencia = !filterCompetencia.trim() || inv.competencia.includes(filterCompetencia.trim());
    return matchesTenant && matchesStatus && matchesCompetencia;
  });

  const getStatusColor = (s: SaaSInvoice["status"]) => {
    switch (s) {
      case "PAGO": return "#10b981";
      case "PENDENTE": return "#f59e0b";
      case "VENCIDO": return "#ef4444";
      case "CANCELADO": return "#6b7280";
      default: return "#374151";
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle
        title="Faturas SaaS"
        icon="🧾"
        actions={
          <Button onClick={openCreateModal} disabled={tenants.length === 0}>
            ➕ Nova Fatura
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
          ⚠️ Você precisa cadastrar ao menos um **Tenant** antes de gerenciar faturas.
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
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <input
            type="text"
            placeholder="Competência (ex: 06/2026)"
            value={filterCompetencia}
            onChange={(e) => setFilterCompetencia(e.target.value)}
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
              minWidth: "180px"
            }}
          />
        </div>
      </div>

      <TableContainer title="Faturas SaaS" count={filteredInvoices.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando faturas...</div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState message="Nenhuma fatura cadastrada ou correspondente aos filtros." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tenant / Empresa</th>
                <th>Competência / Descrição</th>
                <th>Valor</th>
                <th>Datas</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {inv.tenantEmpresa || "Tenant Desconhecido"}
                    </div>
                    {inv.subscriptionId && (
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Assinatura: {inv.subscriptionId.substring(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{inv.competencia}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {inv.descricao || "Mensalidade SaaS"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      R$ {inv.valor.toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Vencimento:</strong> {formatDate(inv.vencimento)}
                    </div>
                    {inv.pagamentoEm && (
                      <div style={{ fontSize: "0.85rem", color: "#10b981" }}>
                        <strong>Pago em:</strong> {new Date(inv.pagamentoEm).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "white",
                      backgroundColor: getStatusColor(inv.status),
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px"
                    }}>
                      {inv.status}
                    </span>
                    {inv.asaasStatus && (
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                        ASAAS: <strong style={{ textTransform: "uppercase" }}>{inv.asaasStatus}</strong>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                      {/* ASAAS Billing Actions */}
                      {!inv.asaasPaymentId && inv.status !== "PAGO" && inv.status !== "CANCELADO" && (
                        <Button
                          onClick={async () => {
                            if (!inv.vencimento) {
                              toast.error("Vencimento ausente. Impossível gerar cobrança ASAAS.");
                              return;
                            }
                            if (inv.valor <= 0) {
                              toast.error("O valor da fatura deve ser maior que zero para cobrança ASAAS.");
                              return;
                            }
                            if (inv.status !== "PENDENTE" && inv.status !== "VENCIDO") {
                              toast.error("Apenas faturas com status PENDENTE ou VENCIDO podem gerar cobrança ASAAS.");
                              return;
                            }

                            try {
                              toast.info("Processando cobrança ASAAS...");
                              // 1. Get client config
                              const config = await asaasSaasService.getConfig();
                              if (!config || !config.ativo) {
                                toast.error("Gateway ASAAS não configurado ou inativo.");
                                return;
                              }

                              // 2. Fetch tenant details
                              const tenantDetails = tenants.find(t => t.id === inv.tenantId);
                              if (!tenantDetails) {
                                toast.error("Dados do tenant não localizados.");
                                return;
                              }

                              const fullTenant = await tenantsAdminSupabaseService.getTenantById(inv.tenantId);
                              const configEmail = fullTenant?.config?.email || "";
                              const configCnpj = fullTenant?.config?.cnpj || "";

                              // 3. Search for existing asaas_customer_id in prior invoices to reuse
                              let customerId = invoices.find(i => i.tenantId === inv.tenantId && i.asaasCustomerId)?.asaasCustomerId;

                              if (!customerId) {
                                // Create customer in ASAAS
                                const newCustomer = await asaasSaasService.createCustomer({
                                  name: tenantDetails.responsavel || tenantDetails.empresa,
                                  email: configEmail || `${inv.tenantId}@legacyflow-mock.com`,
                                  cpfCnpj: configCnpj || "00000000000" // Fallback if missing
                                });
                                customerId = newCustomer.id;
                                // Log audit
                                await invoicesSupabaseService.update(inv.id, { asaasCustomerId: customerId });
                              }

                              // 4. Create Payment in ASAAS
                              const paymentResult = await asaasSaasService.createPayment({
                                customer: customerId!,
                                value: inv.valor,
                                dueDate: inv.vencimento,
                                description: inv.descricao || `Fatura SaaS - Competência ${inv.competencia}`
                              });

                              // 5. Update invoice
                              await invoicesSupabaseService.update(inv.id, {
                                asaasCustomerId: customerId,
                                asaasPaymentId: paymentResult.id,
                                asaasInvoiceUrl: paymentResult.invoiceUrl,
                                asaasStatus: paymentResult.status
                              });

                              toast.success("Cobrança ASAAS gerada com sucesso!");
                              loadData();
                            } catch (err: unknown) {
                              const error = err as Error;
                              toast.error(`Falha ao gerar cobrança ASAAS: ${error.message}`);
                            }
                          }}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#0b4f59", color: "white" }}
                        >
                          Gerar Cobrança ASAAS
                        </Button>
                      )}

                      {inv.asaasInvoiceUrl && (
                        <a
                          href={inv.asaasInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "0.4rem 0.6rem",
                            fontSize: "0.8rem",
                            backgroundColor: "#8b5cf6",
                            color: "white",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: 700
                          }}
                        >
                          Ver Cobrança
                        </a>
                      )}

                      {inv.status !== "PAGO" && inv.status !== "CANCELADO" && (
                        <Button
                          onClick={() => handleMarkAsPaid(inv.id)}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#10b981", color: "white" }}
                        >
                          Marcar como Pago
                        </Button>
                      )}
                      {inv.status !== "CANCELADO" && inv.status !== "PAGO" && (
                        <Button
                          onClick={() => handleCancel(inv.id)}
                          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#ef4444", color: "white" }}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => openEditModal(inv)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDeleteId(inv.id)}
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
              {editingInvoice ? "Editar Fatura SaaS" : "Nova Fatura SaaS"}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Tenant / Empresa *
                  </label>
                  <select
                    required
                    disabled={!!editingInvoice}
                    value={tenantId}
                    onChange={(e) => handleTenantChangeForm(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: editingInvoice ? "#f1f5f9" : "white" }}
                  >
                    <option value="">Selecione um Tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.empresa}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Assinatura SaaS Vinculada
                  </label>
                  <select
                    value={subscriptionId}
                    onChange={(e) => handleSubscriptionChangeForm(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                  >
                    <option value="">Nenhuma Assinatura (Fatura Avulsa)</option>
                    {subscriptions
                      .filter((s) => s.tenantId === tenantId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Plano: {s.saasPlanNome || "Sem Nome"} (Valor: R$ {s.valor.toFixed(2)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Descrição da Cobrança
                  </label>
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Competência (MM/AAAA) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 06/2026"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Valor da Fatura (R$) *
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
                      Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={vencimento}
                      onChange={(e) => setVencimento(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Status *
                    </label>
                    <select
                      required
                      value={status}
                      onChange={(e) => handleStatusChangeForm(e.target.value as SaaSInvoice["status"])}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
                    >
                      {INVOICE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {status === "PAGO" && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Data/Hora do Pagamento
                    </label>
                    <input
                      type="datetime-local"
                      value={pagamentoEm}
                      onChange={(e) => setPagamentoEm(e.target.value)}
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
              Tem certeza que deseja excluir permanentemente esta Fatura? Esta ação não poderá ser desfeita.
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
