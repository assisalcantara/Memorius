"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface PlanOption {
  slug: string;
  name: string;
  badge?: string;
  price: string;
  users: string;
  contracts: string;
}

const PLANS: PlanOption[] = [
  {
    slug: "essencial",
    name: "Essencial",
    price: "R$ 149,90",
    users: "Até 2 usuários",
    contracts: "Até 500 contratos",
  },
  {
    slug: "profissional",
    name: "Profissional",
    badge: "Mais Escolhido",
    price: "R$ 249,90",
    users: "Até 5 usuários",
    contracts: "Até 2.000 contratos",
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "R$ 499,90",
    users: "Até 15 usuários",
    contracts: "Até 10.000 contratos",
  },
];

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanSlug = (searchParams.get("plano") || "profissional").toLowerCase();

  const [selectedPlan, setSelectedPlan] = useState<string>(
    PLANS.some((p) => p.slug === initialPlanSlug) ? initialPlanSlug : "profissional"
  );

  const [empresa, setEmpresa] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Máscara de WhatsApp / Telefone brasileiro (11 dígitos)
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    setWhatsapp(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validações locais
    if (!empresa.trim()) {
      setErrorMsg("Informe o nome da sua empresa.");
      return;
    }
    if (!responsavel.trim()) {
      setErrorMsg("Informe o nome completo do responsável.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Informe um e-mail válido.");
      return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Informe um número de WhatsApp com DDD válido.");
      return;
    }
    if (!aceiteTermos) {
      setErrorMsg("Você precisa aceitar os Termos de Uso e Política de Privacidade para prosseguir.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/trial/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresa.trim(),
          responsavel: responsavel.trim(),
          email: email.trim(),
          whatsapp: cleanPhone,
          plano: selectedPlan,
          aceiteTermos,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro ao processar o cadastro.");
      }

      if (data.alreadyRegistered) {
        // Redireciona para login caso já exista conta
        router.push("/login");
        return;
      }

      // Redireciona para tela de confirmação pendente
      router.push(`/cadastro/pendente?email=${encodeURIComponent(email.trim())}&plano=${selectedPlan}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trial-page-wrapper">
      <style jsx>{`
        .trial-page-wrapper {
          min-height: 100vh;
          background: #F7F9FC;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #101A37;
          display: flex;
          flex-direction: column;
        }

        .trial-header {
          background: #FFFFFF;
          border-bottom: 1px solid #E5EAF0;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .trial-brand-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .trial-brand-link:hover {
          opacity: 0.9;
        }

        .trial-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .trial-back-home-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #52627B;
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 8px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          transition: all 0.15s ease;
        }

        .trial-back-home-link:hover {
          background: #E2E8F0;
          color: #0C1738;
        }

        .trial-login-link {
          font-size: 13px;
          color: #008C66;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .trial-login-link:hover {
          color: #006D50;
          text-decoration: underline;
        }

        .trial-container {
          max-width: 860px;
          margin: 40px auto;
          padding: 0 20px;
          width: 100%;
          box-sizing: border-box;
          flex: 1;
        }

        .trial-header-box {
          text-align: center;
          margin-bottom: 28px;
        }

        .trial-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 140, 102, 0.1);
          color: #008C66;
          border: 1px solid rgba(0, 140, 102, 0.25);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 99px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .trial-title {
          font-size: 28px;
          font-weight: 800;
          color: #0C1738;
          margin: 0 0 8px 0;
          line-height: 1.25;
        }

        .trial-subtitle {
          font-size: 14px;
          color: #52627B;
          margin: 0;
          line-height: 1.5;
        }

        .trial-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(15, 35, 55, 0.05);
          padding: 32px 36px;
          box-sizing: border-box;
        }

        .trial-plan-selector-title {
          font-size: 14px;
          font-weight: 700;
          color: #0C1738;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .trial-plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .trial-plan-card-option {
          border: 2px solid #E5EAF0;
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          background: #FAFCFE;
          transition: all 0.15s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .trial-plan-card-option:hover {
          border-color: #CBD5E1;
          background: #FFFFFF;
        }

        .trial-plan-card-option.selected {
          border-color: #008C66;
          background: #F2FAF7;
          box-shadow: 0 4px 12px rgba(0, 140, 102, 0.12);
        }

        .trial-plan-mini-badge {
          position: absolute;
          top: -9px;
          right: 10px;
          background: #F5BD22;
          color: #0C1738;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 99px;
          text-transform: uppercase;
        }

        .trial-plan-card-name {
          font-size: 14px;
          font-weight: 800;
          color: #0C1738;
          margin-bottom: 4px;
        }

        .trial-plan-card-price {
          font-size: 15px;
          font-weight: 700;
          color: #008C66;
          margin-bottom: 6px;
        }

        .trial-plan-card-meta {
          font-size: 11px;
          color: #64748B;
          line-height: 1.4;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: #34435E;
        }

        .form-input {
          height: 44px;
          padding: 0 14px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 14px;
          color: #0C1738;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          width: 100%;
        }

        .form-input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.15);
        }

        .terms-checkbox-wrap {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 20px 0 24px 0;
          font-size: 12px;
          color: #52627B;
          line-height: 1.5;
        }

        .terms-checkbox-wrap input {
          margin-top: 3px;
          accent-color: #008C66;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .submit-btn {
          width: 100%;
          height: 48px;
          background: #008C66;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(0, 140, 102, 0.25);
        }

        .submit-btn:hover:not(:disabled) {
          background: #007656;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .error-alert {
          background: #FFF1F1;
          border: 1px solid #FFC9C9;
          border-radius: 8px;
          color: #991B1B;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trial-footer-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
          font-size: 12px;
          color: #64748B;
        }

        .trial-footer-info span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        @media (max-width: 768px) {
          .trial-plans-grid {
            grid-template-columns: 1fr;
          }
          .form-grid-2 {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .trial-card {
            padding: 24px 20px;
          }
          .trial-title {
            font-size: 23px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="trial-header">
        <Link href="/" className="trial-brand-link" title="Voltar para a Página Inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Memorius" style={{ height: "32px", objectFit: "contain" }} />
        </Link>
        <div className="trial-header-actions">
          <Link href="/" className="trial-back-home-link" title="Voltar para a Página Inicial">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Voltar ao Início</span>
          </Link>
          <Link href="/login" className="trial-login-link">
            Já tem conta? Entrar →
          </Link>
        </div>
      </header>

      {/* Main Form */}
      <main className="trial-container">
        <div className="trial-header-box">
          <div className="trial-badge">
            ✓ 7 Dias Grátis • Sem Cartão de Crédito
          </div>
          <h1 className="trial-title">Inicie seu teste grátis no Memorius</h1>
          <p className="trial-subtitle">
            Crie sua conta em segundos e experimente todas as funcionalidades do sistema na nuvem com isolamento completo.
          </p>
        </div>

        <div className="trial-card">
          {errorMsg && (
            <div className="error-alert">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Seletor do Plano Escolhido */}
            <div className="trial-plan-selector-title">
              <span>Selecione o plano do seu teste:</span>
              <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                100% dos recursos inclusos no teste
              </span>
            </div>

            <div className="trial-plans-grid">
              {PLANS.map((p) => {
                const isSelected = selectedPlan === p.slug;
                return (
                  <div
                    key={p.slug}
                    className={`trial-plan-card-option ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedPlan(p.slug)}
                  >
                    {p.badge && <span className="trial-plan-mini-badge">{p.badge}</span>}
                    <div>
                      <div className="trial-plan-card-name">Plano {p.name}</div>
                      <div className="trial-plan-card-price">{p.price}<span style={{ fontSize: "10px", color: "#64748B" }}>/mês</span></div>
                    </div>
                    <div className="trial-plan-card-meta">
                      {p.users} • {p.contracts}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linha 1: Empresa e Responsável */}
            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Empresa / Funerária *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Plano de Assistência Familiar Silva"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Responsável *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: João da Silva"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Linha 2: E-mail Corporativo e WhatsApp */}
            <div className="form-grid-2" style={{ marginTop: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">E-mail de Acesso *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="seuemail@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">WhatsApp com DDD *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="(00) 00000-0000"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  maxLength={15}
                  required
                />
              </div>
            </div>

            {/* Aceite dos Termos */}
            <div className="terms-checkbox-wrap">
              <input
                type="checkbox"
                id="aceite"
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
                required
              />
              <label htmlFor="aceite">
                Declaro que li e concordo com os <strong>Termos de Uso</strong> e com a <strong>Política de Privacidade</strong> do Memorius. Compreendo que este é um teste grátis de 7 dias sem cobrança inicial.
              </label>
            </div>

            {/* Botão de Envio */}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Registrando solicitação..." : "Iniciar Teste Grátis de 7 Dias →"}
            </button>
          </form>
        </div>

        {/* Garantias do Rodapé */}
        <div className="trial-footer-info">
          <span>🔒 Criptografia ponta a ponta</span>
          <span>⚡ Ativação imediata pós-confirmação</span>
          <span>💳 Sem cartão de crédito</span>
        </div>
      </main>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Carregando formulário de cadastro...</div>}>
      <CadastroContent />
    </Suspense>
  );
}
