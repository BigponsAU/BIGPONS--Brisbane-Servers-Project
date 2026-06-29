/**
 * Admin fulfilment queue for acknowledgement token perks (spotlight, office hours).
 */
import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusArray, saveCorpusJson } from './corpus-store';
import { voiceFrameworkStorageDir } from './monorepo-root';

export type TokenRedemptionQueueStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface TokenRedemptionQueueItem {
  id: string;
  userId: string;
  userEmail?: string;
  perkId: string;
  perkLabel: string;
  ledgerEntryId: string;
  status: TokenRedemptionQueueStatus;
  createdAt: string;
  fulfilledAt?: string;
  fulfilledBy?: string;
  note?: string;
}

export function getTokenRedemptionQueueFile(): string {
  return path.join(voiceFrameworkStorageDir(), 'token-redemption-queue.json');
}

export async function loadTokenRedemptionQueue(): Promise<TokenRedemptionQueueItem[]> {
  return readCorpusArray<TokenRedemptionQueueItem>(
    CORPUS_DOC_KEYS.TOKEN_REDEMPTION_QUEUE,
    getTokenRedemptionQueueFile(),
    [],
  );
}

export async function saveTokenRedemptionQueue(rows: TokenRedemptionQueueItem[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.TOKEN_REDEMPTION_QUEUE, getTokenRedemptionQueueFile(), rows);
}

export async function enqueueTokenRedemption(item: Omit<TokenRedemptionQueueItem, 'id' | 'createdAt' | 'status'>): Promise<TokenRedemptionQueueItem> {
  const rows = await loadTokenRedemptionQueue();
  const row: TokenRedemptionQueueItem = {
    ...item,
    id: `trq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  rows.push(row);
  await saveTokenRedemptionQueue(rows);
  return row;
}

export async function listPendingTokenRedemptions(): Promise<TokenRedemptionQueueItem[]> {
  const rows = await loadTokenRedemptionQueue();
  return rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fulfillTokenRedemption(
  id: string,
  fulfilledBy: string,
  note?: string
): Promise<TokenRedemptionQueueItem | null> {
  const rows = await loadTokenRedemptionQueue();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  rows[idx] = {
    ...rows[idx],
    status: 'fulfilled',
    fulfilledAt: new Date().toISOString(),
    fulfilledBy,
    note: note?.trim() || rows[idx].note,
  };
  await saveTokenRedemptionQueue(rows);
  return rows[idx];
}
