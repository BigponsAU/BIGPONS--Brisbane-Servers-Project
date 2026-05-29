#!/usr/bin/env npx tsx
/**
 * Seed or upgrade a verified super-admin and optionally email credentials.
 *
 * Usage:
 *   ADMIN_SEED_EMAIL=bigpons@brisbaneservers.com npx tsx scripts/seed-admin-user.ts
 *   ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD='...' npx tsx scripts/seed-admin-user.ts --no-email
 */
import { provisionSuperAdmin } from '../src/lib/admin-provision';

const email = (process.env.ADMIN_SEED_EMAIL ?? process.env.ADMIN_EMAIL ?? 'bigpons@brisbaneservers.com')
  .trim()
  .toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD ?? process.env.ADMIN_PASSWORD ?? undefined;
const role = (process.env.ADMIN_SEED_ROLE ?? 'super-admin') as 'super-admin' | 'admin';
const skipEmail = process.argv.includes('--no-email');

async function main(): Promise<void> {
  const result = await provisionSuperAdmin({
    email,
    password,
    role,
    sendEmail: !skipEmail
  });

  console.log(
    JSON.stringify(
      {
        email: result.email,
        role: result.role,
        created: result.created,
        upgraded: result.upgraded,
        emailSent: result.emailSent,
        emailError: result.emailError,
        password: result.emailSent ? '(sent by email — check inbox)' : result.password
      },
      null,
      2
    )
  );

  if (!result.emailSent) {
    console.log('\nSign in at /account with the password above.');
    if (result.emailError) {
      console.log(`Email not sent: ${result.emailError}`);
      console.log('Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS on the API host.');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
