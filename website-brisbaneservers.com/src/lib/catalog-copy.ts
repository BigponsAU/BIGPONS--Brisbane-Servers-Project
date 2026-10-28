/**
 * Hub-card / workspace descriptions must describe the article, not the voice
 * generator. TextGenerator was producing design-system filler ("wave function",
 * "mathematical precision") that never matched Operational Compliance etc.
 */

const JARGON = [
  /\bcipher\b/i,
  /\bfourier\b/i,
  /\bwave\s+function\b/i,
  /\bgolden\s+ratio\b/i,
  /\b1\.618\b/,
  /\b61\.8\b/,
  /\bmathematical\s+precision\b/i,
  /\bvisual\s+patterns?\b/i,
  /\ball-encompassing\s+precision\b/i,
  /for comprehensive (system )?integration/i,
];

export function isContaminatedCatalogCopy(text: string | undefined | null): boolean {
  const value = String(text ?? '').trim();
  if (!value) return true;
  return JARGON.some((re) => re.test(value));
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstSentences(body: string, maxChars = 280): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/:::diagram\s+\S+:::/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  const parts = plain.split(/(?<=[.!?])\s+/).filter((s) => s.length > 24);
  const joined = (parts.slice(0, 2).join(' ') || plain).trim();
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars - 1).replace(/\s+\S*$/, '')}…`;
}

/** On-topic blurb for cards, SEO, and the workspace Description field. */
export function catalogDescriptionFromArticle(params: {
  title: string;
  industry: string;
  topicLabel: string;
  bodyExcerpt?: string;
}): string {
  const title = params.title.trim() || humanize(params.topicLabel);
  const industry = humanize(params.industry);
  const topic = humanize(params.topicLabel);
  const fromBody = firstSentences(params.bodyExcerpt ?? '');
  if (fromBody && !isContaminatedCatalogCopy(fromBody)) {
    return fromBody;
  }
  return `${title} — practical notes on ${topic} for ${industry} organisations in Australia. Review and expand this draft with industry-specific detail before publishing.`;
}

export function displayCatalogDescription(params: {
  description?: string;
  title: string;
  industry: string;
  topicLabel: string;
  bodyExcerpt?: string;
}): string {
  const stored = String(params.description ?? '').trim();
  if (stored && !isContaminatedCatalogCopy(stored)) {
    return stored;
  }
  return catalogDescriptionFromArticle(params);
}
