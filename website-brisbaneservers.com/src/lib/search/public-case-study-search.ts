/**
 * Lexical search over static case study pages (curated + growth drafts at build).
 * Complements semantic resource search — case study body text is not in the API corpus RAG set.
 */
import { caseStudies } from '../../data/case-studies';
import type { PublicSearchResult } from './public-resource-search';

function studySearchText(study: (typeof caseStudies)[number]): string {
  return [
    study.pageTitle,
    study.metaDescription,
    study.heroTitle,
    study.heroSubtitle,
    study.cardTitle,
    study.cardDescription,
    study.challenge,
    study.approach,
    study.industryFilter,
    study.slug,
    ...study.results.map((r) => `${r.title} ${r.description}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function searchStaticCaseStudies(query: string, limit = 4): PublicSearchResult[] {
  const normalized = query.trim().toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized.length < 2) return [];

  const queryWords = normalized.split(/\s+/).filter((w) => w.length >= 2);
  const scored: PublicSearchResult[] = [];

  for (const study of caseStudies) {
    const text = studySearchText(study);
    let score = 0;

    if (normalized.length >= 2 && text.includes(normalized)) {
      score += 0.55;
    }

    for (const word of queryWords) {
      if (study.slug.includes(word)) score += 0.35;
      if (text.includes(word)) score += 0.12;
    }

    if (score <= 0) continue;

    scored.push({
      id: `case-${study.slug}`,
      title: study.pageTitle,
      description: study.metaDescription,
      url: `case-studies/${study.slug}/index.html`,
      industry: study.industryFilter,
      score: Math.min(1, score),
      strength: Math.round(Math.min(100, score * 100)),
      matchSource: 'keyword',
      matchedKeywords: queryWords.filter((w) => text.includes(w)).slice(0, 6),
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
