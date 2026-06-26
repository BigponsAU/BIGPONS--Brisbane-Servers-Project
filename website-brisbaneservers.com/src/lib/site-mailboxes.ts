/**
 * Canonical @brisbaneservers.com addresses for site copy and outbound mail.
 * Receiving mail is configured in Cloudflare Email Routing (see docs/operations/CLOUDFLARE_EMAIL.md).
 */
export const siteMailboxes = {
  /** Primary public contact (forms, footer) */
  connect: 'connect@brisbaneservers.com',
  /** General inquiries alias — forward to the same inbox as connect@ in Cloudflare Email Routing */
  contact: 'contact@brisbaneservers.com',
  /** Corrections welcome (about page) */
  corrections: 'connect@brisbaneservers.com',
  /** Brand / operator (BIGPONS) */
  bigpons: 'bigpons@brisbaneservers.com',
  /** Outbound auth mail (Resend verified root domain; mail. subdomain also verified) */
  support: 'support@brisbaneservers.com',
  /** Optional no-reply for bulk/automated only */
  noreply: 'noreply@brisbaneservers.com'
} as const;

export type SiteMailboxKey = keyof typeof siteMailboxes;

/** Admin dashboard outbound / recipient mailboxes (all forward to operator inbox). */
export const adminMailboxKeys = ['bigpons', 'support', 'connect'] as const;
export type AdminMailboxKey = (typeof adminMailboxKeys)[number];

export const adminMailboxLabels: Record<AdminMailboxKey, string> = {
  bigpons: 'BIGPONS',
  support: 'Support',
  connect: 'Connect',
};

export function getMailbox(key: SiteMailboxKey): string {
  return siteMailboxes[key];
}

export function isAdminMailboxKey(value: string): value is AdminMailboxKey {
  return (adminMailboxKeys as readonly string[]).includes(value);
}

export function resolveAdminMailboxAddress(key: string | undefined, fallback: AdminMailboxKey): string {
  if (key && isAdminMailboxKey(key)) {
    return siteMailboxes[key];
  }
  return siteMailboxes[fallback];
}

export function formatBrisbaneServersFrom(email: string, displayName = 'Brisbane Servers'): string {
  return `${displayName} <${email}>`;
}
