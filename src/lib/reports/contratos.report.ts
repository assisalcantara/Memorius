import { Contrato } from "@/types";

export interface ContratosReportFilters {
  status?: string;
  planoId?: string;
}

export function generateContratosReport(data: Contrato[], filters: ContratosReportFilters): Contrato[] {
  return data.filter(item => {
    if (filters.status && filters.status !== "TODOS") {
      const target = filters.status === "ATIVOS" ? "ativo" : "cancelado";
      if (item.status.toLowerCase() !== target) return false;
    }
    if (filters.planoId && filters.planoId !== "TODOS") {
      // planoId from filter is Plano UUID, we can match it if needed, or by plan name or by ID.
      // Let's check how planoId is matched in contracts. Usually c.planoId matches the plan's UUID.
      if (String(item.planoId) !== String(filters.planoId)) return false;
    }
    return true;
  });
}
