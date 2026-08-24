export interface BetaInvitationEmailInput {
  recipientName?: string | null;
  inviteUrl: string;
  code: string;
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
 * Renders the OASIS Private Beta invitation email. Institutional, minimal, and
 * readable even without images (no external image dependencies).
 */
export function renderBetaInvitationEmail(
  input: BetaInvitationEmailInput
): RenderedEmail {
  const greetingName = input.recipientName?.trim();
  const greeting = greetingName ? `Hello ${escapeHtml(greetingName)},` : "Hello,";
  const url = input.inviteUrl;
  const code = escapeHtml(input.code);

  const subject = "Your OASIS Private Beta Access";

  const text = [
    `${BRAND}`,
    `${TAGLINE}`,
    `${ATTRIBUTION}`,
    "",
    greetingName ? `Hello ${greetingName},` : "Hello,",
    "",
    "Your request for OASIS Private Beta access has been approved.",
    "",
    "You have been invited to preview OASIS and the Omega Risk Index (ORI) — digital asset risk intelligence designed to provide clearer, multidimensional insight into digital markets.",
    "",
    `Access OASIS: ${url}`,
    "",
    "Your invitation is unique to you and may be subject to expiration or access limits. Before entering OASIS, you will be asked to review and accept the OASIS Private Beta Terms.",
    "",
    `Alternative access code: ${input.code}`,
    "",
    "If you did not request access to OASIS, you may disregard this email.",
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
                Your request for OASIS Private Beta access has been approved.
              </p>
              <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 24px 0;">
                You have been invited to preview OASIS and the Omega Risk Index (ORI) —
                digital asset risk intelligence designed to provide clearer, multidimensional
                insight into digital markets.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#0a0a0a;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Access OASIS
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0 0 20px 0;">
                Your invitation is unique to you and may be subject to expiration or access
                limits. Before entering OASIS, you will be asked to review and accept the
                OASIS Private Beta Terms.
              </p>
              <div style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin:0 0 20px 0;background-color:#fafafa;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;margin-bottom:6px;">Alternative access code</div>
                <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:16px;font-weight:600;letter-spacing:0.04em;">${code}</div>
              </div>
              <p style="font-size:12px;line-height:1.6;color:#a1a1aa;margin:0;">
                If you did not request access to OASIS, you may disregard this email.
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
