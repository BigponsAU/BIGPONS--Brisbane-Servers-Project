/**
 * Flat token perks — no tiers or nested programmes.
 * Redeem via POST /api/tokens/redeem
 */

export type TokenPerkEffect = 'ai_bonus' | 'acknowledgement';

export interface TokenPerk {
  id: string;
  label: string;
  description: string;
  cost: number;
  effect: TokenPerkEffect;
  /** Extra daily AI units (raises effective cap for today). */
  aiBonusUnits?: number;
  /** One redemption per user per UTC day for this perk. */
  oncePerDay?: boolean;
}

export const TOKEN_PERKS: TokenPerk[] = [
  {
    id: 'ai-boost',
    label: '+3 AI generations today',
    description: 'Raises your daily AI cap for resource generate/improve until midnight UTC.',
    cost: 5,
    effect: 'ai_bonus',
    aiBonusUnits: 3,
    oncePerDay: true,
  },
  {
    id: 'spotlight',
    label: 'Spotlight on next approval',
    description:
      'When your next contribution is approved, we prioritise featuring it on the public resources hub (manual review — usually within a few days).',
    cost: 8,
    effect: 'acknowledgement',
    oncePerDay: false,
  },
  {
    id: 'office-hours',
    label: '30‑min office hours slot',
    description:
      'Book a short voice-alignment or hosting Q&A call. We email you within 2 business days to schedule.',
    cost: 15,
    effect: 'acknowledgement',
    oncePerDay: false,
  },
];

export function getTokenPerk(id: string): TokenPerk | undefined {
  return TOKEN_PERKS.find((p) => p.id === id);
}
