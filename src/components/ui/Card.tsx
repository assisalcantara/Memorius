import { ReactNode } from "react";

interface CardProps {
  title?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, icon, children, className = "" }: CardProps) {
  return (
    <div className={`dashboard-card ${className}`} style={{ marginBottom: "1.5rem" }}>
      {title && (
        <div
          className="card-header"
          style={{
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {icon && <span style={{ fontSize: "1.2rem" }}>{icon}</span>}
          <h3 style={{ margin: 0, color: "var(--brand)" }}>{title}</h3>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
