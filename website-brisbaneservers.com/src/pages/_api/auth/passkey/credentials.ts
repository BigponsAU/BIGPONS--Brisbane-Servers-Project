import type { APIRoute } from 'astro';
import { requireAuth } from '~/utils/auth';
import { deleteCredentialForUser, listCredentialsForUser } from '~/lib/db/webauthn-store';

export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const credentials = await listCredentialsForUser(authResult.user.id);
  return new Response(
    JSON.stringify({
      success: true,
      count: credentials.length,
      credentials: credentials.map((c) => ({
        id: c.id,
        deviceType: c.deviceType,
        backedUp: c.backedUp,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt
      }))
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const DELETE: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { credentialId?: string };
    if (!body.credentialId) {
      return new Response(JSON.stringify({ error: 'credentialId required', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const removed = await deleteCredentialForUser(authResult.user.id, body.credentialId);
    return new Response(
      JSON.stringify({ success: removed, message: removed ? 'Passkey removed' : 'Passkey not found' }),
      { status: removed ? 200 : 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request', success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
