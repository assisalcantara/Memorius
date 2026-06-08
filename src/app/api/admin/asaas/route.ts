import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getAsaasHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "access_token": apiKey
  };
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate SUPER_ADMIN role
    const { data: profile, error: profErr } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Acesso restrito a SUPER_ADMIN" }, { status: 403 });
    }

    // 3. Process Request Actions
    const body = await req.json();
    const { action, payload } = body;

    if (action === "testConnection") {
      const { ambiente, apiKey } = payload;
      let actualKey = apiKey;

      // If key is masked, retrieve from DB
      if (apiKey.includes("*")) {
        const { data: config } = await userClient
          .from("saas_gateway_config")
          .select("api_key")
          .eq("ambiente", ambiente)
          .eq("provider", "ASAAS")
          .maybeSingle();
        
        if (!config?.api_key) {
          return NextResponse.json({ success: false, message: "Nenhuma chave salva no banco para este ambiente." });
        }
        actualKey = config.api_key;
      }

      const baseUrl = ambiente === "PRODUCAO" ? "https://api.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";
      
      try {
        const testRes = await fetch(`${baseUrl}/finance/balance`, {
          method: "GET",
          headers: await getAsaasHeaders(actualKey)
        });

        if (testRes.status === 200) {
          const balanceData = await testRes.json();
          return NextResponse.json({ success: true, message: `Conexão bem sucedida! Saldo atual: R$ ${balanceData.balance || 0}` });
        } else {
          const errText = await testRes.text();
          return NextResponse.json({ success: false, message: `Falha na conexão: ASAAS respondeu status ${testRes.status}. Detalhes: ${errText}` });
        }
      } catch (connErr: unknown) {
        const error = connErr as Error;
        return NextResponse.json({ success: false, message: `Erro ao conectar ao ASAAS: ${error.message}` });
      }
    }

    // For customer and payment creation, always fetch API key securely from database
    const { data: dbConfig, error: dbConfigErr } = await userClient
      .from("saas_gateway_config")
      .select("*")
      .eq("ativo", true)
      .eq("provider", "ASAAS")
      .maybeSingle();

    if (dbConfigErr || !dbConfig) {
      return NextResponse.json({ error: "Configuração do gateway ASAAS ativa não encontrada no banco." }, { status: 400 });
    }

    const gatewayApiKey = dbConfig.api_key;
    const baseUrl = dbConfig.ambiente === "PRODUCAO" ? "https://api.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

    if (action === "createCustomer") {
      const asaasRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: await getAsaasHeaders(gatewayApiKey),
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          cpfCnpj: payload.cpfCnpj,
          phone: payload.phone || undefined,
          mobilePhone: payload.mobilePhone || undefined
        })
      });

      const resData = await asaasRes.json();
      if (asaasRes.status !== 200) {
        return NextResponse.json({ error: resData.errors?.[0]?.description || "Erro ao cadastrar cliente no ASAAS" }, { status: asaasRes.status });
      }

      return NextResponse.json(resData);
    }

    if (action === "createPayment") {
      const asaasRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: await getAsaasHeaders(gatewayApiKey),
        body: JSON.stringify({
          customer: payload.customer,
          billingType: "UNDEFINED", // Let customer choose method (PIX, Boleto, CC)
          value: payload.value,
          dueDate: payload.dueDate,
          description: payload.description
        })
      });

      const resData = await asaasRes.json();
      if (asaasRes.status !== 200) {
        return NextResponse.json({ error: resData.errors?.[0]?.description || "Erro ao gerar cobrança no ASAAS" }, { status: asaasRes.status });
      }

      return NextResponse.json(resData);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ASAAS Proxy API] Exception:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
