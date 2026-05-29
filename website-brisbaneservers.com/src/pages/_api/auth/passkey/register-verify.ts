import type { APIRoute } from 'astro';
import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server';
import { requireAuth } from '~/utils/auth';
import { saveWebAuthnCredential } from '~/lib/db/webauthn-store';
import { getWebAuthnOrigin, getWebAuthnRpId, isPasskeyEnabled } from '~/lib/webauthn/config';
import { consumeChallenge } from '~/lib/webauthn/challenges';
import { logAuthEvent } from '~/lib/auth-audit';

export const POST: APIRoute = async ({ request }) => {
  if (!isPasskeyEnabled()) {
    return new Response(JSON.stringify({ error: 'Passkey auth is disabled', success: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as {
      challengeId?: string;
      response?: RegistrationResponseJSON;
    };

    if (!body.challengeId || !body.response) {
      return new Response(JSON.stringify({ error: 'Missing challenge or response', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stored = consumeChallenge(body.challengeId);
    if (!stored?.challenge || stored.userId !== authResult.user.id) {
      return new Response(JSON.stringify({ error: 'Challenge expired or invalid', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: getWebAuthnOrigin(),
      expectedRPID: getWebAuthnRpId(),
      requireUserVerification: false
    });

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: 'Passkey verification failed', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await saveWebAuthnCredential({
      userId: authResult.user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: body.response.response.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp
    });

    await logAuthEvent({
      userId: authResult.user.id,
      email: authResult.user.email,
      eventType: 'auth.passkey.registered'
    });

    return new Response(JSON.stringify({ success: true, message: 'Passkey registered' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid passkey registration payload', success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
