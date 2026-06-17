import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from './corpus-store';
import { voiceFrameworkStorageDir } from './monorepo-root';

export const TOKEN_LEDGER_FILE = path.join(voiceFrameworkStorageDir(), 'token-ledger.json');

export type TokenReason =
  | 'initial_contribution'
  | 'moderation_adjustment'
  | 'admin_grant'
  | 'admin_revoke'
  | 'redemption';

export interface TokenLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: TokenReason;
  resourceId?: string;
  contributionId?: string;
  perkId?: string;
  createdAt: string;
}

export async function loadLedger(): Promise<TokenLedgerEntry[]> {
  const entries = await readCorpusJson<TokenLedgerEntry[]>(
    CORPUS_DOC_KEYS.TOKEN_LEDGER,
    TOKEN_LEDGER_FILE,
    []
  );
  return Array.isArray(entries) ? entries : [];
}

export async function saveLedger(entries: TokenLedgerEntry[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.TOKEN_LEDGER, TOKEN_LEDGER_FILE, entries);
}

export async function addLedgerEntry(
  entry: Omit<TokenLedgerEntry, 'id' | 'createdAt'>
): Promise<TokenLedgerEntry> {
  const entries = await loadLedger();
  const newEntry: TokenLedgerEntry = {
    ...entry,
    id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };
  entries.push(newEntry);
  await saveLedger(entries);
  return newEntry;
}

export async function getUserBalance(userId: string): Promise<number> {
  const entries = await loadLedger();
  return entries
    .filter((e) => e.userId === userId)
    .reduce((sum, e) => sum + e.delta, 0);
}

export async function getUserEntries(userId: string): Promise<TokenLedgerEntry[]> {
  const entries = await loadLedger();
  return entries.filter((e) => e.userId === userId);
}

