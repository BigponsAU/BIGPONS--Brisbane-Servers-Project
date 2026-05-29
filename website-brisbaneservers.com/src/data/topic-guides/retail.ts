import type { TopicGuide } from './types';

export const retailGuides: TopicGuide[] = [
  {
    industrySlug: 'retail',
    topicSlug: 'inventory-pos',
    proposition:
      'When the till and the shelf disagree, you are either overselling, over-ordering, or both — inventory and POS integration exists to make stock truth as reliable as your cash drawer.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Retail margin dies in the gaps: sell-through you did not record, stock you thought you had, shrink you cannot explain. Spreadsheets and end-of-day counts are tolerable at one site; they break when you add staff rotations, promotions, or a second channel.',
          'The necessity is measurable: every oversell forces an apology or emergency supplier run; every phantom SKU ties up cash in dead stock.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'One stock position per SKU (or variant) updated from sales and receipts, with reorder rules you trust and shrink visible by category — not discovered at stocktake.',
        ],
        bullets: [
          'Daily reconciliation between POS totals and payment deposits.',
          'Receiving workflows that update on-hand before product hits the floor.',
          'Reporting that separates margin by category and location without manual pivot tables.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Fix product master data and barcode discipline before buying advanced analytics — garbage SKUs make any system lie confidently.',
          'Cloud POS with offline mode matters for Australian sites with patchy connectivity; verify failover before peak season.',
        ],
      },
      {
        id: 'grants',
        title: 'Australian retail context',
        paragraphs: [
          'Small business technology grants and state retail recovery programs occasionally fund POS modernisation when tied to job creation or measurable efficiency — document baseline shrink and admin hours for applications.',
          'GST and EFTPOS settlement timing should match how your accounting package expects imports — scope integration with Xero/MYOB early.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Reconcile one week brutally',
        detail: 'Match POS sales, refunds, and on-hand for top SKUs manually — variances show where integration must focus.',
      },
      {
        label: 'Clean the catalogue',
        detail: 'Merge duplicate SKUs and fix barcodes before migration — migration amplifies mess at scale.',
      },
      {
        label: 'Phase by location or channel',
        detail: 'Run one store or channel on the new stack while keeping fallback — cutover during quiet trading, not Christmas week.',
      },
    ],
  },
  {
    industrySlug: 'retail',
    topicSlug: 'e-commerce',
    proposition:
      'Selling online without sharing stock and fulfilment logic with the store creates a second business you cannot see — e-commerce integration is how channels reinforce each other instead of fighting.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'A standalone web store with manual stock updates will oversell popular lines and strand capital in web-only inventory. Staff lose trust in the website when customers arrive for click-and-collect that was never reserved.',
          'Customers expect accurate availability, sensible shipping or pickup windows, and consistent pricing — failures here are brand damage, not “IT issues.”',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Unified catalogue, shared inventory pool (or clear rules for channel allocation), automated order routing to pick/pack or store, and payments reconciled without re-keying.',
        ],
        bullets: [
          'Click-and-collect and ship-from-store workflows staff can execute without phone calls to the warehouse.',
          'Promotions that respect margin guardrails across channels.',
          'Returns handled once, reflected everywhere.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Launch with a bounded catalogue and one fulfilment model before promising national next-day — complexity scales with carriers, returns, and multi-site allocation.',
          'Platform choice (Shopify, WooCommerce, custom) should follow fulfilment reality, not theme aesthetics.',
        ],
      },
      {
        id: 'grants',
        title: 'Growth without chaos',
        paragraphs: [
          'Export readiness and Australian consumer law (refunds, pricing display) belong in scope from day one — retrofits are expensive.',
          'Measure cost per order and pick time; if web volume doubles, fulfilment must not double headcount unnoticed.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Choose fulfilment model first',
        detail: 'Pick-up only, single warehouse, or multi-store allocation — technology follows logistics, not the reverse.',
      },
      {
        label: 'Integrate stock before marketing spend',
        detail: 'Turn on ads only when availability and order flow are proven for your top SKUs.',
      },
      {
        label: 'Define returns policy in systems',
        detail: 'Encode refund rules and restock behaviour so staff and customers get the same answer.',
      },
    ],
  },
  {
    industrySlug: 'retail',
    topicSlug: 'customer-systems',
    proposition:
      'Loyalty and CRM only matter when they change behaviour you can measure — otherwise you are paying to email people who would have bought anyway.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Acquisition costs rise; repeat customers subsidise growth. Without identifiable customers and offer logic tied to margin, promotions become blanket discounts that train everyone to wait for sales.',
          'Generic CRM rollouts fail when staff never log interactions and data stays incomplete — the system becomes a mailing list, not a decision tool.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Known customers with consent-based contact, segments based on purchase patterns (not guesswork), and campaigns you can attribute to incremental visits or basket size.',
        ],
        bullets: [
          'Loyalty that rewards profitable behaviour, not only frequency.',
          'Staff can see customer history at POS without opening five screens.',
          'Churn and reactivation triggers you act on weekly, not quarterly.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Start with POS-integrated loyalty and clean email/SMS consent before advanced personalisation — Australian Spam Act compliance is non-negotiable.',
          'Integrate reviews and support tickets only if someone owns follow-up; data without action is noise.',
        ],
      },
      {
        id: 'grants',
        title: 'Prove value before expansion',
        paragraphs: [
          'Run one campaign with a holdout group (even informal) to see if targeted offers beat blanket discounts.',
          'Report incremental margin, not just open rates — leadership funds what protects profit, not clicks.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Define one metric that matters',
        detail: 'Repeat visit rate, average basket, or 90-day LTV — pick one success measure before buying tools.',
      },
      {
        label: 'Fix capture at checkout',
        detail: 'Train staff on consent and identity capture; without IDs, CRM cannot infer value.',
      },
      {
        label: 'Pilot one segment offer',
        detail: 'Test a single win-back or VIP offer, measure redemption and margin, then expand.',
      },
    ],
  },
];
