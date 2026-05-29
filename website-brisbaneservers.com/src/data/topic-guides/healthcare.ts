import type { TopicGuide } from './types';

export const healthcareGuides: TopicGuide[] = [
  {
    industrySlug: 'healthcare',
    topicSlug: 'patient-management',
    proposition:
      'Clinical staff should not spend evenings reconciling notes across systems — patient management earns investment when the record matches the consult and follows the patient across the team.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Double entry between booking, clinical, and billing systems burns capacity that should be clinical. Gaps in history create safety risk and duplicate tests; patients feel it as repeated questions every visit.',
          'Australian practices also face My Health Record expectations, referral loops, and insurer reporting — fragmented records make each harder than it needs to be.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'One coherent patient record: demographics, clinical notes, documents, medications, and appointments accessible to authorised roles with audit trails.',
        ],
        bullets: [
          'Consult documentation completed in-session or immediately after — not batch-caught up nightly.',
          'Referrals and results attached to the patient, not lost in inbox attachments.',
          'Billing codes and clinical notes aligned to reduce claim rejections.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Specialty templates and workflow vary — configure for your actual consult types, not vendor defaults designed for another country.',
          'Migration from legacy PMS requires validation of historical records clinicians still reference — plan read-only archive access if full migration is risky.',
        ],
      },
      {
        id: 'grants',
        title: 'Practice context',
        paragraphs: [
          'Rural and digital health grants sometimes support telehealth and record modernisation when outcomes include access and reduced admin — document minutes saved per clinician per day.',
          'Choose vendors with Australian hosting and support hours that match when your practice actually runs.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Shadow three consult workflows',
        detail: 'Record every system touch from arrival to billing — integration scope should remove duplicate touches, not add screens.',
      },
      {
        label: 'Validate medico-legal requirements',
        detail: 'Confirm note structure, retention, and access rules with your indemnity insurer before cutover.',
      },
      {
        label: 'Pilot with willing clinicians',
        detail: 'Win one high-volume clinician first; their workflow proof convinces the room better than vendor slides.',
      },
    ],
  },
  {
    industrySlug: 'healthcare',
    topicSlug: 'compliance',
    proposition:
      'Privacy and security failures in healthcare are existential — compliance is cheaper when designed into systems than when paid for as an emergency retrofit after an incident.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'The Privacy Act and APPs apply to patient information regardless of practice size. Staff sharing records informally, weak access controls, or unclear retention destroy trust and attract regulatory attention.',
          'Ransomware targeting healthcare is common because records are valuable and downtime hurts patients — “we are too small” is not a control strategy.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Role-based access, encryption in transit and at rest, logging of who viewed what, backup you have tested restoring, and policies staff can follow without a law degree.',
        ],
        bullets: [
          'Unique credentials per user; no shared clinic logins.',
          'Offboarding removes access same day.',
          'Incident response steps documented and rehearsed lightly once per year.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Quick wins: MFA on email and PMS, patched workstations, and backup restore test. Larger projects: network segmentation and vendor risk reviews.',
          'Over-collection of patient data creates liability — collect what you use, delete what you do not need on schedule.',
        ],
      },
      {
        id: 'grants',
        title: 'Australian obligations',
        paragraphs: [
          'Notifiable Data Breaches scheme means you must assess and report eligible breaches — know your process before you need it at 9pm on a Friday.',
          'If using overseas subprocessors, document cross-border disclosure analysis — cloud convenience does not remove accountability.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Run an access review',
        detail: 'List who can export bulk patient data; remove unnecessary admin rights.',
      },
      {
        label: 'Test a restore',
        detail: 'Actually recover a file from backup this quarter — untested backup is hope, not control.',
      },
      {
        label: 'Document breach steps',
        detail: 'One-page playbook: contain, assess NDB eligibility, notify — with named roles.',
      },
    ],
  },
  {
    industrySlug: 'healthcare',
    topicSlug: 'appointments',
    proposition:
      'Empty chairs and long phone queues are the same problem — appointment systems pay off when patients self-serve reliably and the schedule reflects real chair time.',
    sections: [
      {
        id: 'pressure',
        title: 'Operating pressure this addresses',
        paragraphs: [
          'Reception bears the load when booking is phone-only: hold music, double bookings, and reminder calls staff could spend on in-room care. No-shows without automated follow-up are revenue and access lost twice.',
          'Online booking that ignores procedure length or practitioner preference creates chaos downstream — patients blame the practice, not the software.',
        ],
      },
      {
        id: 'outcomes',
        title: 'What good looks like',
        paragraphs: [
          'Templates per appointment type, waitlist backfill, SMS/email reminders with easy confirm/cancel, and two-way sync so online and phone bookings cannot collide.',
        ],
        bullets: [
          'Reduced no-show rate with measured before/after.',
          'Shorter phone time for routine reschedules.',
          'Utilisation visible by practitioner and session type.',
        ],
      },
      {
        id: 'tradeoffs',
        title: 'Trade-offs and sequencing',
        paragraphs: [
          'Start with reminders and waitlist on existing PMS if full online booking is contentious — often 80% of benefit for 20% of change.',
          'Expose only appointment types you can honour; hiding complex consults behind “call us” is valid triage.',
        ],
      },
      {
        id: 'grants',
        title: 'Patient access angle',
        paragraphs: [
          'After-hours booking and telehealth slots improve access narratives for grant or accreditation storytelling — measure reduced phone abandonment and filled cancelled slots.',
        ],
      },
    ],
    nextActions: [
      {
        label: 'Measure no-shows and phone volume',
        detail: 'Baseline for four weeks — proves ROI of reminders and online booking.',
      },
      {
        label: 'Configure duration rules',
        detail: 'Map appointment types to real chair time including turnover — schedule truth prevents daily firefighting.',
      },
      {
        label: 'Enable self-serve cancel/reschedule',
        detail: 'Patients fix their own timing; reception handles exceptions, not every change.',
      },
    ],
  },
];
