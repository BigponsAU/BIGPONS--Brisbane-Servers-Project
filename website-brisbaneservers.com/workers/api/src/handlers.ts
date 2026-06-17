import type { WorkerEnv } from './env';

export type Env = WorkerEnv;

export interface ContactPayload {
  name?: string;
  email: string;
  industry?: string;
  location?: string;
  preference?: string;
  message: string;
  sourcePath?: string;
  queuedAt: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && /^https:\/\/(brisbaneservers\.com|.*\.pages\.dev)$/.test(origin)
    ? origin
    : 'https://brisbaneservers.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function sendContactViaResend(env: Env, payload: ContactPayload): Promise<void> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const from = env.AUTH_EMAIL_FROM ?? 'Brisbane Servers <support@brisbaneservers.com>';
  const replyTo = payload.email;
  const subjectParts = ['Website enquiry'];
  if (payload.industry) subjectParts.push(payload.industry);
  if (payload.name) subjectParts.push(`from ${payload.name}`);
  const subject = subjectParts.join(' — ').slice(0, 180);

  const lines = [
    payload.name ? `Name: ${payload.name}` : null,
    `Email: ${payload.email}`,
    payload.industry ? `Industry: ${payload.industry}` : null,
    payload.location ? `Location: ${payload.location}` : null,
    payload.preference ? `Preference: ${payload.preference}` : null,
    payload.sourcePath ? `Page: ${payload.sourcePath}` : null,
    '',
    payload.message,
  ].filter(Boolean);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: ['connect@brisbaneservers.com'],
      reply_to: replyTo,
      subject,
      text: lines.join('\n'),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body || res.statusText}`);
  }
}

export async function handleContactInquiry(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ success: false, error: 'Invalid JSON', code: 'INVALID_JSON' }, 400, cors);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!email || !EMAIL_RE.test(email)) {
    return json({ success: false, error: 'Please provide a valid email address', code: 'INVALID_EMAIL' }, 400, cors);
  }
  if (!message) {
    return json({ success: false, error: 'Please include a message', code: 'MESSAGE_REQUIRED' }, 400, cors);
  }

  const payload: ContactPayload = {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    email,
    industry: typeof body.industry === 'string' ? body.industry.trim() : undefined,
    location: typeof body.location === 'string' ? body.location.trim() : undefined,
    preference: typeof body.preference === 'string' ? body.preference.trim() : undefined,
    message,
    sourcePath: typeof body.sourcePath === 'string' ? body.sourcePath.trim() : undefined,
    queuedAt: new Date().toISOString(),
  };

  if (env.CONTACT_QUEUE) {
    await env.CONTACT_QUEUE.send(payload);
    return json(
      {
        success: true,
        status: 'queued',
        message: 'Thanks — your enquiry was received. We will reply to the email you provided.',
        deliveryMode: 'queue',
      },
      200,
      cors
    );
  }

  await sendContactViaResend(env, payload);
  return json(
    {
      success: true,
      status: 'sent',
      message: 'Thanks — your enquiry was sent. We will reply to the email you provided.',
      deliveryMode: 'resend',
    },
    200,
    cors
  );
}
