import type { IndustryOverviewGuide } from './types';

export const industryOverviewGuides: IndustryOverviewGuide[] = [
  {
    industrySlug: 'construction',
    proposition:
      'Construction margin is won or lost on job visibility — when quotes, variations, and site reality live in separate threads, technology spend must buy control, not another login nobody uses.',
    sections: [
      {
        id: 'pressure',
        title: 'Why technology matters on the job',
        paragraphs: [
          'Fixed-price and trade businesses bleed when variations are late, photos sit on personal phones, and supervisors reconstruct progress for invoicing. Compliance evidence for safety and licensing becomes archaeology when auditors call.',
          'The inference: systems that tie quote → job → costs → invoice reduce dispute and accelerate cash — generic office software rarely spans the site-to-accounts gap.',
        ],
      },
      {
        id: 'outcomes',
        title: 'Priority capabilities',
        paragraphs: ['Focus spend where leakage is provable:'],
        bullets: [
          'Job costing with live committed costs vs. quote.',
          'Variation capture with client approval trails.',
          'Site diaries, photos, and SWMS accessible by job.',
          'Subcontractor compliance pack on file before mobilisation.',
        ],
      },
      {
        id: 'sequencing',
        title: 'Sequencing that works',
        paragraphs: [
          'Start with job register and document control before mobile apps for every tradesperson — leadership needs one truth before the field multiplies inputs.',
          'Integrate accounting only after job codes and cost categories are disciplined — otherwise you automate mess.',
        ],
      },
      {
        id: 'grants',
        title: 'Australian programs',
        paragraphs: [
          'Manufacturing and business grants sometimes cover operational technology when tied to productivity metrics — document rework hours and variation dispute frequency for credible applications.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Pick one job type to model',
        detail: 'Run quote-to-invoice on paper for your messiest job type — gaps define requirements.',
      },
      {
        label: 'Standardise job codes',
        detail: 'Agree cost categories with your accountant before software selection.',
      },
      {
        label: 'Scope mobile after office truth',
        detail: 'Site apps follow stable job records — not the other way around.',
      },
    ],
  },
  {
    industrySlug: 'finance',
    proposition:
      'Accounting and advisory firms sell trust and timeliness — fragmented ledgers and manual client packs erode both; technology should shorten close cycles and deepen client transparency.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure',
        paragraphs: [
          'Staff chase source documents; partners re-key between systems; clients ask for “live” numbers you cannot produce without heroics. Automation without control increases professional risk if review trails are weak.',
        ],
      },
      {
        id: 'outcomes',
        title: 'Priority capabilities',
        paragraphs: ['Invest where partners and clients feel the pain:'],
        bullets: [
          'Automated bank feeds with exception-based review.',
          'Client portals for document upload and queries.',
          'Standardised management reporting packs.',
          'Workflow for BAS, tax, and audit with clear sign-off.',
        ],
      },
      {
        id: 'sequencing',
        title: 'Sequencing',
        paragraphs: [
          'Fix chart of accounts and client onboarding checklists before buying analytics dashboards.',
          'Pilot portals with five cooperative clients — learn support load before firm-wide launch.',
        ],
      },
      {
        id: 'grants',
        title: 'Client value story',
        paragraphs: [
          'Clients fund advisory when they see faster closes and proactive alerts — price technology as capacity for higher-value work, not headcount replacement without conversation.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Map the close checklist',
        detail: 'Time each step for three clients — automation targets the longest repetitive blocks.',
      },
      {
        label: 'Define portal boundaries',
        detail: 'What clients may upload vs. what staff must validate — scope reduces liability.',
      },
      {
        label: 'Integrate practice management and ledger',
        detail: 'Single client spine beats duplicate CRM and accounting contacts.',
      },
    ],
  },
  {
    industrySlug: 'manufacturing',
    proposition:
      'Manufacturers compete on throughput and defect cost — when floor data lags reality, planning optimises fiction; technology must connect shop floor to schedule and supply.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure',
        paragraphs: [
          'Spreadsheet schedules break when a machine goes down or a rush order arrives. Quality issues discovered at dispatch are expensive; traceability requests from customers expose weak batch records.',
        ],
      },
      {
        id: 'outcomes',
        title: 'Priority capabilities',
        paragraphs: ['Connect floor signal to planning and quality:'],
        bullets: [
          'Real-time or near-real-time production counts by work centre.',
          'Bill of materials and routings you trust.',
          'Inventory by location with scan discipline.',
          'Non-conformance and traceability for critical SKUs.',
        ],
      },
      {
        id: 'sequencing',
        title: 'Sequencing',
        paragraphs: [
          'Instrument one line or cell before plant-wide MES — prove signal quality and operator adherence.',
          'Align engineering change process with BOM updates — systems cannot fix undocumented shop changes.',
        ],
      },
      {
        id: 'grants',
        title: 'Australian manufacturing support',
        paragraphs: [
          'Modern manufacturing and regional grants often fund IoT, MES, and training when tied to output or waste reduction — baseline scrap and overtime hours before applying.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Measure OEE on one line',
        detail: 'Even manual sampling beats no baseline — shows where sensors pay off.',
      },
      {
        label: 'Validate BOM accuracy',
        detail: 'Engineering sign-off on routings before ERP go-live.',
      },
      {
        label: 'Pilot traceability on one SKU',
        detail: 'Prove lot tracking for your most regulated or valuable product first.',
      },
    ],
  },
];
