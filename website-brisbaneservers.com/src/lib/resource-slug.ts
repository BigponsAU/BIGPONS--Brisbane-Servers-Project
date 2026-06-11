/** Topic slug normalization — no repository/DB imports (safe for Cloudflare Pages SSR). */
export function normalizeTopicSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
