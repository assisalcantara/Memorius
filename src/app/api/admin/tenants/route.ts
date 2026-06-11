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

    const body = await req.json();
    const {
      empresa,
      nomeFantasia,
      cnpj,
      telefone,
      celular,
      email,
      cidade,
      uf,
      adminNome,
      adminEmail,
      status,
      password
    } = body;

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create Tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        empresa,
        responsavel: adminNome,
        tipo: "usuario",
        status
      })
      .select()
      .single();

    if (tErr || !tenant) {
      return NextResponse.json({ error: tErr?.message || "Falha ao cadastrar o tenant." }, { status: 400 });
    }

    const tenantId = tenant.id;

    // 2. Insert Empresa Config
    const { error: cErr } = await supabaseAdmin
      .from("empresa_config")
      .insert({
        tenant_id: tenantId,
        razao_social: empresa,
        nome_fantasia: nomeFantasia,
        cnpj: cnpj || null,
        telefone: telefone || null,
        celular: celular || null,
        email: email,
        cidade: cidade || null,
        uf: uf,
        cor_primaria: "#0b4f59",
        cor_secundaria: "#6c757d"
      });

    if (cErr) {
      console.warn("[API Tenants] Warning: Failed to insert empresa_config:", cErr.message);
    }

    // 3. Create Admin user in Auth using Admin client
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true
    });

    if (authErr || !authUser.user) {
      // Rollback tenant
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      return NextResponse.json({ error: authErr?.message || "Falha ao criar usuário administrador no Auth." }, { status: 400 });
    }

    const authUserId = authUser.user.id;

    // 4. Fetch role ID for ADMIN
    const { data: roleData } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("nome", "ADMIN")
      .maybeSingle();

    const roleId = roleData?.id || null;

    // 5. Insert Profile
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUserId,
        tenant_id: tenantId,
        nome: adminNome,
        email: adminEmail,
        role: "ADMIN",
        role_id: roleId,
        status: "ATIVO",
        ativo: true
      });

    if (pErr) {
      console.warn("[API Tenants] Warning: Failed to create admin profile:", pErr.message);
    }

    // 6. Register Audit Log
    try {
      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        modulo: "SAAS_ADMIN",
        acao: "CREATE_TENANT",
        registro_id: tenantId,
        descricao: `Tenant ${nomeFantasia} cadastrado com status ${status}. Admin: ${adminEmail}. Senha definida pelo Super Admin.`,
        user_name: "Super Admin"
      });
    } catch (e: unknown) {
      const error = e as Error;
      console.warn("[API Tenants] Failed to write audit log:", error.message);
    }

    return NextResponse.json({ success: true, tenantId });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Tenants] Exception:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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

    const body = await req.json();
    const {
      tenantId,
      empresa,
      responsavel,
      status,
      password,
      saasPlanId,
      subStatus,
      subCiclo,
      subValor,
      subDataInicio,
      subDataVencimento,
      subObservacoes
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "O ID do tenant é obrigatório." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Update Tenant
    const { error: tErr } = await supabaseAdmin
      .from("tenants")
      .update({
        empresa,
        responsavel,
        status
      })
      .eq("id", tenantId);

    if (tErr) {
      return NextResponse.json({ error: tErr.message || "Falha ao atualizar o tenant." }, { status: 400 });
    }

    // 4. Update Password if provided
    let passwordUpdated = false;
    if (password && password.trim() !== "") {
      const { data: adminProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("tenant_id", tenantId)
        .in("role", ["ADMIN", "SUPER_ADMIN"])
        .maybeSingle();

      if (adminProfile?.id) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(adminProfile.id, {
          password: password
        });

        if (authErr) {
          if (authErr.message?.includes("not found") && adminProfile.email) {
            const { error: repairErr } = await supabaseAdmin.auth.admin.createUser({
              id: adminProfile.id,
              email: adminProfile.email,
              password: password,
              email_confirm: true
            });
            if (repairErr) {
              return NextResponse.json({ error: `Tenant atualizado, mas falha ao restaurar usuário no Auth: ${repairErr.message}` }, { status: 400 });
            }
          } else {
            return NextResponse.json({ error: `Tenant atualizado, mas falha ao alterar a senha: ${authErr.message}` }, { status: 400 });
          }
        }
        passwordUpdated = true;
      }
    }

    // 5. Create or Update subscription if saasPlanId is provided
    if (saasPlanId) {
      const { data: existingSub } = await supabaseAdmin
        .from("tenant_subscriptions")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const subPayload: Record<string, unknown> = {
        tenant_id: tenantId,
        saas_plan_id: saasPlanId,
        status: subStatus || "TRIAL",
        ciclo: subCiclo || "MENSAL",
        valor: subValor !== undefined ? Number(subValor) : 0,
        data_inicio: subDataInicio || new Date().toISOString().split("T")[0],
        data_vencimento: subDataVencimento || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        observacoes: subObservacoes || "Atualizado pelo Super Admin"
      };

      if (existingSub?.id) {
        const { error: subErr } = await supabaseAdmin
          .from("tenant_subscriptions")
          .update(subPayload)
          .eq("id", existingSub.id);

        if (subErr) {
          console.warn("[API Tenants PUT] Failed to update subscription:", subErr.message);
          return NextResponse.json({ error: `Tenant atualizado, mas falha ao salvar assinatura: ${subErr.message}` }, { status: 400 });
        }
      } else {
        const { error: subErr } = await supabaseAdmin
          .from("tenant_subscriptions")
          .insert(subPayload);

        if (subErr) {
          console.warn("[API Tenants PUT] Failed to insert subscription:", subErr.message);
          return NextResponse.json({ error: `Tenant atualizado, mas falha ao criar assinatura: ${subErr.message}` }, { status: 400 });
        }
      }
    }

    // 6. Register Audit Log
    try {
      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        modulo: "SAAS_ADMIN",
        acao: "UPDATE_TENANT",
        registro_id: tenantId,
        descricao: `Tenant atualizado: ${empresa}. Status: ${status}.${passwordUpdated ? " Senha de administrador alterada pelo Super Admin." : ""}`,
        user_name: "Super Admin"
      });
    } catch (e: unknown) {
      const error = e as Error;
      console.warn("[API Tenants] Failed to write audit log:", error.message);
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Tenants PUT] Exception:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}

