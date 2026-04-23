export interface PortalVoiceRule {
  id: string;
  title: string;
  description: string;
}

/**
 * Voice strategy for portal topics:
 * present complete decision context in each section (not staged copy).
 */
export const portalVoiceRules: PortalVoiceRule[] = [
  {
    id: 'context-clear',
    title: 'Context Is Explicit',
    description:
      'State business context and constraints clearly so recommendations are grounded and specific.',
  },
  {
    id: 'evidence-before-claims',
    title: 'Evidence Is Concrete',
    description:
      'Support recommendations with resource evidence, prior outcomes, or measurable signals.',
  },
  {
    id: 'action-ready',
    title: 'Action Is Immediate',
    description:
      'Include clear next actions so users can move from understanding to execution immediately.',
  },
  {
    id: 'topic-stack',
    title: 'Topic Stack Per Section',
    description:
      'Each section should include context, evidence, and action together, without forcing users to wait for meaning later.',
  },
];

export const portalVoiceFrameworkSummary =
  'The workspace voice is direction to connection and improvement: clear context, grounded evidence, and practical next action in every section.';

/**
 * System-layer framing: how articles, published resources, voice rules, and the portal relate.
 * Complements the site’s visual “interconnection” language without requiring a literal mirror.
 */
export const resourceVoiceInterconnection = {
  headline:
    'Published resources are the public face of an interconnected corpus: new articles and API-backed entries extend the same graph over time, voice rules keep evidence and tone consistent, and the portal is where signed-in work aligns with that direction.',
  growth:
    'Manual articles and generated drafts can both ship through review; either path keeps the resource hub forward-compatible as the corpus grows.',
} as const;

/**
 * Relates signed-in voice rules to the public marketing “interconnection” visuals.
 * The UI layer is not a data mirror; it establishes the same idea in geometry and motion.
 */
export const portalAndPublicInterconnectionSummary =
  'The public home page uses per-band section satellites, scaled gutter echoes of the same graph (shared seeds), continuous rim rails, and a tall margin field as a visual interconnection layer—small constellations read as growing into the margin library. The portal voice framework and resource corpus are the behavioural layer: same intent (direction, evidence, growth), different medium.';
