/**
 * Materialize static case studies (curated + growth drafts) into the API resource corpus.
 */

import { curatedCaseStudies } from '../data/case-studies-curated';
import type { CaseStudy } from '../data/case-studies-curated';
import { loadResources, saveResources, type Resource } from './resources-api';

const CASE_STUDY_RESOURCE_PREFIX = 'case-study-';
const CASE_STUDY_SEED_ACTOR = 'system-seed';

function buildCaseStudyContent(study: CaseStudy): string {
  const resultsBlock = study.results
    .map((r) => `## ${r.title}\n\n${r.description}`)
    .join('\n\n');
  return `# ${study.heroTitle}

${study.heroSubtitle}

## Challenge

${study.challenge}

## Our approach

${study.approach}

## Results

${resultsBlock}

## Key technologies

${study.technologies}

## Lessons learned

${study.lessons}`;
}

export function caseStudyToResource(study: CaseStudy): Resource {
  const content = buildCaseStudyContent(study);
  const industry = study.industryFilter || 'general';
  return {
    id: `${CASE_STUDY_RESOURCE_PREFIX}${study.slug}`,
    industry,
    topic: 'case-studies',
    title: study.cardTitle,
    description: study.cardDescription,
    content,
    generatedAt: '2024-06-01T00:00:00.000Z',
    generatedBy: CASE_STUDY_SEED_ACTOR,
    ownerId: 'system',
    version: 1,
    status: 'published',
    visibility: 'public',
    isStarterBlock: false,
    metadata: {
      wordCount: content.split(/\s+/).filter(Boolean).length,
      growthKind: 'case_study',
    },
    processingStatus: 'queued',
  };
}

export function isCaseStudyCorpusResource(resource: Resource): boolean {
  return (
    resource.id.startsWith(CASE_STUDY_RESOURCE_PREFIX) &&
    resource.generatedBy === CASE_STUDY_SEED_ACTOR &&
    resource.metadata?.growthKind === 'case_study'
  );
}

/** Curated studies plus corpus-backed growth drafts (deduped by slug). */
export async function loadCaseStudiesForCorpus(): Promise<CaseStudy[]> {
  const { loadCaseStudyDrafts } = await import('./library-growth/case-study-drafts');
  const curatedSlugs = new Set(curatedCaseStudies.map((s) => s.slug));
  const drafts = await loadCaseStudyDrafts();
  const extra = drafts.filter((d) => !curatedSlugs.has(d.slug));
  return [...curatedCaseStudies, ...extra];
}

export interface SyncCaseStudiesResult {
  resources: Resource[];
  added: number;
  updated: number;
  totalCaseStudies: number;
}

/**
 * Upsert published case study resources into the Neon/filesystem corpus.
 * Safe to call repeatedly — only touches system-seeded case study rows.
 */
export async function syncCaseStudiesToResources(
  resources?: Resource[]
): Promise<SyncCaseStudiesResult> {
  const list = resources ?? (await loadResources());
  const studies = await loadCaseStudiesForCorpus();
  const byId = new Map(list.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;

  for (const study of studies) {
    const next = caseStudyToResource(study);
    const existing = byId.get(next.id);
    if (!existing) {
      list.push(next);
      byId.set(next.id, next);
      added += 1;
      continue;
    }
    if (!isCaseStudyCorpusResource(existing)) {
      continue;
    }
    const contentChanged =
      existing.content !== next.content ||
      existing.title !== next.title ||
      existing.description !== next.description;
    if (contentChanged) {
      const idx = list.findIndex((r) => r.id === next.id);
      if (idx >= 0) {
        list[idx] = {
          ...existing,
          ...next,
          version: (existing.version || 1) + 1,
          embeddingVersion: existing.embeddingVersion,
          chunkIds: existing.chunkIds,
        };
        updated += 1;
      }
    }
  }

  if (added > 0 || updated > 0) {
    await saveResources(list);
  }

  return {
    resources: list,
    added,
    updated,
    totalCaseStudies: studies.length,
  };
}
