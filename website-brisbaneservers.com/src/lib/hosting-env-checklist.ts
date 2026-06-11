/**
 * Production env checklist (names + set/unset only — never exposes secret values).
 */
import { getRuntimeEnv } from '../utils/runtime-env';
import { isGoogleOAuthEnabled } from './oauth/google';
import { isPasskeyEnabled } from './webauthn/config';

export type HostingEnvItem = {
  key: string;
  required: boolean;
  configured: boolean;
  notes: string;
  setOn: 'api' | 'pages' | 'both';
};

export function buildHostingEnvChecklist(): HostingEnvItem[] {
  const has = (key: string) => Boolean(getRuntimeEnv(key)?.trim());

  return [
    {
      key: 'DATABASE_URL',
      required: true,
      configured: has('DATABASE_URL'),
      notes: 'Postgres for auth, corpus, passkeys (Neon via Worker Hyperdrive).',
      setOn: 'api',
    },
    {
      key: 'JWT_SECRET',
      required: true,
      configured: has('JWT_SECRET'),
      notes: 'Session signing; generate a long random string.',
      setOn: 'api',
    },
    {
      key: 'ADMIN_EMAIL',
      required: true,
      configured: has('ADMIN_EMAIL'),
      notes: 'Bootstrap super-admin target (bigpons@brisbaneservers.com).',
      setOn: 'api',
    },
    {
      key: 'ADMIN_PASSWORD',
      required: true,
      configured: has('ADMIN_PASSWORD'),
      notes: 'Bootstrap login until DB user provisioned; rotate after provision-admin.',
      setOn: 'api',
    },
    {
      key: 'CRON_SECRET',
      required: true,
      configured: has('CRON_SECRET'),
      notes: 'Bearer token for POST /api/cron/provision-admin and library-growth cron.',
      setOn: 'api',
    },
    {
      key: 'RESEND_API_KEY',
      required: true,
      configured: has('RESEND_API_KEY'),
      notes: 'Signup, password reset, admin credential emails (or use SMTP_*).',
      setOn: 'api',
    },
    {
      key: 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL',
      required: false,
      configured: has('CLOUDFLARE_PAGES_DEPLOY_HOOK_URL'),
      notes: 'Rebuild static site when resources publish (SEO).',
      setOn: 'api',
    },
    {
      key: 'GOOGLE_OAUTH_CLIENT_ID',
      required: false,
      configured: isGoogleOAuthEnabled(),
      notes: 'Google sign-in; also set GOOGLE_OAUTH_CLIENT_SECRET (+ optional REDIRECT_URI).',
      setOn: 'api',
    },
    {
      key: 'PUBLIC_API_BASE_URL',
      required: true,
      configured: has('PUBLIC_API_BASE_URL'),
      notes: 'Browser API base (Cloudflare Pages production).',
      setOn: 'pages',
    },
    {
      key: 'INTERNAL_API_BASE_URL',
      required: true,
      configured: has('INTERNAL_API_BASE_URL'),
      notes: 'Build-time fetch for prerendered resource pages.',
      setOn: 'pages',
    },
    {
      key: 'PUBLIC_SITE_URL',
      required: true,
      configured: has('PUBLIC_SITE_URL'),
      notes: 'Canonical site URL for SEO and WebAuthn origin.',
      setOn: 'both',
    },
    {
      key: 'PASSKEY_AUTH_ENABLED',
      required: false,
      configured: isPasskeyEnabled(),
      notes: 'Defaults on; set 0/false to disable passkeys.',
      setOn: 'api',
    },
  ];
}

export function formatHostingEnvChecklistEmail(): string {
  const items = buildHostingEnvChecklist();
  const missing = items.filter((i) => i.required && !i.configured);
  const optional = items.filter((i) => !i.required && !i.configured);

  const lines = [
    'Brisbane Servers — production environment checklist',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Required (API host — Cloudflare Worker brisbane-servers-api-edge secrets / Hyperdrive):',
    ...items
      .filter((i) => i.required)
      .map((i) => `  [${i.configured ? 'OK' : 'MISSING'}] ${i.key} — ${i.notes}`),
    '',
    'Cloudflare Pages (project brisbaneservers → Environment → Production):',
    ...items
      .filter((i) => i.setOn === 'pages' || i.setOn === 'both')
      .map((i) => `  [${i.configured ? 'OK' : 'MISSING'}] ${i.key} — ${i.notes}`),
  ];

  if (optional.length) {
    lines.push('', 'Optional (recommended):');
    lines.push(...optional.map((i) => `  [ ] ${i.key} — ${i.notes}`));
  }

  if (missing.length) {
    lines.push('', `Action: set ${missing.length} required variable(s) on the API host, redeploy, then sign in at /account and run provision-admin if needed.`);
  } else {
    lines.push('', 'All required variables appear configured on this host.');
  }

  lines.push(
    '',
    'Admin workspace: https://brisbaneservers.com/account',
    'Provision admin (after deploy): POST /api/cron/provision-admin with Authorization: Bearer <CRON_SECRET>',
    '',
    'Do not reply with secret values in email.'
  );

  return lines.join('\n');
}
