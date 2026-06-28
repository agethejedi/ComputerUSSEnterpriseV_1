/**
 * functions/api/email.js
 * JARVIS — Email delivery via Resend
 *
 * POST /api/email
 * Sends summaries, reports, and digests to Ron.
 *
 * Body: {
 *   to:      "ron@example.com",        // recipient (required)
 *   subject: "Session Summary — ...",  // email subject (required)
 *   title:   "Session Summary",        // heading shown in email (required)
 *   body:    "Plain text content...",  // main content (required)
 *   html:    "<p>Optional HTML...</p>" // optional — overrides auto-generated HTML
 * }
 */

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
    ...init,
  });
}

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY is not configured.' }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { to, subject, title, body: textContent, html: htmlOverride } = body;

  if (!to || !subject || !title || !textContent) {
    return json({ error: 'to, subject, title, and body are required.' }, { status: 400 });
  }

  const sentAt = new Date().toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  // Convert plain text body to HTML paragraphs if no HTML override provided
  const bodyHtml = htmlOverride || textContent
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#a8c4c8;font-family:'Courier New',monospace;">${p.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#070d0f;font-family:'Courier New',monospace;color:#a8c4c8;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070d0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #182e32;">
              <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#4a6a70;">
                JARVIS / RISKXLABS
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#d4e8ea;font-family:'Courier New',monospace;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Timestamp -->
          <tr>
            <td style="padding:16px 0 20px;">
              <p style="margin:0;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#4a6a70;">
                DELIVERED — ${sentAt}
              </p>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding-bottom:28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #182e32;padding-top:20px;">
              <p style="margin:0;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#4a6a70;line-height:1.8;">
                JARVIS / RISKXLABS<br>
                JARVIS@RISKXLABS.COM<br>
                THIS IS AN AUTOMATED MESSAGE — DO NOT REPLY DIRECTLY
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const textBody = `JARVIS / RISKXLABS — ${title.toUpperCase()}

Delivered: ${sentAt}

${textContent}

---
JARVIS / RiskXLabs
JARVIS@RiskXLabs.com
This is an automated message — do not reply directly.`;

  // Send via Resend
  let resendResp;
  try {
    resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'JARVIS <JARVIS@riskxlabs.com>',
        to:      [to],
        subject: subject,
        html:    htmlBody,
        text:    textBody,
      }),
    });
  } catch (err) {
    return json({ error: 'Failed to reach Resend API.', detail: String(err) }, { status: 502 });
  }

  const resendData = await resendResp.json();

  if (!resendResp.ok) {
    return json({
      error:  'Resend API returned an error.',
      detail: resendData,
    }, { status: resendResp.status });
  }

  return json({ ok: true, emailId: resendData.id });
}
