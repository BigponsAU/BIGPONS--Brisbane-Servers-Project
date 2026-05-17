/**
 * Baseline value proposition language for public marketing.
 * Import from pages so scope, presence, and delivery claims stay consistent site-wide.
 */
export const valueProposition = {
  brandEyebrow: 'BIGPONS · Access to truth in technology',

  /**
   * Default meta / OpenGraph description when a page omits `description`.
   */
  metaDefault:
    'Brisbane Servers helps Australian businesses build digital presence and operating leverage—websites, automation, integrations, and support—with scope, cost, and outcomes agreed before major spend.',

  /**
   * One-sentence core promise (reference for intros, pitches, or future components).
   */
  corePromise:
    'We agree scope, budget, and outcomes up front, then deliver technology—public web presence, automation, and integrations—that matches what we scoped together.',

  audience: 'Australian SMEs and growth-stage teams',

  fragments: {
    agreedDelivery:
      'Scope, sequencing, and costs stay visible before you commit; delivery follows what we document together.',
    presenceAndOps:
      'Public-facing sites and internal systems alike are tied to operating value, not vanity deliverables.',
    evidenceLed:
      'Guidance stays evidence-led and sized to your industry and constraints—not generic vendor pitches.',
  },

  home: {
    title: 'Brisbane Servers - Elite Technology Solutions',
    description:
      'Tailored technology consulting for Australian businesses: web applications, automation, integration, and ongoing support—with clear scope and delivery aligned to agreement.',
    heroTitle: 'Transform your business with tailored technology consulting',
    heroSubtitle:
      'From public web presence and high-performance sites to integrations, automation, and enterprise-style delivery—we set expectations in scope and budget, then build what we agreed on: honest trade-offs, visible costs, and outcomes you can measure.',
    coreServicesLead:
      'Enterprise-grade delivery without the enterprise fog: technology sized to your business—websites and digital presence, automation, and integrations—so the value you get matches what we scoped together, with consulting that keeps decisions grounded.',
  },

  about: {
    description:
      'Brisbane Servers is a BIGPONS practice: tailored consulting and delivery for Australian SMEs—scope and outcomes agreed up front, then work that matches those expectations.',
    heroSubtitle:
      'We combine enterprise-grade engineering with consulting that respects your constraints. We agree scope, timelines, and outcomes up front—then deliver work that matches those expectations, whether you are building public presence or hardening how you operate behind the scenes.',
  },

  services: {
    description:
      'Consultation, build, and support—websites, integrations, automation—for Australian teams. Costs, sequencing, and trade-offs visible before you commit.',
    heroTitle: 'Enterprise-grade services, human-sized engagement',
    heroSubtitle:
      'Consultation, architecture, implementation, and support—from web presence and integrations to automation—with costs, sequencing, and trade-offs visible before you commit.',
  },

  projects: {
    description:
      'Case studies, delivery patterns, and live client sites—proof of how we connect business context to shipped technology that matches agreed scope.',
    heroTitle: 'Real projects, measurable outcomes',
    heroSubtitle:
      'Case studies and delivery patterns connect your operating context to architecture, build work, and documentation you can reuse—substantive delivery aligned to what we scope together.',
  },

  resources: {
    description:
      'Industry guides on technology, grants, automation, and implementation—evidence-led content for Australian SMEs, consistent with how Brisbane Servers consults.',
    heroSubtitle:
      'Practical articles and playbooks—grants, automation, compliance-aware technology—so you can decide with context, evidence, and next actions in one place.',
  },
} as const;
