import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import { buildHostingEnvChecklist } from '~/lib/hosting-env-checklist';

/** GET /api/admin/hosting-status — which production env vars are configured (no values). */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const checklist = buildHostingEnvChecklist();
  const missingRequired = checklist.filter((item) => item.required && !item.configured);

  return new Response(
    JSON.stringify({
      success: true,
      ready: missingRequired.length === 0,
      missingRequired: missingRequired.map((item) => item.key),
      checklist,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
