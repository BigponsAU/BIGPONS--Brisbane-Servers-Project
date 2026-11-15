/**
 * Per-article structure plan. Every creatable resource (generate, improve,
 * starter copy, case study) gets an outline composed from THIS title, topic,
 * industry, and brief — not a shared heading list and not a word-count quota.
 */

export const DOCUMENT_STRUCTURE_SEED_VERSION = 5;
export const ARTICLE_DIAGRAM_SLOT = ':::diagram-here:::';

export function humanizeLabel(value: string): string {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type DocumentStructureKind = 'guide' | 'case_study';
export type SpineRole = 'core' | 'support' | 'aside' | 'close';
/** Dominant operating lens — derived from facets, never a forced template. */
export type ArticleShape =
  | 'sequence'
  | 'roster'
  | 'people'
  | 'client'
  | 'incident'
  | 'compliance'
  | 'handover';

export type ArticleFacet =
  | 'coverage'
  | 'path'
  | 'evidence'
  | 'handoff'
  | 'client'
  | 'judgment'
  | 'incident'
  | 'exception';

export type SpineSection = {
  level: 2 | 3 | 4;
  title: string;
  role: SpineRole;
  /** Relative depth: 3 = main claim, 1 = short aside. */
  weight: 1 | 2 | 3;
  diagram?: boolean;
};

export type ArticleStructurePlan = {
  shape: ArticleShape;
  facets: ArticleFacet[];
  thesis: string;
  sections: SpineSection[];
};

const FACET_KEYWORDS: Record<ArticleFacet, string[]> = {
  coverage: ['roster', 'schedul', 'shift', 'staffing', 'timesheet', 'availability', 'cover'],
  handoff: ['handover', 'leave', 'continuity', 'deputy', 'hand-off', 'handoff'],
  incident: ['incident', 'outage', 'breach', 'disaster', 'recovery', 'security', 'fail'],
  evidence: ['compliance', 'audit', 'privacy', 'policy', 'retention', 'consent', 'record', 'evidence'],
  judgment: ['training', 'culture', 'leadership', 'onboard', 'judgment', 'people', 'capability', 'coach'],
  client: [
    'customer',
    'patient',
    'client',
    'booking',
    'appointment',
    'experience',
    'e-commerce',
    'ecommerce',
    'retail',
  ],
  path: ['workflow', 'process', 'integrat', 'operat', 'pipeline', 'path', 'join', 'sequence'],
  exception: ['exception', 'late', 'incomplete', 'dual-record', 'gap', 'stall'],
};

const FACET_TO_SHAPE: Record<ArticleFacet, ArticleShape> = {
  coverage: 'roster',
  handoff: 'handover',
  incident: 'incident',
  evidence: 'compliance',
  judgment: 'people',
  client: 'client',
  path: 'sequence',
  exception: 'sequence',
};

const FACET_TIE_BREAK: Record<ArticleFacet, number> = {
  coverage: 0,
  handoff: 1,
  incident: 2,
  evidence: 3,
  path: 4,
  client: 5,
  judgment: 6,
  exception: 7,
};

const JOIN_FACETS: ArticleFacet[] = ['path', 'evidence', 'coverage', 'handoff', 'incident', 'client'];

function blob(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function stableArticleSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length < 2) return items.slice();
  const n = ((offset % items.length) + items.length) % items.length;
  return items.slice(n).concat(items.slice(0, n));
}

