import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  color?: string; // e.g. "var(--primary)", "#27ae60", etc.
  icon?: string;
}

export function MetricCard({ title, value, color = "var(--primary)", icon }: MetricCardProps) {
  return (
    <div
      style={{
        padding: "1.2rem",
        background: "white",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        borderLeft: `4px solid ${color}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <span
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            fontWeight: "bold",
            display: "block",
            marginBottom: "0.25rem",
          }}
        >
          {title}
        </span>
        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.8rem" }}>
          {value}
        </h2>
      </div>
      {icon && (
        <span style={{ fontSize: "1.8rem", opacity: 0.8 }}>
          {icon}
        </span>
      )}
    </div>
  );
}
