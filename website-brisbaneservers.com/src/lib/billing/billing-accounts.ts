import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusArray, saveCorpusJson } from '../corpus-store';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import { STRIPE_SUBSCRIPTION_DAILY_BONUS } from './stripe-config';

export type BillingSubscriptionStatus =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export interface BillingAccount {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: BillingSubscriptionStatus;
  /** Daily AI cap bonus while subscription is active. */
  dailyBonusUnits: number;
  updatedAt: string;
}

function getBillingAccountsFile(): string {
  return path.join(voiceFrameworkStorageDir(), 'billing-accounts.json');
}

export async function loadBillingAccounts(): Promise<BillingAccount[]> {
  return readCorpusArray<BillingAccount>(
    CORPUS_DOC_KEYS.BILLING_ACCOUNTS,
    getBillingAccountsFile(),
    []
  );
}

async function saveBillingAccounts(rows: BillingAccount[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.BILLING_ACCOUNTS, getBillingAccountsFile(), rows);
}

export async function findBillingAccountByUserId(userId: string): Promise<BillingAccount | null> {
  const rows = await loadBillingAccounts();
  return rows.find((r) => r.userId === userId) ?? null;
}

export async function findBillingAccountByStripeCustomerId(
  customerId: string
): Promise<BillingAccount | null> {
  const rows = await loadBillingAccounts();
  return rows.find((r) => r.stripeCustomerId === customerId) ?? null;
}

export async function upsertBillingAccount(
  patch: Partial<BillingAccount> & { userId: string; email: string }
): Promise<BillingAccount> {
  const rows = await loadBillingAccounts();
  const idx = rows.findIndex((r) => r.userId === patch.userId);
  const now = new Date().toISOString();
  const existing = idx >= 0 ? rows[idx] : null;
  const next: BillingAccount = {
    userId: patch.userId,
    email: patch.email.trim().toLowerCase(),
    stripeCustomerId: patch.stripeCustomerId ?? existing?.stripeCustomerId ?? null,
    stripeSubscriptionId: patch.stripeSubscriptionId ?? existing?.stripeSubscriptionId ?? null,
    status: patch.status ?? existing?.status ?? 'none',
    dailyBonusUnits:
      patch.dailyBonusUnits ??
      (patch.status === 'active' || patch.status === 'trialing'
        ? STRIPE_SUBSCRIPTION_DAILY_BONUS
        : (existing?.dailyBonusUnits ?? 0)),
    updatedAt: now,
  };
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  await saveBillingAccounts(rows);
  return next;
}

export function isActiveSubscriptionStatus(status: BillingSubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

export async function getSubscriptionDailyBonus(userId: string): Promise<number> {
  const account = await findBillingAccountByUserId(userId);
  if (!account || !isActiveSubscriptionStatus(account.status)) return 0;
  return account.dailyBonusUnits > 0 ? account.dailyBonusUnits : STRIPE_SUBSCRIPTION_DAILY_BONUS;
}
