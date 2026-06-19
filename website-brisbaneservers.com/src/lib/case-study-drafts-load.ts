import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { voiceFrameworkSeedStorageDir } from './monorepo-root';
import type { CaseStudy } from '../data/case-studies';

function draftsFilePath(): string {
  return path.join(voiceFrameworkSeedStorageDir(), 'case-study-drafts.json');
}

/**
 * Growth-generated case study drafts (written on API materialize).
 * Merged into `caseStudies` at Astro build when the storage file is present
 * (local dev, monorepo checkout, or committed export).
 *
 * Uses git seed storage path — safe for Node/Astro builds; not invoked on the edge Worker.
 */
export function loadCaseStudyDraftsForBuild(): CaseStudy[] {
  const file = draftsFilePath();
  if (!existsSync(file)) {
    return [];
  }

  try {
    const raw = JSON.parse(readFileSync(file, 'utf-8'));
    return Array.isArray(raw) ? (raw as CaseStudy[]) : [];
  } catch {
    return [];
  }
}
