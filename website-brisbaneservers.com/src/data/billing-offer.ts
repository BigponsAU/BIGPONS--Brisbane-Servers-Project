/**
 * Capacity offer copy — one paid product (AI Boost), one included lane,
 * one earn-not-buy lane. Framed as a professional wall, not a funnel gimmick.
 */

export const AI_BOOST_DAILY_UNITS = 15;

export const billingOffer = {
  wallEyebrow: 'Capacity',
  wallTitle: 'Keep the working day in the workspace',
  wallByline:
    'Generate, Improve, and rewrite draw from a daily AI cap. Boost sits on top of your role allocation. Tokens are earned, not sold.',
  included: {
    name: 'Workspace',
    kicker: 'Included',
    outcome: 'Your role cap, every UTC day, for the same generate and improve paths the library already uses.',
    points: [
      'Role-based daily units — no extra invoice',
      'Resets midnight UTC',
      'Earn tokens when contributions are accepted',
    ],
  },
  boost: {
    name: 'AI Boost',
    kicker: 'Recommended when the week is heavy',
    outcome: `+${AI_BOOST_DAILY_UNITS} AI units every UTC day while the subscription is active — generate, improve, and rewrite without waiting for midnight.`,
    points: [
      `+${AI_BOOST_DAILY_UNITS} daily units on top of your role cap`,
      'Card details stay on Stripe — not on this site',
      'Cancel any time from Manage billing',
    ],
    ctaSubscribe: 'Continue with AI Boost',
    ctaBusy: 'Opening Stripe…',
    ctaManage: 'Manage billing',
    confirmTitle: 'Continue to Stripe',
    confirmMessage:
      'AI Boost is a monthly subscription. It adds extra daily AI units while active. You enter card details on Stripe, then return here. Cancel any time from Manage billing.',
  },
  tokens: {
    name: 'Contribution tokens',
    kicker: 'Earned',
    outcome: 'Same-day bumps and acknowledgements from accepted contributions — not a second paid top-up.',
    points: [
      '+3 generations today for 5 tokens (once per UTC day)',
      'Spotlight and office-hours as human follow-ups',
      'No Stripe charge for tokens',
    ],
  },
  trust: [
    'Hosted checkout on Stripe',
    'Cancel any time',
    'One paid product — no stacked plans',
  ],
  nearCap:
    'You are close to today’s cap. Remaining generate and improve runs stop at zero until midnight UTC, unless you add Boost or redeem tokens.',
  atCap:
    'Today’s AI cap is used. Boost raises the cap for the rest of today and each day after. Tokens add a same-day bump without a subscription.',
  success:
    'Checkout complete. AI Boost applies once Stripe confirms the subscription — usually within a minute. Refresh if the meter has not moved.',
  cancel: 'Checkout closed without a charge. Your included cap is unchanged.',
  portalReturn: 'Returned from Stripe billing. Invoices and cancellation live there; capacity lives here.',
} as const;

export function formatCapContrast(baseCap: number, boosted: boolean): string {
  const boostCap = baseCap + AI_BOOST_DAILY_UNITS;
  if (boosted) return `${baseCap} included + ${AI_BOOST_DAILY_UNITS} Boost = ${boostCap} units today`;
  return `${baseCap} included today · ${boostCap} with AI Boost`;
}
