import { promises as fs } from 'fs';
import * as path from 'path';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import type { GrowthProposal, GrowthProposalStatus } from './types';

function proposalsFilePath(): string {
  return path.join(voiceFrameworkStorageDir(), 'growth-proposals.json');
}

async function ensureFile(): Promise<void> {
  const file = proposalsFilePath();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify([], null, 2));
  }
}

export async function loadGrowthProposals(): Promise<GrowthProposal[]> {
  await ensureFile();
  try {
    const items = JSON.parse(await fs.readFile(proposalsFilePath(), 'utf-8'));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function saveGrowthProposals(proposals: GrowthProposal[]): Promise<void> {
  await fs.writeFile(proposalsFilePath(), JSON.stringify(proposals, null, 2));
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
