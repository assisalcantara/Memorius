import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TenantAdminData, tenantsAdminSupabaseService } from "@/services/tenants-admin.supabase.service";
import { SaasPlan, TenantSubscription } from "@/types";
import { useToast } from "@/context/ToastContext";

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantAdminData | null;
  plans: SaasPlan[];
  onSave: () => void;
}

export function EditTenantModal({
  isOpen,
  onClose,
  tenant,
  plans,
  onSave,
}: EditTenantModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Form State
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editStatus, setEditStatus] = useState("ATIVO");
  const [editPassword, setEditPassword] = useState("");

  const [activeSubscription, setActiveSubscription] = useState<TenantSubscription | null>(null);
  const [editSaasPlanId, setEditSaasPlanId] = useState("");
  const [editSubStatus, setEditSubStatus] = useState("TRIAL");
  const [editSubCiclo, setEditSubCiclo] = useState("MENSAL");
  const [editSubValor, setEditSubValor] = useState(0);
  const [editSubDataInicio, setEditSubDataInicio] = useState("");
  const [editSubDataVencimento, setEditSubDataVencimento] = useState("");
  const [editSubObservacoes, setEditSubObservacoes] = useState("");

  // Limits State
  const [editLimiteUsuarios, setEditLimiteUsuarios] = useState(5);
  const [editLimiteClientes, setEditLimiteClientes] = useState(0);
  const [editLimiteContratos, setEditLimiteContratos] = useState(0);
  const [editLimiteStorageMb, setEditLimiteStorageMb] = useState(0);

  useEffect(() => {
    if (tenant) {
      setEditEmpresa(tenant.empresa);
      setEditResponsavel(tenant.responsavel);
      setEditStatus(tenant.status || "ATIVO");
      setEditPassword("");

      const sub = tenant.subscription || null;
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

      setEditLimiteUsuarios(5);
      setEditLimiteClientes(0);
      setEditLimiteContratos(0);
      setEditLimiteStorageMb(0);
    }
  }, [tenant]);

  const handleEditPlanChange = (planId: string) => {
    setEditSaasPlanId(planId);
    const plan = plans.find((p) => p.id === planId) as any;
    if (plan) {
      setEditSubValor(plan.valorMensal ?? plan.valor_mensal ?? 0);
      setEditLimiteUsuarios(plan.limiteUsuarios ?? 0);
      setEditLimiteClientes(plan.limiteClientes ?? 0);
      setEditLimiteContratos(plan.limiteContratos ?? 0);
      setEditLimiteStorageMb(plan.limiteStorageMb ?? 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    setSaving(true);
    const ok = await tenantsAdminSupabaseService.updateTenant(tenant.id, {
      empresa: editEmpresa,
      responsavel: editResponsavel,
      status: editStatus,
      password: editPassword || undefined,
      limiteUsuarios: editLimiteUsuarios,
      limiteClientes: editLimiteClientes,
      limiteContratos: editLimiteContratos,
      limiteStorageMb: editLimiteStorageMb,
      saasPlanId: editSaasPlanId || undefined,
      subStatus: editSubStatus || undefined,
      subCiclo: editSubCiclo || undefined,
      subValor: Number(editSubValor),
      subDataInicio: editSubDataInicio || undefined,
      subDataVencimento: editSubDataVencimento || undefined,
      subObservacoes: editSubObservacoes,
    });
    setSaving(false);

    if (ok) {
      toast.success("Tenant e assinatura atualizados com sucesso!");
      onSave();
      onClose();
    } else {
      toast.error("Erro ao atualizar os dados do tenant.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Tenant">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              fontSize: "0.9rem",
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
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                borderRadius: "6px",
                fontSize: "0.875rem",
                marginBottom: "1rem",
                border: "1px solid #fde68a",
              }}
            >
              ⚠️ Este tenant ainda não possui assinatura.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Plano SaaS
              </label>
              <select
                value={editSaasPlanId}
                onChange={(e) => handleEditPlanChange(e.target.value)}
                className="auth-input"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "white",
                  fontSize: "0.9rem",
                }}
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
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Status da Assinatura
                </label>
                <select
                  value={editSubStatus}
                  onChange={(e) => setEditSubStatus(e.target.value)}
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="TRIAL">TRIAL</option>
                  <option value="ATIVO">ATIVO</option>
                  <option value="SUSPENSO">SUSPENSO</option>
                  <option value="CANCELADO">CANCELADO</option>
                  <option value="VENCIDO">VENCIDO</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Ciclo
                </label>
                <select
                  value={editSubCiclo}
                  onChange={(e) => setEditSubCiclo(e.target.value)}
                  className="auth-input"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    fontSize: "0.9rem",
                  }}
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
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Observações
              </label>
              <textarea
                value={editSubObservacoes}
                onChange={(e) => setEditSubObservacoes(e.target.value)}
                className="auth-input"
                style={{
                  width: "100%",
                  minHeight: "60px",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
          <Button type="button" variant="cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
