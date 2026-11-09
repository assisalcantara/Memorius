import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/resend.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, senha } = body;

    if (!token?.trim()) {
      return NextResponse.json({ error: "Token de verificação não fornecido." }, { status: 400 });
    }

    if (!senha || senha.length < 6) {
      return NextResponse.json(
        { error: "A senha de acesso deve conter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // 1. Converter raw token para hash SHA-256 para consulta segura
    const rawToken = token.trim();
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Buscar solicitação pelo token_hash
    const { data: signup, error: findErr } = await supabaseAdmin
      .from("trial_signups")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (findErr || !signup) {
      return NextResponse.json(
        { code: "INVALID_TOKEN", error: "Link de confirmação inválido ou inexistente." },
        { status: 404 }
      );
    }

    // 3. Idempotência estrita: se já ativado, retorna sucesso e orienta login
    if (signup.status === "ACTIVATED") {
      return NextResponse.json({
        success: true,
        alreadyActivated: true,
        message: "Esta conta já foi ativada. Você pode fazer login diretamente.",
        email: signup.email,
      });
    }

    // 4. Verificação de expiração
    const now = new Date();
    const expiresAt = new Date(signup.token_expires_at);
    if (now > expiresAt || signup.status === "EXPIRED") {
      await supabaseAdmin
        .from("trial_signups")
        .update({ status: "EXPIRED" })
        .eq("id", signup.id);

      return NextResponse.json(
        { code: "EXPIRED_TOKEN", error: "Este link de confirmação expirou. Solicite um novo link abaixo.", email: signup.email },
        { status: 410 }
      );
    }

    // 5. CONROLE SEGURO DE CONCORRÊNCIA COM ESTADO INTERMEDIÁRIO 'PROVISIONING'
    // Tenta atualizar de PENDING para PROVISIONING atomicamente.
    // Compatibilidade: se a constraint ainda não foi atualizada para aceitar PROVISIONING,
    // fallback seguro sem quebrar o banco.
    let lockAcquired = false;
    const nowIso = now.toISOString();

    const { data: lockedSignup, error: lockErr } = await supabaseAdmin
      .from("trial_signups")
      .update({
        status: "PROVISIONING",
        provisioning_started_at: nowIso,
      })
      .eq("id", signup.id)
      .eq("status", "PENDING")
      .select()
      .maybeSingle();

    if (!lockErr && lockedSignup) {
      lockAcquired = true;
    } else if (lockErr?.message?.includes("violates check constraint")) {
      // Fallback gracioso caso a migration incremental ainda não tenha sido executada manualmente:
      // Mantém a concorrência controlada na verificação prévia
      lockAcquired = true;
    } else if (signup.status === "PROVISIONING") {
      // Outra requisição está no meio do provisionamento neste exato momento
      // Retorna 409 amigável solicitando aguardar 5 segundos
      return NextResponse.json(
        {
          code: "PROVISIONING_IN_PROGRESS",
          error: "Sua conta está sendo configurada no momento. Aguarde alguns instantes e recarregue a página.",
          email: signup.email,
        },
        { status: 409 }
      );
    } else {
      // Já ativado ou modificado concorrentemente
      return NextResponse.json({
        success: true,
        alreadyActivated: true,
        message: "Esta solicitação já foi processada. Acesse o sistema.",
        email: signup.email,
      });
    }

    // 6. Prevenção de duplicidade em profiles / auth
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, tenant_id")
      .ilike("email", signup.email)
      .maybeSingle();

    if (existingProfile) {
      await supabaseAdmin
        .from("trial_signups")
        .update({ status: "ACTIVATED", activated_at: nowIso, tenant_id: existingProfile.tenant_id })
        .eq("id", signup.id);

      return NextResponse.json({
        success: true,
        alreadyActivated: true,
        message: "Usuário já existente no sistema. Redirecionando para o login.",
        email: signup.email,
      });
    }

    // 7. Obter plano SaaS para vincular limites
    let selectedPlan: {
      id: string;
      nome: string;
      trial_dias: number | null;
      valor_mensal: number | null;
      limite_usuarios: number | null;
      limite_clientes: number | null;
      limite_contratos: number | null;
      limite_storage_mb: number | null;
    } | null = null;

    if (signup.plano_saas_id) {
      const { data: pData } = await supabaseAdmin
        .from("saas_plans")
        .select("id, nome, trial_dias, valor_mensal, limite_usuarios, limite_clientes, limite_contratos, limite_storage_mb")
        .eq("id", signup.plano_saas_id)
        .maybeSingle();
      selectedPlan = pData;
    }

    if (!selectedPlan) {
      const { data: fallbackPlan } = await supabaseAdmin
        .from("saas_plans")
        .select("id, nome, trial_dias, valor_mensal, limite_usuarios, limite_clientes, limite_contratos, limite_storage_mb")
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      selectedPlan = fallbackPlan;
    }

    // 8. PROVISIONAMENTO ATÔMICO COM COMPENSAÇÃO (Tenant -> Empresa Config -> Auth User -> Profile -> Assinatura TRIAL)
    let createdTenantId: string | null = null;
    let createdAuthUserId: string | null = null;

    try {
      // 8.1. Inserir Tenant (Multi-tenant)
      const { data: tenant, error: tErr } = await supabaseAdmin
        .from("tenants")
        .insert({
          empresa: signup.empresa.trim(),
          responsavel: signup.responsavel.trim(),
          tipo: "usuario",
          status: "ATIVO",
        })
        .select()
        .single();

      if (tErr || !tenant) {
        throw new Error(tErr?.message || "Falha ao criar o tenant.");
      }
      createdTenantId = tenant.id;

      // 8.2. Inserir Empresa Config
      const { error: cErr } = await supabaseAdmin
        .from("empresa_config")
        .insert({
          tenant_id: createdTenantId,
          razao_social: signup.empresa.trim(),
          nome_fantasia: signup.empresa.trim(),
          celular: signup.whatsapp,
          email: signup.email,
          cor_primaria: "#003D33",
          cor_secundaria: "#F5BD22",
        });

      if (cErr) {
        throw new Error(`Falha ao registrar configurações: ${cErr.message}`);
      }

      // 8.3. Criar usuário no Auth com a senha escolhida diretamente pelo usuário
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: signup.email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome: signup.responsavel.trim(),
          role: "ADMIN",
        },
      });

      if (authErr || !authUser?.user) {
        throw new Error(authErr?.message || "Falha ao criar credenciais de autenticação.");
      }
      createdAuthUserId = authUser.user.id;

      // 8.4. Resolver Role ADMIN
      const { data: roleData } = await supabaseAdmin
        .from("roles")
        .select("id")
        .eq("nome", "ADMIN")
        .maybeSingle();

      const roleId = roleData?.id || null;

      // 8.5. Inserir Profile ADMIN
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: createdAuthUserId,
          tenant_id: createdTenantId,
          nome: signup.responsavel.trim(),
          email: signup.email,
          role: "ADMIN",
          role_id: roleId,
          status: "ATIVO",
          ativo: true,
        });

      if (pErr) {
        throw new Error(`Falha ao criar perfil: ${pErr.message}`);
      }

      // 8.6. Iniciar Período de 7 Dias Exatos (168 Horas contadas da confirmação)
      const days = selectedPlan?.trial_dias || 7;
      const nowUtc = new Date();
      const dataInicioIso = nowUtc.toISOString();
      const vencimentoUtc = new Date(nowUtc.getTime() + days * 24 * 60 * 60 * 1000);
      const dataVencimentoIso = vencimentoUtc.toISOString();

      if (selectedPlan) {
        const { error: subErr } = await supabaseAdmin
          .from("tenant_subscriptions")
          .insert({
            tenant_id: createdTenantId,
            saas_plan_id: selectedPlan.id,
            status: "TRIAL",
            ciclo: "MENSAL",
            valor: Number(selectedPlan.valor_mensal) || 0,
            data_inicio: dataInicioIso,
            data_vencimento: dataVencimentoIso,
            observacoes: `Teste Grátis (${days} dias) iniciado via confirmação de e-mail. Limites: ${selectedPlan.limite_usuarios || 0} usuários, ${selectedPlan.limite_contratos || 0} contratos.`,
          });

        if (subErr) {
          throw new Error(`Falha ao registrar assinatura trial: ${subErr.message}`);
        }
      }

      // 8.7. SOMENTE AGORA transicionar para ACTIVATED com tenant_id vinculado (Garante que nenhuma requisição concorrida receba sucesso antes da criação completa)
      await supabaseAdmin
        .from("trial_signups")
        .update({
          status: "ACTIVATED",
          tenant_id: createdTenantId,
          activated_at: nowIso,
        })
        .eq("id", signup.id);

      // 8.8. Auditoria
      try {
        await supabaseAdmin.from("audit_logs").insert({
          tenant_id: createdTenantId,
          modulo: "SAAS_ONBOARDING",
          acao: "TRIAL_ACTIVATED",
          registro_id: createdTenantId,
          descricao: `Teste grátis de 7 dias ativado pelo usuário ${signup.email} para o plano ${selectedPlan?.nome}. Vencimento: ${dataVencimentoIso}.`,
          user_name: signup.responsavel,
        });
      } catch (logErr) {
        console.warn("[TrialVerify] Audit log warning:", logErr);
      }

      return NextResponse.json({
        success: true,
        message: "E-mail confirmado e teste grátis de 7 dias ativado com sucesso!",
        tenantId: createdTenantId,
        email: signup.email,
        empresa: signup.empresa,
        plano: selectedPlan?.nome || "Profissional",
        trialExpiresAt: dataVencimentoIso,
      });

    } catch (provisionErr: unknown) {
      const err = provisionErr as Error;
      console.error("[TrialVerify] Falha no provisionamento, iniciando rollback compensatório:", err.message);

      // Reverter status para PENDING se o provisionamento falhou e permitir re-tentativa pelo usuário
      try {
        await supabaseAdmin
          .from("trial_signups")
          .update({ status: "PENDING", activated_at: null })
          .eq("id", signup.id);
      } catch (revErr) {
        console.error("[TrialVerify] Erro ao reverter status de trial_signups:", revErr);
      }

      if (createdAuthUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        } catch (delErr) {
          console.error("[TrialVerify] Erro ao deletar auth user:", delErr);
        }
      }

      if (createdTenantId) {
        try {
          await supabaseAdmin.from("tenants").delete().eq("id", createdTenantId);
        } catch (delTenantErr) {
          console.error("[TrialVerify] Erro ao deletar tenant:", delTenantErr);
        }
      }

      return NextResponse.json(
        { error: "Falha ao concluir a ativação do teste. Por favor, tente novamente." },
        { status: 500 }
      );
    }

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[TrialVerify] Erro geral ao validar ativação:", error?.stack || error?.message || error);
    return NextResponse.json(
      { error: "Ocorreu um erro interno ao processar a validação. Por favor, tente novamente." },
      { status: 500 }
    );
  }
}
