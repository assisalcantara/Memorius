/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/context/ToastContext";
import { EmpresaConfig } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [brandConfig, setBrandConfig] = useState<EmpresaConfig | null>(null);

  // Password recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  useEffect(() => {
    // 1. Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });

    // 2. Load branding from cached tenant in local storage (if any)
    try {
      const storedUser = localStorage.getItem("legacyflow_user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.tenant_id) {
          // Temporarily mock tenant check in local storage to fetch config
          (supabase.from("empresa_config") as any)
            .select("*")
            .eq("tenant_id", user.tenant_id)
            .maybeSingle()
            .then(({ data }: any) => {
              if (data) {
                setBrandConfig({
                  id: data.id,
                  tenant_id: data.tenant_id,
                  razaoSocial: data.razao_social || "",
                  nomeFantasia: data.nome_fantasia || "",
                  logoUrl: data.logo_url || "",
                  corPrimaria: data.cor_primaria || "#2f80ed",
                  corSecundaria: data.cor_secundaria || "#27ae60",
                });
              }
            });
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve cached brand info:", err);
    }
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
      router.push("/dashboard");
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
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: window.location.origin + "/dashboard",
      });

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

  // Fallbacks
  const primaryColor = brandConfig?.corPrimaria || "#2f80ed";
  const secondaryColor = brandConfig?.corSecundaria || "#27ae60";
  const companyName = brandConfig?.nomeFantasia || brandConfig?.razaoSocial || "LegacyFlow";

  return (
    <div className="login-page-container">
      {/* Dynamic Style injection */}
      <style>{`
        .login-page-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          font-family: 'Inter', sans-serif;
          background-color: #f7f9fc;
        }

        .login-split-left {
          flex: 1;
          background: linear-gradient(135deg, ${primaryColor} 0%, #1e3c72 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3rem;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .login-split-left::before {
          content: "";
          position: absolute;
          width: 150%;
          height: 150%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          top: -25%;
          left: -25%;
          animation: spin 60s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .login-brand-wrapper {
          position: relative;
          z-index: 10;
          max-width: 450px;
        }

        .login-brand-logo {
          width: 120px;
          height: 120px;
          border-radius: 24px;
          background: white;
          padding: 1.5rem;
          margin-bottom: 2rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        .login-brand-logo img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .login-brand-logo-fallback {
          font-size: 3.5rem;
        }

        .login-brand-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          letter-spacing: -0.5px;
        }

        .login-brand-slogan {
          font-size: 1.15rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }

        .login-split-right {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background-color: #fafafa;
        }

        .login-card {
          background: white;
          padding: 3rem;
          border-radius: 20px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .login-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.08);
        }

        .login-card-header {
          margin-bottom: 2.5rem;
          text-align: center;
        }

        .login-card-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
          letter-spacing: -0.5px;
        }

        .login-card-subtitle {
          font-size: 0.95rem;
          color: #666;
        }

        .login-input-group {
          margin-bottom: 1.5rem;
          position: relative;
        }

        .login-input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #333;
        }

        .login-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 1rem;
          color: #888;
          font-size: 1.1rem;
        }

        .login-input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.75rem;
          border: 1.5px solid #e1e8ed;
          border-radius: 10px;
          font-size: 0.95rem;
          outline: none;
          background-color: #fcfdfe;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .login-input:focus {
          border-color: ${primaryColor};
          box-shadow: 0 0 0 4px rgba(47, 128, 237, 0.1);
          background-color: white;
        }

        .login-actions-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1.75rem;
        }

        .login-forgot-link {
          font-size: 0.85rem;
          font-weight: 600;
          color: ${primaryColor};
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }

        .login-forgot-link:hover {
          color: ${secondaryColor};
          text-decoration: underline;
        }

        .login-btn {
          width: 100%;
          padding: 0.95rem;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .login-btn:active {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .login-page-container {
            flex-direction: column;
          }

          .login-split-left {
            padding: 2.5rem 1.5rem;
            flex: none;
            min-height: auto;
          }

          .login-brand-logo {
            width: 80px;
            height: 80px;
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .login-brand-title {
            font-size: 1.85rem;
          }

          .login-brand-slogan {
            font-size: 1rem;
          }

          .login-split-right {
            flex: 1;
            padding: 1.5rem;
            align-items: flex-start;
          }

          .login-card {
            padding: 2rem 1.5rem;
            border-radius: 16px;
            margin-top: -2rem;
            position: relative;
            z-index: 20;
          }
        }
      `}</style>

      {/* Left Column (Brand info panel) */}
      <div className="login-split-left">
        <div className="login-brand-wrapper">
          <div className="login-brand-logo">
            {brandConfig?.logoUrl ? (
              <img src={brandConfig.logoUrl} alt="Logo" />
            ) : (
              <span className="login-brand-logo-fallback">🕊️</span>
            )}
          </div>
          <h1 className="login-brand-title">{companyName}</h1>
          <p className="login-brand-slogan">
            Gestão moderna, eficiente e humana para a sua empresa. Controle total de planos, associados e atendimentos em uma plataforma unificada.
          </p>
        </div>
      </div>

      {/* Right Column (Auth form card) */}
      <div className="login-split-right">
        <div className="login-card">
          {!isRecovering ? (
            <>
              <div className="login-card-header">
                <h2 className="login-card-title">Bem-vindo ao LegacyFlow</h2>
                <p className="login-card-subtitle">Entre com suas credenciais de acesso</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="login-input-group">
                  <label className="login-input-label" htmlFor="email">E-mail</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon">✉️</span>
                    <input
                      id="email"
                      type="email"
                      required
                      className="login-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: seuemail@empresa.com"
                    />
                  </div>
                </div>

                <div className="login-input-group">
                  <label className="login-input-label" htmlFor="password">Senha</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon">🔒</span>
                    <input
                      id="password"
                      type="password"
                      required
                      className="login-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha de acesso"
                    />
                  </div>
                </div>

                <div className="login-actions-row">
                  <span className="login-forgot-link" onClick={() => setIsRecovering(true)}>
                    Esqueci minha senha
                  </span>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="login-card-header">
                <h2 className="login-card-title">Recuperação de Acesso</h2>
                <p className="login-card-subtitle">Informe seu e-mail para receber o link de redefinição de senha</p>
              </div>

              <form onSubmit={handleRecovery}>
                <div className="login-input-group" style={{ marginBottom: "2rem" }}>
                  <label className="login-input-label" htmlFor="recoveryEmail">E-mail Cadastrado</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon">✉️</span>
                    <input
                      id="recoveryEmail"
                      type="email"
                      required
                      className="login-input"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="Ex: seuemail@empresa.com"
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" style={{ marginBottom: "1rem" }} disabled={recoveryLoading}>
                  {recoveryLoading ? "Processando..." : "Enviar E-mail de Recuperação"}
                </button>

                <button
                  type="button"
                  className="login-btn"
                  style={{
                    background: "none",
                    border: "1.5px solid #e1e8ed",
                    color: "#333",
                    boxShadow: "none"
                  }}
                  onClick={() => setIsRecovering(false)}
                >
                  Voltar ao Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
