import { ReactNode } from "react";

interface TableContainerProps {
  children: ReactNode;
  title?: string;
  count?: number;
}

export function TableContainer({ children, title, count }: TableContainerProps) {
  return (
    <div className="content-card" style={{ overflowX: "auto" }}>
      {(title || count !== undefined) && (
        <div
          className="list-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {title && <span className="list-title" style={{ fontWeight: "bold" }}>{title}</span>}
          {count !== undefined && (
            <div className="list-count" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Registros:</span>
              <span
                className="count-box"
                style={{
                  background: "var(--brand)",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                {count}
              </span>
            </div>
          )}
        </div>
      )}
      <div style={{ width: "100%", overflowX: "auto" }}>{children}</div>
    </div>
  );
}
