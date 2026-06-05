/**
 * Modelable business objective for the Brisbane Servers (BIGPONS) project.
 * Ties civic 2032 network implementation to the Resources inference corpus and
 * documented history used for future contemplation — not a separate product line.
 */

export type ObjectiveIndicator = {
  id: string;
  label: string;
  description: string;
};

export type InferenceSource = {
  id: string;
  label: string;
  href: string;
  role: string;
};

/** Primary route for the program; `#project-purpose` is the modelable objective block. */
export const projectPurposePath = '/brisbane-2032#project-purpose' as const;
export const resourcesInferencePath = '/resources#resources-project-objective' as const;

/** Navigation labels — independent of portal voice framework (editorial standard, not project purpose). */
export const projectPurposeNav = {
  groupTitle: 'Project purpose',
  programPage: { label: 'Brisbane 2032 program', href: projectPurposePath },
  inferenceHub: { label: 'Inference on Resources', href: resourcesInferencePath },
  contribute: { label: 'Contribute evidence', href: '/contribute' },
  publicLead:
    'Project purpose is separate from the voice framework: voice governs how we write; project purpose governs what we implement (2032 network capacity) and what history we capture for inference on Resources.',
} as const;

export const brisbaneServersProjectObjective = {
  id: 'brisbane-servers-inference-implementation',
  programName: 'Brisbane Servers project',
  operator: 'BIGPONS',

  /**
   * Single modelable outcome: implementation of network capacity work,
   * documented so inference (on Resources and in workspace data) stays grounded.
   */
  primaryOutcome:
    'Implement and document data networking hardware, backbone capacity, and operational structure required for Brisbane 2032 — with evidence captured on this site so conclusions follow from history, not assertion.',

  businessObjective: {
    title: 'Modelable business objective',
    summary:
      'The site exists to make implementation legible: what was true in the past, what is being built now, and what future scenarios (especially 2032) require — so readers and contributors can infer next steps from documented fact.',
    implementationGoal:
      'Deliver structured network and platform implementation (paths, hardware, compute, observability) for Games-adjacent and civic-scale demand, phased with test events and written gates — the same discipline we apply to SME engagements, extended to this one-time civic horizon.',
  },

  indicators: [
    {
      id: 'documented-baseline',
      label: 'Documented baseline',
      description:
        'Existing paths, hardware generations, contracts, and peak models recorded before capital spend — gaps named against 2032 scenarios.',
    },
    {
      id: 'implemented-capacity',
      label: 'Implemented capacity',
      description:
        'Physical routes, active networking hardware, and platform capacity deployed to agreed reference designs — not catalogue purchases without integration.',
    },
    {
      id: 'tested-under-load',
      label: 'Tested under load',
      description:
        'Trial events and measured failover/latency results stored as evidence, informing adjustments before the main event window.',
    },
    {
      id: 'inference-ready-corpus',
      label: 'Inference-ready corpus',
      description:
        'Resources, 2032 context pages, and BIGPONS-authored entries structured for context → evidence → action so future readers can reason from captured history.',
    },
  ] satisfies ObjectiveIndicator[],

  inferenceProgram: {
    title: 'Inference from captured history',
    lead:
      'Resources are the public inference layer: industry guides, topic articles, and reviewed API-backed entries form a growing graph. Brisbane 2032 infrastructure narrative and delivery notes BIGPONS publishes here extend that graph for civic-scale decisions.',
    temporalFrame: {
      capture:
        'Record what was decided, built, and measured — implementation artefacts, trade-offs, and outcomes — as primary-source material.',
      contemplation:
        'Use that history to stress-test future plans: if peak load, venue count, or supplier mix changes, inference chains are re-run against documented evidence rather than restarted from opinion.',
    },
    sources: [
      {
        id: 'resources-hub',
        label: 'Resources hub',
        href: resourcesInferencePath,
        role: 'Industry and topic guides; published resources scored for evidence; primary public inference surface (separate from voice framework).',
      },
      {
        id: 'brisbane-2032',
        label: 'Brisbane 2032 program',
        href: projectPurposePath,
        role: 'Civic-scale network imperative, implementation phases, and modelable business objective for Games-adjacent work.',
      },
      {
        id: 'contribute',
        label: 'Contribute',
        href: '/contribute',
        role: 'Community extensions reviewed into the corpus — field context strengthens inference without diluting standards.',
      },
      {
        id: 'account-workspace',
        label: 'Account workspace',
        href: '/account',
        role: 'Signed-in capture, moderation, and analytics over resources BIGPONS and contributors add — aligned to the portal voice framework.',
      },
    ] satisfies InferenceSource[],
  },

  necessityForSite:
    'Without a modelable objective, the site would be marketing copy only. Implementation of networking hardware and capacity — and the data BIGPONS captures while doing it — gives Resources something substantive to infer from: history that develops forward into 2032 and beyond.',
} as const;
