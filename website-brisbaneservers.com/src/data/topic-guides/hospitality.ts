import type { TopicGuide } from './types';

export const hospitalityGuides: TopicGuide[] = [
  {
    industrySlug: 'hospitality',
    topicSlug: 'booking',
    proposition:
      'Double-booked tables and phone-only reservations burn goodwill before service starts — booking systems justify spend when the floor plan and guest promises stay in sync.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Covers are perishable inventory. A empty table at 7:30pm cannot be sold twice; an overbooked Friday costs comps, stress, and reviews. Managers should not be the human API between Google, phone, walk-ins, and the floor plan.',
          'Accommodation adds channel manager complexity — OTAs, direct web, and front desk must agree on inventory or you honour rates you did not intend.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Real-time availability, deposits where no-shows hurt, automated confirmations, and service-period rules (turn times, combos, functions) encoded — not remembered by one veteran host.',
        ],
        bullets: [
          'Waitlist that texts when tables turn.',
          'Function and event holds that do not disappear from a notebook.',
          'Reporting on covers, no-shows, and channel mix.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Integrate booking with POS or at least export guest lists for busy services — otherwise kitchen and floor still fly blind.',
          'Deposits and cancellation policies must match consumer law and your brand tone — technology enforces what you document.',
        ],
      },
      {
        id: 'grants',
        title: 'Hospitality context',
        paragraphs: [
          'Tourism and small business programs occasionally fund digital booking and channel tools post-disruption — tie applications to measurable cover utilisation and labour saved on phones.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Audit one peak service',
        detail: 'Count booking sources and conflicts — shows where integration must land first.',
      },
      {
        label: 'Set turn-time rules',
        detail: 'Encode realistic seating duration per party size — stops optimistic overbooking.',
      },
      {
        label: 'Turn on deposits where pain is highest',
        detail: 'Functions and peak Saturdays first; measure no-show delta before rolling everywhere.',
      },
    ],
  },
  {
    industrySlug: 'hospitality',
    topicSlug: 'pos-integration',
    proposition:
      'If menu, payments, and stock do not reconcile daily, you are flying blind on margin — POS integration makes the shift handover a fact, not a debate.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Hospitality COGS move with weather, events, and supply shocks. Without item-level sales tied to recipes or purchase data, “we feel busy” replaces gross profit clarity. Tip pooling and surcharge rules add payroll complexity when POS and roster systems disagree.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Menu engineering with stable PLU structure, integrated EFTPOS, kitchen routing where needed, and end-of-day reports that match bank deposits without a 45-minute reconciliation argument.',
        ],
        bullets: [
          'Modifier and combo pricing consistent across terminals.',
          'Void and discount reasons captured for fraud and training signals.',
          'Labour % viewed against actual sales, not projected.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Match POS depth to venue type — a cafe does not need enterprise table management; a full-service venue does.',
          'Offline mode and surge support matter for festivals and stadium adjacency sites.',
        ],
      },
      {
        id: 'grants',
        title: 'Cash and compliance',
        paragraphs: [
          'Single Touch Payroll and award interpretation still need payroll expertise — POS exports wages components; they do not replace HR advice.',
          'Surcharge display rules must be clear on receipts — compliance protects against chargeback disputes.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Reconcile tills to bank for one week',
        detail: 'Document variances by terminal and shift — integration scope targets real leaks.',
      },
      {
        label: 'Standardise menu data',
        detail: 'Fix PLUs and modifiers before adding delivery aggregators — aggregators amplify mess.',
      },
      {
        label: 'Connect roster to sales hours',
        detail: 'Compare rostered hours to sales by hour block; adjust staffing patterns with data.',
      },
    ],
  },
  {
    industrySlug: 'hospitality',
    topicSlug: 'automation',
    proposition:
      'Automation in hospitality should buy back floor and kitchen attention — not add screens. If staff ignore alerts, the automation failed.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Owners and managers repeat the same messages: roster changes, function confirmations, low-stock warnings, review responses. Labour is tight; wasting shift time on copy-paste communication is margin you cannot recover.',
          'Automation that fights service rhythm — buzzing kitchens with low-value alerts — gets disabled and distrusted.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Triggered messages guests actually want, inventory alerts tied to par levels, scheduled reports to owners, and roster reminders that reduce no-show shifts — each with an owner who tunes rules monthly.',
        ],
        bullets: [
          'Post-visit feedback requests timed after payment, not before dessert.',
          'Supplier reorder prompts from usage, not calendar guesses.',
          'Daily flash report to owner phone without opening five apps.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Automate high-volume, low-risk comms first; keep complaints and VIP handling human.',
          'Integrate only systems you will maintain — zombie Zapier chains become secret infrastructure.',
        ],
      },
      {
        id: 'grants',
        title: 'Prove labour returned',
        paragraphs: [
          'Track manager hours spent on admin pre/post automation — that hours-saved figure funds the next integration.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'List top ten repetitive tasks',
        detail: 'Rank by weekly frequency and error cost — automate the top two only.',
      },
      {
        label: 'Assign an automation owner',
        detail: 'One person reviews triggers monthly; orphan automations rot.',
      },
      {
        label: 'Measure guest response',
        detail: 'Opt-out and complaint rates on SMS/email — stop campaigns that annoy regulars.',
      },
    ],
  },
];
