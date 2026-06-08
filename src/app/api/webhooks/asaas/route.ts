/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get supabase admin client on demand
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (supabaseAdminInstance) return supabaseAdminInstance;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL and Service Role Key must be configured.");
  }
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
  return supabaseAdminInstance;
}

async function logAudit(tenantId: string, acao: string, invoiceId: string, descricao: string) {
  try {
    const admin = getSupabaseAdmin();
    await (admin.from("audit_logs") as any).insert({
      tenant_id: tenantId,
      modulo: "INVOICES",
      acao,
      registro_id: invoiceId,
      descricao,
      user_name: "ASAAS Webhook"
    });
  } catch (err: any) {
    console.warn("[ASAAS Webhook] Failed to log audit:", err.message);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Validate ASAAS_WEBHOOK_TOKEN
    const { searchParams } = new URL(req.url);
    const tokenParam = searchParams.get("token");
    const secretToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!secretToken || tokenParam !== secretToken) {
      return NextResponse.json({ error: "Unauthorized: Token inválido ou não configurado." }, { status: 401 });
    }

    // 2. Parse payload
    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    if (!event || !payment || !payment.id) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const asaasPaymentId = payment.id;
    const asaasStatus = payment.status || event;

    // 3. Find invoice by asaas_payment_id
    const admin = getSupabaseAdmin();
    const { data: invoice, error: findErr } = await (admin
      .from("saas_invoices") as any)
      .select("*")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    if (findErr) {
      console.error("[ASAAS Webhook] Error fetching invoice:", findErr.message);
      return NextResponse.json({ error: "Erro ao buscar fatura no banco" }, { status: 500 });
    }

    if (!invoice) {
      console.warn(`[ASAAS Webhook] Warning: SaaS invoice not found for asaas_payment_id: ${asaasPaymentId}`);
      // Return 200 as requested so ASAAS doesn't retry endlessly
      return NextResponse.json({ success: true, message: "Fatura não localizada." }, { status: 200 });
    }

    // 4. Update Invoice & write Audit Log based on event type
    let newStatus = invoice.status;
    let paymentDate = invoice.pagamento_em;
    let auditAction = "";
    let auditDesc = "";

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      newStatus = "PAGO";
      paymentDate = payment.confirmedDate || new Date().toISOString();
      auditAction = "ASAAS_PAYMENT_RECEIVED";
      auditDesc = `Fatura paga via gateway ASAAS. ID ASAAS: ${asaasPaymentId}.`;
    } else if (event === "PAYMENT_OVERDUE") {
      newStatus = "VENCIDO";
      auditAction = "ASAAS_PAYMENT_OVERDUE";
      auditDesc = `Fatura identificada como VENCIDA no gateway ASAAS. ID ASAAS: ${asaasPaymentId}.`;
    } else if (event === "PAYMENT_CANCELLED" || event === "PAYMENT_DELETED") {
      newStatus = "CANCELADO";
      auditAction = "ASAAS_PAYMENT_CANCELLED";
      auditDesc = `Fatura cancelada/excluída no gateway ASAAS. ID ASAAS: ${asaasPaymentId}.`;
    } else if (event === "PAYMENT_REFUNDED") {
      // For refunds, keep original status as PAGO or update asaas_status and audit only
      auditAction = "ASAAS_PAYMENT_REFUNDED";
      auditDesc = `Fatura estornada no gateway ASAAS. ID ASAAS: ${asaasPaymentId}.`;
    }

    // Update DB
    const updatePayload: any = {
      asaas_status: asaasStatus
    };
    if (newStatus !== invoice.status) {
      updatePayload.status = newStatus;
    }
    if (paymentDate !== invoice.pagamento_em) {
      updatePayload.pagamento_em = paymentDate;
    }

    const { error: updateErr } = await (admin.from("saas_invoices") as any)
      .update(updatePayload)
      .eq("id", invoice.id);

    if (updateErr) {
      console.error("[ASAAS Webhook] Error updating invoice status:", updateErr.message);
      return NextResponse.json({ error: "Erro ao atualizar fatura no banco" }, { status: 500 });
    }

    // Write audit log
    if (auditAction) {
      await logAudit(invoice.tenant_id, auditAction, invoice.id, auditDesc);
    }

    return NextResponse.json({ success: true, message: `Evento ${event} processado com sucesso.` });

  } catch (err: any) {
    console.error("[ASAAS Webhook] Exception:", err);
    return NextResponse.json({ error: err.message || "Erro interno no servidor" }, { status: 500 });
  }
}
