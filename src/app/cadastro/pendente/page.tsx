"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PendenteContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const plano = searchParams.get("plano") || "profissional";

  const [loadingResend, setLoadingResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ message: string; success: boolean } | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setLoadingResend(true);
    setResendStatus(null);

    try {
      const res = await fetch("/api/trial/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao reenviar confirmação.");
      }

      setResendStatus({
        success: true,
        message: data.message || "E-mail de confirmação reenviado com sucesso!",
      });
    } catch (err: unknown) {
      const error = err as Error;
      setResendStatus({
        success: false,
        message: error.message || "Erro ao reenviar e-mail.",
      });
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <div className="pendente-wrapper">
      <style jsx>{`
        .pendente-wrapper {
          min-height: 100vh;
          background: #F7F9FC;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #101A37;
          display: flex;
          flex-direction: column;
        }

        .pendente-header {
          background: #FFFFFF;
          border-bottom: 1px solid #E5EAF0;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pendente-container {
          max-width: 580px;
          margin: 60px auto;
          padding: 0 20px;
          width: 100%;
          box-sizing: border-box;
          text-align: center;
        }

        .pendente-card {
          background: #FFFFFF;
          border: 1px solid #E5EAF0;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(15, 35, 55, 0.06);
          padding: 44px 36px;
          box-sizing: border-box;
        }

        .icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #E8F8F2;
          color: #008C66;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .pendente-title {
          font-size: 24px;
          font-weight: 800;
          color: #0C1738;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .pendente-desc {
          font-size: 14px;
          color: #52627B;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }

        .email-highlight {
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 15px;
          font-weight: 700;
          color: #003D33;
          display: inline-block;
          margin-bottom: 24px;
          word-break: break-all;
        }

        .pendente-instructions {
          text-align: left;
          background: #FAFCFE;
          border: 1px solid #E5EAF0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 28px;
          font-size: 13px;
          color: #34435E;
          line-height: 1.5;
        }

        .pendente-instructions ol {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }

        .pendente-instructions li {
          margin-bottom: 6px;
        }

        .resend-btn {
          background: transparent;
          border: 1px solid #008C66;
          color: #008C66;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .resend-btn:hover:not(:disabled) {
          background: #E8F8F2;
        }

        .resend-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .feedback-box {
          margin-top: 16px;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 14px;
          border-radius: 8px;
        }

        .feedback-box.success {
          background: #E8F8F2;
          color: #008C66;
          border: 1px solid #A7F3D0;
        }

        .feedback-box.error {
          background: #FFF1F1;
          color: #991B1B;
          border: 1px solid #FFC9C9;
        }
      `}</style>

      {/* Header */}
      <header className="pendente-header">
        <Link href="/" title="Voltar para a Página Inicial" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Memorius" style={{ height: "30px", objectFit: "contain" }} />
        </Link>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#52627B",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: "8px",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Página Inicial</span>
        </Link>
      </header>

      {/* Card Central */}
      <main className="pendente-container">
        <div className="pendente-card">
          <div className="icon-circle">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>

          <h1 className="pendente-title">Quase lá! Confirme seu e-mail</h1>
          <p className="pendente-desc">
            Enviamos um link de ativação exclusivo para o e-mail informado:
          </p>

          <div className="email-highlight">
            {email || "seu-email@empresa.com.br"}
          </div>

          <div className="pendente-instructions">
            <strong>Passos para ativar seu teste grátis:</strong>
            <ol>
              <li>Abra a sua caixa de entrada e procure pelo e-mail do <strong>Memorius</strong>.</li>
              <li>Clique no botão <strong>Confirmar E-mail e Iniciar Teste</strong>.</li>
              <li>Sua conta e o período de <strong>7 dias de teste</strong> serão liberados imediatamente.</li>
            </ol>
          </div>

          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "14px" }}>
            Não recebeu a mensagem? Verifique sua caixa de spam ou lixo eletrônico.
          </p>

          <button
            onClick={handleResend}
            className="resend-btn"
            disabled={loadingResend || !email}
          >
            {loadingResend ? "Reenviando e-mail..." : "Reenviar e-mail de confirmação"}
          </button>

          {resendStatus && (
            <div className={`feedback-box ${resendStatus.success ? "success" : "error"}`}>
              {resendStatus.message}
            </div>
          )}

          <div style={{ marginTop: "28px", borderTop: "1px solid #E5EAF0", paddingTop: "20px" }}>
            <Link
              href={`/cadastro?plano=${plano}`}
              style={{ fontSize: "12px", color: "#64748B", textDecoration: "underline" }}
            >
              ← Corrigir e-mail ou dados informados
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CadastroPendentePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Carregando status de confirmação...</div>}>
      <PendenteContent />
    </Suspense>
  );
}
