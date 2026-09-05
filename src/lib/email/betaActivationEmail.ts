export interface BetaActivationEmailInput {
  recipientName?: string | null;
  confirmUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = "OASIS";
const TAGLINE = "Clarity in digital markets.";
const ATTRIBUTION = "by Omega Labs Protocol";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Passwordless confirmation email. Completes the invite → Auth identity
 * step without asking the participant for a password.
 */
export function renderBetaActivationEmail(
  input: BetaActivationEmailInput
): RenderedEmail {
  const greetingName = input.recipientName?.trim();
  const greeting = greetingName ? `Hello ${escapeHtml(greetingName)},` : "Hello,";
  const url = input.confirmUrl;
  const subject = "Confirm your OASIS access";

  const text = [
    `${BRAND}`,
    `${TAGLINE}`,
    `${ATTRIBUTION}`,
    "",
    greetingName ? `Hello ${greetingName},` : "Hello,",
    "",
    "You already have access to the OASIS private beta. Confirm this email to save your workspace and keep your activity under one identity — no password required.",
    "",
    `Confirm access: ${url}`,
    "",
    "This link expires shortly. If you did not request OASIS access, you may disregard this email.",
    "",
    `${BRAND} — ${TAGLINE} ${ATTRIBUTION}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px 40px;border-bottom:1px solid #f0f0f1;">
              <div style="font-size:20px;font-weight:600;letter-spacing:-0.02em;">${BRAND}</div>
              <div style="font-size:13px;color:#71717a;margin-top:2px;">${TAGLINE}</div>
              <div style="font-size:11px;color:#a1a1aa;margin-top:2px;">${ATTRIBUTION}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">${greeting}</p>
              <p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;">
                You already have access to the OASIS private beta. Confirm this email
                to save your workspace and keep your activity under one identity.
                No password is required.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#0a0a0a;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Confirm access
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px;line-height:1.6;color:#a1a1aa;margin:0;">
                This link expires shortly. If you did not request OASIS access, you may
                disregard this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f0f0f1;">
              <div style="font-size:12px;color:#71717a;">${BRAND} · ${TAGLINE}</div>
              <div style="font-size:11px;color:#a1a1aa;margin-top:2px;">${ATTRIBUTION}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
