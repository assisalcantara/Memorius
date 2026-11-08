/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { Cobranca } from "@/types";
import { auditLogSupabaseService } from "./audit-log.supabase.service";

function toCamel(db: any): Cobranca | null {
  if (!db) return null;
  return {
    id: db.id,
    tenantId: db.tenant_id,
    mensalidadeId: db.mensalidade_id,
    clienteId: db.cliente_id,
    gatewayProvider: db.gateway_provider,
    gatewayCustomerId: db.gateway_customer_id,
    gatewayPaymentId: db.gateway_payment_id,
    gatewayMethod: db.gateway_method,
    gatewayStatus: db.gateway_status,
    valor: db.valor ? Number(db.valor) : 0,
    descricao: db.descricao,
    vencimento: db.vencimento,
    invoiceUrl: db.invoice_url,
    bankSlipUrl: db.bank_slip_url,
    pixQrCode: db.pix_qr_code,
    pixCopyPaste: db.pix_copy_paste,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    paidAt: db.paid_at,
    cancelledAt: db.cancelled_at,
  };
}

function toSnake(ui: Partial<Cobranca>): any {
  if (!ui) return null;
  const payload: any = {};
  if (ui.tenantId !== undefined) payload.tenant_id = ui.tenantId;
  if (ui.mensalidadeId !== undefined) payload.mensalidade_id = ui.mensalidadeId;
  if (ui.clienteId !== undefined) payload.cliente_id = ui.clienteId;
  if (ui.gatewayProvider !== undefined) payload.gateway_provider = ui.gatewayProvider;
  if (ui.gatewayCustomerId !== undefined) payload.gateway_customer_id = ui.gatewayCustomerId;
  if (ui.gatewayPaymentId !== undefined) payload.gateway_payment_id = ui.gatewayPaymentId;
  if (ui.gatewayMethod !== undefined) payload.gateway_method = ui.gatewayMethod;
  if (ui.gatewayStatus !== undefined) payload.gateway_status = ui.gatewayStatus;
  if (ui.valor !== undefined) payload.valor = ui.valor;
  if (ui.descricao !== undefined) payload.descricao = ui.descricao;
  if (ui.vencimento !== undefined) payload.vencimento = ui.vencimento;
  if (ui.invoiceUrl !== undefined) payload.invoice_url = ui.invoiceUrl;
  if (ui.bankSlipUrl !== undefined) payload.bank_slip_url = ui.bankSlipUrl;
  if (ui.pixQrCode !== undefined) payload.pix_qr_code = ui.pixQrCode;
  if (ui.pixCopyPaste !== undefined) payload.pix_copy_paste = ui.pixCopyPaste;
  if (ui.paidAt !== undefined) payload.paid_at = ui.paidAt;
  if (ui.cancelledAt !== undefined) payload.cancelled_at = ui.cancelledAt;
  return payload;
}

function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storedUser = window.localStorage.getItem("legacyflow_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.tenant_id || null;
    }
  } catch {}
  return null;
}

