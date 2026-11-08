"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

interface TrialBlockedScreenProps {
  status: "ATIVO" | "TRIAL" | "SUSPENSO" | "CANCELADO" | "EXSPIRADO" | "SEM_ASSINATURA";
  message?: string;
  dataVencimento?: string;
  onLogout: () => void;
}

export function TrialBlockedScreen({
  status,
  message,
  dataVencimento,
  onLogout,
}: TrialBlockedScreenProps) {
  const isExpired = status === "EXSPIRADO" || status === "TRIAL";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#070d18",
        backgroundImage: "radial-gradient(ellipse at 50% 20%, rgba(11, 79, 89, 0.25) 0%, rgba(7, 13, 24, 0.95) 70%)",
        padding: "1.5rem",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "3rem 2.5rem",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: isExpired ? "#fff7ed" : "#fef2f2",
            border: `2px solid ${isExpired ? "#fb923c" : "#f87171"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1.5rem auto",
          }}
        >
          {isExpired ? "⏳" : "🔒"}
        </div>

        <span
          style={{
            display: "inline-block",
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: isExpired ? "#ea580c" : "#dc2626",
            backgroundColor: isExpired ? "#ffedd5" : "#fee2e2",
            padding: "0.3rem 0.8rem",
            borderRadius: "999px",
            marginBottom: "0.8rem",
          }}
        >
          {status === "EXSPIRADO" || status === "TRIAL"
            ? "Período de Avaliação Encerrado"
            : `Acesso ${status}`}
        </span>

        <h2
          style={{
            fontSize: "1.65rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 0.8rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          {isExpired
            ? "Seus 7 dias de teste grátis terminaram"
            : "Assinatura pendente de regularização"}
        </h2>

        <p
          style={{
            fontSize: "0.95rem",
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: "1.75rem",
          }}
        >
          {message ||
            "Seus dados e históricos continuam preservados com total segurança. Para continuar operando e desbloquear todos os módulos, ative seu plano comercial."}
        </p>

        {dataVencimento && (
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              fontSize: "0.85rem",
              color: "#475569",
              marginBottom: "2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Vencimento do período:</span>
            <strong style={{ color: "#0f172a" }}>
              {new Date(dataVencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            </strong>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <a
            href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20ativar%20meu%20plano%20no%20Memorius."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.85rem 1.5rem",
              backgroundColor: "#0b4f59",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              borderRadius: "10px",
              textDecoration: "none",
              transition: "background 0.2s ease",
            }}
          >
            💬 Falar com Suporte / Ativar Plano
          </a>

          <Button
            variant="secondary"
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "0.75rem 1.5rem",
              fontSize: "0.9rem",
              color: "#64748b",
            }}
          >
            Encerrar Sessão (Sair)
          </Button>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            fontSize: "0.78rem",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <span>🛡️</span>
          <span>Seus cadastros, contratos e financeiro continuam 100% seguros.</span>
        </div>
      </div>
    </div>
  );
}
