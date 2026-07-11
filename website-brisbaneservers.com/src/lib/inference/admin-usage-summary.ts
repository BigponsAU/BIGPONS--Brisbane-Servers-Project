/**
 * Admin site-wide daily AI usage summary (today UTC).
 */
import type { AuthRole } from '../../utils/auth';
import { loadUsers } from '../db/users';
import {
  DAILY_USAGE_CAP,
  loadDailyAiBonuses,
  loadUsageLedger,
} from './usage-ledger';
import {
  isActiveSubscriptionStatus,
  loadBillingAccounts,
} from '../billing/billing-accounts';
import { STRIPE_SUBSCRIPTION_DAILY_BONUS } from '../billing/stripe-config';
import { getInferenceProvider } from './inference-provider';
import { isNvidiaConfigured, getNvidiaModelId } from './nvidia-ai-client';
import { isWorkersAIConfigured } from './workers-ai-client';

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

export interface AdminUsageUserRow {
  userId: string;
  email: string;
  role: AuthRole;
  baseCap: number;
  bonus: number;
  subscriptionBonus: number;
  cap: number;
  used: number;
  remaining: number;
  nearCap: boolean;
  atCap: boolean;
  subscriptionStatus: string;
  subscriptionActive: boolean;
}

export interface AdminUsageSummary {
  day: string;
  provider: string;
  nvidiaConfigured: boolean;
  nvidiaModel?: string;
  workersAiConfigured: boolean;
  totals: {
    totalUsed: number;
    usersWithUsage: number;
    usersNearCap: number;
    usersAtCap: number;
    activeUsers: number;
  };
  users: AdminUsageUserRow[];
}

export async function buildAdminUsageSummary(
  day = utcDayKey(new Date().toISOString())
): Promise<AdminUsageSummary> {
  const users = await loadUsers({ includeRemoved: false });
  const ledger = await loadUsageLedger();
  const bonuses = await loadDailyAiBonuses();
  const billingAccounts = await loadBillingAccounts();

  const usageByUser = new Map<string, number>();
  for (const entry of ledger) {
    if (utcDayKey(entry.createdAt) !== day) continue;
    usageByUser.set(entry.userId, (usageByUser.get(entry.userId) ?? 0) + entry.units);
  }

  const bonusByUser = new Map<string, number>();
  for (const row of bonuses) {
    if (row.day === day) bonusByUser.set(row.userId, row.bonusUnits);
  }

  const billingByUser = new Map(billingAccounts.map((a) => [a.userId, a]));

  let totalUsed = 0;
  let usersWithUsage = 0;
  let usersNearCap = 0;
  let usersAtCap = 0;

  const rows: AdminUsageUserRow[] = [];

  for (const user of users) {
    const role = user.role as AuthRole;
    const baseCap = DAILY_USAGE_CAP[role] ?? DAILY_USAGE_CAP.client;
    const bonus = bonusByUser.get(user.id) ?? 0;
    const billing = billingByUser.get(user.id);
    const subscriptionActive = billing ? isActiveSubscriptionStatus(billing.status) : false;
    const subscriptionBonus = subscriptionActive
      ? billing!.dailyBonusUnits > 0
        ? billing!.dailyBonusUnits
        : STRIPE_SUBSCRIPTION_DAILY_BONUS
      : 0;
    const cap = baseCap + bonus + subscriptionBonus;
    const used = usageByUser.get(user.id) ?? 0;
    const remaining = Math.max(0, cap - used);
    const nearCap = cap > 0 && used / cap >= 0.8 && used < cap;
    const atCap = cap > 0 && used >= cap;

    totalUsed += used;
    if (used > 0) usersWithUsage += 1;
    if (nearCap) usersNearCap += 1;
    if (atCap) usersAtCap += 1;

    rows.push({
      userId: user.id,
      email: user.email,
      role,
      baseCap,
      bonus,
      subscriptionBonus,
      cap,
      used,
      remaining,
      nearCap,
      atCap,
      subscriptionStatus: billing?.status ?? 'none',
      subscriptionActive,
    });
  }

  rows.sort((a, b) => b.used - a.used || a.email.localeCompare(b.email));

  return {
    day,
    provider: getInferenceProvider(),
    nvidiaConfigured: isNvidiaConfigured(),
    nvidiaModel: isNvidiaConfigured() ? getNvidiaModelId() : undefined,
    workersAiConfigured: isWorkersAIConfigured(),
    totals: {
      totalUsed,
      usersWithUsage,
      usersNearCap,
      usersAtCap,
      activeUsers: users.length,
    },
    users: rows,
  };
}