export const cobrancasSupabaseService = {
  async getAll(): Promise<Cobranca[]> {
    const { data, error } = await (supabase.from("cobrancas") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all cobrancas:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((c: Cobranca | null): c is Cobranca => c !== null);
  },

  async getByMensalidade(mensalidadeId: string | number): Promise<Cobranca[]> {
    const { data, error } = await (supabase.from("cobrancas") as any)
      .select("*")
      .eq("mensalidade_id", mensalidadeId);

    if (error) {
      console.error("Error fetching cobrancas by mensalidade ID:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((c: Cobranca | null): c is Cobranca => c !== null);
  },

  async getByCliente(clienteId: string | number): Promise<Cobranca[]> {
    const { data, error } = await (supabase.from("cobrancas") as any)
      .select("*")
      .eq("cliente_id", clienteId);

    if (error) {
      console.error("Error fetching cobrancas by cliente ID:", error);
      return [];
    }

    return (data || []).map(toCamel).filter((c: Cobranca | null): c is Cobranca => c !== null);
  },

  async create(data: Omit<Cobranca, "id">): Promise<Cobranca | null> {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("Tenant não configurado. Por favor, faça login novamente.");
    }

    const dbPayload = {
      ...toSnake(data),
      tenant_id: tenantId,
    };

    const { data: inserted, error } = await (supabase.from("cobrancas") as any)
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating cobranca in Supabase:", error);
      throw new Error(error.message || "Erro ao criar cobrança no Supabase.");
    }

    const result = toCamel(inserted);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity(
        "Cobranças",
        "CREATE",
        result.id,
        `Cobrança de R$ ${result.valor} gerada para o cliente ID: ${result.clienteId}`
      );
    }
    return result;
  },

  async update(id: string | number, data: Partial<Cobranca>): Promise<Cobranca | null> {
    const dbPayload = toSnake(data);
    const { data: updated, error } = await (supabase.from("cobrancas") as any)
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating cobranca in Supabase:", error);
      throw new Error(error.message || "Erro ao atualizar cobrança no Supabase.");
    }

    const result = toCamel(updated);
    if (result && result.id) {
      await auditLogSupabaseService.logActivity(
        "Cobranças",
        "UPDATE",
        result.id,
        `Cobrança atualizada. Valor: R$ ${result.valor}, Status: ${result.gatewayStatus}`
      );
    }
    return result;
  },

  async cancel(id: string | number): Promise<Cobranca | null> {
    const now = new Date().toISOString();
    return this.update(id, {
      gatewayStatus: "CANCELLED",
      cancelledAt: now,
    });
  },

  async markPaid(id: string | number, paidAt?: string): Promise<Cobranca | null> {
    const paymentDate = paidAt || new Date().toISOString();
    return this.update(id, {
      gatewayStatus: "RECEIVED",
      paidAt: paymentDate,
    });
  },

  async createPixFromMensalidade(mensalidadeId: string | number): Promise<Cobranca | null> {
    const { data: mensalidade, error: mErr } = await (supabase.from("mensalidades") as any)
      .select("*")
      .eq("id", mensalidadeId)
      .single();

    if (mErr || !mensalidade) {
      throw new Error("Mensalidade não encontrada.");
    }

    const { data: existing } = await (supabase.from("cobrancas") as any)
      .select("*")
      .eq("mensalidade_id", mensalidadeId)
      .eq("gateway_method", "PIX")
      .neq("gateway_status", "CANCELLED")
      .maybeSingle();

    if (existing) {
      throw new Error("Já existe uma cobrança ativa para esta mensalidade.");
    }

    const { data: contrato, error: cErr } = await (supabase.from("contratos") as any)
      .select("cliente_id")
      .eq("id", mensalidade.contrato_id)
      .single();

    if (cErr || !contrato) {
      throw new Error("Contrato ou cliente correspondente não encontrado.");
    }

    const clienteId = contrato.cliente_id;

    const { clientesSupabaseService } = await import("./clientes.supabase.service");
    const gatewayCustomerId = await clientesSupabaseService.ensureGatewayCustomer(clienteId);

    if (!gatewayCustomerId) {
      throw new Error("Falha ao obter ID do cliente no gateway.");
    }

    const { asaasService } = await import("./asaas.service");
    const res = await asaasService.createPixPayment({
      customerId: gatewayCustomerId,
      value: Number(mensalidade.valor),
      dueDate: mensalidade.data_vencimento,
      description: `Mensalidade ref. competencia ${mensalidade.competencia}`,
      externalReference: String(mensalidade.id),
    });

    if (!res.success || !res.paymentId) {
      throw new Error(res.error || "Falha ao gerar PIX no ASAAS.");
    }

    const cobranca = await this.create({
      tenantId: mensalidade.tenant_id,
      mensalidadeId: String(mensalidadeId),
      clienteId: String(clienteId),
      gatewayProvider: "ASAAS",
      gatewayCustomerId,
      gatewayPaymentId: res.paymentId,
      gatewayMethod: "PIX",
      gatewayStatus: res.status || "PENDING",
      valor: Number(mensalidade.valor),
      descricao: `Mensalidade ref. competencia ${mensalidade.competencia}`,
      vencimento: mensalidade.data_vencimento,
      invoiceUrl: res.invoiceUrl || null,
      bankSlipUrl: null,
      pixQrCode: res.pixQrCode || null,
      pixCopyPaste: res.pixCopyPaste || null,
    });

    if (cobranca && cobranca.id) {
      await auditLogSupabaseService.logActivity(
        "Cobranças",
        "CREATE_PIX_PAYMENT",
        cobranca.id,
        `Cobrança PIX gerada no ASAAS para mensalidade ID: ${mensalidadeId}, ID Pagamento: ${res.paymentId}`
      );
    }

    return cobranca;
  },

  async processPaymentReceived(gatewayPaymentId: string, status: string, supabaseClient: any): Promise<boolean> {
    const { data: dbCobranca } = await (supabaseClient.from("cobrancas") as any)
      .select("*")
      .eq("gateway_payment_id", gatewayPaymentId)
      .maybeSingle();

    if (!dbCobranca) {
      console.warn(`[cobrancasSupabaseService] Warning: Cobrança not found for gatewayPaymentId: ${gatewayPaymentId}`);
      return false;
    }

    const now = new Date().toISOString();

    const { error: cobErr } = await (supabaseClient.from("cobrancas") as any)
      .update({
        gateway_status: status,
        paid_at: now
      })
      .eq("id", dbCobranca.id);

    if (cobErr) throw cobErr;

    if (dbCobranca.mensalidade_id) {
      const { error: mensErr } = await (supabaseClient.from("mensalidades") as any)
        .update({
          status: "PAGO",
          data_pagamento: now,
          valor_recebido: Number(dbCobranca.valor),
          observacao: "Baixa automática via ASAAS"
        })
        .eq("id", dbCobranca.mensalidade_id);

      if (mensErr) throw mensErr;
    }

    // Write audit log
    await (supabaseClient.from("audit_logs") as any).insert({
      tenant_id: dbCobranca.tenant_id,
      modulo: "Cobranças",
      acao: "ASAAS_PAYMENT_RECEIVED",
      registro_id: dbCobranca.id,
      descricao: `Baixa automática via ASAAS para cobrança ID: ${dbCobranca.id}, mensalidade ID: ${dbCobranca.mensalidade_id}`,
      user_name: "ASAAS Webhook"
    });

    return true;
  },

  async processPaymentOverdue(gatewayPaymentId: string, status: string, supabaseClient: any): Promise<boolean> {
    const { data: dbCobranca } = await (supabaseClient.from("cobrancas") as any)
      .select("*")
      .eq("gateway_payment_id", gatewayPaymentId)
      .maybeSingle();

    if (!dbCobranca) {
      console.warn(`[cobrancasSupabaseService] Warning: Cobrança not found for gatewayPaymentId: ${gatewayPaymentId}`);
      return false;
    }

    const { error: cobErr } = await (supabaseClient.from("cobrancas") as any)
      .update({
        gateway_status: status
      })
      .eq("id", dbCobranca.id);

    if (cobErr) throw cobErr;

    // Write audit log
    await (supabaseClient.from("audit_logs") as any).insert({
      tenant_id: dbCobranca.tenant_id,
      modulo: "Cobranças",
      acao: "ASAAS_PAYMENT_OVERDUE",
      registro_id: dbCobranca.id,
      descricao: `Cobrança identificada como VENCIDA no ASAAS. ID: ${dbCobranca.id}, mensalidade ID: ${dbCobranca.mensalidade_id}`,
      user_name: "ASAAS Webhook"
    });

    return true;
  },

  async processPaymentCancelled(gatewayPaymentId: string, status: string, supabaseClient: any): Promise<boolean> {
    const { data: dbCobranca } = await (supabaseClient.from("cobrancas") as any)
      .select("*")
      .eq("gateway_payment_id", gatewayPaymentId)
      .maybeSingle();

    if (!dbCobranca) {
      console.warn(`[cobrancasSupabaseService] Warning: Cobrança not found for gatewayPaymentId: ${gatewayPaymentId}`);
      return false;
    }

    const now = new Date().toISOString();

    const { error: cobErr } = await (supabaseClient.from("cobrancas") as any)
      .update({
        gateway_status: "CANCELLED",
        cancelled_at: now
      })
      .eq("id", dbCobranca.id);

    if (cobErr) throw cobErr;

    // Write audit log
    await (supabaseClient.from("audit_logs") as any).insert({
      tenant_id: dbCobranca.tenant_id,
      modulo: "Cobranças",
      acao: "ASAAS_PAYMENT_CANCELLED",
      registro_id: dbCobranca.id,
      descricao: `Cobrança cancelada/excluída no ASAAS. ID: ${dbCobranca.id}, mensalidade ID: ${dbCobranca.mensalidade_id}`,
      user_name: "ASAAS Webhook"
    });

    return true;
  },

  async processPaymentRefunded(gatewayPaymentId: string, status: string, supabaseClient: any): Promise<boolean> {
    const { data: dbCobranca } = await (supabaseClient.from("cobrancas") as any)
      .select("*")
      .eq("gateway_payment_id", gatewayPaymentId)
      .maybeSingle();

    if (!dbCobranca) {
      console.warn(`[cobrancasSupabaseService] Warning: Cobrança not found for gatewayPaymentId: ${gatewayPaymentId}`);
      return false;
    }

    const { error: cobErr } = await (supabaseClient.from("cobrancas") as any)
      .update({
        gateway_status: "REFUNDED"
      })
      .eq("id", dbCobranca.id);

    if (cobErr) throw cobErr;

    // Write audit log
    await (supabaseClient.from("audit_logs") as any).insert({
      tenant_id: dbCobranca.tenant_id,
      modulo: "Cobranças",
      acao: "ASAAS_PAYMENT_REFUNDED",
      registro_id: dbCobranca.id,
      descricao: `Cobrança estornada no ASAAS. ID: ${dbCobranca.id}, mensalidade ID: ${dbCobranca.mensalidade_id}`,
      user_name: "ASAAS Webhook"
    });

    return true;
  },
};
