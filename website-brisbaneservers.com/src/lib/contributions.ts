import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusArray, saveCorpusJson } from './corpus-store';
import { voiceFrameworkStorageDir } from './monorepo-root';

export const CONTRIBUTIONS_FILE = path.join(voiceFrameworkStorageDir(), 'contributions.json');

export type ContributionType = 'new_upload' | 'edit_suggestion';
export type ContributionStatus = 'pending' | 'accepted' | 'rejected';

export interface Contribution {
  id: string;
  userId: string;
  resourceId: string;
  type: ContributionType;
  status: ContributionStatus;
  payload: {
    industry: string;
    topic: string;
    title?: string;
    contentSnippet: string;
  };
  analysis?: {
    voiceScore?: number;
    notes?: string;
  };
  tokensAwarded?: number;
  createdAt: string;
  updatedAt: string;
}

export async function loadContributions(): Promise<Contribution[]> {
  return readCorpusArray<Contribution>(CORPUS_DOC_KEYS.CONTRIBUTIONS, CONTRIBUTIONS_FILE, []);
}

export async function saveContributions(contributions: Contribution[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.CONTRIBUTIONS, CONTRIBUTIONS_FILE, contributions);
}

export async function createContribution(
  input: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Contribution> {
  const contributions = await loadContributions();
  const now = new Date().toISOString();
  const contribution: Contribution = {
    ...input,
    id: `contrib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now
  };
  contributions.push(contribution);
  await saveContributions(contributions);
  return contribution;
}

export async function getUserContributions(userId: string): Promise<Contribution[]> {
  const contributions = await loadContributions();
  return contributions.filter((c) => c.userId === userId);
}

export async function updateContributionStatus(
  id: string,
  status: ContributionStatus,
  analysisUpdate?: Contribution['analysis'],
  tokensAwarded?: number
): Promise<Contribution | null> {
  const contributions = await loadContributions();
  const idx = contributions.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  contributions[idx] = {
    ...contributions[idx],
    status,
    analysis: {
      ...contributions[idx].analysis,
      ...analysisUpdate
    },
    tokensAwarded: tokensAwarded ?? contributions[idx].tokensAwarded,
    updatedAt: new Date().toISOString()
  };

  await saveContributions(contributions);
  return contributions[idx];
}

