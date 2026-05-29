import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import type { GrowthProposal, GrowthProposalStatus } from './types';

function proposalsFilePath(): string {
  return path.join(voiceFrameworkStorageDir(), 'growth-proposals.json');
}

export async function loadGrowthProposals(): Promise<GrowthProposal[]> {
  const items = await readCorpusJson<GrowthProposal[]>(
    CORPUS_DOC_KEYS.GROWTH_PROPOSALS,
    proposalsFilePath(),
    []
  );
  return Array.isArray(items) ? items : [];
}

export async function saveGrowthProposals(proposals: GrowthProposal[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.GROWTH_PROPOSALS, proposalsFilePath(), proposals);
}

export async function upsertGrowthProposal(proposal: GrowthProposal): Promise<void> {
  const all = await loadGrowthProposals();
  const idx = all.findIndex((p) => p.id === proposal.id);
  if (idx >= 0) all[idx] = proposal;
  else all.push(proposal);
  await saveGrowthProposals(all);
}

export async function updateGrowthProposalStatus(
  id: string,
  status: GrowthProposalStatus,
  patch: Partial<GrowthProposal> = {}
): Promise<GrowthProposal | null> {
  const all = await loadGrowthProposals();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const updated: GrowthProposal = {
    ...all[idx],
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  await saveGrowthProposals(all);
  return updated;
}
