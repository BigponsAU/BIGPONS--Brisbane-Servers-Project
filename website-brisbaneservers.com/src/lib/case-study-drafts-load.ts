import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { voiceFrameworkStorageDir } from './monorepo-root';
import type { CaseStudy } from '../data/case-studies';

function draftsFilePath(): string {
  return path.join(voiceFrameworkStorageDir(), 'case-study-drafts.json');
}

/**
 * Growth-generated case study drafts (written on API materialize).
 * Merged into `caseStudies` at Astro build when the storage file is present
 * (local dev, monorepo checkout, or committed export).
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
