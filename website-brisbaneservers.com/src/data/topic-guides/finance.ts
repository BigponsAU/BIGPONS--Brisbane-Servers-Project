import type { TopicGuide } from './types';

export const financeGuides: TopicGuide[] = [
  {
    industrySlug: 'finance',
    topicSlug: 'client-reporting',
    proposition:
      'Advisory firms sell clarity — when management packs are rebuilt manually each month, partners trade judgment for spreadsheet heroics and clients wait longer for answers.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Staff chase source documents; partners re-key between systems; clients ask for “live” numbers you cannot produce without weekend work. Weak review trails increase professional risk when automation outpaces control.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Standardised reporting packs generated from reconciled ledgers, with exceptions flagged for partner review — not rebuilt from scratch.',
        ],
        bullets: [
          'Chart of accounts and tracking categories stable across clients where possible.',
          'Client portals for document upload and query — fewer email threads.',
          'Versioned packs with sign-off before send.',
        ],
      },
      {
        id: 'sequencing',
        title: 'Sequencing that works',
        paragraphs: [
          'Automate bank feeds and exception review before client-facing dashboards — pretty charts on dirty data destroy trust.',
          'Pick one client segment (e.g. SME trading) and perfect the pack before templating firm-wide.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Time one close cycle',
        detail: 'Measure hours per client for last month-end — largest buckets define automation priority.',
      },
      {
        label: 'Template one pack',
        detail: 'Freeze a partner-approved SME pack as the reference; diff all others against it.',
      },
    ],
  },
  {
    industrySlug: 'finance',
    topicSlug: 'workflow-compliance',
    proposition:
      'BAS, tax, and audit workflows need visible sign-off — opaque inboxes and shared logins fail when the ATO or reviewer asks who approved what and when.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Deadline season compresses judgment into hours. Without workflow states, work queues hide overload until something lodges late or without review.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Each job moves through defined states (prepare → review → lodge) with named owners and timestamps — recoverable in an audit.',
        ],
        bullets: [
          'Segregation between preparer and reviewer on material items.',
          'Checklists for BAS/tax tied to job type, not memory.',
          'Secure client credentials — no shared passwords in spreadsheets.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs',
        paragraphs: [
          'Workflow software fails if partners bypass it — leadership must lodge from the system, not email PDFs.',
          'Start with high-risk job types (complex GST, trust distributions) before every micro-engagement.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Map one lodgement',
        detail: 'Trace last BAS from client docs to lodge — every handoff is a workflow step candidate.',
      },
      {
        label: 'Define review gates',
        detail: 'List what must be partner-reviewed vs. manager-reviewed — encode in checklists.',
      },
    ],
  },
];