export function detectArticleFacets(params: {
  industry?: string;
  topic?: string;
  title?: string;
  brief?: string;
}): ArticleFacet[] {
  const topicText = blob([params.topic, params.title, params.brief]);
  const industryText = blob([params.industry]);
  const scored = (Object.keys(FACET_KEYWORDS) as ArticleFacet[])
    .map((facet) => {
      const topicHits = FACET_KEYWORDS[facet].reduce(
        (sum, token) => sum + (topicText.includes(token) ? 1 : 0),
        0,
      );
      const industryHits = FACET_KEYWORDS[facet].reduce(
        (sum, token) => sum + (industryText.includes(token) ? 1 : 0),
        0,
      );
      return { facet, score: topicHits * 3 + industryHits };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || FACET_TIE_BREAK[a.facet] - FACET_TIE_BREAK[b.facet]);
  if (scored.length) return scored.map((row) => row.facet);
  return ['path', 'exception', 'judgment'];
}

export function detectArticleShape(params: {
  industry?: string;
  topic?: string;
  title?: string;
  brief?: string;
}): ArticleShape {
  const facets = detectArticleFacets(params);
  return FACET_TO_SHAPE[facets[0] || 'path'];
}

function openingTitle(
  kind: DocumentStructureKind,
  title: string,
  topic: string,
  industry: string,
): string {
  const stripped = title
    .replace(new RegExp(`\\s+for\\s+${industry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
    .trim();
  if (kind === 'case_study') {
    return `What ${stripped || topic} actually showed`;
  }
  if (stripped && stripped.toLowerCase() !== topic.toLowerCase()) {
    return `What ${stripped} has to get right in ${industry}`;
  }
  return `Why ${topic} is the operating problem in ${industry}`;
}

function joinTitle(facet: ArticleFacet, topic: string, industry: string): string {
  switch (facet) {
    case 'coverage':
      return `The live ${topic} coverage path`;
    case 'evidence':
      return `Evidence for ${topic} along the path`;
    case 'handoff':
      return `The ${topic} handoff picture`;
    case 'incident':
      return `Recovery as a ${topic} path`;
    case 'client':
      return `The path a ${industry} client can see`;
    case 'judgment':
      return `How the ${industry} week teaches ${topic}`;
    case 'exception':
      return `Where ${topic} leaves the happy path`;
    default:
      return `How ${topic} actually runs`;
  }
}

function supportTitle(facet: ArticleFacet, topic: string, industry: string, variant: number): string {
  const options: Record<ArticleFacet, string[]> = {
    coverage: [
      `Coverage holes a ${industry} week already knows`,
      `Who is on for ${topic}, and who is not`,
    ],
    evidence: [
      `What an auditor would ask about ${topic} on Thursday`,
      `Retention for ${topic} without a second folder`,
    ],
    handoff: [
      `Leave should not reset ${topic}`,
      `A deputy who can find the ${topic} file`,
    ],
    incident: [
      `The first hour versus the ${topic} folklore`,
      `Who is told, and in what order`,
    ],
    client: [
      `The booking is not the ${industry} relationship`,
      `When the file and the conversation disagree`,
    ],
    judgment: [
      `The judgment ${topic} cannot automate`,
      `What new ${industry} staff actually inherit`,
    ],
    path: [
      `What the ${industry} week actually costs for ${topic}`,
      `One live ${topic} path, then the join`,
    ],
    exception: [
      `When ${topic} is late or incomplete`,
      `A wait nobody named in ${topic}`,
    ],
  };
  const list = options[facet];
  return list[variant % list.length];
}

function asideTitle(facet: ArticleFacet, topic: string): string {
  switch (facet) {
    case 'coverage':
      return `A ${topic} shift with no named owner`;
    case 'evidence':
      return `A ${topic} field nobody can explain`;
    case 'handoff':
      return `When the ${topic} owner is simply away`;
    case 'incident':
      return `The ${topic} note that was never written`;
    case 'client':
      return `A wait nobody named`;
    default:
      return `When ${topic} is late or incomplete`;
  }
}

function closeTitle(facet: ArticleFacet, topic: string, industry: string): string {
  switch (facet) {
    case 'coverage':
      return `Keep judgment on the ${topic} swap`;
    case 'evidence':
      return `Keep the awkward ${topic} call human`;
    case 'handoff':
      return `Continuity ${industry} can brief from`;
    case 'incident':
      return `What ${industry} should refuse to normalise`;
    case 'client':
      return `Where ${topic} should stay quiet`;
    case 'judgment':
      return `What stays human on purpose`;
    default:
      return `What to keep human in ${topic}`;
  }
}

function thesisForPlan(
  kind: DocumentStructureKind,
  shape: ArticleShape,
  topic: string,
  industry: string,
  title: string,
): string {
  const focus = title && title.toLowerCase() !== topic.toLowerCase() ? title : topic;
  if (kind === 'case_study') {
    return `This page is the story of ${focus} in ${industry}: what happened, what the live ${topic} path did, and what a second team should inherit. Supporting notes stay shorter than that claim.`;
  }
  switch (shape) {
    case 'roster':
      return `This page is about whether a ${industry} ${topic} practice names who is on, who is covering, and what happens when the gap hits — not a staffing slogan.`;
    case 'people':
      return `This page is about the judgment ${topic} still needs a person for in ${industry}. Supporting notes stay shorter than that claim.`;
    case 'client':
      return `This page is about the wait a ${industry} client or patient can feel. ${topic} only matters where it changes that wait.`;
    case 'incident':
      return `This page is about the next step after something breaks — owner, path, and who is told. ${topic} is the recovery, not the post-mortem slide.`;
    case 'compliance':
      return `This page is about the record ${topic} can show on a ${industry} Thursday. Evidence sits on the path; asides stay short.`;
    case 'handover':
      return `This page is about what the next person inherits when someone is away. ${topic} that resets on leave is not a practice.`;
    default:
      return `This page spends its length on whether ${industry} staff can name the object of ${topic}, the owner, and what “done” looks like. Supporting notes stay shorter.`;
  }
}

function composeSpine(params: {
  industry: string;
  topic: string;
  title: string;
  brief?: string;
  kind?: DocumentStructureKind;
}): { shape: ArticleShape; facets: ArticleFacet[]; thesis: string; sections: SpineSection[] } {
  const topic = humanizeLabel(params.topic) || 'this work';
  const industry = humanizeLabel(params.industry) || 'this industry';
  const title = params.title.trim() || `${topic} for ${industry}`;
  const kind = params.kind || 'guide';
  const facets = detectArticleFacets(params);
  const shape = FACET_TO_SHAPE[facets[0] || 'path'];
  const seed = stableArticleSeed(blob([title, topic, industry, params.brief, kind]));
  const rotated = rotate(facets, seed % Math.max(1, facets.length));
  const joinFacet = (
    JOIN_FACETS.includes(facets[0])
      ? facets[0]
      : rotated.find((facet) => JOIN_FACETS.includes(facet))
  ) || rotated[0];

  const sections: SpineSection[] = [
    {
      level: 2,
      title: openingTitle(kind, title, topic, industry),
      role: 'core',
      weight: 3,
    },
    {
      level: 2,
      title: joinTitle(joinFacet, topic, industry),
      role: 'core',
      weight: 3,
      diagram: true,
    },
  ];

  const others = rotated.filter((facet) => facet !== joinFacet).slice(0, 2 + (seed % 2));
  others.forEach((facet, index) => {
    sections.push({
      level: 3,
      title: supportTitle(facet, topic, industry, seed + index),
      role: 'support',
      weight: 2,
    });
    if (seed % 3 === index % 3) {
      sections.push({
        level: 4,
        title: asideTitle(facet, topic),
        role: 'aside',
        weight: 1,
      });
    }
  });

  sections.push({
    level: 2,
    title: closeTitle(rotated[rotated.length - 1] || 'judgment', topic, industry),
    role: 'close',
    weight: 2,
  });

  return {
    shape,
    facets,
    thesis: thesisForPlan(kind, shape, topic, industry, title),
    sections,
  };
}

function classifyExistingHeading(title: string, index: number, total: number): SpineSection {
  const lower = title.toLowerCase();
  const diagram =
    /how work|path|picture|join|sequence|roster path|handoff|hand-off|recovery|evidence along/.test(lower);
  if (index === 0 || /why |main |operating problem|who is on|what broke|what the next|the record|has to get right/.test(lower)) {
    return { level: 2, title, role: 'core', weight: 3, diagram };
  }
  if (index === total - 1 || /keep human|judgment|refuse|quiet|normalise|continuity/.test(lower)) {
    return { level: 2, title, role: 'close', weight: 2 };
  }
  if (/when |aside|note|field nobody|simply away/.test(lower)) {
    return { level: 4, title, role: 'aside', weight: 1 };
  }
  return { level: 2, title, role: 'support', weight: 2, diagram };
}

export function planFromExistingMarkdown(markdown: string, fallback: ArticleStructurePlan): ArticleStructurePlan {
  const headings = [...markdown.matchAll(/^(#{2,4})\s+(.+)$/gm)].map((match) => ({
    level: Math.min(4, match[1].length) as 2 | 3 | 4,
    title: match[2].trim(),
  }));
  if (headings.length < 2) return fallback;
  const sections: SpineSection[] = headings.map((heading, index) => {
    const classified = classifyExistingHeading(heading.title, index, headings.length);
    return {
      ...classified,
      level: heading.level,
      title: heading.title,
    };
  });
  if (!sections.some((section) => section.diagram)) {
    const join = sections.find((section) =>
      /path|run|picture|join|roster|handoff|recovery|evidence|week teaches/.test(section.title.toLowerCase()),
    );
    if (join) join.diagram = true;
    else {
      const core = sections.find((section) => section.role === 'core' && section.level === 2);
      if (core) core.diagram = true;
    }
  }
  return { ...fallback, sections };
}

export function planArticleStructure(params: {
  industry: string;
  topic: string;
  title?: string;
  brief?: string;
  kind?: DocumentStructureKind;
  existingMarkdown?: string;
}): ArticleStructurePlan {
  const topic = humanizeLabel(params.topic) || 'this work';
  const industry = humanizeLabel(params.industry) || 'this industry';
  const title = (params.title || '').trim() || `${topic} for ${industry}`;
  const planned = composeSpine({
    industry,
    topic,
    title,
    brief: params.brief,
    kind: params.kind,
  });
  if (params.existingMarkdown?.trim()) {
    return planFromExistingMarkdown(params.existingMarkdown, planned);
  }
  return planned;
}

export function documentSpine(
  topicLabel: string,
  industryLabel: string,
  extras?: { title?: string; brief?: string; existingMarkdown?: string; kind?: DocumentStructureKind },
): SpineSection[] {
  return planArticleStructure({
    topic: topicLabel,
    industry: industryLabel,
    title: extras?.title,
    brief: extras?.brief,
    existingMarkdown: extras?.existingMarkdown,
    kind: extras?.kind,
  }).sections;
}

export function documentChapterTitles(topicLabel: string, industryLabel: string): string[] {
  return documentSpine(topicLabel, industryLabel)
    .filter((section) => section.level === 2)
    .map((section) => section.title);
}

export function buildDocumentStructureSeed(params: {
  industry: string;
  topic: string;
  title: string;
  kind?: DocumentStructureKind;
  brief?: string;
  existingMarkdown?: string;
}): string {
  const topicLabel = humanizeLabel(params.topic) || 'this work';
  const industryLabel = humanizeLabel(params.industry) || 'this industry';
  const title = params.title.trim() || `${topicLabel} for ${industryLabel}`;
  const plan = planArticleStructure({
    industry: params.industry,
    topic: params.topic,
    title: params.title,
    brief: params.brief,
    kind: params.kind,
    existingMarkdown: params.existingMarkdown,
  });
  const kindNote =
    params.kind === 'case_study'
      ? 'Write this as a case-study narrative that still uses heading levels by importance.'
      : 'Write this as a practical operating guide.';

  const lines = [
    `# ${title}`,
    '',
    `${kindNote} Stay on ${industryLabel} / ${topicLabel}.`,
    `Facets for this article: ${plan.facets.join(', ')}. Dominant lens: ${plan.shape}.`,
    plan.thesis,
    'This is a plan for THIS title and brief only. Rewrite a heading if the brief needs different emphasis. Do not reuse another article’s heading list. Do not add sections to hit a word count.',
    'Do not write heading → one equal paragraph → heading. Give the main claim more room than asides.',
    'Use # once (title), ## for the two or three load-bearing claims, ### for supporting points that follow from the claim above, #### for tight asides only when they earn space.',
    'Open with two or three thesis paragraphs before the first ## — name the object of work, the owner, and what “done” looks like.',
    'Each section should follow from the one before it. Do not restart the argument under a new heading.',
    'Do not use stock filler titles (pilot notes, going deeper, working detail, practice note).',
    '',
  ];

  for (const section of plan.sections) {
    const hashes = '#'.repeat(section.level);
    const depth =
      section.weight === 3
        ? 'Main point — several paragraphs, examples from a real week, then a tighter follow-on.'
        : section.weight === 2
          ? 'Supporting point — two paragraphs of different length, continuing the claim above, not a copy of it.'
          : 'Short aside — one tight paragraph that does not restart the article.';
    lines.push(`${hashes} ${section.title}`, '');
    lines.push(depth, '');
    if (section.diagram) {
      lines.push(
        'This is where the operating picture belongs — because this section is the join. Introduce it in prose (what to look at, left to right).',
        ARTICLE_DIAGRAM_SLOT,
        'After the picture, explain how a supervisor would use it on Thursday — do not leave the figure uncommented.',
        '',
      );
    }
  }

  lines.push(
    'If the draft is already useful, stop. Extra length belongs under the main ## claims, not as cloned headings.',
  );
  return lines.join('\n');
}
