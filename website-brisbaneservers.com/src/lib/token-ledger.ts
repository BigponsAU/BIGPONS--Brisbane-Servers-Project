import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store ledger alongside resources in voice-framework/storage for now
const projectRoot = path.resolve(__dirname, '../../../../');
export const TOKEN_LEDGER_FILE = path.join(
  projectRoot,
  'voice-framework',
  'storage',
  'token-ledger.json'
);

export type TokenReason =
  | 'initial_contribution'
  | 'moderation_adjustment'
  | 'admin_grant'
  | 'admin_revoke';

export interface TokenLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: TokenReason;
  resourceId?: string;
  contributionId?: string;
  createdAt: string;
}

async function ensureLedgerFile(): Promise<void> {
  try {
    await fs.access(TOKEN_LEDGER_FILE);
  } catch {
    await fs.mkdir(path.dirname(TOKEN_LEDGER_FILE), { recursive: true });
    await fs.writeFile(TOKEN_LEDGER_FILE, JSON.stringify([], null, 2));
  }
}

export async function loadLedger(): Promise<TokenLedgerEntry[]> {
  await ensureLedgerFile();
  const data = await fs.readFile(TOKEN_LEDGER_FILE, 'utf-8');
  try {
    const entries = JSON.parse(data);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

export async function saveLedger(entries: TokenLedgerEntry[]): Promise<void> {
  await fs.writeFile(TOKEN_LEDGER_FILE, JSON.stringify(entries, null, 2));
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

