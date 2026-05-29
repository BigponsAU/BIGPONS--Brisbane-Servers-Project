import * as crypto from 'crypto';
import { createSessionToken, type AuthUser } from '~/utils/auth';
import { createSession } from '~/lib/db/sessions';
import { findUserByEmail, createUser, markUserEmailVerified, type StoredUser } from '~/lib/db/users';
import { findOAuthIdentity, saveOAuthIdentity } from '~/lib/db/oauth-identities';
import { logAuthEvent } from '~/lib/auth-audit';
import { getRuntimeEnv } from '~/utils/runtime-env';
import { saveChallenge, consumeChallenge } from '~/lib/webauthn/challenges';
import { resolvePublicSitePath } from '~/lib/api-config';

const OAUTH_PROVIDER = 'google' as const;
const OAUTH_NO_PASSWORD = 'oauth:no-password';

export function isGoogleOAuthEnabled(): boolean {
  return Boolean(getRuntimeEnv('GOOGLE_OAUTH_CLIENT_ID') && getRuntimeEnv('GOOGLE_OAUTH_CLIENT_SECRET'));
}

function getGoogleClientId(): string {
  return getRuntimeEnv('GOOGLE_OAUTH_CLIENT_ID') ?? '';
}

function getGoogleClientSecret(): string {
  return getRuntimeEnv('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';
}

export function getGoogleRedirectUri(request: Request): string {
  const configured = getRuntimeEnv('GOOGLE_OAUTH_REDIRECT_URI');
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.origin}/api/auth/oauth/google/callback`;
}

function getAccountReturnUrl(): string {
  const siteUrl = (getRuntimeEnv('PUBLIC_SITE_URL') ?? 'https://brisbaneservers.com').replace(/\/$/, '');
  return `${siteUrl}${resolvePublicSitePath('/account/')}`;
}

export function startGoogleOAuth(request: Request): Response {
  if (!isGoogleOAuthEnabled()) {
    return new Response('Google sign-in is not configured', { status: 503 });
  }

  const state = crypto.randomBytes(24).toString('hex');
  saveChallenge(state, { challenge: state, email: 'oauth-google' });

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGoogleRedirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account'
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

async function exchangeCodeForUserInfo(
  request: Request,
  code: string
): Promise<GoogleUserInfo> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(request),
      grant_type: 'authorization_code'
    })
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error ?? 'Token exchange failed');
  }

  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!userRes.ok) {
    throw new Error('Failed to load Google profile');
  }
  return (await userRes.json()) as GoogleUserInfo;
}

async function resolveUserFromGoogle(profile: GoogleUserInfo): Promise<StoredUser> {
  if (!profile.sub || !profile.email) {
    throw new Error('Google account did not return an email');
  }
  if (profile.email_verified === false) {
    throw new Error('Google email is not verified');
  }

  const email = profile.email.trim().toLowerCase();
  const existingOAuth = await findOAuthIdentity(OAUTH_PROVIDER, profile.sub);
  if (existingOAuth) {
    const byId = await findUserByEmail(existingOAuth.email);
    if (byId) return byId;
  }

  let user = await findUserByEmail(email);
  if (!user) {
    user = await createUser(email, OAUTH_NO_PASSWORD, 'client');
    await markUserEmailVerified(user.id);
    user.emailVerifiedAt = new Date().toISOString();
  } else if (!user.emailVerifiedAt) {
    await markUserEmailVerified(user.id);
    user = (await findUserByEmail(email)) ?? user;
  }

  await saveOAuthIdentity({
    provider: OAUTH_PROVIDER,
    subject: profile.sub,
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString()
  });

  return user;
}

export async function completeGoogleOAuth(
  request: Request,
  code: string,
  state: string
): Promise<Response> {
  const stored = consumeChallenge(state);
  if (!stored?.challenge || stored.challenge !== state) {
    return Response.redirect(`${getAccountReturnUrl()}?oauth_error=invalid_state`, 302);
  }

  try {
    const profile = await exchangeCodeForUserInfo(request, code);
    const storedUser = await resolveUserFromGoogle(profile);

    const user: AuthUser = {
      id: storedUser.id,
      email: storedUser.email,
      role: storedUser.role,
      emailVerified: true
    };
    const token = createSessionToken(user);
    await createSession(user, token);
    await logAuthEvent({
      userId: user.id,
      email: user.email,
      eventType: 'auth.oauth.google.succeeded'
    });

    const returnUrl = new URL(getAccountReturnUrl());
    returnUrl.searchParams.set('oauth_token', token);
    return Response.redirect(returnUrl.toString(), 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'oauth_failed';
    await logAuthEvent({ eventType: 'auth.oauth.google.failed', eventMeta: { message } });
    return Response.redirect(`${getAccountReturnUrl()}?oauth_error=${encodeURIComponent(message)}`, 302);
  }
}

export function userHasPasswordLogin(user: StoredUser): boolean {
  return Boolean(user.passwordHash && user.passwordHash !== OAUTH_NO_PASSWORD);
}
