import { Mensalidade } from "@/types";

export interface MensalidadesReportFilters {
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function generateMensalidadesReport(data: Mensalidade[], filters: MensalidadesReportFilters): Mensalidade[] {
  const todayStr = new Date().toISOString().split("T")[0];

  return data.filter(item => {
    // Vencimento date check
    if (filters.dataInicio && item.dataVencimento < filters.dataInicio) return false;
    if (filters.dataFim && item.dataVencimento > filters.dataFim) return false;

    // Status filter
    if (filters.status && filters.status !== "TODOS") {
      if (filters.status === "INADIMPLENTES") {
        if (item.status !== "EM_ABERTO" || item.dataVencimento >= todayStr) return false;
      } else if (item.status !== filters.status) {
        return false;
      }
    }
    return true;
  });
}
