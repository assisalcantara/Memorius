import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.trim().toUpperCase();
  
  let badgeClass = "badge";
  let displayLabel = status;

  if (normalizedStatus === "ATIVO" || normalizedStatus === "ACTIVE" || normalizedStatus === "PAGO" || normalizedStatus === "CONCLUIDO") {
    badgeClass = "badge badge-active";
  } else if (normalizedStatus === "INATIVO" || normalizedStatus === "INACTIVE" || normalizedStatus === "CANCELADO" || normalizedStatus === "EXCLUIDO") {
    badgeClass = "badge badge-inactive";
  } else if (normalizedStatus === "EM_ABERTO" || normalizedStatus === "PENDENTE" || normalizedStatus === "ATRASADO") {
    badgeClass = "badge badge-warning";
  }

  // Handle label clean displays for specific statuses
  if (normalizedStatus === "EM_ABERTO") {
    displayLabel = "Em Aberto";
  }

  return (
    <span className={badgeClass}>
      {displayLabel}
    </span>
  );
}
