import { getTokenPerk } from '../data/token-perks';
import { addLedgerEntry, getUserBalance, getUserEntries, type TokenLedgerEntry } from './token-ledger';
import { grantDailyAiBonus, getDailyAiBonus } from './inference/usage-ledger';
import { enqueueTokenRedemption } from './token-redemption-queue';

function utcDayKey(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

export async function listRedemptionHistory(userId: string): Promise<TokenLedgerEntry[]> {
  return (await getUserEntries(userId)).filter((e) => e.reason === 'redemption');
}

export async function hasRedeemedPerkToday(userId: string, perkId: string): Promise<boolean> {
  const day = utcDayKey();
  const entries = await getUserEntries(userId);
  return entries.some(
    (e) =>
      e.reason === 'redemption' &&
      e.perkId === perkId &&
      e.createdAt.slice(0, 10) === day
  );
}

export type RedeemResult =
  | { ok: true; entry: TokenLedgerEntry; message: string; aiBonusGranted?: number }
  | { ok: false; code: string; error: string };

export async function redeemTokenPerk(
  userId: string,
  perkId: string,
  userEmail?: string
): Promise<RedeemResult> {
  const perk = getTokenPerk(perkId);
  if (!perk) {
    return { ok: false, code: 'UNKNOWN_PERK', error: 'Unknown perk.' };
  }

  if (perk.oncePerDay && (await hasRedeemedPerkToday(userId, perk.id))) {
    return { ok: false, code: 'ALREADY_REDEEMED_TODAY', error: 'You already redeemed this perk today.' };
  }

  const balance = await getUserBalance(userId);
  if (balance < perk.cost) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      error: `Need ${perk.cost} tokens (you have ${balance}).`,
    };
  }

  const entry = await addLedgerEntry({
    userId,
    delta: -perk.cost,
    reason: 'redemption',
    perkId: perk.id,
  });

  let message = perk.description;
  let aiBonusGranted: number | undefined;

  if (perk.effect === 'ai_bonus' && perk.aiBonusUnits) {
    aiBonusGranted = await grantDailyAiBonus(userId, perk.aiBonusUnits);
    const totalBonus = await getDailyAiBonus(userId);
    message = `+${aiBonusGranted} AI units added for today (${totalBonus} bonus units active until midnight UTC).`;
  } else if (perk.effect === 'acknowledgement') {
    await enqueueTokenRedemption({
      userId,
      userEmail,
      perkId: perk.id,
      perkLabel: perk.label,
      ledgerEntryId: entry.id,
    });
    message = 'Redeemed — our team will follow up on this perk (see Admin Ops queue).';
  }

  return { ok: true, entry, message, aiBonusGranted };
}
