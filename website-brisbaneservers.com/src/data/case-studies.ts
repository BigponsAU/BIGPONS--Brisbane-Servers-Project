/**
 * Published case studies — single source for project cards, hub index, and detail pages.
 * Curated entries in case-studies-curated.ts; library-growth drafts merge in at build when present
 * (`voice-framework/storage/case-study-drafts.json`).
 */

import { loadCaseStudyDraftsForBuild } from '../lib/case-study-drafts-load';
import { curatedCaseStudies } from './case-studies-curated';

export type {
  CaseStudy,
  CaseStudyMetaField,
  CaseStudyResult,
} from './case-studies-curated';

const curatedSlugs = new Set(curatedCaseStudies.map((study) => study.slug));
const growthDraftCaseStudies = loadCaseStudyDraftsForBuild().filter(
  (draft) => !curatedSlugs.has(draft.slug)
);

/** Curated case studies plus growth drafts (when storage file exists at build). */
export const caseStudies = [...curatedCaseStudies, ...growthDraftCaseStudies];

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((study) => study.slug === slug);
}
