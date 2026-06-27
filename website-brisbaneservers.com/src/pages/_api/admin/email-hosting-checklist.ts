import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import { sendAuthEmail } from '~/lib/auth-email';
import { buildHostingEnvChecklist, formatHostingEnvChecklistEmail } from '~/lib/hosting-env-checklist';
import {
  formatBrisbaneServersFrom,
  isAdminMailboxKey,
  resolveAdminMailboxAddress,
  siteMailboxes,
} from '~/lib/site-mailboxes';
import { getRuntimeEnv } from '~/utils/runtime-env';

type ChecklistEmailBody = {
  email?: string;
  toMailbox?: string;
  fromMailbox?: string;
};

/**
 * POST /api/admin/email-hosting-checklist
 * Emails env checklist (names + status only) to admin.
 * Body: { email?: string, toMailbox?: 'bigpons'|'support'|'connect', fromMailbox?: same }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json().catch(() => ({}))) as ChecklistEmailBody;

  let targetEmail = resolveAdminMailboxAddress(
    typeof body.toMailbox === 'string' ? body.toMailbox : undefined,
    'bigpons',
  )
    .trim()
    .toLowerCase();

  const adminEmail = getRuntimeEnv('ADMIN_EMAIL')?.trim().toLowerCase();
  if (!body.toMailbox && adminEmail) {
    targetEmail = adminEmail;
  }

  if (typeof body.email === 'string' && body.email.includes('@')) {
    const custom = body.email.trim().toLowerCase();
    const allowed = new Set<string>([
      siteMailboxes.bigpons,
      siteMailboxes.support,
      siteMailboxes.connect,
      ...(adminEmail ? [adminEmail] : []),
    ]);
    if (allowed.has(custom)) {
      targetEmail = custom;
    }
  }

  const fromMailbox = typeof body.fromMailbox === 'string' && isAdminMailboxKey(body.fromMailbox)
    ? body.fromMailbox
    : 'support';
  const fromAddress = formatBrisbaneServersFrom(siteMailboxes[fromMailbox]);

  const checklist = buildHostingEnvChecklist();
  const missingRequired = checklist.filter((item) => item.required && !item.configured);

  try {
    await sendAuthEmail({
      to: targetEmail,
      from: fromAddress,
      replyTo: siteMailboxes.connect,
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
      emailedFrom: fromAddress,
      fromMailbox,
      missingRequired: missingRequired.map((item) => item.key),
      ready: missingRequired.length === 0,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
