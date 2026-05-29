#!/usr/bin/env npx tsx
/**
 * Email production env checklist to admin (no secret values).
 *
 * Usage:
 *   npx tsx scripts/email-go-live-checklist.ts
 *   npx tsx scripts/email-go-live-checklist.ts --email bigpons@brisbaneservers.com
 *   npx tsx scripts/email-go-live-checklist.ts --api https://brisbane-servers-api.onrender.com --cron-secret <secret>
 */
import { formatHostingEnvChecklistEmail } from '../src/lib/hosting-env-checklist';
import { sendAuthEmail } from '../src/lib/auth-email';

const args = process.argv.slice(2);
const emailFlag = args.indexOf('--email');
const apiFlag = args.indexOf('--api');

const targetEmail =
  emailFlag >= 0 && args[emailFlag + 1]
    ? args[emailFlag + 1].trim().toLowerCase()
    : (process.env.ADMIN_EMAIL ?? 'bigpons@brisbaneservers.com').trim().toLowerCase();

const apiOrigin =
  apiFlag >= 0 && args[apiFlag + 1]
    ? args[apiFlag + 1].replace(/\/+$/, '')
    : process.env.API_ORIGIN?.replace(/\/+$/, '');

async function emailViaApi(): Promise<boolean> {
  const sessionToken = process.env.ADMIN_SESSION_TOKEN?.trim();
  if (!apiOrigin || !sessionToken) return false;

  const res = await fetch(`${apiOrigin}/api/admin/email-hosting-checklist`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: targetEmail }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`API email failed (${res.status}): ${body}`);
    return false;
  }

  const data = (await res.json()) as { emailedTo?: string; missingRequired?: string[] };
  console.log(`Checklist emailed via API to ${data.emailedTo ?? targetEmail}`);
  if (data.missingRequired?.length) {
    console.log('Missing on API host:', data.missingRequired.join(', '));
  }
  return true;
}

async function emailLocal(): Promise<void> {
  const text = formatHostingEnvChecklistEmail();
  await sendAuthEmail({
    to: targetEmail,
    subject: 'Brisbane Servers — production environment checklist',
    text,
    html: `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</pre>`,
  });
  console.log(`Checklist emailed locally to ${targetEmail}`);
}

async function main(): Promise<void> {
  if (await emailViaApi()) return;
  await emailLocal();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
