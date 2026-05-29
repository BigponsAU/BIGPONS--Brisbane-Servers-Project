import type { APIRoute } from 'astro';
import { provisionSuperAdmin } from '~/lib/admin-provision';
import { getRuntimeEnv } from '~/utils/runtime-env';

/**
 * One-time or rotation: provision verified super-admin and email credentials.
 * POST /api/cron/provision-admin
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return new Response(
      JSON.stringify({ success: false, error: 'CRON_SECRET is not configured on the API host' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== secret) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const configuredEmail = (getRuntimeEnv('ADMIN_EMAIL') ?? 'bigpons@brisbaneservers.com').trim().toLowerCase();
  let bodyEmail: string | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    bodyEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
  } catch {
    bodyEmail = undefined;
  }

  const email = bodyEmail || configuredEmail;
  if (!email.endsWith('@brisbaneservers.com')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin email must be on @brisbaneservers.com' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await provisionSuperAdmin({
      email,
      role: 'super-admin',
      sendEmail: true,
      request
    });

    return new Response(
      JSON.stringify({
        success: true,
        email: result.email,
        role: result.role,
        created: result.created,
        upgraded: result.upgraded,
        emailSent: result.emailSent,
        emailError: result.emailError,
        ...(result.emailSent ? {} : { temporaryPassword: result.password })
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provision failed';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
