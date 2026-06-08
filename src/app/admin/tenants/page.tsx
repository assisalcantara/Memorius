/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { tenantsAdminSupabaseService, TenantAdminData } from "@/services/tenants-admin.supabase.service";
import { saasPlansSupabaseService } from "@/services/saas-plans.supabase.service";
import { subscriptionsSupabaseService } from "@/services/subscriptions.supabase.service";
import { SaasPlan, TenantSubscription } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantAdminData | null>(null);
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editStatus, setEditStatus] = useState("ATIVO");
  const [editPassword, setEditPassword] = useState("");

  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<TenantSubscription | null>(null);
  const [editSaasPlanId, setEditSaasPlanId] = useState("");
  const [editSubStatus, setEditSubStatus] = useState("TRIAL");
  const [editSubCiclo, setEditSubCiclo] = useState("MENSAL");
  const [editSubValor, setEditSubValor] = useState(0);
  const [editSubDataInicio, setEditSubDataInicio] = useState("");
  const [editSubDataVencimento, setEditSubDataVencimento] = useState("");
  const [editSubObservacoes, setEditSubObservacoes] = useState("");

  // Limits
  const [editLimiteUsuarios, setEditLimiteUsuarios] = useState(5);
  const [editLimiteClientes, setEditLimiteClientes] = useState(0);
  const [editLimiteContratos, setEditLimiteContratos] = useState(0);
  const [editLimiteStorageMb, setEditLimiteStorageMb] = useState(0);

  // Delete State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantAdminData | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function loadTenants() {
    const data = await tenantsAdminSupabaseService.getAllTenants();
    setTenants(data);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await tenantsAdminSupabaseService.getAllTenants();
      if (active) {
        setTenants(data);
        setLoading(false);
      }
    }
    async function loadPlans() {
      try {
        const allPlans = await saasPlansSupabaseService.getAll();
        if (active) {
          setPlans(allPlans.filter(p => p.ativo));
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      }
    }
    load();
    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    const ok = await tenantsAdminSupabaseService.toggleTenantStatus(id, newStatus);
    if (ok) {
      toast.success(`Tenant ${newStatus === "ATIVO" ? "ativado" : "bloqueado"} com sucesso!`);
      loadTenants();
    } else {
      toast.error("Erro ao alterar o status do tenant.");
    }
  };

  const handleEditPlanChange = (planId: string) => {
    setEditSaasPlanId(planId);
    const plan = plans.find(p => p.id === planId) as any;
    if (plan) {
      setEditSubValor(plan.valorMensal ?? plan.valor_mensal ?? 0);
      setEditLimiteUsuarios(plan.limiteUsuarios ?? 0);
      setEditLimiteClientes(plan.limiteClientes ?? 0);
      setEditLimiteContratos(plan.limiteContratos ?? 0);
      setEditLimiteStorageMb(plan.limiteStorageMb ?? 0);
    }
  };

  const handleEditClick = async (t: TenantAdminData) => {
    setEditingTenant(t);
    setEditEmpresa(t.empresa);
    setEditResponsavel(t.responsavel);
    setEditStatus(t.status || "ATIVO");
    setEditPassword("");

    // Load subscription for tenant
    try {
      if (t.id) {
        const sub = await subscriptionsSupabaseService.getByTenantId(t.id);
        setActiveSubscription(sub);
        if (sub) {
          setEditSaasPlanId(sub.saasPlanId);
          setEditSubStatus(sub.status);
          setEditSubCiclo(sub.ciclo);
          setEditSubValor(sub.valor);
          setEditSubDataInicio(sub.dataInicio ? sub.dataInicio.split("T")[0] : "");
          setEditSubDataVencimento(sub.dataVencimento ? sub.dataVencimento.split("T")[0] : "");
          setEditSubObservacoes(sub.observacoes || "");
        } else {
          setEditSaasPlanId("");
          setEditSubStatus("TRIAL");
          setEditSubCiclo("MENSAL");
          setEditSubValor(0);
          setEditSubDataInicio(new Date().toISOString().split("T")[0]);
          setEditSubDataVencimento("");
          setEditSubObservacoes("");
        }
      }
    } catch (err) {
      console.warn("Failed to load subscription:", err);
    }

    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant?.id) return;

    // 1. Update basic tenant data
    const ok = await tenantsAdminSupabaseService.updateTenant(editingTenant.id, {
      empresa: editEmpresa,
      responsavel: editResponsavel,
      status: editStatus,
      password: editPassword || undefined,
      limiteUsuarios: editLimiteUsuarios,
      limiteClientes: editLimiteClientes,
      limiteContratos: editLimiteContratos,
      limiteStorageMb: editLimiteStorageMb
    });

    if (!ok) {
      toast.error("Erro ao atualizar os dados do tenant.");
      return;
    }

    // 2. Handle subscription
    try {
      if (activeSubscription) {
        // update existing subscription
        await subscriptionsSupabaseService.update(activeSubscription.id, {
          saasPlanId: editSaasPlanId || undefined,
          status: editSubStatus as any,
          ciclo: editSubCiclo as any,
          valor: Number(editSubValor),
          dataInicio: editSubDataInicio || undefined,
          dataVencimento: editSubDataVencimento || undefined,
          observacoes: editSubObservacoes
        });
      } else if (editSaasPlanId) {
        // create new subscription if plan was chosen
        await subscriptionsSupabaseService.create({
          tenantId: editingTenant.id,
          saasPlanId: editSaasPlanId,
          status: editSubStatus as any,
          ciclo: editSubCiclo as any,
          valor: Number(editSubValor),
          dataInicio: editSubDataInicio || new Date().toISOString().split("T")[0],
          dataVencimento: editSubDataVencimento || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          observacoes: editSubObservacoes
        });
      }
      toast.success("Tenant e assinatura atualizados com sucesso!");
      setIsEditModalOpen(false);
      loadTenants();
    } catch (err: any) {
      toast.error(`Erro ao atualizar assinatura: ${err.message}`);
    }
  };

  const handleDeleteClick = (t: TenantAdminData) => {
    setTenantToDelete(t);
    setDeleteConfirmText("");
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete?.id) return;
    if (deleteConfirmText !== "EXCLUIR") {
      toast.error("Texto de confirmação incorreto.");
      return;
    }

    const ok = await tenantsAdminSupabaseService.removeTenant(tenantToDelete.id);
    if (ok) {
      toast.success("Tenant excluído com sucesso!");
      setIsDeleteConfirmOpen(false);
      loadTenants();
    } else {
      toast.error("Erro ao excluir o tenant.");
    }
  };

  return (
    <div>
      <PageTitle
        title="Gerenciar Tenants"
        icon="🏢"
        actions={
          <Button onClick={() => window.location.href = "/admin/tenants/novo"}>
            ➕ Novo Tenant
          </Button>
        }
      />

      <TableContainer title="Todos os Tenants" count={tenants.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>
        ) : tenants.length === 0 ? (
          <EmptyState message="Nenhum tenant cadastrado no sistema." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Empresa / Razão Social</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Criado em</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{t.empresa}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ID: {t.id}</div>
                  </td>
                  <td>{t.responsavel}</td>
                  <td>
                    <StatusBadge status={t.status || "ATIVO"} />
                  </td>
                  <td>{t.created_at ? formatDate(t.created_at) : "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                      <Button
                        variant="secondary"
                        onClick={() => handleEditClick(t)}
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", marginRight: "0.5rem" }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant={t.status === "ATIVO" ? "danger" : "primary"}
                        onClick={() => t.id && handleToggleStatus(t.id, t.status || "ATIVO")}
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", marginRight: "0.5rem" }}
                      >
                        {t.status === "ATIVO" ? "Bloquear" : "Ativar"}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteClick(t)}
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
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

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Tenant"
      >
        <form onSubmit={handleUpdateTenant} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Razão Social"
            value={editEmpresa}
            onChange={(e) => setEditEmpresa(e.target.value)}
            required
          />
          <Input
            label="Responsável"
            value={editResponsavel}
            onChange={(e) => setEditResponsavel(e.target.value)}
            required
          />
          <Input
            label="Nova Senha (deixe em branco para manter a atual)"
            type="password"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            placeholder="Nova senha de acesso"
          />
          <div className="form-group">
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="auth-input"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "white",
                fontSize: "0.9rem"
              }}
            >
              <option value="ATIVO">ATIVO</option>
              <option value="TRIAL">TRIAL</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
            </select>
          </div>

          {/* Plano e Assinatura Section */}
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Plano e Assinatura</h3>

            {!activeSubscription && (
              <div style={{ padding: "0.75rem", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1rem", border: "1px solid #fde68a" }}>
                ⚠️ Este tenant ainda não possui assinatura.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Plano SaaS</label>
                <select
                  value={editSaasPlanId}
                  onChange={(e) => handleEditPlanChange(e.target.value)}
                  className="auth-input"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", fontSize: "0.9rem" }}
                >
                  <option value="">Selecione um plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {p.valorMensal || 0}/mês
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Status da Assinatura</label>
                  <select
                    value={editSubStatus}
                    onChange={(e) => setEditSubStatus(e.target.value)}
                    className="auth-input"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", fontSize: "0.9rem" }}
                  >
                    <option value="TRIAL">TRIAL</option>
                    <option value="ATIVO">ATIVO</option>
                    <option value="SUSPENSO">SUSPENSO</option>
                    <option value="CANCELADO">CANCELADO</option>
                    <option value="VENCIDO">VENCIDO</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Ciclo</label>
                  <select
                    value={editSubCiclo}
                    onChange={(e) => setEditSubCiclo(e.target.value)}
                    className="auth-input"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", fontSize: "0.9rem" }}
                  >
                    <option value="MENSAL">MENSAL</option>
                    <option value="ANUAL">ANUAL</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Input
                  label="Valor da Assinatura (R$)"
                  type="number"
                  step="0.01"
                  value={editSubValor}
                  onChange={(e) => setEditSubValor(Number(e.target.value))}
                />

                <Input
                  label="Data de Início"
                  type="date"
                  value={editSubDataInicio}
                  onChange={(e) => setEditSubDataInicio(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <Input
                  label="Data de Vencimento"
                  type="date"
                  value={editSubDataVencimento}
                  onChange={(e) => setEditSubDataVencimento(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Observações</label>
                <textarea
                  value={editSubObservacoes}
                  onChange={(e) => setEditSubObservacoes(e.target.value)}
                  className="auth-input"
                  style={{ width: "100%", minHeight: "60px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
            <Button type="button" variant="cancel" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Tenant Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirmar Exclusão de Tenant"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ color: "#b91c1c", fontWeight: 600 }}>
            ⚠️ Atenção: Esta ação é irreversível!
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            A exclusão removerá dados vinculados conforme regras do banco.
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Para confirmar a exclusão do tenant <strong>{tenantToDelete?.empresa}</strong>, digite <strong>EXCLUIR</strong> abaixo:
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR"
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Button type="button" variant="cancel" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmText !== "EXCLUIR"}
            >
              Confirmar Exclusão
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
