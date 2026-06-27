/**
 * Daily AI usage caps before Workers AI calls (free tier protection).
 */

import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import type { AuthRole } from '../../utils/auth';

export function getUsageLedgerFile(): string {
  return path.join(voiceFrameworkStorageDir(), 'usage-ledger.json');
}

export type UsageReason =
  | 'inference_generate'
  | 'inference_improve'
  | 'inference_process'
  | 'inference_document_rewrite';

export interface UsageLedgerEntry {
  id: string;
  userId: string;
  units: number;
  reason: UsageReason;
  modelId?: string;
  createdAt: string;
}

/** Daily free units by role (Workers AI neuron budget is site-wide; this limits abuse). */
export const DAILY_USAGE_CAP: Record<AuthRole, number> = {
  client: 2,
  viewer: 3,
  editor: 8,
  admin: 25,
  'super-admin': 100,
};

export function unitsForGenerate(contentLength: number): number {
  return Math.max(1, Math.ceil(contentLength / 4000));
}

export async function loadUsageLedger(): Promise<UsageLedgerEntry[]> {
  const entries = await readCorpusJson<UsageLedgerEntry[]>(
    CORPUS_DOC_KEYS.USAGE_LEDGER,
    getUsageLedgerFile(),
    []
  );
  return Array.isArray(entries) ? entries : [];
}

export async function saveUsageLedger(entries: UsageLedgerEntry[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.USAGE_LEDGER, getUsageLedgerFile(), entries);
}

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function getUserDailyUsage(userId: string, day = utcDayKey(new Date().toISOString())): Promise<number> {
  const entries = await loadUsageLedger();
  return entries
    .filter((e) => e.userId === userId && utcDayKey(e.createdAt) === day)
    .reduce((sum, e) => sum + e.units, 0);
}

export interface DailyAiBonusRow {
  userId: string;
  day: string;
  bonusUnits: number;
}

export function getAiBonusFile(): string {
  return path.join(voiceFrameworkStorageDir(), 'ai-daily-bonuses.json');
}

export async function loadDailyAiBonuses(): Promise<DailyAiBonusRow[]> {
  const rows = await readCorpusJson<DailyAiBonusRow[]>(
    CORPUS_DOC_KEYS.AI_DAILY_BONUSES,
    getAiBonusFile(),
    []
  );
  return Array.isArray(rows) ? rows : [];
}

export async function saveDailyAiBonuses(rows: DailyAiBonusRow[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.AI_DAILY_BONUSES, getAiBonusFile(), rows);
}

export async function getDailyAiBonus(
  userId: string,
  day = utcDayKey(new Date().toISOString())
): Promise<number> {
  const rows = await loadDailyAiBonuses();
  return rows.find((r) => r.userId === userId && r.day === day)?.bonusUnits ?? 0;
}

/** Add bonus units to today's effective AI cap (token redemption). */
export async function grantDailyAiBonus(
  userId: string,
  units: number,
  day = utcDayKey(new Date().toISOString())
): Promise<number> {
  if (units <= 0) return 0;
  const rows = await loadDailyAiBonuses();
  const idx = rows.findIndex((r) => r.userId === userId && r.day === day);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], bonusUnits: rows[idx].bonusUnits + units };
  } else {
    rows.push({ userId, day, bonusUnits: units });
  }
  await saveDailyAiBonuses(rows);
  return units;
}

export async function checkUsageCap(
  userId: string,
  role: AuthRole,
  units: number
): Promise<{ ok: true; remaining: number } | { ok: false; cap: number; used: number }> {
  const baseCap = DAILY_USAGE_CAP[role] ?? DAILY_USAGE_CAP.client;
  const bonus = await getDailyAiBonus(userId);
  const cap = baseCap + bonus;
  const used = await getUserDailyUsage(userId);
  if (used + units > cap) {
    return { ok: false, cap, used };
  }
  return { ok: true, remaining: cap - used - units };
}

export async function recordUsage(entry: Omit<UsageLedgerEntry, 'id' | 'createdAt'>): Promise<UsageLedgerEntry> {
  const entries = await loadUsageLedger();
  const row: UsageLedgerEntry = {
    ...entry,
    id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  entries.push(row);
  await saveUsageLedger(entries);
  return row;
}

export async function getUserUsageSummary(
  userId: string,
  role: AuthRole
): Promise<{ cap: number; used: number; remaining: number; bonus: number }> {
  const baseCap = DAILY_USAGE_CAP[role] ?? DAILY_USAGE_CAP.client;
  const bonus = await getDailyAiBonus(userId);
  const cap = baseCap + bonus;
  const used = await getUserDailyUsage(userId);
  return { cap, used, remaining: Math.max(0, cap - used), bonus };
}
