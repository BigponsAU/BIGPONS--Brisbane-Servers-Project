import type { APIRoute } from 'astro';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { findUserByEmail } from '~/lib/db/users';
import { listCredentialsForUser } from '~/lib/db/webauthn-store';
import { getWebAuthnRpId, isPasskeyEnabled } from '~/lib/webauthn/config';
import { saveChallenge } from '~/lib/webauthn/challenges';
import { isValidEmail } from '~/utils/error-handling';
import * as crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  if (!isPasskeyEnabled()) {
    return new Response(JSON.stringify({ error: 'Passkey auth is disabled', success: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { email?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Valid email is required for passkey sign-in', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No passkey found for this account', success: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const credentials = await listCredentialsForUser(user.id);
    if (!credentials.length) {
      return new Response(JSON.stringify({ error: 'No passkey registered for this account', success: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpId(),
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransport[]
      })),
      userVerification: 'preferred'
    });

    const challengeId = crypto.randomUUID();
    saveChallenge(challengeId, { challenge: options.challenge, userId: user.id, email: user.email });

    return new Response(
      JSON.stringify({ success: true, options, challengeId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request', success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
