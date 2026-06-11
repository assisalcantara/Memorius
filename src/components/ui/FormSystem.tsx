"use client";

import React, { ReactNode } from "react";

// FormContainer: simple form wrapper
export function FormContainer({
  children,
  onSubmit,
  className = "",
  ...props
}: {
  children: ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
      className={`form-container ${className}`}
      {...props}
    >
      {children}
    </form>
  );
}

// FormSection: section partition with visual styling
export function FormSection({
  title,
  icon,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  icon?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`form-section ${className}`}
      style={{
        marginTop: "8px", // Reduzido para 8px
        marginBottom: "8px", // Reduzido para 8px
        borderBottom: "1px solid #f1f5f9",
        paddingBottom: "8px",
      }}
    >
      <div
        className="form-section-header"
        style={{
          marginBottom: "12px", // Reduzido para 12px
        }}
      >
        <h4
          style={{
            fontSize: "0.95rem",
            fontWeight: 800,
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          {icon && <span style={{ fontSize: "1.1rem" }}>{icon}</span>}
          {title}
        </h4>
        {subtitle && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="form-section-body">{children}</div>
    </div>
  );
}

// FormGrid: responsive css grid wrapper
export function FormGrid({
  children,
  columns = 3,
  className = "",
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  // Column styles mapping
  const gridTemplateColumns = {
    1: "1fr",
    2: "repeat(2, 1fr)",
    3: "repeat(3, 1fr)",
    4: "repeat(4, 1fr)",
  };

  return (
    <div
      className={`form-grid-system ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: gridTemplateColumns[columns],
        gap: "12px", // Inputs da mesma linha: 12px
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

// FormField: Field wrapper with label and input alignment
export function FormField({
  label,
  required = false,
  children,
  className = "",
  fullWidth = false,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`form-group ${className}`}
      style={{
        gridColumn: fullWidth ? "1 / -1" : "auto",
        marginBottom: "8px", // Linha de Inputs -> Próxima Linha: 8px
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "#475569",
          marginBottom: "2px", // Label -> Input: 2px
        }}
      >
        {label}
        {required && (
          <span
            style={{
              color: "#ef4444",
              marginLeft: "3px",
              fontWeight: "bold",
            }}
          >
            *
          </span>
        )}
      </label>
      <div style={{ width: "100%", position: "relative" }}>{children}</div>
    </div>
  );
}

// ModalHeader: Styled header section for forms inside modais
export function ModalHeader({
  title,
  subtitle,
  icon,
  onClose,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-header">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {icon && (
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(11, 79, 89, 0.08)",
              color: "#0b4f59",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <h3 className="modal-title" style={{ margin: 0 }}>
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                margin: "0.15rem 0 0 0",
                fontSize: "0.78rem",
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <button onClick={onClose} className="modal-close-btn" aria-label="Fechar">
        &times;
      </button>
    </div>
  );
}

// ModalFooter: Fixed bottom bar for modal submissions
export function ModalFooter({
  onCancel,
  cancelText = "Cancelar",
  saveText = "Salvar",
  saving = false,
  className = "",
}: {
  onCancel: () => void;
  cancelText?: string;
  saveText?: string;
  saving?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`modal-footer ${className}`}
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "1rem",
        padding: "1rem 1.5rem", // Modal padding interno: 24px (1.5rem)
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        style={{
          padding: "0.65rem 1.25rem",
          background: "transparent",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          color: "#475569",
          fontWeight: 600,
          fontSize: "0.9rem",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {cancelText}
      </button>
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "0.65rem 1.5rem",
          background: "linear-gradient(135deg, #0b4f59 0%, #115e6b 100%)",
          border: "none",
          borderRadius: "12px",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "0.9rem",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(11, 79, 89, 0.2)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(11, 79, 89, 0.3)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(11, 79, 89, 0.2)";
        }}
      >
        {saving ? "Salvando..." : saveText}
      </button>
    </div>
  );
}

// SectionTitle: Standalone Title divider component
export function SectionTitle({
  title,
  icon,
  subtitle,
}: {
  title: string;
  icon?: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
      <h4
        style={{
          fontSize: "0.95rem",
          fontWeight: 800,
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          margin: 0,
        }}
      >
        {icon && <span>{icon}</span>}
        {title}
      </h4>
      {subtitle && <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>{subtitle}</p>}
    </div>
  );
}
