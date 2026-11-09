import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL and Service Role Key must be configured.");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// Configurações do Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Memorius <nao-responder@memorius.com.br>";

export interface SendTrialEmailParams {
  to: string;
  responsavel: string;
  empresa: string;
  planoNome: string;
  confirmationUrl: string;
}

export async function sendTrialVerificationEmail({
  to,
  responsavel,
  empresa,
  planoNome,
  confirmationUrl,
}: SendTrialEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const isProduction = process.env.NODE_ENV === "production";

  // Em produção, a ausência de RESEND_API_KEY deve falhar explicitamente
  if (!RESEND_API_KEY) {
    const errorMsg = "RESEND_API_KEY não está configurada no ambiente do servidor.";
    console.error(`[ResendService] ${errorMsg}`);
    if (isProduction) {
      return { success: false, error: errorMsg };
    }

    // Apenas em ambiente de desenvolvimento local (não produção) registramos log detalhado
    console.warn(`[ResendService - DEV ONLY] Simulação ativa. Link de verificação: ${confirmationUrl}`);
    return {
      success: true,
      id: "dev-simulated-" + crypto.randomUUID(),
      error: "RESEND_API_KEY_NOT_CONFIGURED_DEV",
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu teste grátis no Memorius</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F9FC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #101A37;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F7F9FC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5EAF0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 35, 55, 0.05);">
          <!-- Top Header Brand -->
          <tr>
            <td style="background: linear-gradient(160deg, #003D33 0%, #002D27 100%); padding: 32px 36px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
                MEMORIUS
              </h1>
              <p style="margin: 6px 0 0; color: #D1E5DF; font-size: 13px;">
                Gestão de Planos de Assistência Familiar
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #0C1738;">
                Olá, ${escapeHtml(responsavel)}!
              </h2>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4A5568;">
                Recebemos sua solicitação para iniciar o <strong>teste grátis de 7 dias</strong> do <strong>Plano ${escapeHtml(planoNome)}</strong> para a empresa <strong>${escapeHtml(empresa)}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4A5568;">
                Para ativar sua conta e acessar todos os módulos do sistema com isolamento e segurança, confirme seu e-mail clicando no botão abaixo:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${confirmationUrl}" target="_blank" style="display: inline-block; background-color: #008C66; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 140, 102, 0.3); letter-spacing: 0.01em;">
                      Confirmar E-mail e Iniciar Teste →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 12px; line-height: 1.5; color: #718096;">
                Este link é de uso único e expira em <strong>24 horas</strong>. Caso o botão não funcione, copie e cole o endereço abaixo no seu navegador:
              </p>
              <p style="margin: 0 0 24px; font-size: 11px; word-break: break-all; color: #008C66;">
                <a href="${confirmationUrl}" style="color: #008C66; text-decoration: underline;">${confirmationUrl}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #A0AEC0;">
                Se você não solicitou este cadastro no Memorius, por favor desconsidere esta mensagem. Nenhuma conta será ativada sem a confirmação prévia deste e-mail.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 36px; text-align: center; border-top: 1px solid #E5EAF0;">
              <p style="margin: 0; font-size: 11px; color: #718096;">
                © ${new Date().getFullYear()} Memorius Tecnologia SaaS. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject: `Confirme seu teste grátis no Memorius (${planoNome})`,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[ResendService] Erro ao enviar e-mail:", data);
      return { success: false, error: data?.message || "Erro no envio via Resend" };
    }

    return { success: true, id: data.id };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ResendService] Exceção no envio via Resend:", error.message);
    return { success: false, error: error.message };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
