export interface AuthEmailResult {
  deliveryMode: 'resend';
}

export async function sendAuthEmail(
  env: { RESEND_API_KEY?: string; AUTH_EMAIL_FROM?: string; AUTH_EMAIL_REPLY_TO?: string },
  payload: { to: string; subject: string; text: string; html: string }
): Promise<AuthEmailResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('AUTH_EMAIL_NOT_CONFIGURED');

  const from = env.AUTH_EMAIL_FROM ?? 'Brisbane Servers <support@mail.brisbaneservers.com>';
  const replyTo = env.AUTH_EMAIL_REPLY_TO ?? 'connect@brisbaneservers.com';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      reply_to: replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body || res.statusText}`);
  }

  return { deliveryMode: 'resend' };
}

function renderEmailHtml(title: string, body: string, actionLabel: string, actionUrl: string): string {
  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #10213b; max-width: 640px; margin: 0 auto;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">${title}</h1>
      <p style="margin-bottom: 16px;">${body}</p>
      <p style="margin-bottom: 24px;">
        <a href="${actionUrl}" style="display: inline-block; background: #0A74DA; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">
          ${actionLabel}
        </a>
      </p>
      <p style="font-size: 14px; color: #556274;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 14px; word-break: break-all;"><a href="${actionUrl}">${actionUrl}</a></p>
    </div>
  `;
}

export async function sendVerificationEmail(
  env: { RESEND_API_KEY?: string; AUTH_EMAIL_FROM?: string; AUTH_EMAIL_REPLY_TO?: string; PUBLIC_SITE_URL?: string },
  request: Request,
  user: { id: string; email: string },
  createToken: () => Promise<string>
): Promise<AuthEmailResult> {
  const rawToken = await createToken();
  const siteUrl = env.PUBLIC_SITE_URL ?? 'https://brisbaneservers.com';
  const verifyUrl = `${siteUrl.replace(/\/+$/, '')}/account?verify=${encodeURIComponent(rawToken)}`;

  return sendAuthEmail(env, {
    to: user.email,
    subject: 'Verify your Brisbane Servers account',
    text: `Verify your account by visiting: ${verifyUrl}`,
    html: renderEmailHtml(
      'Verify your account',
      'Confirm your email address to finish setting up your Brisbane Servers account workspace.',
      'Verify account',
      verifyUrl
    ),
  });
}
