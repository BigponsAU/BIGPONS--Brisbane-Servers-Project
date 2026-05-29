#!/usr/bin/env node
/**
 * Configure Cloudflare Email Routing for brisbaneservers.com.
 *
 * Forwards connect@, contact@, bigpons@, support@ → brisbaneservers@gmail.com
 *
 * Requires API token with:
 *   Zone → Email Routing Rules → Edit
 *   Account → Email Routing Addresses → Edit
 *   Zone → DNS → Edit (MX records when enabling routing)
 *
 * Usage:
 *   set CLOUDFLARE_API_TOKEN=...
 *   node scripts/setup-cloudflare-email-routing.mjs
 *
 * Or: npm run setup:cloudflare-email
 */
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? '92d738484386c6b613628bbeafebe2f9';
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID ?? 'd17d7ab59aec5a7a6fb4f08f9740f779';
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME ?? 'brisbaneservers.com';
const DESTINATION_EMAIL = process.env.EMAIL_ROUTING_DESTINATION ?? 'brisbaneservers@gmail.com';

const CUSTOM_ADDRESSES = ['connect', 'contact', 'bigpons', 'support'];

const token = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
if (!token) {
  console.error('Set CLOUDFLARE_API_TOKEN (Account + Zone Email Routing Edit, Zone DNS Edit).');
  process.exit(1);
}

async function cf(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.map((e) => e.message).join('; ') ?? res.statusText;
    throw new Error(`${method} ${path}: ${msg}`);
  }
  return data.result;
}

async function getOrCreateDestination() {
  const list = await cf(`/accounts/${ACCOUNT_ID}/email/routing/addresses`);
  let dest = list.find((d) => d.email?.toLowerCase() === DESTINATION_EMAIL.toLowerCase());
  if (!dest) {
    console.log(`Creating destination ${DESTINATION_EMAIL}…`);
    dest = await cf(`/accounts/${ACCOUNT_ID}/email/routing/addresses`, {
      method: 'POST',
      body: { email: DESTINATION_EMAIL }
    });
    console.log('→ Check Gmail for Cloudflare verification link (required before forwards work).');
  } else {
    console.log(`Destination already exists: ${DESTINATION_EMAIL}`);
  }
  return dest;
}

async function waitForVerified(destId, maxWaitMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const dest = await cf(`/accounts/${ACCOUNT_ID}/email/routing/addresses/${destId}`);
    if (dest.verified) {
      console.log(`Destination verified: ${DESTINATION_EMAIL}`);
      return dest;
    }
    console.log('Waiting for Gmail verification… (click link in inbox)');
    await new Promise((r) => setTimeout(r, 8000));
  }
  throw new Error(
    `Destination not verified within ${maxWaitMs / 1000}s. Click the Cloudflare link in ${DESTINATION_EMAIL}, then re-run this script.`
  );
}

async function enableEmailRouting() {
  try {
    const dns = await cf(`/zones/${ZONE_ID}/email/routing/dns`, {
      method: 'POST',
      body: { name: ZONE_NAME }
    });
    console.log('Email Routing DNS enabled:', dns?.status ?? 'ok');
    return dns;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already') || message.includes('enabled')) {
      console.log('Email Routing already enabled (DNS).');
      return null;
    }
    throw error;
  }
}

async function listRules() {
  return cf(`/zones/${ZONE_ID}/email/routing/rules`);
}

function ruleExists(rules, localPart) {
  const target = `${localPart}@${ZONE_NAME}`.toLowerCase();
  return rules.some((rule) =>
    rule.matchers?.some(
      (m) =>
        m.type === 'literal' &&
        m.field === 'to' &&
        String(m.value).toLowerCase() === target
    )
  );
}

async function createForwardRule(localPart, destinationId) {
  const address = `${localPart}@${ZONE_NAME}`;
  const name = `Forward ${address} to ${DESTINATION_EMAIL}`;
  await cf(`/zones/${ZONE_ID}/email/routing/rules`, {
    method: 'POST',
    body: {
      name,
      enabled: true,
      priority: 0,
      matchers: [{ type: 'literal', field: 'to', value: address }],
      actions: [{ type: 'forward', value: [destinationId] }]
    }
  });
  console.log(`Created rule: ${address} → ${DESTINATION_EMAIL}`);
}

async function main() {
  console.log(`Zone: ${ZONE_NAME} (${ZONE_ID})`);
  console.log(`Account: ${ACCOUNT_ID}`);

  const dest = await getOrCreateDestination();
  const destId = dest.id ?? dest.tag;
  if (!destId) throw new Error('No destination id returned from Cloudflare');

  if (!dest.verified) {
    try {
      await waitForVerified(destId);
    } catch {
      console.warn('\nContinuing to enable DNS/rules — forwards will not deliver until Gmail is verified.\n');
    }
  }

  await enableEmailRouting();

  const rules = await listRules();
  for (const local of CUSTOM_ADDRESSES) {
    if (ruleExists(rules, local)) {
      console.log(`Rule already exists: ${local}@${ZONE_NAME}`);
      continue;
    }
    await createForwardRule(local, destId);
  }

  try {
    const mxRecords = await cf(`/zones/${ZONE_ID}/dns_records?type=MX`);
    console.log(
      '\nCurrent MX records:',
      mxRecords.map((r) => r.content).join(', ') || '(none)'
    );
  } catch {
    /* optional summary */
  }

  console.log('\nDone. Test: send mail to connect@brisbaneservers.com and confirm Gmail receives it.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
