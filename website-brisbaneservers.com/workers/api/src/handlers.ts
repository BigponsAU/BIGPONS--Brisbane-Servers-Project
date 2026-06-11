import type { WorkerEnv } from './env';

export type Env = WorkerEnv;

const RENDER_HEALTH_PATH = '/api/health';

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

  const from = env.AUTH_EMAIL_FROM ?? 'Brisbane Servers <support@mail.brisbaneservers.com>';
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

export function renderApiOrigin(env: Env): string {
  return (env.RENDER_API_ORIGIN ?? 'https://brisbane-servers-api.onrender.com').replace(/\/+$/, '');
}

export async function pingRenderHealth(env: Env, timeoutMs = 120_000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${renderApiOrigin(env)}${RENDER_HEALTH_PATH}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { status?: string; persistence?: unknown } | null;
    return Boolean(data && (data.status === 'ok' || data.status === 'degraded') && data.persistence);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Instant edge response; kicks Render warm in background (Phase 1). */
export function handleAuthWake(request: Request, env: Env, ctx: ExecutionContext): Response {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);
  ctx.waitUntil(pingRenderHealth(env));
  return json(
    {
      success: true,
      status: 'waking',
      edge: 'cloudflare-worker',
      renderOrigin: renderApiOrigin(env),
      message: 'Edge is ready. Render API warm-up started in background.',
    },
    200,
    cors
  );
}

/** True stack health — proxies to Render (may take minutes on cold start). */
export async function handleRenderHealth(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);
  const ready = await pingRenderHealth(env, 120_000);
  return json(
    {
      success: ready,
      status: ready ? 'ok' : 'unavailable',
      edge: 'cloudflare-worker',
      render: { reachable: ready, origin: renderApiOrigin(env) },
    },
    ready ? 200 : 503,
    cors
  );
}

export async function proxyToRender(request: Request, env: Env, url: URL): Promise<Response> {
  const origin = env.RENDER_API_ORIGIN ?? 'https://brisbane-servers-api.onrender.com';
  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', url.host);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.clone().arrayBuffer();
  }

  const res = await fetch(target.toString(), init);
  const outHeaders = new Headers(res.headers);
  const cors = corsHeaders(request.headers.get('origin'));
  Object.entries(cors).forEach(([k, v]) => outHeaders.set(k, v));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: outHeaders });
}
