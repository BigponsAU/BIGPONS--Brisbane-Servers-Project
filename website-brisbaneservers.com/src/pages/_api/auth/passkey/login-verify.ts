import type { APIRoute } from 'astro';
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import { createSessionToken, type AuthUser } from '~/utils/auth';
import { createSession } from '~/lib/db/sessions';
import { findUserById, isUserEmailVerified } from '~/lib/db/users';
import { findCredentialById, updateCredentialCounter } from '~/lib/db/webauthn-store';
import { getWebAuthnOrigin, getWebAuthnRpId, isPasskeyEnabled } from '~/lib/webauthn/config';
import { consumeChallenge } from '~/lib/webauthn/challenges';
import { authTokenSetCookie } from '~/utils/http-cookies';
import { logAuthEvent } from '~/lib/auth-audit';
import { authRateLimitResponse } from '~/lib/auth-rate-limit';

const SESSION_MAX_AGE = 24 * 60 * 60;

export const POST: APIRoute = async ({ request }) => {
  if (!isPasskeyEnabled()) {
    return new Response(JSON.stringify({ error: 'Passkey auth is disabled', success: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const limited = authRateLimitResponse(request, 'auth-passkey-login', 10, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json() as {
      challengeId?: string;
      response?: AuthenticationResponseJSON;
    };

    if (!body.challengeId || !body.response) {
      return new Response(JSON.stringify({ error: 'Missing challenge or response', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stored = consumeChallenge(body.challengeId);
    if (!stored?.challenge) {
      return new Response(JSON.stringify({ error: 'Challenge expired or invalid', success: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const credential = await findCredentialById(body.response.id);
    if (!credential) {
      await logAuthEvent({ eventType: 'auth.passkey.login.failed' });
      return new Response(JSON.stringify({ error: 'Unknown passkey', success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const dbUser = await findUserById(credential.userId);
    if (!dbUser || !isUserEmailVerified(dbUser)) {
      return new Response(JSON.stringify({ error: 'Account not verified', code: 'EMAIL_NOT_VERIFIED', success: false }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: getWebAuthnOrigin(),
      expectedRPID: getWebAuthnRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransport[]
      },
      requireUserVerification: false
    });

    if (!verification.verified) {
      await logAuthEvent({ userId: dbUser.id, email: dbUser.email, eventType: 'auth.passkey.login.failed' });
      return new Response(JSON.stringify({ error: 'Passkey verification failed', success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await updateCredentialCounter(credential.credentialId, verification.authenticationInfo.newCounter);

    const user: AuthUser = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      emailVerified: true
    };
    const token = createSessionToken(user);
    await createSession(user, token);
    await logAuthEvent({ userId: user.id, email: user.email, eventType: 'auth.passkey.login.succeeded' });

    return new Response(
      JSON.stringify({ user, success: true, token }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': authTokenSetCookie(token, SESSION_MAX_AGE, request)
        }
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid passkey login payload', success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
