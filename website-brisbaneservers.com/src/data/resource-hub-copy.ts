import type { Industry, Topic } from './industries';
import { valueProposition } from './value-proposition';
import type { FeatureGlyphName } from '../lib/marketing/feature-glyphs';
import { formatHeadingCopy } from '../lib/copy-style';

export interface HubCard {
  title: string;
  description: string;
  icon: FeatureGlyphName;
}

/** Hero title for an industry hub — outcome-led, not catalogue-led. */
export function industryHeroTitle(industry: Industry): string {
  return formatHeadingCopy(`${industry.name}: decisions grounded in sector context`);
}

/** Section lead tying operating reality to technology necessity. */
export function industryContextLead(industry: Industry): string {
  const bySlug: Record<string, string> = { 
    'professional-services':
      'Firms live on trust, deadlines, and billable clarity — when client data is scattered or documents are rebuilt by hand each matter, margin erodes before anyone names a “technology problem.” These guides connect that operating reality to systems that earn their place in scope and budget.',
    retail:
      'Stock, channels, and customer expectations move faster than spreadsheet discipline — when inventory and POS do not agree, promotions and fulfilment cost you twice. Resources here tie retail constraints to technology choices you can sequence before major spend.',
    healthcare:
      'Patient care depends on reliable scheduling and defensible records — privacy obligations and clinical workflow are not optional overlays. Guidance here links compliance pressure and daily operations to implementations sized to Australian practice realities.',
    hospitality:
      'Covers, bookings, and labour peaks define margin — disconnected POS, reservations, and kitchen communication show up as waste long before a platform upgrade is justified. These resources map that pressure to automation and integration that actually fits service businesses.',
    construction:
      'Jobs run on quotes, site coordination, and compliance evidence — when project status lives in messages and spreadsheets, margin and safety both suffer. This hub frames technology as job control and visibility, not generic “digital transformation.”',
    finance:
      'Reporting cycles, audit trails, and client confidentiality set the bar — manual reconciliation and fragmented ledgers consume capacity that should go to advice and growth. Resources here connect financial operations to automation and controls you can defend to regulators and clients.',
    manufacturing:
      'Throughput, quality signals, and supply timing determine competitiveness — when production data lags the floor, planning guesses and rework follow. Guides here tie shop-floor reality to tracking and integration decisions with costs visible up front.',
  };
  return (
    bySlug[industry.slug] ??
    `${industry.name} operators face sector-specific regulations, incentives, and day-to-day constraints — generic vendor pitches miss that context. These resources infer what is worth doing from how you actually run the business, with scope and trade-offs visible before you commit.`
  );
}

/** Three-card opportunity positioning per industry. */
export function industryOpportunityCards(industry: Industry): HubCard[] {
  const bySlug: Record<string, HubCard[]> = {
    'professional-services': [
      {
        title: 'Client and matter visibility',
        description:
          'When every interaction is findable and matters have a single source of truth, partners spend less time reconstructing context — and clients experience fewer “can you resend that?” moments that erode confidence.',
        icon: 'clients',
      },
      {
        title: 'Document and workflow leverage',
        description:
          'Template discipline and controlled automation turn repeatable drafting into margin — not by replacing judgment, but by removing rework that never should have been manual.',
        icon: 'documents',
      },
      {
        title: 'Revenue capture without friction',
        description:
          'Time that is captured accurately and invoiced on rhythm improves cash flow without adding admin theatre — especially when billing ties to the same systems that hold client work.',
        icon: 'billing',
      },
    ],
    retail: [
      {
        title: 'Single view of stock and sales',
        description:
          'POS, e-commerce, and warehouse signals that agree reduce oversell, emergency freight, and blind promotions — the cost of inconsistency is measurable once channels multiply.',
        icon: 'inventory',
      },
      {
        title: 'Channel growth without chaos',
        description:
          'Online and in-store can share catalogue and fulfilment logic when integration is scoped in phases — so expansion does not mean a second shadow inventory.',
        icon: 'commerce',
      },
      {
        title: 'Retention that pays for itself',
        description:
          'Loyalty and CRM only matter when they change behaviour you can see — repeat visits, basket size, or reduced acquisition cost — not when they are vanity dashboards.',
        icon: 'loyalty',
      },
    ],
    healthcare: [
      {
        title: 'Clinical workflow that stays defensible',
        description:
          'Records and scheduling that match how clinicians actually work reduce double-entry and after-hours catch-up — the prerequisite for any patient-facing improvement.',
        icon: 'clinical',
      },
      {
        title: 'Privacy and access by design',
        description:
          'Australian privacy expectations are not a checklist after build — access controls, audit trails, and retention policy belong in the architecture conversation from the first scope line.',
        icon: 'privacy',
      },
      {
        title: 'Capacity without waiting-room chaos',
        description:
          'Reminders, waitlists, and calendar discipline recover chair time and reduce no-shows — often the fastest win before larger system change.',
        icon: 'appointments',
      },
    ],
    hospitality: [
      {
        title: 'Bookings that match service rhythm',
        description:
          'Tables, rooms, and events on one reliable flow reduce double-bookings and front-of-house firefighting — guests notice smoothness before they notice “technology.”',
        icon: 'booking',
      },
      {
        title: 'POS tied to what you sell',
        description:
          'Menu, inventory, and payments that reconcile daily make margin visible per service period — essential when labour and supply costs swing weekly.',
        icon: 'pos',
      },
      {
        title: 'Automation where staff time is thin',
        description:
          'Communications, alerts, and reporting that run without constant supervision free managers for service quality — scoped so automation does not fight the floor.',
        icon: 'robot',
      },
    ],
    construction: [
      {
        title: 'Job visibility from quote to handover',
        description:
          'When status, variations, and site photos live in one place, disputes shrink and supervisors stop living in message threads — that visibility is the basis for sensible platform spend.',
        icon: 'construction',
      },
      {
        title: 'Quoting and margin discipline',
        description:
          'Structured estimating and change control protect margin on fixed-price work — technology earns its place when it reduces surprise cost, not when it adds another login.',
        icon: 'quoting',
      },
      {
        title: 'Compliance evidence on demand',
        description:
          'Safety, licensing, and subcontractor documentation that is retrievable beats folder archaeology at audit time — especially across multiple active sites.',
        icon: 'privacy',
      },
    ],
    finance: [
      {
        title: 'Close cycles without heroics',
        description:
          'Reconciliation and reporting that run on rhythm reduce month-end crunch — freeing partners and controllers for client-facing and strategic work.',
        icon: 'finance',
      },
      {
        title: 'Client-ready transparency',
        description:
          'Portals and automated reporting that clients actually use strengthen retention — when the alternative is email attachments and version confusion.',
        icon: 'partnership',
      },
      {
        title: 'Controls that scale with the book',
        description:
          'Segregation of duties, audit logs, and integration to source systems matter more as transaction volume grows — not as compliance theatre.',
        icon: 'lock',
      },
    ],
    manufacturing: [
      {
        title: 'Floor truth in near real time',
        description:
          'Production counts and downtime reasons that match the floor make planning credible — without that signal, MRP and dashboards optimise fiction.',
        icon: 'manufacturing',
      },
      {
        title: 'Quality that contains cost',
        description:
          'Traceability and defect capture early in the process reduce scrap and recall risk — the business case is waste avoided, not software for its own sake.',
        icon: 'check-double',
      },
      {
        title: 'Supply chain you can commit to',
        description:
          'Inventory and supplier lead times that align with orders prevent expedite fees and customer disappointment — integration is sequenced, not big-bang.',
        icon: 'logistics',
      },
    ],
  };
  return bySlug[industry.slug] ?? defaultOpportunityCards(industry.name);
}

