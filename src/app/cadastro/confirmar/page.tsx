"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ConfirmarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [successData, setSuccessData] = useState<{
    message: string;
    empresa?: string;
    email?: string;
    plano?: string;
    trialExpiresAt?: string;
  } | null>(null);

  const [errorState, setErrorState] = useState<{
    code: string;
    message: string;
    email?: string;
  } | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorState({
        code: "NO_TOKEN",
        message: "Nenhum token de verificação foi informado no link.",
      });
    }
  }, [token]);

  const handleConfirmActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (senha.length < 6) {
      setFormError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setFormError("A confirmação de senha não confere.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/trial/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorState({
          code: data.code || "ERROR",
          message: data.error || "Link de confirmação inválido ou expirado.",
          email: data.email,
        });
      } else {
        setSuccessData({
          message: data.message,
          empresa: data.empresa,
          email: data.email,
          plano: data.plano,
          trialExpiresAt: data.trialExpiresAt,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Erro de conexão ao ativar teste.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!errorState?.email) return;
    setResendLoading(true);
    setResendMsg(null);

    try {
      const res = await fetch("/api/trial/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: errorState.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResendMsg("Novo e-mail enviado! Verifique sua caixa de entrada.");
    } catch (err: unknown) {
      const error = err as Error;
      setResendMsg(error.message || "Falha ao reenviar.");
    } finally {
      setResendLoading(false);
    }
  };

  const formatExpiry = (isoString?: string) => {
    if (!isoString) return "7 dias";
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="confirm-wrapper">
      <style jsx>{`
        .confirm-wrapper {
          min-height: 100vh;
          background: #F7F9FC;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #101A37;
          display: flex;
          flex-direction: column;
        }

        .confirm-header {
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          padding: 0 32px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .confirm-brand-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .confirm-brand-link:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .confirm-back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 9999px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          transition: all 0.18s ease;
        }

        .confirm-back-link:hover {
          background: #EEF2F6;
          color: #0F172A;
          border-color: #CBD5E1;
          transform: translateX(-1px);
        }

        .confirm-container {
          max-width: 580px;
          margin: 50px auto;
          padding: 0 20px;
          width: 100%;
          box-sizing: border-box;
          text-align: center;
        }

        .confirm-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(15, 35, 55, 0.06);
          padding: 38px 36px;
          box-sizing: border-box;
        }

        .icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .icon-circle.success {
          background: #E8F8F2;
          color: #008C66;
        }

        .icon-circle.error {
          background: #FFF1F1;
          color: #EF4444;
        }

        .icon-circle.setup {
          background: #F2FAF7;
          color: #008C66;
        }

        .confirm-title {
          font-size: 24px;
          font-weight: 800;
          color: #0C1738;
          margin: 0 0 10px 0;
          line-height: 1.3;
        }

        .confirm-desc {
          font-size: 14px;
          color: #52627B;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }

        .details-box {
          background: #FAFCFE;
          border: 1px solid #E5EAF0;
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 24px;
          text-align: left;
          font-size: 13px;
        }

        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #EEF2F6;
        }

        .details-row:last-child {
          border-bottom: none;
        }

        .details-label {
          color: #64748B;
          font-weight: 500;
        }

        .details-value {
          color: #0C1738;
          font-weight: 700;
        }

        .form-group {
          text-align: left;
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
          box-sizing: border-box;
          width: 100%;
        }

        .form-input:focus {
          border-color: #008C66;
          box-shadow: 0 0 0 3px rgba(0, 140, 102, 0.15);
        }

        .action-btn {
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
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(0, 140, 102, 0.25);
        }

        .action-btn:hover:not(:disabled) {
          background: #007656;
          transform: translateY(-1px);
        }

        .action-btn:disabled {
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
          margin-bottom: 16px;
          text-align: left;
        }

        .resend-box {
          margin-top: 24px;
          border-top: 1px solid #E5EAF0;
          padding-top: 20px;
        }
      `}</style>

      {/* Header */}
      <header className="confirm-header">
        <Link href="/" className="confirm-brand-link" title="Voltar para a Página Inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Memorius" style={{ height: "36px", width: "auto", objectFit: "contain" }} />
        </Link>
        <Link
          href="/"
          className="confirm-back-link"
          title="Voltar para a Página Inicial"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Voltar ao Início</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="confirm-container">
        <div className="confirm-card">
          {/* 1. Formulário de Ativação (Definição Segura da Senha) */}
          {!successData && !errorState && (
            <div>
              <div className="icon-circle setup">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>

              <h1 className="confirm-title">Quase lá! Crie sua senha de acesso</h1>
              <p className="confirm-desc">
                Seu e-mail foi validado. Defina a senha para acessar o painel administrativo da sua empresa. O período de <strong>7 dias de teste</strong> começará imediatamente.
              </p>

              {formError && (
                <div className="error-alert">
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleConfirmActivation}>
                <div className="form-group">
                  <label className="form-label">Criar Senha de Acesso *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmar Senha *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repita sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <button type="submit" className="action-btn" disabled={loading} style={{ marginTop: 12 }}>
                  {loading ? "Ativando ambiente e teste..." : "Ativar Teste Grátis de 7 Dias →"}
                </button>
              </form>
            </div>
          )}

          {/* 2. Success State */}
          {successData && (
            <div>
              <div className="icon-circle success">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>

              <h1 className="confirm-title">Teste Grátis Ativado com Sucesso!</h1>
              <p className="confirm-desc">
                Sua conta no <strong>Memorius</strong> foi ativada com isolamento multi-tenant total. Você já tem acesso irrestrito a todos os recursos.
              </p>

              <div className="details-box">
                {successData.empresa && (
                  <div className="details-row">
                    <span className="details-label">Empresa:</span>
                    <span className="details-value">{successData.empresa}</span>
                  </div>
                )}
                {successData.email && (
                  <div className="details-row">
                    <span className="details-label">E-mail:</span>
                    <span className="details-value">{successData.email}</span>
                  </div>
                )}
                <div className="details-row">
                  <span className="details-label">Plano Selecionado:</span>
                  <span className="details-value">Plano {successData.plano || "Profissional"}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Período de Teste:</span>
                  <span className="details-value" style={{ color: "#008C66" }}>7 dias grátis</span>
                </div>
                {successData.trialExpiresAt && (
                  <div className="details-row">
                    <span className="details-label">Válido até:</span>
                    <span className="details-value">{formatExpiry(successData.trialExpiresAt)}</span>
                  </div>
                )}
              </div>

              <Link href="/login" className="action-btn">
                Acessar Plataforma Agora →
              </Link>
            </div>
          )}

          {/* 3. Error / Expired State */}
          {errorState && (
            <div>
              <div className="icon-circle error">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>

              <h1 className="confirm-title">
                {errorState.code === "EXPIRED_TOKEN" ? "Link de Confirmação Expirado" : "Link Inválido"}
              </h1>
              <p className="confirm-desc">{errorState.message}</p>

              {errorState.email && (
                <div className="resend-box">
                  <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "12px" }}>
                    Deseja receber um novo link de confirmação para <strong>{errorState.email}</strong>?
                  </p>
                  <button
                    onClick={handleResend}
                    className="action-btn"
                    style={{ background: "#003D33" }}
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Enviando..." : "Solicitar Novo Link de Ativação"}
                  </button>
                  {resendMsg && (
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#008C66", marginTop: 12 }}>
                      {resendMsg}
                    </p>
                  )}
                </div>
              )}

              <div style={{ marginTop: "24px" }}>
                <Link href="/cadastro" style={{ fontSize: "13px", color: "#008C66", fontWeight: 700 }}>
                  ← Voltar para a página de cadastro
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ConfirmarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Validando link de teste...</div>}>
      <ConfirmarContent />
    </Suspense>
  );
}
