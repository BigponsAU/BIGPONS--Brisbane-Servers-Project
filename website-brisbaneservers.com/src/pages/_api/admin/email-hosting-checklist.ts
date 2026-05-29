import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import { sendAuthEmail } from '~/lib/auth-email';
import { buildHostingEnvChecklist, formatHostingEnvChecklistEmail } from '~/lib/hosting-env-checklist';
import { getRuntimeEnv } from '~/utils/runtime-env';

/**
 * POST /api/admin/email-hosting-checklist
 * Emails env checklist (names + status only) to admin. Body: { email?: string }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let targetEmail = (getRuntimeEnv('ADMIN_EMAIL') ?? 'bigpons@brisbaneservers.com').trim().toLowerCase();
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    if (typeof body.email === 'string' && body.email.includes('@')) {
      targetEmail = body.email.trim().toLowerCase();
    }
  } catch {
    /* use default */
  }

  const checklist = buildHostingEnvChecklist();
  const missingRequired = checklist.filter((item) => item.required && !item.configured);

  try {
    await sendAuthEmail({
      to: targetEmail,
      subject: 'Brisbane Servers — production environment checklist',
      text: formatHostingEnvChecklistEmail(),
      html: `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${formatHostingEnvChecklistEmail()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</pre>`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return new Response(JSON.stringify({ success: false, error: message, missingRequired }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      emailedTo: targetEmail,
      missingRequired: missingRequired.map((item) => item.key),
      ready: missingRequired.length === 0,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
