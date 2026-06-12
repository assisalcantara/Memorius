/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Password recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const checkRedirect = useCallback(async (userId: string) => {
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
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);

    // 1. Try to redirect instantly using cached local storage data
    if (typeof window !== "undefined") {
      const cachedUserStr = localStorage.getItem("legacyflow_user");
      if (cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr);
          const role = cachedUser.tipo || "";
          if (role.toUpperCase() === "SUPER_ADMIN") {
            router.push("/admin");
            clearTimeout(t);
            return;
          } else {
            router.push("/dashboard");
            clearTimeout(t);
            return;
          }
        } catch {
          // Fallback to normal flow
        }
      }
    }

    // 2. Otherwise do the normal async verification
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkRedirect(session.user.id);
      } else {
        setCheckingSession(false);
      }
    });

    return () => clearTimeout(t);
  }, [router, checkRedirect]);

  if (!mounted) {
    return (
      <div style={{
        backgroundColor: "#f8fafc",
        height: "100vh",
        width: "100vw"
      }} />
    );
  }

  const hasCachedSession = typeof window !== "undefined" && !!localStorage.getItem("legacyflow_user");

  if (hasCachedSession && checkingSession) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div className="lf-spinner-light" />
        <span style={{ opacity: 0.8, fontSize: "0.95rem", marginTop: "1rem" }}>Carregando...</span>
        <style>{`
          .lf-spinner-light {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(15,23,42,0.1);
            border-top-color: #0b4f59;
            border-radius: 50%;
            animation: spin-anim-light 0.8s linear infinite;
          }
          @keyframes spin-anim-light { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#060b13",
        color: "white",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div className="lf-spinner-init" />
        <span style={{ opacity: 0.8, fontSize: "0.95rem", marginTop: "1rem" }}>Carregando...</span>
        <style>{`
          .lf-spinner-init {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #00d2ff;
            border-radius: 50%;
            animation: spin-anim-init 0.8s linear infinite;
          }
          @keyframes spin-anim-init { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

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
          background: #060b13;
          overflow-x: hidden;
        }

        /* ──────────────────────────────────────
           LEFT PANEL (HERO)
        ────────────────────────────────────── */
        .lf-left {
          flex: 1.2;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 5rem 6rem;
          overflow: hidden;
          background: linear-gradient(135deg, #070e17 0%, #0c1a2e 50%, #061f16 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.03);
        }

        /* Ambient Orbs */
        .lf-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
          pointer-events: none;
        }
        .lf-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #00d2ff, transparent 70%);
          top: -100px; left: -100px;
          animation: float-slow 15s ease-in-out infinite alternate;
        }
        .lf-orb-2 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, #00ff87, transparent 70%);
          bottom: -100px; right: -50px;
          animation: float-slow 18s ease-in-out infinite alternate-reverse;
        }

        /* CSS Abstract Shapes */
        .lf-shape {
          position: absolute;
          opacity: 0.03;
          border: 2px solid #ffffff;
          pointer-events: none;
        }
        .lf-shape-1 {
          width: 300px; height: 300px;
          border-radius: 38% 62% 63% 37% / 41% 44% 56% 59%;
          top: 20%; right: 10%;
          animation: spin-slow 25s linear infinite;
        }
        .lf-shape-2 {
          width: 200px; height: 200px;
          border-radius: 53% 47% 34% 66% / 56% 36% 64% 44%;
          bottom: 25%; left: 15%;
          animation: spin-slow 35s linear infinite reverse;
        }

        @keyframes float-slow {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -30px) scale(1.08); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Grid Background overlay */
        .lf-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
        }

        .lf-left-inner {
          position: relative;
          z-index: 10;
          max-width: 540px;
          width: 100%;
        }

        /* Header Logo Section */
        .lf-logo-area {
          margin-bottom: 3rem;
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .lf-logo {
          height: 55px; /* increased ~30% from 42px */
          width: auto;
          object-fit: contain;
          margin-bottom: 0.5rem;
          display: block;
        }
        .lf-logo-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding-left: 2px;
        }

        /* Badge */
        .lf-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          padding: 0.35rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          letter-spacing: 0.05em;
          margin-bottom: 1.5rem;
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .lf-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #00ff87;
          box-shadow: 0 0 10px #00ff87;
        }

        /* Headline & Subtitle */
        .lf-headline {
          font-size: 2.85rem;
          font-weight: 900;
          line-height: 1.15;
          color: #ffffff;
          letter-spacing: -0.03em;
          margin-bottom: 1.25rem;
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .lf-headline span {
          background: linear-gradient(90deg, #00d2ff, #00ff87);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lf-sub {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.65;
          margin-bottom: 2.5rem;
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }

        /* Bullets */
        .lf-bullets {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-bottom: 3.5rem;
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
        }
        .lf-bullet {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 500;
        }
        .lf-bullet-icon {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(0, 255, 135, 0.1);
          border: 1px solid rgba(0, 255, 135, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: #00ff87;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* Institutional Stats Block */
        .lf-inst-block {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 2rem;
          margin-top: auto;
          width: 100%;
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        .lf-inst-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem 1rem;
        }
        .lf-inst-item {
          display: flex;
          flex-direction: column;
        }
        .lf-inst-val {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: 0.15rem;
        }
        .lf-inst-lbl {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        /* ──────────────────────────────────────
           RIGHT PANEL (CARD)
        ────────────────────────────────────── */
        .lf-right {
          flex: 0.8;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 3.5rem;
          background: #070e17;
          position: relative;
        }

        .lf-card {
          background: #ffffff;
          border-radius: 24px; /* improved to 24px */
          padding: 3.25rem 3rem;
          width: 100%;
          max-width: 450px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow:
            0 10px 40px -10px rgba(0, 0, 0, 0.3),
            0 1px 1px rgba(0, 0, 0, 0.05),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: anim-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
          position: relative;
          z-index: 10;
        }

        .lf-card-eyebrow {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #0b4f59;
          margin-bottom: 0.6rem;
        }

        .lf-card-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0c1524;
          letter-spacing: -0.03em;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .lf-card-subtitle {
          font-size: 0.92rem;
          color: #64748b;
          margin-bottom: 2rem;
        }

        .lf-divider {
          height: 1px;
          background: #e2e8f0;
          margin-bottom: 2rem;
        }

        .lf-field {
          margin-bottom: 1.5rem;
        }

        .lf-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.5rem;
          letter-spacing: 0.01em;
        }

        /* Inputs and Alignment */
        .lf-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .lf-input-svg {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #94a3b8;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        input.lf-input[type="email"],
        input.lf-input[type="password"],
        input.lf-input {
          width: 100% !important;
          height: 48px !important;
          padding: 0.5rem 1rem 0.5rem 48px !important;
          border: 1.5px solid #cbd5e1 !important;
          border-radius: 12px !important;
          font-size: 0.95rem !important;
          font-family: inherit !important;
          color: #0f172a !important;
          background: #f8fafc !important;
          outline: none !important;
          transition: all 0.2s ease !important;
          box-sizing: border-box !important;
        }

        input.lf-input::placeholder { color: #94a3b8 !important; }

        input.lf-input:hover {
          border-color: #94a3b8 !important;
          background: #f1f5f9 !important;
        }

        input.lf-input:focus {
          border-color: #0b4f59 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(11, 79, 89, 0.12) !important;
        }

        input.lf-input:focus + .lf-input-svg {
          color: #0b4f59 !important;
        }

        .lf-actions-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1.75rem;
          margin-top: -0.5rem;
        }

        .lf-forgot {
          font-size: 0.85rem;
          font-weight: 600;
          color: #0b4f59;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          text-decoration: none;
          transition: color 0.18s;
        }
        .lf-forgot:hover {
          color: #0ea5e9;
          text-decoration: underline;
        }

        /* Premium Submit Button */
        .lf-btn-primary {
          width: 100%;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #0b4f59 0%, #115e6b 100%);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 18px rgba(11, 79, 89, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
        }
        .lf-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(11, 79, 89, 0.35);
          filter: brightness(1.08);
        }
        .lf-btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(11, 79, 89, 0.2);
        }
        .lf-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .lf-btn-secondary {
          width: 100%;
          padding: 0.9rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          background: transparent;
          color: #475569;
          font-weight: 600;
          font-size: 0.95rem;
          font-family: inherit;
          cursor: pointer;
          margin-top: 0.85rem;
          transition: all 0.2s ease;
        }
        .lf-btn-secondary:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
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
          margin-top: 1.75rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        /* ──────────────────────────────────────
           ANIMATIONS
        ────────────────────────────────────── */
        @keyframes anim-fade-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ──────────────────────────────────────
           RESPONSIVENESS (MOBILE)
        ────────────────────────────────────── */
        @media (max-width: 1024px) {
          .lf-left {
            padding: 4rem 3rem;
          }
        }

        @media (max-width: 900px) {
          .lf-root { flex-direction: column; }

          .lf-left {
            padding: 3rem 2rem;
            align-items: center;
            text-align: center;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .lf-left-inner {
            align-items: center;
            display: flex;
            flex-direction: column;
          }

          .lf-logo-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 2rem;
          }

          .lf-logo {
            height: 48px;
            margin-bottom: 0.4rem;
          }

          .lf-headline {
            font-size: 2rem;
          }

          .lf-sub {
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }

          .lf-bullets {
            align-items: flex-start;
            width: 100%;
            max-width: 380px;
            margin-bottom: 2rem;
          }

          /* Hide institutional stats grid on mobile */
          .lf-inst-block {
            display: none;
          }

          .lf-right {
            flex: 1;
            padding: 3rem 1.5rem;
            min-height: unset;
          }

          .lf-card {
            padding: 2.5rem 2rem;
            border-radius: 20px;
          }
        }

        @media (max-width: 480px) {
          .lf-left { padding: 2.5rem 1.25rem; }
          .lf-headline { font-size: 1.75rem; }
          .lf-card { padding: 2rem 1.25rem; }
        }
      `}</style>

      {/* ── LEFT: Institutional Panel ── */}
      <div className="lf-left">
        <div className="lf-orb lf-orb-1" />
        <div className="lf-orb lf-orb-2" />
        <div className="lf-shape lf-shape-1" />
        <div className="lf-shape lf-shape-2" />
        <div className="lf-grid" />

        <div className="lf-left-inner">
          <div className="lf-logo-area">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_legacy.png" alt="Memorius" className="lf-logo" />
            <div className="lf-logo-tag">Plataforma SaaS</div>
          </div>

          <div className="lf-badge">
            <span className="lf-badge-dot" />
            Plataforma SaaS para Gestão Funerária
          </div>

          <h1 className="lf-headline">
            Gestão funerária <span>moderna, segura</span> e inteligente.
          </h1>

          <p className="lf-sub">
            Controle planos, contratos, mensalidades, atendimentos e cobranças em uma única plataforma.
          </p>

          <div className="lf-bullets">
            {bullets.map((b) => (
              <div key={b.text} className="lf-bullet">
                <span className="lf-bullet-icon">{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>

          <div className="lf-inst-block">
            <div className="lf-inst-grid">
              <div className="lf-inst-item">
                <span className="lf-inst-val">Atuação Nacional</span>
                <span className="lf-inst-lbl">em todo o Brasil</span>
              </div>
              <div className="lf-inst-item">
                <span className="lf-inst-val">99,9%</span>
                <span className="lf-inst-lbl">disponibilidade</span>
              </div>
              <div className="lf-inst-item">
                <span className="lf-inst-val">Suporte</span>
                <span className="lf-inst-lbl">especializado</span>
              </div>
              <div className="lf-inst-item">
                <span className="lf-inst-val">Atualizações</span>
                <span className="lf-inst-lbl">contínuas</span>
              </div>
            </div>
          </div>
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
                    <svg className="lf-input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                </div>

                <div className="lf-field">
                  <label className="lf-label" htmlFor="password">Senha</label>
                  <div className="lf-input-wrap">
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
                    <svg className="lf-input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
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
                    <svg className="lf-input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
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
