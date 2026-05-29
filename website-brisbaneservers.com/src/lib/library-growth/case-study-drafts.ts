import { promises as fs } from 'fs';
import * as path from 'path';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import type { CaseStudy } from '../../data/case-studies';
import type { GrowthProposal } from './types';
import type { Resource } from '../resources-api';

function draftsFilePath(): string {
  return path.join(voiceFrameworkStorageDir(), 'case-study-drafts.json');
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function buildCaseStudyDraftFromGrowth(
  proposal: GrowthProposal,
  resource: Resource
): CaseStudy {
  const slug = slugFromTitle(proposal.title);
  const excerpt = (resource.description || resource.content || '').slice(0, 280);
  const industry = proposal.industry;

  return {
    slug,
    pageTitle: `${proposal.title} — case study`,
    metaDescription: resource.description || excerpt,
    pageId: `case-study-${slug}`,
    cardTitle: proposal.title,
    navLabel: proposal.title.slice(0, 48),
    cardDescription: resource.description || excerpt,
    icon: 'fas fa-briefcase',
    industryFilter: industry,
    relatedResourcesHref: `/resources/${industry}`,
    heroTitle: proposal.title,
    heroSubtitle: resource.description || excerpt,
    metaFields: [
      { label: 'Industry', value: industry },
      { label: 'Source', value: 'Library growth' },
      { label: 'Resource', value: resource.id },
    ],
    challenge: excerpt || proposal.rationale,
    approach: `Generated from the voice-aligned resource library and approved in the account workspace. ${proposal.rationale}`,
    results: [
      {
        title: 'Voice-aligned delivery',
        description: 'Draft case study material generated with the site default voice (not a new per-case-study profile).',
        icon: 'fas fa-chart-line',
      },
    ],
    technologies: 'Voice framework resource pipeline, semantic index, Cloudflare Pages static publish.',
    lessons: 'Review and refine this draft in src/data/case-studies.ts before treating it as a flagship case study.',
    inquiryTitle: 'Discuss a similar initiative',
    inquirySubtitle: 'Share your industry context and objectives. We respond with practical next steps.',
    inquiryIndustry: industry,
  };
}

async function ensureDraftsFile(): Promise<void> {
  const file = draftsFilePath();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify([], null, 2));
  }
}

export async function loadCaseStudyDrafts(): Promise<CaseStudy[]> {
  await ensureDraftsFile();
  try {
    const raw = JSON.parse(await fs.readFile(draftsFilePath(), 'utf-8'));
    return Array.isArray(raw) ? (raw as CaseStudy[]) : [];
  } catch {
    return [];
  }
}

export async function appendCaseStudyDraft(draft: CaseStudy): Promise<void> {
  const existing = await loadCaseStudyDrafts();
  if (existing.some((d) => d.slug === draft.slug)) {
    return;
  }
  existing.push(draft);
  await fs.writeFile(draftsFilePath(), JSON.stringify(existing, null, 2));
}
