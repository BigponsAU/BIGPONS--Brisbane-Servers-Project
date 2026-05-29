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

export async function sendAdminCredentialsEmail(
  request: Request | undefined,
  params: { email: string; password: string; role: string }
): Promise<AuthEmailResult> {
  const accountUrl = request
    ? buildAccountUrl(request, '/account')
    : (() => {
        const configuredSiteUrl = getRuntimeEnv('PUBLIC_SITE_URL');
        const configuredSiteBase = normalizePathPrefix(getRuntimeEnv('PUBLIC_SITE_BASE', '/') ?? '/');
        if (!configuredSiteUrl) {
          throw new Error('PUBLIC_SITE_URL is required to build account links without a request');
        }
        return new URL(`${configuredSiteBase === '/' ? '' : configuredSiteBase}/account`, configuredSiteUrl).toString();
      })();

  const bodyText = [
    'Your Brisbane Servers super-admin account is ready.',
    '',
    `Sign-in URL: ${accountUrl}`,
    `Email: ${params.email}`,
    `Temporary password: ${params.password}`,
    '',
    'After signing in, register a passkey under Account settings and change this password.',
    'Do not share this email.'
  ].join('\n');

  return sendAuthEmail({
    to: params.email,
    subject: 'Your Brisbane Servers admin account',
    text: bodyText,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #10213b; max-width: 640px; margin: 0 auto;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Admin account ready</h1>
        <p>Your <strong>${params.role}</strong> account for the Brisbane Servers account workspace is configured.</p>
        <p style="margin: 16px 0;">
          <a href="${accountUrl}" style="display: inline-block; background: #0A74DA; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">
            Open account workspace
          </a>
        </p>
        <p><strong>Email:</strong> ${params.email}</p>
        <p><strong>Temporary password:</strong> <code style="background:#f4f6f8;padding:2px 6px;border-radius:4px;">${params.password}</code></p>
        <p style="font-size: 14px; color: #556274;">Register a passkey after sign-in and change this password. Do not forward this message.</p>
      </div>
    `
  });
}
