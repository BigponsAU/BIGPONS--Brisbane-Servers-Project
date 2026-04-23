import { createAuthToken, pruneExpiredAuthTokens } from './db/auth-tokens';
import { sendAuthEmail, type AuthEmailResult } from './auth-email';
import { getRuntimeEnv, normalizePathPrefix } from '../utils/runtime-env';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function buildAccountUrl(request: Request, pathAndQuery: string): string {
  const configuredSiteUrl = getRuntimeEnv('PUBLIC_SITE_URL');
  const configuredSiteBase = normalizePathPrefix(getRuntimeEnv('PUBLIC_SITE_BASE', '/') ?? '/');

  if (configuredSiteUrl) {
    return new URL(`${configuredSiteBase === '/' ? '' : configuredSiteBase}${pathAndQuery}`, configuredSiteUrl).toString();
  }

  const currentUrl = new URL(request.url);
  if (currentUrl.hostname === 'localhost' && currentUrl.port === '3002') {
    currentUrl.port = '3000';
  }

  const targetUrl = new URL(pathAndQuery, currentUrl.origin);
  currentUrl.pathname = targetUrl.pathname;
  currentUrl.search = targetUrl.search;
  return currentUrl.toString();
}

function renderEmailHtml(title: string, body: string, actionLabel: string, actionUrl: string): string {
  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #10213b; max-width: 640px; margin: 0 auto;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">${title}</h1>
      <p style="margin-bottom: 16px;">${body}</p>
      <p style="margin-bottom: 24px;">
        <a href="${actionUrl}" style="display: inline-block; background: #0A74DA; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">
          ${actionLabel}
        </a>
      </p>
      <p style="font-size: 14px; color: #556274;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 14px; word-break: break-all;"><a href="${actionUrl}">${actionUrl}</a></p>
    </div>
  `;
}

export async function sendVerificationEmail(request: Request, user: { id: string; email: string }): Promise<AuthEmailResult> {
  await pruneExpiredAuthTokens();
  const { token } = await createAuthToken(user.id, user.email, 'email-verify', VERIFY_TTL_MS);
  const verifyUrl = buildAccountUrl(request, `/account?verify=${encodeURIComponent(token)}`);
  return sendAuthEmail({
    to: user.email,
    subject: 'Verify your Brisbane Servers account',
    text: `Verify your account by visiting: ${verifyUrl}`,
    html: renderEmailHtml(
      'Verify your account',
      'Confirm your email address to finish setting up your Brisbane Servers account workspace.',
      'Verify account',
      verifyUrl
    )
  });
}

export async function sendPasswordResetEmail(request: Request, user: { id: string; email: string }): Promise<AuthEmailResult> {
  await pruneExpiredAuthTokens();
  const { token } = await createAuthToken(user.id, user.email, 'password-reset', RESET_TTL_MS);
  const resetUrl = buildAccountUrl(request, `/account?reset=${encodeURIComponent(token)}`);
  return sendAuthEmail({
    to: user.email,
    subject: 'Reset your Brisbane Servers password',
    text: `Reset your password by visiting: ${resetUrl}`,
    html: renderEmailHtml(
      'Reset your password',
      'We received a request to reset the password for your Brisbane Servers account workspace.',
      'Reset password',
      resetUrl
    )
  });
}
