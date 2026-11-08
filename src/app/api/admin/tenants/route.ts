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
      .select("nome, role")
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
      planoSaasId,
      trialDias,
      valorAssinatura,
      observacoes
    } = body;

    if (!empresa?.trim() || !nomeFantasia?.trim() || !adminNome?.trim() || !adminEmail?.trim()) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes: empresa, nomeFantasia, adminNome, adminEmail." },
        { status: 400 }
      );
    }

    const normalizedAdminEmail = adminEmail.trim().toLowerCase();
    const normalizedCompanyEmail = (email || adminEmail).trim().toLowerCase();
    const cleanCnpj = cnpj ? cnpj.replace(/\D/g, "") : null;

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Pre-flight idempotency / anti-duplication checks
    // 3.1. Check if user with adminEmail already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, tenant_id")
      .ilike("email", normalizedAdminEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: `Já existe um usuário cadastrado com o e-mail: ${normalizedAdminEmail}` },
        { status: 409 }
      );
    }

    // 3.2. Check if tenant with same CNPJ already exists (if provided)
    if (cleanCnpj) {
      const { data: existingCnpj } = await supabaseAdmin
        .from("empresa_config")
        .select("tenant_id, cnpj")
        .eq("cnpj", cleanCnpj)
        .maybeSingle();

      if (existingCnpj) {
        return NextResponse.json(
          { error: `Já existe um tenant cadastrado com este CNPJ: ${cnpj}` },
          { status: 409 }
        );
      }
    }

    // 3.3. Check if active SaaS plan exists
    let selectedPlan: { id: string; nome: string; valor_mensal: number | null; trial_dias: number | null } | null = null;
    if (planoSaasId) {
      const { data: planData } = await supabaseAdmin
        .from("saas_plans")
        .select("id, nome, valor_mensal, trial_dias")
        .eq("id", planoSaasId)
        .maybeSingle();
      selectedPlan = planData;
    }

    if (!selectedPlan) {
      // Fallback: pick the first active SaaS plan
      const { data: defaultPlan } = await supabaseAdmin
        .from("saas_plans")
        .select("id, nome, valor_mensal, trial_dias")
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      selectedPlan = defaultPlan;
    }

    // 4. Provisioning Workflow with Compensating Rollback
    let createdTenantId: string | null = null;
    let createdAuthUserId: string | null = null;

    try {
      // Step A: Create Tenant
      const { data: tenant, error: tErr } = await supabaseAdmin
        .from("tenants")
        .insert({
          empresa: empresa.trim(),
          responsavel: adminNome.trim(),
          tipo: "usuario",
          status: status || "ATIVO"
        })
        .select()
        .single();

      if (tErr || !tenant) {
        throw new Error(tErr?.message || "Falha ao cadastrar o tenant.");
      }
      createdTenantId = tenant.id;

      // Step B: Insert Empresa Config
      const { error: cErr } = await supabaseAdmin
        .from("empresa_config")
        .insert({
          tenant_id: createdTenantId,
          razao_social: empresa.trim(),
          nome_fantasia: nomeFantasia.trim(),
          cnpj: cleanCnpj,
          telefone: telefone ? telefone.trim() : null,
          celular: celular ? celular.trim() : null,
          email: normalizedCompanyEmail,
          cidade: cidade ? cidade.trim() : null,
          uf: uf ? uf.trim() : "SP",
          cor_primaria: "#0b4f59",
          cor_secundaria: "#6c757d"
        });

      if (cErr) {
        throw new Error(`Falha ao registrar configurações da empresa: ${cErr.message}`);
      }

      // Step C: Create Admin user in Auth using Admin Client
      // We use inviteUserByEmail so Supabase Auth handles the secure email invite token.
      // If SMTP is not yet configured or fails, we generate an invite link as fallback.
      let inviteSent = false;
      let inviteLink: string | null = null;

      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.memorius.com.br";
      const redirectUrl = `${appBaseUrl}/login`;

      const { data: invitedUser, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedAdminEmail,
        {
          redirectTo: redirectUrl,
          data: {
            nome: adminNome.trim(),
            role: "ADMIN"
          }
        }
      );

      if (!inviteErr && invitedUser?.user) {
        createdAuthUserId = invitedUser.user.id;
        inviteSent = true;
      } else {
        console.warn("[API Tenants] inviteUserByEmail warning/error:", inviteErr?.message);

        // Fallback: create user without password (or with random cryptographically secure token)
        // and generate link securely for manual copy or SMTP retry
        const crypto = await import("crypto");
        const placeholderPassword = crypto.randomBytes(32).toString("base64") + "!Aa19#";

        const { data: fallbackUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedAdminEmail,
          password: placeholderPassword,
          email_confirm: true,
          user_metadata: {
            nome: adminNome.trim(),
            role: "ADMIN"
          }
        });

        if (createErr || !fallbackUser?.user) {
          throw new Error(createErr?.message || inviteErr?.message || "Falha ao criar usuário administrador no Auth.");
        }

        createdAuthUserId = fallbackUser.user.id;

        // Generate invite / recovery link via generateLink
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: normalizedAdminEmail,
          options: {
            redirectTo: redirectUrl
          }
        });

        if (!linkErr && linkData?.properties?.action_link) {
          inviteLink = linkData.properties.action_link;
        }
      }

      // Step D: Resolve ADMIN role ID
      const { data: roleData } = await supabaseAdmin
        .from("roles")
        .select("id")
        .eq("nome", "ADMIN")
        .maybeSingle();

      const roleId = roleData?.id || null;

      // Step E: Insert Profile for ADMIN
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: createdAuthUserId,
          tenant_id: createdTenantId,
          nome: adminNome.trim(),
          email: normalizedAdminEmail,
          role: "ADMIN",
          role_id: roleId,
          status: "ATIVO",
          ativo: true
        });

      if (pErr) {
        throw new Error(`Falha ao criar perfil do administrador: ${pErr.message}`);
      }

      // Step F: Create Initial TRIAL Subscription (168 hours = 7 days exact UTC timestamp)
      if (selectedPlan) {
        const days = typeof trialDias === "number" && trialDias > 0
          ? trialDias
          : (selectedPlan.trial_dias || 7);

        const nowUtc = new Date();
        const dataInicioIso = nowUtc.toISOString();

        // 168 horas exatas (7 * 24 * 60 * 60 * 1000 ms)
        const vencimentoUtc = new Date(nowUtc.getTime() + days * 24 * 60 * 60 * 1000);
        const dataVencimentoIso = vencimentoUtc.toISOString();

        const subValor = typeof valorAssinatura === "number" && valorAssinatura >= 0
          ? valorAssinatura
          : (Number(selectedPlan.valor_mensal) || 0);

        const { error: subErr } = await supabaseAdmin
          .from("tenant_subscriptions")
          .insert({
            tenant_id: createdTenantId,
            saas_plan_id: selectedPlan.id,
            status: "TRIAL",
            ciclo: "MENSAL",
            valor: subValor,
            data_inicio: dataInicioIso,
            data_vencimento: dataVencimentoIso,
            observacoes: observacoes || `Assinatura de teste (${days} dias / ${days * 24}h) provisionada pelo Super Admin.`
          });

        if (subErr) {
          throw new Error(`Falha ao registrar assinatura inicial do tenant: ${subErr.message}`);
        }
      }

      // Step G: Register Audit Log
      try {
        await supabaseAdmin.from("audit_logs").insert({
          tenant_id: createdTenantId,
          modulo: "SAAS_ADMIN",
          acao: "CREATE_TENANT",
          registro_id: createdTenantId,
          descricao: `Tenant ${nomeFantasia} provisionado com sucesso. Admin: ${normalizedAdminEmail}. Assinatura TRIAL com vencimento em UTC.`,
          user_name: profile.nome || user.email || "Super Admin"
        });
      } catch (logErr) {
        console.warn("[API Tenants] Audit log warning:", logErr);
      }

      return NextResponse.json({
        success: true,
        tenantId: createdTenantId,
        authUserId: createdAuthUserId,
        inviteSent,
        inviteLink,
        message: inviteSent
          ? "Tenant, configurações, usuário administrador e assinatura TRIAL provisionados! Convite enviado por e-mail."
          : "Tenant provisionado com sucesso! O e-mail de convite pode ser reenviado pelo Super Admin."
      });

    } catch (provisionErr: unknown) {
      const err = provisionErr as Error;
      console.error("[API Tenants] Erro no provisionamento, iniciando compensação/rollback:", err.message);

      // Safe Compensating Actions
      if (createdAuthUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        } catch (delAuthErr) {
          console.error("[API Tenants] Falha ao compensar usuário Auth:", delAuthErr);
        }
      }

      if (createdTenantId) {
        try {
          // Deleting tenant cascades profiles, empresa_config, tenant_subscriptions, etc.
          await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
        } catch (delTenantErr) {
          console.error("[API Tenants] Falha ao compensar Tenant:", delTenantErr);
        }
      }

      return NextResponse.json(
        { error: `Falha no provisionamento: ${err.message}` },
        { status: 500 }
      );
    }

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
      .select("nome, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Acesso restrito a SUPER_ADMIN" }, { status: 403 });
    }

    const body = await req.json();
    const {
      action,
      tenantId,
      adminEmail,
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

    const supabaseAdmin = getSupabaseAdmin();

    // Reenviar Convite de Primeiro Acesso
    if (action === "resendInvite") {
      if (!tenantId && !adminEmail) {
        return NextResponse.json({ error: "tenantId ou adminEmail é obrigatório para reenviar convite." }, { status: 400 });
      }

      let targetEmail = adminEmail ? adminEmail.trim().toLowerCase() : null;
      const targetTenantId = tenantId;

      if (!targetEmail && tenantId) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("tenant_id", tenantId)
          .in("role", ["ADMIN", "SUPER_ADMIN"])
          .maybeSingle();
        targetEmail = p?.email || null;
      }

      if (!targetEmail) {
        return NextResponse.json({ error: "Administrador não encontrado para este tenant." }, { status: 404 });
      }

      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.memorius.com.br";
      const redirectUrl = `${appBaseUrl}/login`;

      let inviteSent = false;
      let inviteLink: string | null = null;

      // Try invite/recovery link first
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
        options: {
          redirectTo: redirectUrl
        }
      });

      if (!linkErr && linkData?.properties?.action_link) {
        inviteLink = linkData.properties.action_link;
      }

      // Also dispatch through resetPasswordForEmail / invite
      try {
        const { error: inviteErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: redirectUrl
        });
        if (!inviteErr) {
          inviteSent = true;
        }
      } catch (e) {
        console.warn("[API Tenants] Resend invite warning:", e);
      }

      // Log audit
      try {
        await supabaseAdmin.from("audit_logs").insert({
          tenant_id: targetTenantId || null,
          modulo: "SAAS_ADMIN",
          acao: "RESEND_TENANT_INVITE",
          registro_id: targetTenantId || "N/A",
          descricao: `Convite de primeiro acesso reenviado para ${targetEmail}.`,
          user_name: profile.nome || user.email || "Super Admin"
        });
      } catch (logErr) {
        console.warn("[API Tenants] Audit log error:", logErr);
      }

      return NextResponse.json({
        success: true,
        inviteSent,
        inviteLink,
        message: inviteSent
          ? `Convite enviado com sucesso para ${targetEmail}!`
          : `Link de convite gerado com sucesso para ${targetEmail}.`
      });
    }

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

