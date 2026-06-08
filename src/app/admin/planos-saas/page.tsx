"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { TableContainer } from "@/components/ui/TableContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { saasPlansSupabaseService } from "@/services/saas-plans.supabase.service";
import { SaasPlan } from "@/types";
import { useToast } from "@/context/ToastContext";

export default function AdminSaasPlansPage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS"); // TODOS, ATIVO, INATIVO
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorMensal, setValorMensal] = useState("");
  const [valorAnual, setValorAnual] = useState("");
  const [limiteUsuarios, setLimiteUsuarios] = useState("");
  const [limiteClientes, setLimiteClientes] = useState("");
  const [limiteContratos, setLimiteContratos] = useState("");
  const [limiteStorageMb, setLimiteStorageMb] = useState("");
  const [trialDias, setTrialDias] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [destaque, setDestaque] = useState(false);

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toast = useToast();

  async function loadPlans() {
    const data = await saasPlansSupabaseService.getAll();
    setPlans(data);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await saasPlansSupabaseService.getAll();
      if (active) {
        setPlans(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setNome("");
    setDescricao("");
    setValorMensal("");
    setValorAnual("");
    setLimiteUsuarios("");
    setLimiteClientes("");
    setLimiteContratos("");
    setLimiteStorageMb("");
    setTrialDias("");
    setAtivo(true);
    setDestaque(false);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: SaasPlan) => {
    setEditingPlan(plan);
    setNome(plan.nome);
    setDescricao(plan.descricao || "");
    setValorMensal(plan.valorMensal !== undefined ? String(plan.valorMensal) : "");
    setValorAnual(plan.valorAnual !== undefined ? String(plan.valorAnual) : "");
    setLimiteUsuarios(plan.limiteUsuarios !== undefined ? String(plan.limiteUsuarios) : "");
    setLimiteClientes(plan.limiteClientes !== undefined ? String(plan.limiteClientes) : "");
    setLimiteContratos(plan.limiteContratos !== undefined ? String(plan.limiteContratos) : "");
    setLimiteStorageMb(plan.limiteStorageMb !== undefined ? String(plan.limiteStorageMb) : "");
    setTrialDias(plan.trialDias !== undefined ? String(plan.trialDias) : "");
    setAtivo(plan.ativo);
    setDestaque(plan.destaque);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("O nome do plano é obrigatório.");
      return;
    }

    const planData = {
      nome,
      descricao: descricao || undefined,
      valorMensal: valorMensal ? Number(valorMensal) : undefined,
      valorAnual: valorAnual ? Number(valorAnual) : undefined,
      limiteUsuarios: limiteUsuarios ? Number(limiteUsuarios) : undefined,
      limiteClientes: limiteClientes ? Number(limiteClientes) : undefined,
      limiteContratos: limiteContratos ? Number(limiteContratos) : undefined,
      limiteStorageMb: limiteStorageMb ? Number(limiteStorageMb) : undefined,
      trialDias: trialDias ? Number(trialDias) : undefined,
      ativo,
      destaque
    };

    try {
      if (editingPlan) {
        await saasPlansSupabaseService.update(editingPlan.id, planData);
        toast.success("Plano SaaS atualizado com sucesso!");
      } else {
        await saasPlansSupabaseService.create(planData);
        toast.success("Plano SaaS criado com sucesso!");
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Erro ao salvar plano: ${error.message}`);
    }
  };

  const handleToggleActive = async (plan: SaasPlan) => {
    const nextAtivo = !plan.ativo;
    const ok = await saasPlansSupabaseService.toggleActive(plan.id, nextAtivo);
    if (ok) {
      toast.success(`Plano ${nextAtivo ? "ativado" : "desativado"} com sucesso!`);
      loadPlans();
    } else {
      toast.error("Erro ao alterar status de ativação.");
    }
  };

  const handleToggleHighlight = async (plan: SaasPlan) => {
    const nextDestaque = !plan.destaque;
    const ok = await saasPlansSupabaseService.toggleHighlight(plan.id, nextDestaque);
    if (ok) {
      toast.success(nextDestaque ? "Plano marcado como destaque!" : "Destaque removido.");
      loadPlans();
    } else {
      toast.error("Erro ao alterar destaque.");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await saasPlansSupabaseService.remove(id);
    if (ok) {
      toast.success("Plano SaaS excluído com sucesso!");
      setConfirmDeleteId(null);
      loadPlans();
    } else {
      toast.error("Erro ao excluir plano SaaS.");
    }
  };

  // Filter plans list
  const filteredPlans = plans.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.descricao && p.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "TODOS" || 
      (statusFilter === "ATIVO" && p.ativo) ||
      (statusFilter === "INATIVO" && !p.ativo);

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <PageTitle
        title="Planos SaaS"
        icon="🏷️"
        actions={
          <Button onClick={openCreateModal}>
            ➕ Novo Plano SaaS
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
        <div style={{ flex: 1, minWidth: "250px" }}>
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>
        </div>
      </div>

      <TableContainer title="Planos SaaS Cadastrados" count={filteredPlans.length}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Carregando planos...</div>
        ) : filteredPlans.length === 0 ? (
          <EmptyState message="Nenhum plano SaaS cadastrado ou correspondente aos filtros." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome / Descrição</th>
                <th>Mensal / Anual</th>
                <th>Limites (Usuários / Clientes / Contratos / Storage)</th>
                <th>Trial</th>
                <th>Destaque</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((p) => (
                <tr key={p.id} className="table-row">
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.nome}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.descricao || "Sem descrição"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      M: {p.valorMensal !== undefined ? `R$ ${p.valorMensal.toFixed(2)}` : "N/A"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      A: {p.valorAnual !== undefined ? `R$ ${p.valorAnual.toFixed(2)}` : "N/A"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      👤 {p.limiteUsuarios !== undefined ? p.limiteUsuarios : "Ilimitado"} users
                    </div>
                    <div style={{ fontSize: "0.85rem" }}>
                      🤝 {p.limiteClientes !== undefined ? p.limiteClientes : "Ilimitado"} clientes
                    </div>
                    <div style={{ fontSize: "0.85rem" }}>
                      📄 {p.limiteContratos !== undefined ? p.limiteContratos : "Ilimitado"} contratos
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      💾 {p.limiteStorageMb !== undefined ? `${p.limiteStorageMb} MB` : "Ilimitado"}
                    </div>
                  </td>
                  <td>{p.trialDias !== undefined ? `${p.trialDias} dias` : "Não"}</td>
                  <td>
                    <button
                      onClick={() => handleToggleHighlight(p)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.2rem",
                        cursor: "pointer"
                      }}
                      title={p.destaque ? "Remover destaque" : "Marcar como destaque"}
                    >
                      {p.destaque ? "⭐" : "☆"}
                    </button>
                  </td>
                  <td>
                    <StatusBadge status={p.ativo ? "ATIVO" : "INATIVO"} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <Button
                        variant="secondary"
                        onClick={() => openEditModal(p)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant={p.ativo ? "danger" : "primary"}
                        onClick={() => handleToggleActive(p)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        {p.ativo ? "Inativar" : "Ativar"}
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
              {editingPlan ? "Editar Plano SaaS" : "Novo Plano SaaS"}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
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
                    rows={3}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Valor Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorMensal}
                      onChange={(e) => setValorMensal(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Valor Anual (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorAnual}
                      onChange={(e) => setValorAnual(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Limite de Usuários
                    </label>
                    <input
                      type="number"
                      placeholder="Ilimitado se vazio"
                      value={limiteUsuarios}
                      onChange={(e) => setLimiteUsuarios(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Limite de Clientes
                    </label>
                    <input
                      type="number"
                      placeholder="Ilimitado se vazio"
                      value={limiteClientes}
                      onChange={(e) => setLimiteClientes(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Limite de Contratos
                    </label>
                    <input
                      type="number"
                      placeholder="Ilimitado se vazio"
                      value={limiteContratos}
                      onChange={(e) => setLimiteContratos(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Storage (MB)
                    </label>
                    <input
                      type="number"
                      placeholder="Ilimitado se vazio"
                      value={limiteStorageMb}
                      onChange={(e) => setLimiteStorageMb(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Dias de Trial
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 7"
                      value={trialDias}
                      onChange={(e) => setTrialDias(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", paddingBottom: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={destaque}
                        onChange={(e) => setDestaque(e.target.checked)}
                      />
                      Destaque
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                      />
                      Ativo
                    </label>
                  </div>
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
              Tem certeza que deseja excluir permanentemente este plano SaaS? Esta ação não poderá ser desfeita.
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
