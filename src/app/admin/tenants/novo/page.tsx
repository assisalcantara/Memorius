/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/ui/PageTitle";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { tenantsAdminSupabaseService } from "@/services/tenants-admin.supabase.service";
import { saasPlansSupabaseService } from "@/services/saas-plans.supabase.service";
import { useToast } from "@/context/ToastContext";
import { SaasPlan } from "@/types";

export default function AdminNewTenantPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Form states
  const [empresa, setEmpresa] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("SP");

  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminTelefone, setAdminTelefone] = useState("");
  const [password, setPassword] = useState("");

  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [planoSaasId, setPlanoSaasId] = useState("");
  const [status, setStatus] = useState("TRIAL");
  const [limiteUsuarios, setLimiteUsuarios] = useState(5);
  const [limiteClientes, setLimiteClientes] = useState(0);
  const [limiteContratos, setLimiteContratos] = useState(0);
  const [limiteStorageMb, setLimiteStorageMb] = useState(0);
  const [trialDias, setTrialDias] = useState(30);
  const [valorAssinatura, setValorAssinatura] = useState(0);
  const [observacoes, setObservacoes] = useState("");

  const handlePlanChange = (planId: string) => {
    setPlanoSaasId(planId);
    const plan = plans.find(p => p.id === planId) as any;
    if (plan) {
      setLimiteUsuarios(plan.limiteUsuarios ?? 0);
      setLimiteClientes(plan.limiteClientes ?? 0);
      setLimiteContratos(plan.limiteContratos ?? 0);
      setLimiteStorageMb(plan.limiteStorageMb ?? 0);
      setTrialDias(plan.trialDias ?? 30);
      setValorAssinatura(plan.valorMensal ?? plan.valor_mensal ?? 0);
    }
  };

  useEffect(() => {
    async function loadPlans() {
      try {
        const allPlans = await saasPlansSupabaseService.getAll();
        const activePlans = allPlans.filter(p => p.ativo);
        setPlans(activePlans);
        if (activePlans.length > 0) {
          const firstPlan = activePlans[0] as any;
          setPlanoSaasId(firstPlan.id);
          setLimiteUsuarios(firstPlan.limiteUsuarios ?? 0);
          setLimiteClientes(firstPlan.limiteClientes ?? 0);
          setLimiteContratos(firstPlan.limiteContratos ?? 0);
          setLimiteStorageMb(firstPlan.limiteStorageMb ?? 0);
          setTrialDias(firstPlan.trialDias ?? 30);
          setValorAssinatura(firstPlan.valorMensal ?? firstPlan.valor_mensal ?? 0);
        }
      } catch {
        toast.error("Erro ao carregar planos SaaS.");
      }
    }
    loadPlans();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresa || !nomeFantasia || !email || !adminNome || !adminEmail || !password || !planoSaasId) {
      toast.error("Por favor, preencha os campos obrigatórios (*).");
      return;
    }

    setLoading(true);

    console.log('Plano selecionado:', planoSaasId);

    const result = await tenantsAdminSupabaseService.createTenant({
      empresa,
      nomeFantasia,
      cnpj,
      telefone,
      celular,
      email,
      cidade,
      uf,
      adminNome,
      adminEmail,
      adminTelefone,
      planoSaasId,
      status,
      limiteUsuarios,
      limiteClientes,
      limiteContratos,
      limiteStorageMb,
      trialDias,
      valorAssinatura,
      observacoes,
      password
    });

    setLoading(false);

    if (result.success) {
      if (result.inviteSent) {
        toast.success(result.message || "Tenant criado e convite enviado com sucesso!");
      } else {
        toast.warning(result.message || "Tenant criado, mas o convite de e-mail falhou.");
      }
      router.push("/admin/tenants");
    } else {
      toast.error(result.message || "Erro ao criar o tenant.");
    }
  };

  return (
    <div>
      <PageTitle title="Cadastrar Novo Tenant" icon="➕" />

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Dados da Empresa */}
          <Card title="Dados da Empresa" icon="🏢">
            <div className="form-grid">
              <Input
                label="Razão Social"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                requiredMark
                required
              />
              <Input
                label="Nome Fantasia"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                requiredMark
                required
              />
            </div>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <Input
                label="CNPJ"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00"
              />
              <Input
                label="E-mail da Empresa"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                requiredMark
                required
              />
            </div>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <Input
                label="Telefone Fixo"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <Input
                label="Celular"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
              />
            </div>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <Input
                label="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
              <div className="form-group">
                <label>UF</label>
                <select value={uf} onChange={(e) => setUf(e.target.value)} className="auth-input">
                  <option value="AC">AC</option>
                  <option value="AL">AL</option>
                  <option value="AP">AP</option>
                  <option value="AM">AM</option>
                  <option value="BA">BA</option>
                  <option value="CE">CE</option>
                  <option value="DF">DF</option>
                  <option value="ES">ES</option>
                  <option value="GO">GO</option>
                  <option value="MA">MA</option>
                  <option value="MT">MT</option>
                  <option value="MS">MS</option>
                  <option value="MG">MG</option>
                  <option value="PA">PA</option>
                  <option value="PB">PB</option>
                  <option value="PR">PR</option>
                  <option value="PE">PE</option>
                  <option value="PI">PI</option>
                  <option value="RJ">RJ</option>
                  <option value="RN">RN</option>
                  <option value="RS">RS</option>
                  <option value="RO">RO</option>
                  <option value="RR">RR</option>
                  <option value="SC">SC</option>
                  <option value="SP">SP</option>
                  <option value="SE">SE</option>
                  <option value="TO">TO</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Administrador Inicial */}
          <Card title="Administrador Inicial" icon="👤">
            <div className="form-grid">
              <Input
                label="Nome Completo"
                value={adminNome}
                onChange={(e) => setAdminNome(e.target.value)}
                requiredMark
                required
              />
              <Input
                label="E-mail de Acesso"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                requiredMark
                required
              />
              <Input
                label="Telefone de Contato"
                value={adminTelefone}
                onChange={(e) => setAdminTelefone(e.target.value)}
              />
              <Input
                label="Senha de Acesso *"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                requiredMark
                required
              />
            </div>
          </Card>

          {/* Plano Comercial */}
          <Card title="Plano SaaS" icon="💳">
            <div className="form-grid">
              <div className="form-group">
                <label>Plano SaaS *</label>
                <select value={planoSaasId} onChange={(e) => handlePlanChange(e.target.value)} className="auth-input" required>
                  <option value="">Selecione um plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {p.valorMensal || 0}/mês
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status Inicial</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="auth-input">
                  <option value="TRIAL">TRIAL</option>
                  <option value="ATIVO">ATIVO</option>
                </select>
              </div>
              <Input
                label="Limite de Usuários"
                type="number"
                value={limiteUsuarios}
                onChange={(e) => setLimiteUsuarios(Number(e.target.value))}
                required
              />
            </div>

            {planoSaasId && (
              <div style={{
                marginTop: "1.5rem",
                padding: "1rem",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "0.375rem",
                backgroundColor: "rgba(0, 0, 0, 0.02)",
                fontSize: "0.875rem"
              }}>
                <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-primary, #1e293b)" }}>
                  Plano selecionado:
                </div>
                <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem" }}>
                  <li><strong>• Valor mensal:</strong> R$ {valorAssinatura}</li>
                  <li><strong>• Valor anual:</strong> R$ {((plans.find(p => p.id === planoSaasId) as any)?.valorAnual ?? (plans.find(p => p.id === planoSaasId) as any)?.valor_anual ?? (valorAssinatura * 12 * 0.9).toFixed(2))}</li>
                  <li><strong>• Limite de usuários:</strong> {limiteUsuarios}</li>
                  <li><strong>• Limite de clientes:</strong> {limiteClientes}</li>
                  <li><strong>• Limite de contratos:</strong> {limiteContratos}</li>
                  <li><strong>• Storage:</strong> {limiteStorageMb} MB</li>
                  <li><strong>• Trial:</strong> {trialDias} dias</li>
                </ul>
              </div>
            )}

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Observações Comerciais</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="auth-input"
                style={{ minHeight: "80px" }}
              />
            </div>
          </Card>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Button
              type="button"
              variant="cancel"
              onClick={() => router.push("/admin/tenants")}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Confirmar Cadastro"}
            </Button>
          </div>

        </div>
      </form>
    </div>
  );
}
