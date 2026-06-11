/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Password recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const checkRedirect = async (userId: string) => {
    try {
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("*, roles(nome)")
        .eq("id", userId)
        .maybeSingle();

      const role =
        (Array.isArray(profile?.roles)
          ? profile?.roles[0]?.nome
          : profile?.roles?.nome) ||
        profile?.role ||
        "";
      if (role.toUpperCase() === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkRedirect(session.user.id);
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        toast.error(signInErr.message || "E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }
      toast.success("Login realizado com sucesso!");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await checkRedirect(session.user.id);
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Ocorreu um erro ao realizar o login.");
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      toast.error("Por favor, preencha o e-mail.");
      return;
    }
    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        recoveryEmail,
        { redirectTo: window.location.origin + "/dashboard" }
      );
      if (error) {
        toast.error(error.message || "Erro ao solicitar recuperação.");
      } else {
        toast.success("E-mail de recuperação enviado com sucesso!");
        setIsRecovering(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const bullets = [
    { icon: "✓", text: "Multiempresa" },
    { icon: "✓", text: "Cobrança integrada" },
    { icon: "✓", text: "Atendimento organizado" },
    { icon: "✓", text: "Relatórios e auditoria" },
  ];

  return (
    <div className="lf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lf-root {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0b1b2e;
        }

        /* ──────────────────────────────────────
           LEFT PANEL
        ────────────────────────────────────── */
        .lf-left {
          flex: 1.1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 4rem 5rem;
          overflow: hidden;
          background: linear-gradient(145deg, #0d2137 0%, #0b3d2e 55%, #0a2d1f 100%);
        }

        /* animated orbs */
        .lf-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          pointer-events: none;
          animation: orb-float 12s ease-in-out infinite alternate;
        }
        .lf-orb-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #1a6fb0, transparent);
          top: -80px; left: -100px;
          animation-delay: 0s;
        }
        .lf-orb-2 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, #0f7a4a, transparent);
          bottom: -60px; right: -80px;
          animation-delay: -4s;
        }
        .lf-orb-3 {
          width: 280px; height: 280px;
          background: radial-gradient(circle, #c9960c, transparent);
          top: 50%; left: 60%;
          transform: translate(-50%, -50%);
          animation-delay: -8s;
        }

        @keyframes orb-float {
          0%   { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.12) translate(20px, -20px); }
        }

        /* grid overlay */
        .lf-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .lf-left-inner {
          position: relative;
          z-index: 10;
          max-width: 480px;
        }

        .lf-logo {
          width: 200px;
          height: auto;
          object-fit: contain;
          margin-bottom: 2.75rem;
          filter: drop-shadow(0 4px 18px rgba(0,0,0,0.35));
        }

        .lf-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          padding: 0.3rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.75);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 1.25rem;
        }

        .lf-badge::before {
          content: '';
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #2ecc71;
          display: inline-block;
          box-shadow: 0 0 8px #2ecc71;
        }

        .lf-headline {
          font-size: 2.75rem;
          font-weight: 900;
          line-height: 1.15;
          color: #ffffff;
          letter-spacing: -0.03em;
          margin-bottom: 1.25rem;
        }

        .lf-headline span {
          background: linear-gradient(90deg, #4fc3f7, #26a69a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lf-sub {
          font-size: 1.05rem;
          color: rgba(255,255,255,0.62);
          line-height: 1.7;
          margin-bottom: 2.25rem;
          max-width: 400px;
        }

        .lf-bullets {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          margin-bottom: 3rem;
        }

        .lf-bullet {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: rgba(255,255,255,0.82);
          font-weight: 500;
        }

        .lf-bullet-icon {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1b9a6a, #1565c0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: white;
          font-weight: 800;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }

        .lf-footer-text {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.3);
          margin-top: auto;
          padding-top: 2rem;
        }

        /* ──────────────────────────────────────
           RIGHT PANEL
        ────────────────────────────────────── */
        .lf-right {
          flex: 0.9;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2.5rem;
          background: #f4f6f9;
          min-height: 100vh;
        }

        .lf-card {
          background: #ffffff;
          border-radius: 22px;
          padding: 3rem 2.75rem;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 8px 48px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06);
          animation: card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lf-card-eyebrow {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #1b9a6a;
          margin-bottom: 0.5rem;
        }

        .lf-card-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f1c2e;
          letter-spacing: -0.03em;
          margin-bottom: 0.4rem;
          line-height: 1.2;
        }

        .lf-card-subtitle {
          font-size: 0.9rem;
          color: #7a8899;
          margin-bottom: 2.25rem;
        }

        .lf-divider {
          height: 1px;
          background: #edf0f4;
          margin-bottom: 2.25rem;
        }

        .lf-field {
          margin-bottom: 1.25rem;
        }

        .lf-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #3a4a5c;
          margin-bottom: 0.45rem;
          letter-spacing: 0.02em;
        }

        .lf-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .lf-input-svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #9baab8;
          pointer-events: none;
          flex-shrink: 0;
        }

        .lf-input {
          width: 100%;
          padding: 0.82rem 1rem 0.82rem 44px;
          border: 1.5px solid #dde3ec;
          border-radius: 11px;
          font-size: 0.93rem;
          font-family: inherit;
          color: #0f1c2e;
          background: #f9fafc;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .lf-input::placeholder { color: #b0bac6; }

        .lf-input:focus {
          border-color: #1b9a6a;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(27,154,106,0.1);
        }

        .lf-actions-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1.5rem;
          margin-top: -0.25rem;
        }

        .lf-forgot {
          font-size: 0.82rem;
          font-weight: 600;
          color: #1565c0;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          text-decoration: none;
          transition: color 0.18s;
        }
        .lf-forgot:hover { color: #1b9a6a; text-decoration: underline; }

        .lf-btn-primary {
          width: 100%;
          padding: 0.92rem;
          border: none;
          border-radius: 11px;
          background: linear-gradient(135deg, #1565c0 0%, #1b9a6a 100%);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 20px rgba(21,101,192,0.3);
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .lf-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(21,101,192,0.38);
        }
        .lf-btn-primary:active { transform: translateY(0); }
        .lf-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .lf-btn-secondary {
          width: 100%;
          padding: 0.88rem;
          border: 1.5px solid #dde3ec;
          border-radius: 11px;
          background: transparent;
          color: #4a5a6a;
          font-weight: 600;
          font-size: 0.95rem;
          font-family: inherit;
          cursor: pointer;
          margin-top: 0.75rem;
          transition: border-color 0.18s, color 0.18s, background 0.18s;
        }
        .lf-btn-secondary:hover {
          border-color: #b0bac6;
          background: #f4f6f9;
        }

        .lf-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin-anim 0.7s linear infinite;
        }
        @keyframes spin-anim { to { transform: rotate(360deg); } }

        .lf-secure-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1.5rem;
          font-size: 0.75rem;
          color: #9baab8;
        }

        /* ──────────────────────────────────────
           MOBILE
        ────────────────────────────────────── */
        @media (max-width: 900px) {
          .lf-root { flex-direction: column; }

          .lf-left {
            padding: 2.5rem 2rem;
            align-items: center;
            text-align: center;
          }

          .lf-left-inner { max-width: 100%; align-items: center; display: flex; flex-direction: column; }

          .lf-logo { width: 160px; margin-bottom: 1.5rem; }

          .lf-headline { font-size: 1.85rem; }

          .lf-sub { font-size: 0.95rem; }

          .lf-bullets { align-items: flex-start; width: 100%; max-width: 340px; }

          .lf-footer-text { display: none; }

          .lf-right {
            flex: 1;
            padding: 2rem 1.25rem;
            background: #f4f6f9;
            min-height: unset;
          }

          .lf-card {
            padding: 2.25rem 1.75rem;
            border-radius: 18px;
          }
        }

        @media (max-width: 480px) {
          .lf-left { padding: 2rem 1.25rem; }
          .lf-headline { font-size: 1.6rem; }
          .lf-card { padding: 1.75rem 1.25rem; }
        }
      `}</style>

      {/* ── LEFT: Institutional Panel ── */}
      <div className="lf-left">
        <div className="lf-orb lf-orb-1" />
        <div className="lf-orb lf-orb-2" />
        <div className="lf-orb lf-orb-3" />
        <div className="lf-grid" />

        <div className="lf-left-inner">
          <img src="/logo_legacy.png" alt="Memorius" className="lf-logo" />

          <div className="lf-badge">Plataforma SaaS Funerária</div>

          <h1 className="lf-headline">
            Gestão funerária <span>moderna, segura</span> e inteligente.
          </h1>

          <p className="lf-sub">
            Controle planos, contratos, mensalidades, atendimentos e cobranças
            em uma única plataforma — do operacional ao financeiro.
          </p>

          <div className="lf-bullets">
            {bullets.map((b) => (
              <div key={b.text} className="lf-bullet">
                <span className="lf-bullet-icon">{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>

          <p className="lf-footer-text">
            © {new Date().getFullYear()} Memorius · www.memorius.com.br
          </p>
        </div>
      </div>

      {/* ── RIGHT: Auth Card ── */}
      <div className="lf-right">
        <div className="lf-card">
          {!isRecovering ? (
            <>
              <p className="lf-card-eyebrow">Acesso ao sistema</p>
              <h2 className="lf-card-title">Bem-vindo ao Memorius</h2>
              <p className="lf-card-subtitle">Entre com suas credenciais de acesso</p>
              <div className="lf-divider" />

              <form onSubmit={handleLogin} noValidate>
                <div className="lf-field">
                  <label className="lf-label" htmlFor="email">E-mail</label>
                  <div className="lf-input-wrap">
                    <svg className="lf-input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input
                      id="email"
                      type="email"
                      required
                      className="lf-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@empresa.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="lf-field">
                  <label className="lf-label" htmlFor="password">Senha</label>
                  <div className="lf-input-wrap">
                    <svg className="lf-input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      id="password"
                      type="password"
                      required
                      className="lf-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha de acesso"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="lf-actions-row">
                  <button
                    type="button"
                    className="lf-forgot"
                    onClick={() => setIsRecovering(true)}
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  className="lf-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="lf-spinner" /> Entrando...</>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>

              <div className="lf-secure-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Conexão segura · Criptografia SSL
              </div>
            </>
          ) : (
            <>
              <p className="lf-card-eyebrow">Recuperação de acesso</p>
              <h2 className="lf-card-title">Redefinir Senha</h2>
              <p className="lf-card-subtitle">
                Informe seu e-mail para receber o link de redefinição
              </p>
              <div className="lf-divider" />

              <form onSubmit={handleRecovery} noValidate>
                <div className="lf-field" style={{ marginBottom: "1.75rem" }}>
                  <label className="lf-label" htmlFor="recoveryEmail">
                    E-mail Cadastrado
                  </label>
                  <div className="lf-input-wrap">
                    <svg className="lf-input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input
                      id="recoveryEmail"
                      type="email"
                      required
                      className="lf-input"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="seuemail@empresa.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="lf-btn-primary"
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? (
                    <><span className="lf-spinner" /> Enviando...</>
                  ) : (
                    "Enviar E-mail de Recuperação"
                  )}
                </button>

                <button
                  type="button"
                  className="lf-btn-secondary"
                  onClick={() => setIsRecovering(false)}
                >
                  ← Voltar ao Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
