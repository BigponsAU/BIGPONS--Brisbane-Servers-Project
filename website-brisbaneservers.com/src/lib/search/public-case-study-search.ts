/**
 * Lexical search over static case study pages (curated + growth drafts at build).
 * Complements semantic resource search — case study body text is not in the API corpus RAG set.
 */
import { caseStudies } from '../../data/case-studies';
import type { PublicSearchResult } from './public-resource-search';
import { classifyQueryTokenMatch, collectSearchTokens, queryTokensFromText, SEARCH_MIN_CHARS } from './fuzzy-text';

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
  if (normalized.length < SEARCH_MIN_CHARS) return [];

  const queryWords = queryTokensFromText(query);
  const scored: PublicSearchResult[] = [];

  for (const study of caseStudies) {
    const text = studySearchText(study);
    const tokens = collectSearchTokens(text);
    let score = 0;
    const matchedKeywords: string[] = [];

    if (normalized.length >= SEARCH_MIN_CHARS && text.includes(normalized)) {
      score += 0.55;
    }

    for (const word of queryWords) {
      let wordScore = 0;
      for (const token of tokens) {
        const kind = classifyQueryTokenMatch(word, token);
        if (kind === 'none') continue;
        matchedKeywords.push(token);
        if (kind === 'exact') wordScore = Math.max(wordScore, 0.2);
        else if (kind === 'prefix') wordScore = Math.max(wordScore, 0.16);
        else wordScore = Math.max(wordScore, 0.14);
      }
      if (study.slug.includes(word)) wordScore = Math.max(wordScore, 0.35);
      score += wordScore;
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
      matchedKeywords: [...new Set(matchedKeywords)].slice(0, 6),
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
