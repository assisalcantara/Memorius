import { supabase } from "@/lib/supabase/client";

export interface TestConnectionResponse {
  success: boolean;
  balance?: number;
  accountName?: string | null;
  environment?: string;
  error?: string;
}

export const asaasService = {
  async testConnection(): Promise<TestConnectionResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        return { success: false, error: "Não autorizado. Faça login novamente." };
      }

      const res = await fetch("/api/gateway/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "testConnection"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erro de comunicação com o servidor." };
      }

      return {
        success: true,
        balance: data.balance,
        accountName: data.accountName,
        environment: data.environment
      };
    } catch (err: unknown) {
      console.error("[ASAAS Service] testConnection Exception:", err);
      return { success: false, error: "Erro de comunicação." };
    }
  },

  async createCustomer(payload: {
    nome: string;
    cpf: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  }): Promise<{ success: boolean; customerId?: string; name?: string; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        return { success: false, error: "Não autorizado. Faça login novamente." };
      }

      const res = await fetch("/api/gateway/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "createCustomer",
          ...payload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erro ao cadastrar cliente no ASAAS." };
      }

      return {
        success: true,
        customerId: data.customerId,
        name: data.name
      };
    } catch (err: unknown) {
      console.error("[ASAAS Service] createCustomer Exception:", err);
      return { success: false, error: "Erro de comunicação." };
    }
  },

  async createPixPayment(payload: {
    customerId: string;
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  }): Promise<{ success: boolean; paymentId?: string; status?: string; invoiceUrl?: string | null; pixQrCode?: string | null; pixCopyPaste?: string | null; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        return { success: false, error: "Não autorizado. Faça login novamente." };
      }

      const res = await fetch("/api/gateway/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "createPixPayment",
          ...payload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erro ao criar cobrança no ASAAS." };
      }

      return {
        success: true,
        paymentId: data.paymentId,
        status: data.status,
        invoiceUrl: data.invoiceUrl,
        pixQrCode: data.pixQrCode,
        pixCopyPaste: data.pixCopyPaste
      };
    } catch (err: unknown) {
      console.error("[ASAAS Service] createPixPayment Exception:", err);
      return { success: false, error: "Erro de comunicação." };
    }
  }
};