function defaultOpportunityCards(industryName: string): HubCard[] {
  return [
    {
      title: 'Operating reality first',
      description: `For ${industryName}, technology only matters when it removes friction you already pay for — duplicated work, blind spots, or compliance risk — with costs visible before commitment.`,
      icon: 'semantic-search',
    },
    {
      title: 'Grants and sequencing',
      description:
        'Australian incentives and phased delivery can change what is feasible — we map programs and order of work so funding supports scope, not scope chasing funding.',
      icon: 'grants',
    },
    {
      title: 'Evidence you can act on',
      description: valueProposition.fragments.evidenceLed,
      icon: 'book',
    },
  ];
}

/** Topic hero — positions the topic inside the industry narrative. */
export function topicHeroTitle(topic: Topic, industry: Industry): string {
  return formatHeadingCopy(`${topic.name} for ${industry.name}`);
}

export function topicHeroSubtitle(topic: Topic, industry: Industry): string {
  return topic.description;
}

/** Why this topic matters — inference from sector + topic pressure. */
export function topicNecessityLead(topic: Topic, industry: Industry): string {
  return `In ${industry.name}, ${topic.name.toLowerCase()} is not a catalogue item; it is a response to existing constraints such as rework, margin loss from inconsistency, and risk from systems that do not fit operational reality. ${valueProposition.fragments.agreedDelivery}`;
}

/** Three-card decision framework per topic (context → evidence → action). */
export function topicDecisionCards(topic: Topic, industry: Industry): HubCard[] {
  return [
    {
      title: 'Your context',
      description: `We start from how your ${industry.name} operation actually runs — team size, existing tools, compliance, and budget — so ${topic.name.toLowerCase()} recommendations are feasible, not aspirational.`,
      icon: 'location',
    },
    {
      title: 'Evidence and trade-offs',
      description:
        'Options are compared using documented outcomes, integration cost, and measurable impact, with grants and incentives included where they materially change feasibility.',
      icon: 'tradeoffs',
    },
    {
      title: 'Next actions',
      description:
        'Each guide ends with practical sequencing: what to address first, what to defer, and what to lock into scope before major spend.',
      icon: 'next',
    },
  ];
}

/** Opportunity band for topic pages — grants, scope, partnership. */
export function topicOpportunityCards(topic: Topic, industry: Industry): HubCard[] {
  return [
    {
      title: 'Where value shows up',
      description: `For ${topic.name.toLowerCase()}, value is time returned to billable or customer-facing work, fewer errors that cost rework, and decisions made from one source of truth — not dashboard vanity.`,
      icon: 'results',
    },
    {
      title: 'Grants and phased delivery',
      description:
        'Digital transformation and industry programmes can offset implementation when project structure matches eligibility; we surface this early so scope and funding remain aligned.',
      icon: 'grants',
    },
    {
      title: 'Engage with agreed scope',
      description: valueProposition.fragments.agreedDelivery,
      icon: 'conversation',
    },
  ];
}

export const resourceHubShared = {
  industryTopicsTitle: 'Topics that change decisions',
  industryTopicsLead:
    'Each topic gathers guides, playbooks, and published resources with context, evidence, and practical next steps in one place, consistent with how Brisbane Servers consults.',
  publishedTitle: 'Published guides',
  publishedLead:
    'Voice-validated resources with practical recommendations. Open a guide for full detail or discuss application within your operating context.',
  consultTitle: 'From reading to agreed scope',
  consultLead: valueProposition.fragments.presenceAndOps,
  emptyTopicsLead:
    'Topic guides for this sector are expanding. Share your context and we can map feasible priorities, incentives, and sequencing while the hub grows.',
} as const;
