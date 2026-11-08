import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getTenantPlanLimits, validateResourceCreationLimit } from "@/lib/plan-limits-guard";

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
        planName: "SUPER_ADMIN",
        trialDias: 7,
        isSuperAdmin: true,
        limits: { usuarios: 999999, clientes: 999999, contratos: 999999 },
        usage: { usuarios: 0, clientes: 0, contratos: 0 },
        hasReached: { usuarios: false, clientes: false, contratos: false },
      });
    }

    if (!profile.tenant_id) {
      return NextResponse.json(
        { error: "Tenant não configurado para este usuário" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const resourceToCheck = searchParams.get("check") as "USUARIOS" | "CLIENTES" | "CONTRATOS" | null;

    if (resourceToCheck) {
      const validation = await validateResourceCreationLimit(
        supabaseAdmin,
        profile.tenant_id,
        resourceToCheck,
        profile.role
      );
      return NextResponse.json(validation);
    }

    const summary = await getTenantPlanLimits(
      supabaseAdmin,
      profile.tenant_id,
      profile.role
    );

    return NextResponse.json(summary);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Plan Limits] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erro interno ao consultar limites" },
      { status: 500 }
    );
  }
}
