import type { InfographicSpec } from '../infographic-types';

const VB = '0 0 800 300';

export const infographicSpecs: Record<string, InfographicSpec> = {
  'professional-services/client-management-systems': {
    id: 'ps-client-mgmt',
    viewBox: VB,
    title: 'Client truth at the centre',
    caption: 'Matters, documents, communications, and billing attach to one client spine — fragmentation is what you are replacing.',
    description:
      'Diagram showing a central client record connected to matters, documents, communications, and billing, representing a single source of truth for professional services firms.',
    badges: [{ x: 400, y: 268, text: 'Single source of truth' }],
    nodes: [
      { id: 'hub', x: 400, y: 150, label: 'Client &\nmatter', sublabel: 'authoritative', kind: 'hub' },
      { id: 'matters', x: 160, y: 80, label: 'Matters', kind: 'node' },
      { id: 'docs', x: 640, y: 80, label: 'Documents', kind: 'node' },
      { id: 'comms', x: 140, y: 210, label: 'Comms log', kind: 'node' },
      { id: 'bill', x: 660, y: 210, label: 'Billing', kind: 'node' },
      { id: 'out', x: 400, y: 52, label: 'Partner clarity', kind: 'outcome' },
    ],
    edges: [
      { from: 'hub', to: 'matters' },
      { from: 'hub', to: 'docs' },
      { from: 'hub', to: 'comms' },
      { from: 'hub', to: 'bill' },
      { from: 'matters', to: 'out' },
      { from: 'docs', to: 'out' },
    ],
  },

  'professional-services/document-automation': {
    id: 'ps-doc-auto',
    viewBox: VB,
    title: 'Controlled document pipeline',
    caption: 'Templates and data merge into drafts; partners review substance on a known baseline — not one-off layouts.',
    description:
      'Flow diagram from template and matter data through draft generation, partner review, to final client-ready document.',
    nodes: [
      { id: 'tpl', x: 100, y: 150, label: 'Template', sublabel: 'governed', kind: 'node' },
      { id: 'data', x: 230, y: 150, label: 'Matter data', kind: 'node' },
      { id: 'draft', x: 370, y: 150, label: 'Draft', kind: 'phase' },
      { id: 'review', x: 530, y: 150, label: 'Review', kind: 'node' },
      { id: 'final', x: 700, y: 150, label: 'Final PDF', kind: 'outcome' },
      { id: 'risk', x: 370, y: 248, label: 'No free merge', kind: 'risk' },
    ],
    edges: [
      { from: 'tpl', to: 'draft', label: 'merge' },
      { from: 'data', to: 'draft' },
      { from: 'draft', to: 'review' },
      { from: 'review', to: 'final' },
      { from: 'draft', to: 'risk', dashed: true },
    ],
  },

  'professional-services/billing-time-tracking': {
    id: 'ps-billing',
    viewBox: VB,
    title: 'Time to cash rhythm',
    caption: 'Capture close to the work; invoicing on cadence — WIP you trust is the basis for forecasting and partner decisions.',
    description:
      'Timeline showing work performed, time capture, WIP, invoice, and cash collection with leakage points marked.',
    nodes: [
      { id: 'work', x: 90, y: 120, label: 'Work done', kind: 'node' },
      { id: 'capture', x: 240, y: 120, label: 'Capture', kind: 'phase' },
      { id: 'wip', x: 400, y: 120, label: 'WIP', kind: 'hub' },
      { id: 'inv', x: 560, y: 120, label: 'Invoice', kind: 'node' },
      { id: 'cash', x: 710, y: 120, label: 'Cash in', kind: 'outcome' },
      { id: 'leak', x: 240, y: 230, label: 'Leakage', kind: 'risk' },
    ],
    edges: [
      { from: 'work', to: 'capture' },
      { from: 'capture', to: 'wip' },
      { from: 'wip', to: 'inv' },
      { from: 'inv', to: 'cash' },
      { from: 'capture', to: 'leak', dashed: true, label: 'if delayed' },
    ],
  },

  'professional-services/practice-management': {
    id: 'ps-practice',
    viewBox: VB,
    title: 'Integrated practice spine',
    caption: 'Layers stack from intake through delivery to reporting — shadow spreadsheets exit when the spine is trusted.',
    description:
      'Layered diagram of intake, workflow, documents, time and billing, and leadership reporting as one practice management spine.',
    nodes: [
      { id: 'l1', x: 400, y: 52, label: 'Reporting', kind: 'outcome' },
      { id: 'l2', x: 400, y: 98, label: 'Time & billing', kind: 'node' },
      { id: 'l3', x: 400, y: 144, label: 'Documents', kind: 'node' },
      { id: 'l4', x: 400, y: 190, label: 'Workflow', kind: 'node' },
      { id: 'hub', x: 400, y: 248, label: 'Intake &\nconflicts', kind: 'hub' },
      { id: 'shadow', x: 680, y: 144, label: 'Shadow\nsheets', kind: 'risk' },
    ],
    edges: [
      { from: 'hub', to: 'l4' },
      { from: 'l4', to: 'l3' },
      { from: 'l3', to: 'l2' },
      { from: 'l2', to: 'l1' },
      { from: 'shadow', to: 'l3', dashed: true, label: 'replace' },
    ],
  },

  'retail/inventory-pos': {
    id: 'retail-inv-pos',
    viewBox: VB,
    title: 'Stock truth across touchpoints',
    caption: 'POS, floor, and back-of-house must agree — oversell and phantom SKU are symptoms of broken sync.',
    description:
      'Diagram linking POS terminal, shop floor stock, and warehouse with reconciliation to a single stock position.',
    badges: [{ x: 400, y: 268, text: 'One stock position' }],
    nodes: [
      { id: 'pos', x: 140, y: 150, label: 'POS', kind: 'node' },
      { id: 'floor', x: 400, y: 150, label: 'On-hand', kind: 'hub' },
      { id: 'wh', x: 660, y: 150, label: 'Receiving', kind: 'node' },
      { id: 'bank', x: 400, y: 56, label: 'Deposit match', kind: 'outcome' },
      { id: 'bad', x: 660, y: 248, label: 'Oversell', kind: 'risk' },
    ],
    edges: [
      { from: 'pos', to: 'floor', label: 'sales' },
      { from: 'wh', to: 'floor', label: 'receipts' },
      { from: 'floor', to: 'bank' },
      { from: 'pos', to: 'bad', dashed: true, label: 'if split' },
    ],
  },

  'retail/e-commerce': {
    id: 'retail-ecom',
    viewBox: VB,
    title: 'Channels share one catalogue',
    caption: 'Web and store draw from the same pool — channel expansion without a second shadow inventory.',
    description:
      'Diagram showing online store and physical store connected to unified catalogue, inventory pool, and fulfilment.',
    nodes: [
      { id: 'web', x: 160, y: 100, label: 'Online', kind: 'node' },
      { id: 'store', x: 160, y: 200, label: 'In-store', kind: 'node' },
      { id: 'cat', x: 400, y: 150, label: 'Catalogue', kind: 'hub' },
      { id: 'stock', x: 580, y: 150, label: 'Stock pool', kind: 'node' },
      { id: 'fulfil', x: 720, y: 150, label: 'Fulfil', kind: 'outcome' },
      { id: 'shadow', x: 580, y: 248, label: 'Shadow SKU', kind: 'risk' },
    ],
    edges: [
      { from: 'web', to: 'cat' },
      { from: 'store', to: 'cat' },
      { from: 'cat', to: 'stock' },
      { from: 'stock', to: 'fulfil' },
      { from: 'stock', to: 'shadow', dashed: true },
    ],
  },

  'retail/customer-systems': {
    id: 'retail-crm',
    viewBox: VB,
    title: 'Loyalty loop with proof',
    caption: 'Identify → segment → offer → measure — vanity lists skip the measure step and waste margin.',
    description:
      'Circular diagram of customer identification, segmentation, targeted offer, and measured repeat behaviour.',
    nodes: [
      { id: 'id', x: 400, y: 60, label: 'Identify', kind: 'phase' },
      { id: 'seg', x: 620, y: 150, label: 'Segment', kind: 'node' },
      { id: 'offer', x: 400, y: 240, label: 'Offer', kind: 'node' },
      { id: 'measure', x: 180, y: 150, label: 'Measure', kind: 'outcome' },
      { id: 'hub', x: 400, y: 150, label: 'Known\ncustomer', kind: 'hub' },
    ],
    edges: [
      { from: 'id', to: 'hub' },
      { from: 'hub', to: 'seg' },
      { from: 'seg', to: 'offer' },
      { from: 'offer', to: 'measure' },
      { from: 'measure', to: 'id', label: 'iterate' },
    ],
  },

  'healthcare/patient-management': {
    id: 'hc-patient',
    viewBox: VB,
    title: 'One record per patient',
    caption: 'Clinical notes, results, and admin tasks attach to the same patient spine — double-entry is capacity lost twice.',
    description:
      'Hub diagram with patient record at centre linked to clinical notes, results, scheduling, and billing.',
    nodes: [
      { id: 'hub', x: 400, y: 150, label: 'Patient\nrecord', kind: 'hub' },
      { id: 'notes', x: 180, y: 90, label: 'Clinical', kind: 'node' },
      { id: 'results', x: 620, y: 90, label: 'Results', kind: 'node' },
      { id: 'appt', x: 180, y: 210, label: 'Schedule', kind: 'node' },
      { id: 'bill', x: 620, y: 210, label: 'Billing', kind: 'node' },
      { id: 'out', x: 400, y: 52, label: 'Safer handoff', kind: 'outcome' },
    ],
    edges: [
      { from: 'hub', to: 'notes' },
      { from: 'hub', to: 'results' },
      { from: 'hub', to: 'appt' },
      { from: 'hub', to: 'bill' },
      { from: 'notes', to: 'out' },
    ],
  },

  'healthcare/compliance': {
    id: 'hc-compliance',
    viewBox: VB,
    title: 'Privacy by layer',
    caption: 'Access, audit, retention, and breach response stack — retrofitting after build is the expensive path.',
    description:
      'Layered shield diagram showing access control, audit logging, retention policy, and incident response for healthcare privacy.',
    nodes: [
      { id: 'outer', x: 400, y: 52, label: 'Breach\nresponse', kind: 'outcome' },
      { id: 'ret', x: 400, y: 98, label: 'Retention', kind: 'phase' },
      { id: 'audit', x: 400, y: 144, label: 'Audit log', kind: 'phase' },
      { id: 'access', x: 400, y: 190, label: 'Role access', kind: 'node' },
      { id: 'hub', x: 400, y: 248, label: 'Patient data', kind: 'hub' },
      { id: 'risk', x: 640, y: 144, label: 'Shared login', kind: 'risk' },
    ],
    edges: [
      { from: 'hub', to: 'access' },
      { from: 'access', to: 'audit' },
      { from: 'audit', to: 'ret' },
      { from: 'ret', to: 'outer' },
      { from: 'risk', to: 'access', dashed: true, label: 'remove' },
    ],
  },

  'healthcare/appointments': {
    id: 'hc-appt',
    viewBox: VB,
    title: 'Chair time protected',
    caption: 'Reminders and waitlists recover no-shows; online booking only works when duration rules match clinical reality.',
    description:
      'Timeline of appointment slots with reminders, waitlist backfill, and reduced no-show outcome.',
    nodes: [
      { id: 'book', x: 120, y: 150, label: 'Booking', kind: 'node' },
      { id: 'rules', x: 280, y: 150, label: 'Duration', kind: 'phase' },
      { id: 'remind', x: 440, y: 150, label: 'Remind', kind: 'node' },
      { id: 'chair', x: 600, y: 150, label: 'Chair filled', kind: 'outcome' },
      { id: 'noshow', x: 440, y: 248, label: 'No-show', kind: 'risk' },
      { id: 'wait', x: 280, y: 248, label: 'Waitlist', kind: 'node' },
    ],
    edges: [
      { from: 'book', to: 'rules' },
      { from: 'rules', to: 'remind' },
      { from: 'remind', to: 'chair' },
      { from: 'noshow', to: 'wait', dashed: true },
      { from: 'wait', to: 'chair', label: 'backfill' },
    ],
  },

  'hospitality/booking': {
    id: 'hosp-booking',
    viewBox: VB,
    title: 'Covers as inventory',
    caption: 'Tables, rooms, and events share availability logic — double-booking erodes trust before service starts.',
    description:
      'Diagram of booking channels converging on availability engine feeding floor plan and kitchen readiness.',
    nodes: [
      { id: 'phone', x: 120, y: 100, label: 'Phone', kind: 'node' },
      { id: 'web', x: 120, y: 200, label: 'Online', kind: 'node' },
      { id: 'hub', x: 360, y: 150, label: 'Availability', kind: 'hub' },
      { id: 'floor', x: 560, y: 150, label: 'Floor plan', kind: 'node' },
      { id: 'svc', x: 720, y: 150, label: 'Service', kind: 'outcome' },
      { id: 'dbl', x: 360, y: 248, label: 'Double book', kind: 'risk' },
    ],
    edges: [
      { from: 'phone', to: 'hub' },
      { from: 'web', to: 'hub' },
      { from: 'hub', to: 'floor' },
      { from: 'floor', to: 'svc' },
      { from: 'hub', to: 'dbl', dashed: true },
    ],
  },

  'hospitality/pos-integration': {
    id: 'hosp-pos',
    viewBox: VB,
    title: 'Service period margin',
    caption: 'Menu, payments, and inventory reconcile per service — labour and COGS move weekly; daily truth matters.',
    description:
      'Flow from menu and orders through POS to payment settlement and margin reporting per service period.',
    nodes: [
      { id: 'menu', x: 100, y: 150, label: 'Menu PLU', kind: 'node' },
      { id: 'orders', x: 260, y: 150, label: 'Orders', kind: 'node' },
      { id: 'pos', x: 420, y: 150, label: 'POS', kind: 'hub' },
      { id: 'pay', x: 580, y: 150, label: 'EFTPOS', kind: 'node' },
      { id: 'margin', x: 740, y: 150, label: 'Margin', kind: 'outcome' },
      { id: 'stock', x: 420, y: 248, label: 'Stock use', kind: 'phase' },
    ],
    edges: [
      { from: 'menu', to: 'orders' },
      { from: 'orders', to: 'pos' },
      { from: 'pos', to: 'pay' },
      { from: 'pay', to: 'margin' },
      { from: 'pos', to: 'stock' },
    ],
  },

  'hospitality/automation': {
    id: 'hosp-auto',
    viewBox: VB,
    title: 'Triggers that respect the floor',
    caption: 'Alerts and comms run without manager copy-paste — automation that fights service rhythm gets disabled.',
    description:
      'Diagram of triggers such as low stock, booking changes, and shift gaps leading to automated actions and manager exceptions.',
    nodes: [
      { id: 't1', x: 140, y: 90, label: 'Low stock', kind: 'phase' },
      { id: 't2', x: 140, y: 210, label: 'Booking chg', kind: 'phase' },
      { id: 'hub', x: 400, y: 150, label: 'Rules', kind: 'hub' },
      { id: 'a1', x: 620, y: 90, label: 'SMS guest', kind: 'node' },
      { id: 'a2', x: 620, y: 210, label: 'Reorder', kind: 'node' },
      { id: 'mgr', x: 400, y: 52, label: 'Manager time', kind: 'outcome' },
    ],
    edges: [
      { from: 't1', to: 'hub' },
      { from: 't2', to: 'hub' },
      { from: 'hub', to: 'a1' },
      { from: 'hub', to: 'a2' },
      { from: 'a1', to: 'mgr' },
    ],
  },

  'construction/overview': {
    id: 'const-overview',
    viewBox: VB,
    title: 'Quote to handover visibility',
    caption: 'Job control connects estimating, site reality, variations, and invoice — margin lives in the gaps between those steps.',
    description:
      'Job lifecycle diagram from quote through active job and variations to handover and invoice for construction businesses.',
    nodes: [
      { id: 'quote', x: 100, y: 150, label: 'Quote', kind: 'node' },
      { id: 'job', x: 280, y: 150, label: 'Active job', kind: 'hub' },
      { id: 'var', x: 460, y: 150, label: 'Variations', kind: 'phase' },
      { id: 'site', x: 640, y: 150, label: 'Site proof', kind: 'node' },
      { id: 'inv', x: 720, y: 150, label: 'Invoice', kind: 'outcome' },
      { id: 'msg', x: 460, y: 248, label: 'Message chaos', kind: 'risk' },
    ],
    edges: [
      { from: 'quote', to: 'job' },
      { from: 'job', to: 'var' },
      { from: 'var', to: 'site' },
      { from: 'site', to: 'inv' },
      { from: 'msg', to: 'job', dashed: true, label: 'replace' },
    ],
  },

  'finance/overview': {
    id: 'fin-overview',
    viewBox: VB,
    title: 'Close cycle without heroics',
    caption: 'Source docs, ledger, review, and client pack on rhythm — partners regain capacity for advice.',
    description:
      'Accounting close cycle from client documents through ledger reconciliation to review and client reporting pack.',
    nodes: [
      { id: 'docs', x: 110, y: 150, label: 'Source docs', kind: 'node' },
      { id: 'ledger', x: 300, y: 150, label: 'Ledger', kind: 'hub' },
      { id: 'rev', x: 490, y: 150, label: 'Review', kind: 'phase' },
      { id: 'pack', x: 680, y: 150, label: 'Client pack', kind: 'outcome' },
      { id: 'hero', x: 300, y: 248, label: 'Month-end crunch', kind: 'risk' },
    ],
    edges: [
      { from: 'docs', to: 'ledger' },
      { from: 'ledger', to: 'rev' },
      { from: 'rev', to: 'pack' },
      { from: 'hero', to: 'ledger', dashed: true, label: 'reduce' },
    ],
  },

  'manufacturing/overview': {
    id: 'mfg-overview',
    viewBox: VB,
    title: 'Floor signal to plan',
    caption: 'Production counts and downtime reasons that match reality make MRP credible — otherwise you optimise fiction.',
    description:
      'Diagram linking shop floor data collection to production planning and supply chain commitments for manufacturers.',
    nodes: [
      { id: 'floor', x: 140, y: 150, label: 'Shop floor', kind: 'hub' },
      { id: 'count', x: 320, y: 100, label: 'Counts', kind: 'node' },
      { id: 'down', x: 320, y: 200, label: 'Downtime', kind: 'node' },
      { id: 'plan', x: 520, y: 150, label: 'Planning', kind: 'node' },
      { id: 'supply', x: 700, y: 150, label: 'Supply', kind: 'outcome' },
      { id: 'fiction', x: 520, y: 248, label: 'Stale data', kind: 'risk' },
    ],
    edges: [
      { from: 'floor', to: 'count' },
      { from: 'floor', to: 'down' },
      { from: 'count', to: 'plan' },
      { from: 'down', to: 'plan' },
      { from: 'plan', to: 'supply' },
      { from: 'fiction', to: 'plan', dashed: true },
    ],
  },
};
