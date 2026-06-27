/**
 * Value-proposition keywords and identity pillars for public search + admin RAG display.
 */
import { valueProposition } from '../../data/value-proposition';
import { industries } from '../../data/industries';

export interface PropositionPillar {
  id: string;
  label: string;
  keywords: string[];
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'our', 'how',
  'what', 'when', 'into', 'than', 'then', 'they', 'them', 'not', 'can', 'will', 'all',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function uniqueKeywords(...parts: string[]): string[] {
  const set = new Set<string>();
  for (const part of parts) {
    for (const token of tokenize(part)) {
      set.add(token);
    }
  }
  return [...set].sort();
}

/** Canonical proposition pillars shown in admin + used for keyword boosting. */
export function getPropositionPillars(): PropositionPillar[] {
  const industryNames = industries.map((i) => i.name).join(' ');
  const topicNames = industries.flatMap((i) => i.topics.map((t) => t.name)).join(' ');

  return [
    {
      id: 'truth-access',
      label: 'Access to truth in technology',
      keywords: uniqueKeywords(
        valueProposition.brandEyebrow,
        valueProposition.corePromise,
        valueProposition.voice.inferenceNotAssertion,
        valueProposition.fragments.evidenceLed
      ),
    },
    {
      id: 'actionable-delivery',
      label: 'Actionable, scoped delivery',
      keywords: uniqueKeywords(
        valueProposition.voice.actionablePrimary,
        valueProposition.voice.resourcefulDelivery,
        valueProposition.fragments.agreedDelivery,
        valueProposition.services.heroSubtitle
      ),
    },
    {
      id: 'australian-sme',
      label: 'Australian SME context',
      keywords: uniqueKeywords(
        valueProposition.audience,
        valueProposition.about.sections.sme.byline,
        industryNames,
        topicNames
      ),
    },
    {
      id: 'resources-evidence',
      label: 'Resources & evidence hub',
      keywords: uniqueKeywords(
        valueProposition.resources.heroSubtitle,
        valueProposition.resources.description,
        'grants automation compliance integration semantic search RAG inference'
      ),
    },
    {
      id: 'portal-voice',
      label: 'Portal voice framework',
      keywords: uniqueKeywords(
        valueProposition.about.sections.portalVoice.byline,
        'voice profile corpus BIGPONS Brisbane Servers workspace'
      ),
    },
  ];
}

export function getAllPropositionKeywords(): string[] {
  const set = new Set<string>();
  for (const pillar of getPropositionPillars()) {
    for (const kw of pillar.keywords) {
      set.add(kw);
    }
  }
  return [...set].sort();
}

/** Text blob used to embed proposition identity for vector alignment checks. */
export function getPropositionIdentityText(): string {
  return getPropositionPillars()
    .map((p) => `${p.label}: ${p.keywords.slice(0, 12).join(', ')}`)
    .join('\n');
}

export function matchPropositionKeywords(query: string): string[] {
  const q = query.toLowerCase();
  const qTokens = new Set(tokenize(query));
  const matched: string[] = [];

  for (const kw of getAllPropositionKeywords()) {
    if (q.includes(kw) || qTokens.has(kw)) {
      matched.push(kw);
      continue;
    }
    if (kw.length >= 5 && qTokens.size > 0) {
      for (const t of qTokens) {
        if (t.startsWith(kw.slice(0, 4)) || kw.startsWith(t.slice(0, 4))) {
          matched.push(kw);
          break;
        }
      }
    }
  }

  return [...new Set(matched)].slice(0, 12);
}

export function propositionKeywordScore(query: string, text: string): number {
  const matched = matchPropositionKeywords(query);
  if (matched.length === 0) return 0;
  const hay = text.toLowerCase();
  let hits = 0;
  for (const kw of matched) {
    if (hay.includes(kw)) hits += 1;
  }
  return Math.min(100, Math.round((hits / matched.length) * 100));
}
