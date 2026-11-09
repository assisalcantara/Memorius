import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, sendTrialVerificationEmail } from "@/lib/resend.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Localizar solicitação PENDING
    const { data: signup, error: findErr } = await supabaseAdmin
      .from("trial_signups")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("status", "PENDING")
      .maybeSingle();

    // Proteção anti-enumeração: resposta genérica de sucesso se não houver registro pendente
    if (findErr || !signup) {
      return NextResponse.json({
        success: true,
        message: "Se houver uma solicitação pendente para este e-mail, as instruções de confirmação foram reenviadas.",
      });
    }

    // 2. Limite de tentativas e Rate Limiting (máx 5 reenvios; intervalo mín 60s)
    const MAX_RESENDS = 5;
    if (signup.resend_count >= MAX_RESENDS) {
      return NextResponse.json(
        { error: "Limite de reenvios excedido para este e-mail. Por favor, aguarde alguns minutos ou entre em contato com o suporte." },
        { status: 429 }
      );
    }

    if (signup.last_resend_at) {
      const lastResend = new Date(signup.last_resend_at).getTime();
      const diffSec = (Date.now() - lastResend) / 1000;
      if (diffSec < 60) {
        const waitSec = Math.ceil(60 - diffSec);
        return NextResponse.json(
          { error: `Aguarde ${waitSec} segundos antes de solicitar um novo reenvio.` },
          { status: 429 }
        );
      }
    }

    // 3. Gerar novo token seguro via Hash SHA-256
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
    );
    const confirmationUrl = `${appBaseUrl}/cadastro/confirmar?token=${rawVerificationToken}`;

    await supabaseAdmin
      .from("trial_signups")
      .update({
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
        resend_count: signup.resend_count + 1,
        last_resend_at: new Date().toISOString(),
      })
      .eq("id", signup.id);

    // 4. Enviar e-mail via Resend
    const planoNome = signup.plano_slug === "essencial" ? "Essencial" : signup.plano_slug === "enterprise" ? "Enterprise" : "Profissional";
    const emailResult = await sendTrialVerificationEmail({
      to: normalizedEmail,
      responsavel: signup.responsavel,
      empresa: signup.empresa,
      planoNome,
      confirmationUrl,
    });

    if (!emailResult.success) {
      console.error("[TrialResend] Erro ao reenviar e-mail via Resend:", emailResult.error);
      return NextResponse.json(
        {
          error: "Não foi possível reenviar o e-mail de confirmação no momento. Por favor, tente novamente em instantes.",
          details: process.env.NODE_ENV !== "production" ? emailResult.error : undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "E-mail de confirmação reenviado com sucesso! Verifique sua caixa de entrada.",
      resendsLeft: MAX_RESENDS - (signup.resend_count + 1),
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[TrialResend] Erro:", error.message);
    return NextResponse.json(
      { error: error.message || "Erro ao reenviar e-mail de confirmação." },
      { status: 500 }
    );
  }
}
