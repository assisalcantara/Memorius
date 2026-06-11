export function formatCurrency(value: number | string): string {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(amount)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("pt-BR").format(date);
  } catch {
    return dateStr;
  }
}

export function getClienteMatricula(clienteId: string | number | undefined, allClientes: { id?: string | number; dataCadastro?: string }[]): string {
  if (!clienteId) return "";
  const sorted = [...allClientes].sort((a, b) => {
    const dateA = a.dataCadastro || "";
    const dateB = b.dataCadastro || "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
  const index = sorted.findIndex((c) => c.id === clienteId);
  if (index === -1) return "000001";
  return String(index + 1).padStart(6, "0");
}
