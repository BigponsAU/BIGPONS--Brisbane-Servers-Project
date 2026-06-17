export interface Industry {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export const industries: Industry[] = [
  {
    id: 'professional-services',
    name: 'Professional Services',
    slug: 'professional-services',
    description:
      'Law, accounting, consulting, and architecture firms run on trust and billable clarity — when client work is fragmented across inboxes and ad hoc files, margin and responsiveness suffer before anyone schedules a “digital project.” Guides here tie that reality to client systems, document discipline, and practice management sized to Australian firms.',
    icon: 'fas fa-briefcase',
    topics: [
      {
        id: 'client-management',
        name: 'Client Management Systems',
        slug: 'client-management-systems',
        description:
          'A single, defensible view of clients and matters reduces rework and protects relationships — essential when partners and staff cannot afford to hunt for context before every call or deadline.',
        icon: 'fas fa-users',
      },
      {
        id: 'document-automation',
        name: 'Document Automation',
        slug: 'document-automation',
        description:
          'Repeatable documents should not consume senior time — controlled templates and automation recover margin on high-volume work without replacing professional judgment.',
        icon: 'fas fa-file-alt',
      },
      {
        id: 'billing-time',
        name: 'Billing & Time Tracking',
        slug: 'billing-time-tracking',
        description:
          'Revenue leakage from uncaptured time and slow invoicing is measurable — systems that match how professionals actually work improve cash flow without adding admin theatre.',
        icon: 'fas fa-dollar-sign',
      },
      {
        id: 'practice-management',
        name: 'Practice Management',
        slug: 'practice-management',
        description:
          'Workflows, deadlines, and compliance sit on one integrated spine when practice management is scoped to how the firm operates — not imposed as a generic legal-tech catalogue.',
        icon: 'fas fa-building',
      },
    ],
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    slug: 'retail',
    description:
      'Retail margin depends on stock truth across channels — when POS, online, and warehouse disagree, promotions and fulfilment cost twice. Resources here connect that pressure to inventory, e-commerce, and customer systems you can phase before major spend.',
    icon: 'fas fa-store',
    topics: [
      {
        id: 'inventory-pos',
        name: 'Inventory & POS Systems',
        slug: 'inventory-pos',
        description:
          'Accurate stock and till data are prerequisites for confident trading — integration and reorder logic earn their place when oversell and emergency freight stop being normal.',
        icon: 'fas fa-boxes',
      },
      {
        id: 'e-commerce',
        name: 'E-commerce Integration',
        slug: 'e-commerce',
        description:
          'Growing online without a second shadow inventory requires catalogue, payment, and fulfilment scoped to how you already sell — sequenced so channel expansion does not break the store.',
        icon: 'fas fa-shopping-cart',
      },
      {
        id: 'customer-systems',
        name: 'Customer Systems',
        slug: 'customer-systems',
        description:
          'Loyalty and CRM only justify spend when they change behaviour you can measure — repeat visits, basket size, or acquisition cost — not when they are reporting vanity.',
        icon: 'fas fa-star',
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Medical Practices',
    slug: 'healthcare',
    description:
      'Clinical quality and Australian privacy obligations share the same foundation — reliable records, scheduling, and access control. Guides here link patient care workflow to systems and automation sized to general practice and specialist realities.',
    icon: 'fas fa-heartbeat',
    topics: [
      {
        id: 'patient-management',
        name: 'Patient Management Systems',
        slug: 'patient-management',
        description:
          'Clinical and administrative staff need one coherent patient record — double-entry and after-hours catch-up are signals that the current stack is costing capacity, not just inconvenience.',
        icon: 'fas fa-user-md',
      },
      {
        id: 'compliance',
        name: 'Compliance & Security',
        slug: 'compliance',
        description:
          'Privacy, retention, and access control belong in the architecture conversation from the first scope line — retrofitting compliance after build is the expensive path Australian practices cannot afford.',
        icon: 'fas fa-shield-alt',
      },
      {
        id: 'appointments',
        name: 'Appointment Management',
        slug: 'appointments',
        description:
          'No-shows and manual scheduling consume chair time — reminders, waitlists, and calendar discipline are often the fastest win before larger clinical system change.',
        icon: 'fas fa-calendar-check',
      },
    ],
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Tourism',
    slug: 'hospitality',
    description:
      'Service businesses live on covers, bookings, and labour peaks — disconnected reservations, POS, and kitchen communication show up as waste long before a platform upgrade is justified. Resources map that rhythm to integration and automation that fits the floor.',
    icon: 'fas fa-utensils',
    topics: [
      {
        id: 'booking',
        name: 'Booking & Reservation Systems',
        slug: 'booking',
        description:
          'Double-bookings and front-of-house firefighting erode guest experience — reliable booking flow is the basis for staffing and revenue decisions, not an add-on brochure feature.',
        icon: 'fas fa-calendar-alt',
      },
      {
        id: 'pos-integration',
        name: 'POS Integration',
        slug: 'pos-integration',
        description:
          'Menu, payments, and inventory that reconcile daily make margin visible per service period — essential when labour and supply costs move weekly.',
        icon: 'fas fa-cash-register',
      },
      {
        id: 'automation',
        name: 'Automation & Efficiency',
        slug: 'automation',
        description:
          'Communications, alerts, and reporting that run without constant supervision free managers for service quality — scoped so automation supports the floor instead of fighting it.',
        icon: 'fas fa-robot',
      },
    ],
  },
  {
    id: 'construction',
    name: 'Construction & Trades',
    slug: 'construction',
    description:
      'Jobs run on quotes, site coordination, and compliance evidence — when status lives in messages and spreadsheets, margin and safety both suffer. This hub frames technology as job control and visibility, with scope and costs agreed before major platform spend.',
    icon: 'fas fa-hard-hat',
    topics: [
      {
        id: 'job-costing',
        name: 'Job Costing & Variations',
        slug: 'job-costing-variations',
        description:
          'Quote-to-invoice control when variations and committed costs must stay visible — margin is decided before the final claim, not in a spreadsheet after the fact.',
        icon: 'fas fa-calculator',
      },
      {
        id: 'site-compliance',
        name: 'Site Compliance & Diaries',
        slug: 'site-compliance',
        description:
          'SWMS, inductions, and site evidence linked to the job — so principal contractors and auditors get answers in minutes, not archaeology.',
        icon: 'fas fa-clipboard-check',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    slug: 'finance',
    description:
      'Reporting cycles, audit trails, and client confidentiality set the bar — manual reconciliation and fragmented ledgers consume capacity that should go to advice and growth. Resources connect financial operations to automation and controls you can defend to clients and regulators.',
    icon: 'fas fa-chart-line',
    topics: [
      {
        id: 'client-reporting',
        name: 'Client Reporting Packs',
        slug: 'client-reporting',
        description:
          'Standardised management reporting without monthly rebuilds — partners review exceptions, not formulas.',
        icon: 'fas fa-file-invoice',
      },
      {
        id: 'workflow-compliance',
        name: 'Workflow & Compliance',
        slug: 'workflow-compliance',
        description:
          'BAS, tax, and audit jobs with visible sign-off — named owners and timestamps you can defend.',
        icon: 'fas fa-tasks',
      },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Production',
    slug: 'manufacturing',
    description:
      'Throughput, quality signals, and supply timing determine competitiveness — when production data lags the floor, planning guesses and rework follow. Guides tie shop-floor reality to tracking and integration with trade-offs visible up front.',
    icon: 'fas fa-industry',
    topics: [
      {
        id: 'shop-floor',
        name: 'Shop Floor Tracking',
        slug: 'shop-floor-tracking',
        description:
          'WIP and downtime visible before the customer calls — schedules grounded in what the floor actually did.',
        icon: 'fas fa-conveyor-belt-boxes',
      },
      {
        id: 'quality-trace',
        name: 'Quality & Traceability',
        slug: 'quality-traceability',
        description:
          'Batch genealogy for recalls and audits — answer which customers got which lot without paper travellers.',
        icon: 'fas fa-magnifying-glass-chart',
      },
    ],
  },
];

export function getIndustryBySlug(slug: string): Industry | undefined {
  return industries.find((industry) => industry.slug === slug);
}

export function getTopicBySlug(industrySlug: string, topicSlug: string): Topic | undefined {
  const industry = getIndustryBySlug(industrySlug);
  return industry?.topics.find((topic) => topic.slug === topicSlug);
}
