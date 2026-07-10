import type { APIRoute } from 'astro';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { requireAuth } from '~/utils/auth';
import { listCredentialsForUser } from '~/lib/db/webauthn-store';
import { getWebAuthnRpId, isPasskeyEnabled, MAX_PASSKEYS_PER_USER } from '~/lib/webauthn/config';
import { saveChallenge } from '~/lib/webauthn/challenges';
import * as crypto from 'crypto';

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

  const user = authResult.user;
  const existing = await listCredentialsForUser(user.id);

  if (existing.length >= MAX_PASSKEYS_PER_USER) {
    return new Response(
      JSON.stringify({
        error: 'A passkey is already registered. Remove it before adding a new one.',
        code: 'PASSKEY_LIMIT',
        success: false,
        count: existing.length,
        max: MAX_PASSKEYS_PER_USER
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const options = await generateRegistrationOptions({
    rpName: 'Brisbane Servers',
    rpID: getWebAuthnRpId(),
    userName: user.email,
    userID: new TextEncoder().encode(user.id),
    userDisplayName: user.email,
    attestationType: 'none',
    excludeCredentials: existing.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports as AuthenticatorTransport[]
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred'
    }
  });

  const challengeId = crypto.randomUUID();
  await saveChallenge(challengeId, { challenge: options.challenge, userId: user.id, email: user.email });

  return new Response(
    JSON.stringify({ success: true, options, challengeId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
