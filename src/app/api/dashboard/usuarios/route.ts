import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

    // 2. Validate Caller is ADMIN of a tenant
    const { data: callerProfile, error: profErr } = await userClient
      .from("profiles")
      .select("nome, email, role, tenant_id")
      .eq("id", caller.id)
      .maybeSingle();

    if (profErr || !callerProfile || callerProfile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Acesso restrito a ADMIN" }, { status: 403 });
    }

    const tenantId = callerProfile.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant não configurado para o usuário atual" }, { status: 400 });
    }

    const body = await req.json();
    const { email, nome, password, role, status } = body;

    if (!email || !nome || !password || !role || !status) {
      return NextResponse.json({ error: "Todos os campos (nome, email, senha, perfil, status) são obrigatórios" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Create user in Auth
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authErr || !authUser.user) {
      return NextResponse.json({ error: authErr?.message || "Falha ao criar o usuário no Auth" }, { status: 400 });
    }

    const newUserId = authUser.user.id;

    // 4. Fetch role ID for the new user's role
    const { data: roleData } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("nome", role)
      .maybeSingle();

    const roleId = roleData?.id || null;

    // 5. Create Profile
    const { data: profileCreated, error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        tenant_id: tenantId,
        nome,
        email,
        role: role,
        role_id: roleId,
        status: status,
        ativo: status === "ATIVO"
      })
      .select()
      .single();

    if (pErr) {
      // Cleanup auth user on profile failure
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: pErr.message || "Falha ao criar perfil do usuário" }, { status: 400 });
    }

    // 6. Write Audit Log
    const callerName = callerProfile.nome || callerProfile.email || "Administrador";
    try {
      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        modulo: "Usuários",
        acao: "CREATE_USER",
        registro_id: newUserId,
        descricao: `Usuário ${nome} (${email}) cadastrado diretamente como ${role} (Status: ${status}) pelo Administrador`,
        user_name: callerName
      });
    } catch (e) {
      console.warn("Failed to write audit log:", e);
    }

    return NextResponse.json({ success: true, profile: profileCreated });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Users] Exception:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

    // 2. Validate Caller is ADMIN
    const { data: callerProfile, error: profErr } = await userClient
      .from("profiles")
      .select("nome, email, role, tenant_id")
      .eq("id", caller.id)
      .maybeSingle();

    if (profErr || !callerProfile || callerProfile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Acesso restrito a ADMIN" }, { status: 403 });
    }

    const tenantId = callerProfile.tenant_id;

    // Get the target user ID to delete
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json({ error: "O ID do usuário é obrigatório" }, { status: 400 });
    }

    // 3. Verify target user belongs to the same tenant
    const { data: targetProfile, error: targetErr } = await userClient
      .from("profiles")
      .select("nome, email, tenant_id")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetErr || !targetProfile) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (targetProfile.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Acesso negado: o usuário pertence a outro tenant" }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 4. Delete user profile
    const { error: deleteProfErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (deleteProfErr) {
      return NextResponse.json({ error: deleteProfErr.message || "Erro ao excluir perfil" }, { status: 400 });
    }

    // 5. Delete user in Auth
    const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteAuthErr) {
      console.warn("Failed to delete auth user, profile already deleted:", deleteAuthErr.message);
    }

    // 6. Write Audit Log
    const callerName = callerProfile.nome || callerProfile.email || "Administrador";
    try {
      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        modulo: "Usuários",
        acao: "DELETE_USER",
        registro_id: targetUserId,
        descricao: `Usuário ${targetProfile.nome} (${targetProfile.email}) excluído permanentemente pelo Administrador`,
        user_name: callerName
      });
    } catch (e) {
      console.warn("Failed to write audit log:", e);
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Users DELETE] Exception:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
