"use client";

interface EmptyStateProps {
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  message = "Nenhum registro encontrado",
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="empty-state"
      style={{
        textAlign: "center",
        padding: "3rem 1.5rem",
        color: "#666",
        backgroundColor: "#fafafa",
        borderRadius: "var(--border-radius)",
        border: "1px dashed var(--color-border)",
        margin: "1rem 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
      }}
    >
      <div style={{ fontSize: "2.5rem" }}>📂</div>
      <h3 style={{ margin: "0.5rem 0 0 0", color: "#333", fontSize: "1.2rem", fontWeight: "600" }}>{message}</h3>
      {description && (
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#888", maxWidth: "400px" }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary"
          style={{ marginTop: "0.5rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
