import { ReactNode } from "react";

interface PageTitleProps {
  title: string;
  icon?: string;
  actions?: ReactNode;
}

export function PageTitle({ title, icon, actions }: PageTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {icon && <span style={{ fontSize: "1.8rem" }}>{icon}</span>}
        <h1 style={{ color: "var(--brand)", margin: 0, fontSize: "1.8rem" }}>
          {title}
        </h1>
      </div>
      {actions && <div className="action-buttons">{actions}</div>}
    </div>
  );
}
