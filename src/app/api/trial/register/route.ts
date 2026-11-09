import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, sendTrialVerificationEmail } from "@/lib/resend.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      empresa,
      responsavel,
      email,
      whatsapp,
      plano, // "essencial", "profissional", "enterprise"
      aceiteTermos,
    } = body;

    // 1. Validação estrita de campos
    if (!empresa?.trim() || !responsavel?.trim() || !email?.trim() || !whatsapp?.trim()) {
      return NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos." },
        { status: 400 }
      );
    }

    if (!aceiteTermos) {
      return NextResponse.json(
        { error: "É obrigatório aceitar os Termos de Uso e Política de Privacidade." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "O formato do e-mail informado é inválido." },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 11) {
      return NextResponse.json(
        { error: "Informe um número de WhatsApp válido com DDD." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Proteção Anti-Enumeração: Checar se o e-mail já possui conta ativa no sistema
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // Resposta segura e uniforme que orienta para o login sem expor detalhes estruturais
      return NextResponse.json(
        {
          success: true,
          registered: false,
          message: "Se o e-mail informado for novo, as instruções foram enviadas. Caso já possua conta, acesse o login.",
          alreadyRegistered: true,
        },
        { status: 200 }
      );
    }

    // 3. Resolver plano SaaS
    const planSlug = (plano || "profissional").toLowerCase();
    const planNameMap: Record<string, string> = {
      essencial: "Essencial",
      profissional: "Profissional",
      enterprise: "Enterprise",
    };
    const targetPlanName = planNameMap[planSlug] || "Profissional";

    const { data: saasPlan } = await supabaseAdmin
      .from("saas_plans")
      .select("id, nome, trial_dias, valor_mensal")
      .ilike("nome", targetPlanName)
      .maybeSingle();

    const planoSaasId = saasPlan?.id || null;
    const planoNomeReal = saasPlan?.nome || targetPlanName;

    // 4. Armazenamento seguro de Token via Hash SHA-256 (Raw Token nunca persistido no banco)
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
    );
    // Link enviado ao usuário contém o raw token; o banco armazena apenas o hash sha256
    const confirmationUrl = `${appBaseUrl}/cadastro/confirmar?token=${rawVerificationToken}`;

    // 5. Upsert da solicitação PENDING
    const { data: existingPending } = await supabaseAdmin
      .from("trial_signups")
      .select("id, resend_count, last_resend_at")
      .eq("email", normalizedEmail)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingPending) {
      await supabaseAdmin
        .from("trial_signups")
        .update({
          empresa: empresa.trim(),
          responsavel: responsavel.trim(),
          whatsapp: cleanWhatsapp,
          plano_slug: planSlug,
          plano_saas_id: planoSaasId,
          token_hash: tokenHash,
          token_expires_at: tokenExpiresAt,
          resend_count: (existingPending.resend_count || 0) + 1,
          last_resend_at: new Date().toISOString(),
        })
        .eq("id", existingPending.id);
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from("trial_signups")
        .insert({
          empresa: empresa.trim(),
          responsavel: responsavel.trim(),
          email: normalizedEmail,
          whatsapp: cleanWhatsapp,
          plano_slug: planSlug,
          plano_saas_id: planoSaasId,
          token_hash: tokenHash,
          token_expires_at: tokenExpiresAt,
          status: "PENDING",
        });

      if (insertErr) {
        console.error("[TrialRegister] Erro ao registrar trial_signups:", insertErr);
        throw new Error("Falha ao salvar solicitação de cadastro.");
      }
    }

    // 6. Enviar e-mail de confirmação pelo Resend no servidor
    const emailResult = await sendTrialVerificationEmail({
      to: normalizedEmail,
      responsavel: responsavel.trim(),
      empresa: empresa.trim(),
      planoNome: planoNomeReal,
      confirmationUrl,
    });

    if (!emailResult.success) {
      console.error("[TrialRegister] Falha no envio do e-mail via Resend:", emailResult.error);
      
      // Rollback se for um cadastro recém-inserido:
      // Remove o registro PENDING órfão para não travar o e-mail em estado pendente irrecuperável
      if (!existingPending) {
        await supabaseAdmin
          .from("trial_signups")
          .delete()
          .eq("email", normalizedEmail)
          .eq("status", "PENDING");
      }

      return NextResponse.json(
        {
          error: "Não foi possível enviar o e-mail de confirmação. Por favor, verifique o e-mail informado ou tente novamente.",
          details: process.env.NODE_ENV !== "production" ? emailResult.error : undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      registered: true,
      message: "Solicitação registrada com sucesso! Verifique seu e-mail para ativar o teste grátis.",
      email: normalizedEmail,
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[TrialRegister] Erro inesperado ao processar cadastro:", error?.stack || error?.message || error);
    return NextResponse.json(
      { error: "Ocorreu uma instabilidade temporária ao processar seu cadastro. Por favor, tente novamente em instantes." },
      { status: 500 }
    );
  }
}
