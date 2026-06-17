import type { TopicGuide } from './types';

export const constructionGuides: TopicGuide[] = [
  {
    industrySlug: 'construction',
    topicSlug: 'job-costing-variations',
    proposition:
      'Margin on fixed-price work is decided in variations and job costing — when committed costs live in spreadsheets and site photos, you find out too late whether the job paid.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Trades and builders lose money when variations are verbal, materials are bought off-job, and supervisors reconstruct progress for invoicing. Disputes start when the client’s memory of scope differs from yours.',
          'The inference: one job register with live committed costs vs. quote is the minimum control before mobile apps or fancy dashboards.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Every active job shows quote, variations approved in writing, committed costs, and % complete you trust — without exporting to Excel every Friday.',
        ],
        bullets: [
          'Variation register with client approval trail and revised contract value.',
          'Cost codes aligned with your accountant’s chart of accounts.',
          'Progress claims tied to measurable milestones, not gut feel.',
        ],
      },
      {
        id: 'sequencing',
        title: 'Sequencing that works',
        paragraphs: [
          'Model one messy job type on paper before selecting software — gaps define requirements better than vendor demos.',
          'Integrate accounting only after job codes are disciplined; otherwise you automate confusion.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Quote-to-invoice on paper',
        detail: 'Walk one recent job from quote through variations to final invoice — note every re-key and dispute point.',
      },
      {
        label: 'Agree cost categories',
        detail: 'Align job cost codes with your bookkeeper before shortlisting platforms.',
      },
    ],
  },
  {
    industrySlug: 'construction',
    topicSlug: 'site-compliance',
    proposition:
      'Safety and licensing evidence cannot live on personal phones — auditors and principal contractors expect job-linked SWMS, inductions, and photos when they ask, not a week later.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Site diaries, toolbox talks, and subcontractor insurances scatter across WhatsApp and email. When a principal contractor or regulator requests records, reconstruction burns senior time and risks gaps.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Compliance pack per job: SWMS, inductions, insurance certificates, and key site photos retrievable by job code in minutes.',
        ],
        bullets: [
          'Subcontractor compliance checked before mobilisation, not after.',
          'Daily diary entries with weather, crew, and incidents — even brief.',
          'Photo tags linked to job and location, not camera roll scroll.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs',
        paragraphs: [
          'Start with document control and checklists before rolling apps to every tradesperson — leadership needs one truth first.',
          'Free-form chat is not a system of record; route approvals through named workflows.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Audit last principal request',
        detail: 'List every document you had to find for the last compliance chase — that is your minimum feature set.',
      },
      {
        label: 'Standardise naming',
        detail: 'Job folder template: SWMS, insurances, variations, photos — same structure every job.',
      },
    ],
  },
];
