import type { ContactPayload } from './handlers';
import type { WorkerEnv } from './env';
import { handleLogin } from './auth/login';
import { handleLogout } from './auth/logout';
import { handleMe } from './auth/me';
import { handleRegister } from './auth/register';
import { handleResendVerification } from './auth/resend-verification';
import { handleVerifyEmail } from './auth/verify-email';
import {
  corsHeaders,
  handleAuthWake,
  handleContactInquiry,
  handleRenderHealth,
  json,
  proxyToRender,
  sendContactViaResend,
} from './handlers';

const EDGE_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
]);

function edgeAuthEnabled(env: WorkerEnv): boolean {
  return Boolean(env.HYPERDRIVE?.connectionString);
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const apiPath = path.startsWith('/api') ? path : `/api${path}`;

    if (request.method === 'OPTIONS' && apiPath.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
    }

    if (apiPath === '/api/health' && request.method === 'GET') {
      return json(
        {
          success: true,
          status: 'ok',
          edge: 'cloudflare-worker',
          origin: 'edge',
          timestamp: new Date().toISOString(),
        },
        200,
        corsHeaders(request.headers.get('origin'))
      );
    }

    if (apiPath === '/api/health/render' && request.method === 'GET') {
      return handleRenderHealth(request, env);
    }

    if (apiPath === '/api/auth/wake' && request.method === 'GET') {
      return handleAuthWake(request, env, ctx);
    }

    if (edgeAuthEnabled(env) && EDGE_AUTH_PATHS.has(apiPath)) {
      if (apiPath === '/api/auth/login' && request.method === 'POST') return handleLogin(request, env);
      if (apiPath === '/api/auth/register' && request.method === 'POST') return handleRegister(request, env);
      if (apiPath === '/api/auth/me' && request.method === 'GET') return handleMe(request, env);
      if (apiPath === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env);
      if (apiPath === '/api/auth/verify-email' && request.method === 'GET') return handleVerifyEmail(request, env);
      if (apiPath === '/api/auth/resend-verification' && request.method === 'POST') {
        return handleResendVerification(request, env);
      }
    }

    if (apiPath === '/api/contact/inquiry' && request.method === 'POST') {
      return handleContactInquiry(request, env);
    }

    const proxied = new URL(request.url);
    proxied.pathname = apiPath;
    return proxyToRender(request, env, proxied);
  },

  async queue(batch: MessageBatch<ContactPayload>, env: WorkerEnv): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await sendContactViaResend(env, msg.body);
        msg.ack();
      } catch (err) {
        console.error('[contact-queue] send failed', err);
        msg.retry();
      }
    }
  },
};
