import type { APIRoute } from 'astro';
import { requireAuth } from '~/utils/auth';
import { deleteCredentialForUser, listCredentialsForAccount } from '~/lib/db/webauthn-store';
import { MAX_PASSKEYS_PER_USER } from '~/lib/webauthn/config';

export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const credentials = await listCredentialsForAccount(authResult.user.id, authResult.user.email);
    return new Response(
      JSON.stringify({
        success: true,
        count: credentials.length,
        max: MAX_PASSKEYS_PER_USER,
        credentials: credentials.map((c) => ({
          id: c.id,
          deviceType: c.deviceType,
          backedUp: c.backedUp,
          createdAt: c.createdAt,
          lastUsedAt: c.lastUsedAt,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[passkey/credentials GET]', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Unable to load passkeys', success: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as { credentialId?: string };
    if (!body.credentialId) {
      return new Response(JSON.stringify({ error: 'credentialId required', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await listCredentialsForAccount(authResult.user.id, authResult.user.email);

    const removed = await deleteCredentialForUser(authResult.user.id, body.credentialId);
    return new Response(
      JSON.stringify({ success: removed, message: removed ? 'Passkey removed' : 'Passkey not found' }),
      { status: removed ? 200 : 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[passkey/credentials DELETE]', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Invalid request', success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
