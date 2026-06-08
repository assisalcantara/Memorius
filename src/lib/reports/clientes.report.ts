import { Cliente } from "@/types";

export interface ClientesReportFilters {
  status?: string;
  cidade?: string;
}

export function generateClientesReport(data: Cliente[], filters: ClientesReportFilters): Cliente[] {
  return data.filter(item => {
    if (filters.status && filters.status !== "TODOS") {
      const target = filters.status === "ATIVOS" ? "ativo" : "inativo";
      if (item.status.toLowerCase() !== target) return false;
    }
    if (filters.cidade && filters.cidade.trim() !== "") {
      if (!item.cidade || !item.cidade.toLowerCase().includes(filters.cidade.trim().toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}
