import type { APIRoute } from 'astro';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { findUserByEmail } from '~/lib/db/users';
import { listCredentialsForAccount } from '~/lib/db/webauthn-store';
import { getWebAuthnRpId, isPasskeyEnabled } from '~/lib/webauthn/config';
import { saveChallenge, pruneChallenges } from '~/lib/webauthn/challenges';
import { isValidEmail } from '~/utils/error-handling';
import { authRateLimitResponse } from '~/lib/auth-rate-limit';
import * as crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  if (!isPasskeyEnabled()) {
    return new Response(JSON.stringify({ error: 'Passkey auth is disabled', success: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const limited = authRateLimitResponse(request, 'auth-passkey-login-options', 20, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = (await request.json()) as { email?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required for passkey sign-in', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await findUserByEmail(email);
    // Same message whether missing user or missing passkey — avoid account enumeration.
    if (!user) {
      return new Response(JSON.stringify({ error: 'No passkey registered for this account', success: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    void pruneChallenges().catch(() => undefined);

    const credentials = await listCredentialsForAccount(user.id, user.email);
    if (!credentials.length) {
      return new Response(JSON.stringify({ error: 'No passkey registered for this account', success: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpId(),
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransport[],
      })),
      userVerification: 'preferred',
    });

    const challengeId = crypto.randomUUID();
    await saveChallenge(challengeId, {
      challenge: options.challenge,
      userId: user.id,
      email: user.email,
    });

    return new Response(JSON.stringify({ success: true, options, challengeId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[passkey/login-options]', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Could not start passkey sign-in', success: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
