import { Atendimento } from "@/types";

export interface AtendimentosReportFilters {
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function generateAtendimentosReport(data: Atendimento[], filters: AtendimentosReportFilters): Atendimento[] {
  return data.filter(item => {
    // Date range check
    if (filters.dataInicio && item.data < filters.dataInicio) return false;
    if (filters.dataFim && item.data > filters.dataFim) return false;

    // Status check
    if (filters.status && filters.status !== "TODOS") {
      if (item.status.toLowerCase() !== filters.status.toLowerCase()) return false;
    }
    return true;
  });
}
