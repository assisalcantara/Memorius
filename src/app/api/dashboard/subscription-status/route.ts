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
    auth: { persistSession: false },
  });
}

export async function GET(req: Request) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Profile to get tenant_id and role
    const { data: profile, error: profErr } = await userClient
      .from("profiles")
      .select("nome, email, role, tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    if (profile.role === "SUPER_ADMIN") {
      return NextResponse.json({
        allowed: true,
        isSuperAdmin: true,
        status: "ATIVO",
        message: "Acesso total SUPER_ADMIN",
      });
    }

    if (!profile.tenant_id) {
      return NextResponse.json(
        { error: "Tenant não configurado para este usuário" },
        { status: 400 }
      );
    }

    // 3. Validate Server-Side Subscription
    const supabaseAdmin = getSupabaseAdmin();
    const result = await validateTenantSubscription(
      supabaseAdmin,
      profile.tenant_id,
      profile.role
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Check Subscription] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erro interno ao validar assinatura" },
      { status: 500 }
    );
  }
}
