import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateTenantSubscription } from "@/lib/subscription-guard";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL and Service Role Key must be configured.");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate Caller
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: caller }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Caller Profile to verify tenant_id
    const { data: callerProfile, error: profErr } = await userClient
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", caller.id)
      .maybeSingle();

    if (profErr || !callerProfile) {
      return NextResponse.json({ error: "Perfil do usuário não encontrado" }, { status: 404 });
    }

    const tenantId = callerProfile.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant não configurado para o usuário atual" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2.1. Server-side validation of tenant subscription
    const subCheck = await validateTenantSubscription(supabaseAdmin, tenantId, callerProfile.role);
    if (!subCheck.allowed) {
      return NextResponse.json(
        {
          error: subCheck.message || "Operação bloqueada: Assinatura ou período de teste expirado.",
          status: subCheck.status,
          code: "SUBSCRIPTION_REQUIRED"
        },
        { status: 402 }
      );
    }

    // 3. Parse Payload
    const body = await req.json();
    const { action } = body;

    if (action !== "testConnection" && action !== "createCustomer" && action !== "createPixPayment") {
      return NextResponse.json({ error: "Ação não suportada" }, { status: 400 });
    }

    // 4. Fetch Gateway Configuration for the Tenant
    const { data: config, error: configErr } = await supabaseAdmin
      .from("gateway_configs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("provider", "ASAAS")
      .maybeSingle();

    if (configErr || !config) {
      return NextResponse.json({ error: "Gateway não configurado." }, { status: 400 });
    }

    if (!config.enabled) {
      return NextResponse.json({ error: "Gateway inativo." }, { status: 400 });
    }

    const apiKey = config.api_key;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({ error: "Gateway não configurado." }, { status: 400 });
    }

    // 5. Select ASAAS Base URL based on environment
    const isProd = config.environment === "PRODUCAO";
    const baseUrl = isProd ? "https://api.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

    // 6. Execute requested action
    if (action === "testConnection") {
      try {
        const response = await fetch(`${baseUrl}/finance/balance`, {
          method: "GET",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
        }

        if (!response.ok) {
          return NextResponse.json({ error: "Erro de comunicação." }, { status: 400 });
        }

        const resData = await response.json();

        return NextResponse.json({
          success: true,
          balance: resData.balance !== undefined ? resData.balance : 0,
          accountName: resData.accountName || null,
          environment: config.environment
        });
      } catch (fetchErr) {
        console.error("[ASAAS Proxy] Fetch Error:", fetchErr);
        return NextResponse.json({ error: "Erro de comunicação." }, { status: 400 });
      }
    }

    if (action === "createCustomer") {
      const { nome, cpf, email, telefone, endereco, cep } = body;

      const cleanCpf = cpf ? cpf.replace(/\D/g, "") : undefined;
      const cleanCep = cep ? cep.replace(/\D/g, "") : undefined;

      const customerPayload = {
        name: nome,
        cpfCnpj: cleanCpf,
        email: email || undefined,
        phone: telefone || undefined,
        address: endereco || undefined,
        postalCode: cleanCep || undefined,
      };

      try {
        const response = await fetch(`${baseUrl}/customers`, {
          method: "POST",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(customerPayload)
        });

        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
        }

        const resData = await response.json();

        if (!response.ok) {
          console.error("[ASAAS Proxy] Create Customer Error:", resData);
          const errors = resData.errors || [];
          const errorMsg = errors.map((e: { description: string }) => e.description).join(", ") || "Erro ao criar cliente no ASAAS.";
          return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          customerId: resData.id,
          name: resData.name
        });
      } catch (fetchErr) {
        console.error("[ASAAS Proxy] Create Customer Fetch Error:", fetchErr);
        return NextResponse.json({ error: "Erro de comunicação." }, { status: 400 });
      }
    }

    if (action === "createPixPayment") {
      const { customerId, value, dueDate, description, externalReference } = body;

      const paymentPayload = {
        billingType: "PIX",
        customer: customerId,
        value: Number(value),
        dueDate,
        description: description || undefined,
        externalReference: externalReference || undefined,
      };

      try {
        const response = await fetch(`${baseUrl}/payments`, {
          method: "POST",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(paymentPayload)
        });

        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
        }

        const resData = await response.json();

        if (!response.ok) {
          console.error("[ASAAS Proxy] Create Payment Error:", resData);
          const errors = resData.errors || [];
          const errorMsg = errors.map((e: { description: string }) => e.description).join(", ") || "Erro ao criar cobrança no ASAAS.";
          return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        const paymentId = resData.id;

        const qrResponse = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
          method: "GET",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          }
        });

        let pixQrCode = null;
        let pixCopyPaste = null;

        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          pixQrCode = qrData.encodedImage || null;
          pixCopyPaste = qrData.payload || null;
        } else {
          console.warn("[ASAAS Proxy] Get PIX QR Code returned not-ok:", qrResponse.status);
        }

        return NextResponse.json({
          success: true,
          paymentId,
          status: resData.status,
          invoiceUrl: resData.invoiceUrl || null,
          pixQrCode,
          pixCopyPaste
        });

      } catch (fetchErr) {
        console.error("[ASAAS Proxy] Create PIX Payment Fetch Error:", fetchErr);
        return NextResponse.json({ error: "Erro de comunicação." }, { status: 400 });
      }
    }

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ASAAS Proxy] Exception:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
