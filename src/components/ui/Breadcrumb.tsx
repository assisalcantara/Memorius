"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Início",
  atendimento: "Central de Atendimento",
  planos: "Planos",
  clientes: "Clientes",
  contratos: "Contratos",
  agregados: "Agregados",
  mensalidades: "Mensalidades",
  relatorios: "Relatórios",
  auditoria: "Auditoria",
  usuarios: "Usuários",
  configuracoes: "Configurações",
};

export function Breadcrumb() {
  const pathname = usePathname();
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="breadcrumb" style={{ marginBottom: "1rem" }}>
      <ol style={{ display: "flex", flexWrap: "wrap", listStyle: "none", padding: 0, margin: 0, gap: "0.5rem", alignItems: "center", fontSize: "0.9rem" }}>
        {segments.map((segment, index) => {
          const path = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <li key={path} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: isLast ? "#333" : "#888" }}>
              {index > 0 && <span style={{ color: "#ccc" }}>/</span>}
              {isLast ? (
                <span style={{ fontWeight: "600" }}>{label}</span>
              ) : (
                <Link href={path} style={{ color: "#0070f3", textDecoration: "none" }} className="hover-underline">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
