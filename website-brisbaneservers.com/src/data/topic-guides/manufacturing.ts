import type { TopicGuide } from './types';

export const manufacturingGuides: TopicGuide[] = [
  {
    industrySlug: 'manufacturing',
    topicSlug: 'shop-floor-tracking',
    proposition:
      'Planning guesses when production reality lags the office — shop-floor tracking exists so schedule, WIP, and downtime are visible before rework and missed dispatch dates.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Spreadsheet schedules diverge from the floor by midday. Supervisors know which orders are stuck; the office finds out when a customer calls. Labour and machine time are too expensive to reconcile blindly at month-end.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Orders show status (queued, in progress, hold, complete) with reason codes for downtime — trusted enough for daily production meetings.',
        ],
        bullets: [
          'Routings or work centres reflect how product actually moves, not idealised flow.',
          'Scrap and rework logged against order or batch.',
          'Hand-off to dispatch without re-keying quantities.',
        ],
      },
      {
        id: 'sequencing',
        title: 'Sequencing that works',
        paragraphs: [
          'Digitise one product family or line before the whole plant — prove signal quality where volume is highest.',
          'Fix unit of measure and BOM accuracy before MES dashboards — bad BOMs make any system lie confidently.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Walk one hot order',
        detail: 'Follow today’s urgent order across stations — note every undocumented wait and rework.',
      },
      {
        label: 'Define reason codes',
        detail: 'Agree five downtime/scrap codes operators will actually use — start small.',
      },
    ],
  },
  {
    industrySlug: 'manufacturing',
    topicSlug: 'quality-traceability',
    proposition:
      'Recalls and customer audits demand batch traceability — if lot numbers live on paper travellers, you cannot answer “which customers got this material?” fast enough.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Quality issues without traceability force broad holds or risky ship decisions. Regulated or food-adjacent customers increasingly expect genealogy from raw material to dispatch.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Forward and backward trace for lots/batches in minutes: supplier lot → WIP → finished goods → customer shipment.',
        ],
        bullets: [
          'Receiving tied to supplier certificates where required.',
          'Non-conformance workflow with disposition (scrap, rework, concession).',
          'Calibration and maintenance records for critical equipment.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs',
        paragraphs: [
          'Full genealogy on every SKU may be overkill — scope traceability to regulated lines or top revenue products first.',
          'Operator burden kills adoption — barcode or station UI must be faster than paper for the common case.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Simulate a recall',
        detail: 'Pick a recent batch and time how long it takes to list affected customers — that is your baseline.',
      },
      {
        label: 'Scope critical SKUs',
        detail: 'Mark products that require full trace vs. aggregate tracking — implement depth where risk justifies it.',
      },
    ],
  },
];
