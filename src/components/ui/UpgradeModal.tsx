"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: "USUARIOS" | "CLIENTES" | "CONTRATOS";
  currentCount: number;
  limit: number;
  planName: string;
}

const RESOURCE_LABELS = {
  USUARIOS: {
    singular: "usuário",
    plural: "usuários",
    title: "Limite de Usuários Atingido",
    desc: "Você atingiu o número máximo de usuários operadores permitidos no seu plano.",
  },
  CLIENTES: {
    singular: "associado",
    plural: "associados",
    title: "Limite de Associados Atingido",
    desc: "Você atingiu o número máximo de associados/clientes permitidos no seu plano.",
  },
  CONTRATOS: {
    singular: "contrato ativo",
    plural: "contratos ativos",
    title: "Limite de Contratos Ativos Atingido",
    desc: "Você atingiu o número máximo de contratos ativos simultâneos permitidos no seu plano.",
  },
};

export function UpgradeModal({
  isOpen,
  onClose,
  resource,
  currentCount,
  limit,
  planName,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const resInfo = RESOURCE_LABELS[resource] || {
    singular: "item",
    plural: "itens",
    title: "Limite do Plano Atingido",
    desc: "Você atingiu a capacidade máxima deste recurso no seu plano.",
  };

  const whatsappMessage = encodeURIComponent(
    `Olá, sou cliente Memorius (Plano ${planName}). Gostaria de solicitar um upgrade de plano pois atingi o limite de ${limit} ${resInfo.plural}.`
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Capacidade do Plano">
      <div style={{ textAlign: "center", padding: "1rem 0" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#fff7ed",
            border: "2px solid #fb923c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            margin: "0 auto 1.25rem auto",
          }}
        >
          ⚡
        </div>

        <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
          {resInfo.title}
        </h3>

        <p style={{ fontSize: "0.95rem", color: "#64748b", lineHeight: 1.5, marginBottom: "1.25rem" }}>
          {resInfo.desc}
        </p>

        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "0.85rem 1.2rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Plano Atual
            </span>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
              {planName}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Capacidade
            </span>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ea580c" }}>
              {currentCount} / {limit} {resInfo.plural}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "0.75rem",
            fontSize: "0.82rem",
            color: "#166534",
            marginBottom: "1.5rem",
            textAlign: "left",
          }}
        >
          🛡️ <strong>Seus dados estão protegidos:</strong> Todas as consultas, edições, emissão de boletos e relatórios continuam liberados normalmente sem cobrança de excedentes surpresa.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <a
            href={`https://wa.me/5591981755021?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.85rem 1.2rem",
              backgroundColor: "#0b4f59",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            🚀 Solicitar Upgrade do Plano
          </a>

          <Button variant="secondary" onClick={onClose} style={{ width: "100%" }}>
            Continuar Navegando
          </Button>
        </div>
      </div>
    </Modal>
  );
}
