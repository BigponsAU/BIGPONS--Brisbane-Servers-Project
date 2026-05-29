import type { TopicGuide } from './types';

export const professionalServicesGuides: TopicGuide[] = [
  {
    industrySlug: 'professional-services',
    topicSlug: 'client-management-systems',
    proposition:
      'When client and matter context lives in inboxes and ad hoc folders, partners reconstruct history before every decision — client management earns its cost by making that reconstruction unnecessary.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Professional firms sell trust and responsiveness. Fragmented contact lists, duplicate records, and matter files scattered across email threads create rework: staff re-read history, partners intervene on routine lookups, and clients wait while someone “finds the file.”',
          'That friction is often accepted as normal until a key person leaves and institutional memory walks out the door — then the cost becomes obvious in write-offs, missed deadlines, and client complaints.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'A defensible client and matter spine means one authoritative record per client relationship, clear matter status, communication history attached to the work — not buried in personal inboxes — and permissions that match who may see what.',
        ],
        bullets: [
          'New staff can orient on a matter in minutes, not days of shadowing.',
          'Handoffs between team members do not reset context.',
          'Reporting on pipeline, workload, and aging work is trustworthy without manual exports.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Full practice-suite replacement is rarely the right first move. Many firms benefit from consolidating client and matter records, standardising intake, and integrating document locations before selecting a new “everything” platform.',
          'Integration cost often exceeds licence cost — budget for data cleanup, migration validation, and a parallel run where partners can still work if the new system hiccups during cutover.',
        ],
        bullets: [
          'Phase 1: Single client index, matter taxonomy, and communication logging.',
          'Phase 2: Document links, workflow templates, and billing hooks.',
          'Phase 3: Advanced analytics, client portals, and automation where volume justifies it.',
        ],
      },
      {
        id: 'grants',
        title: 'Australian context and incentives',
        paragraphs: [
          'Digital transformation and business advisory grants can offset structured CRM or practice-management projects when the business case ties to measurable outcomes — reduced admin hours, faster matter opening, improved collection — not “we bought software.”',
          'Document the baseline: hours spent weekly on client lookup, error rates on matter setup, and average days to invoice. Those numbers anchor grant applications and post-implementation review.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Map where client truth lives today',
        detail: 'List systems (email, spreadsheets, legacy CRM, document stores) and who owns updates. Gaps become your Phase 1 scope.',
      },
      {
        label: 'Define matter taxonomy',
        detail: 'Agree matter types, stages, and mandatory fields before tool selection — tools should fit your practice, not redefine it by default.',
      },
      {
        label: 'Scope integration before licences',
        detail: 'Price data migration, document linking, and billing integration separately so total cost is visible before commitment.',
      },
    ],
  },
  {
    industrySlug: 'professional-services',
    topicSlug: 'document-automation',
    proposition:
      'Senior time spent rebuilding near-identical documents is margin you already earned and then gave back — automation returns that time when templates and controls match how the firm actually drafts.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Letters, agreements, and court forms repeat with small variations. When each version is rebuilt manually, error rates rise, version control fails, and partners review low-value formatting instead of substance.',
          'The inference is direct: if a document type exceeds a modest monthly volume, manual production costs more than controlled automation — even before counting partner review time.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Automation here means governed templates, clause libraries, merge fields tied to matter data, and approval paths — not unconstrained mail-merge that creates liability.',
        ],
        bullets: [
          'First drafts generated in minutes with mandatory fields enforced.',
          'Version history and audit trail for who changed what.',
          'Partners review substance on a known template baseline, not one-off layouts.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Start with the highest-volume, lowest-risk document types — engagement letters, standard correspondence, routine filings — before automating complex agreements that need bespoke negotiation.',
          'Template maintenance is ongoing work: someone must own clause updates when law or firm policy changes. Budget that ownership or automation rots.',
        ],
      },
      {
        id: 'grants',
        title: 'Value and risk balance',
        paragraphs: [
          'Measure time per document type before and after pilot. Firms that quantify hours recovered per week build a credible ROI story for partners and for any grant or investment committee.',
          'Keep human sign-off on client-facing outputs until error rates on generated drafts are demonstrably low — speed without control is exposure.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Rank document types by volume and risk',
        detail: 'Automate high-volume, standardised work first; leave bespoke negotiation manual until templates prove stable.',
      },
      {
        label: 'Assign template ownership',
        detail: 'Name a partner or senior associate accountable for clause libraries and periodic review — not “IT owns Word.”',
      },
      {
        label: 'Pilot one matter type end-to-end',
        detail: 'Run intake data → generated draft → review → final PDF for a single workflow before firm-wide rollout.',
      },
    ],
  },
  {
    industrySlug: 'professional-services',
    topicSlug: 'billing-time-tracking',
    proposition:
      'Uncaptured time and slow invoicing are silent revenue leaks — billing systems earn their place when capture matches how professionals work and cash collection accelerates without adding admin theatre.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Partners and staff postpone time entry; matters close with write-offs that were preventable; clients receive invoices long after work felt “finished.” Each pattern points to the same root cause: capture is harder than doing the work.',
          'When WIP is unreliable, forecasting and partner compensation discussions run on opinion — that is an operating risk, not just a finance inconvenience.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Time is captured close to the work — mobile, calendar-linked, or matter-integrated — with clear narratives clients will accept. Invoicing runs on rhythm; exceptions are visible early.',
        ],
        bullets: [
          'WIP aging visible by matter and responsible lawyer.',
          'Standard narratives and billing rules reduce partner rework on invoices.',
          'Trust accounting and compliance requirements met without parallel spreadsheets.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Changing billing software without fixing capture habits fails. Train for “same day or next morning” entry before debating feature lists.',
          'For fixed-fee matters, time may still be tracked internally for profitability even if clients never see hourly lines — agree that policy up front.',
        ],
      },
      {
        id: 'grants',
        title: 'Australian practice considerations',
        paragraphs: [
          'Trust accounting rules and GST treatment must be validated with your accountant before migration. A billing cutover during tax season or trust audit windows is an own goal.',
          'Payment portals and automated reminders can shorten debtor days — model current average days-to-pay and set a target improvement for the business case.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Audit WIP leakage',
        detail: 'Sample closed matters: compare narrative time entered vs. work performed. Patterns show whether the problem is capture, policy, or tooling.',
      },
      {
        label: 'Set capture norms before tool change',
        detail: 'Agree daily entry standard and partner enforcement — software follows behaviour, not the reverse.',
      },
      {
        label: 'Model cash impact',
        detail: 'Estimate revenue recovered from 5–10% better capture and 10–15 days faster collection — that funds the project.',
      },
    ],
  },
  {
    industrySlug: 'professional-services',
    topicSlug: 'practice-management',
    proposition:
      'Practice management is the spine that connects clients, documents, time, and deadlines — worth investing when fragmentation is costing you matters, margin, or regulatory confidence.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Firms outgrow bolt-on tools: CRM here, documents there, billing elsewhere, deadlines in Outlook. Staff become the integration layer — copying data, chasing status, and missing conflicts because systems do not talk.',
          'At scale, that fragmentation shows up as missed limitation dates, duplicate client records, and inability to answer “what is our capacity next month?” without a manual war room.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Integrated practice management ties matter lifecycle, responsibilities, documents, time, and billing on one spine — with reporting partners trust for resourcing and profitability.',
        ],
        bullets: [
          'Conflict checks and intake are systematic, not heroic memory.',
          'Workflow templates enforce who does what by matter stage.',
          'Leadership sees pipeline, utilisation, and risk concentrations without exporting five reports.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Suite selection is a multi-year decision — pilot with one practice group or matter type before firm-wide mandate.',
          'Change management is the dominant cost: partners must agree data standards and stop supporting shadow spreadsheets.',
        ],
      },
      {
        id: 'grants',
        title: 'Implementation reality',
        paragraphs: [
          'Run parallel operations for at least one billing cycle where feasible. Cutover weekends alone rarely suffice for firms with trust accounting complexity.',
          'Vendor demos show happy paths — insist on scenarios from your messiest matter types and trust reporting requirements.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Document integration pain points',
        detail: 'List duplicate entry locations and failure modes (missed dates, billing errors) — these become acceptance criteria for any platform.',
      },
      {
        label: 'Pilot with one group',
        detail: 'Choose a cooperative team with representative matter complexity; measure admin hours and error rates before scaling.',
      },
      {
        label: 'Negotiate rollout, not just licence',
        detail: 'Include migration validation, training hours, and post-go-live support in scope — not as optional change orders.',
      },
    ],
  },
];
