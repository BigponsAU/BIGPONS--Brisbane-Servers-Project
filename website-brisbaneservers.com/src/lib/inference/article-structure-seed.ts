/**
 * Per-article structure plan. Heading level, section length, and diagram
 * placement follow this topic’s priorities — not a shared heading list.
 */

export const DOCUMENT_STRUCTURE_SEED_VERSION = 3;
export const ARTICLE_DIAGRAM_SLOT = ':::diagram-here:::';

export function humanizeLabel(value: string): string {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type DocumentStructureKind = 'guide' | 'case_study';
export type SpineRole = 'core' | 'support' | 'aside' | 'close';
export type ArticleShape =
  | 'sequence'
  | 'roster'
  | 'people'
  | 'client'
  | 'incident'
  | 'compliance'
  | 'handover';

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
  thesis: string;
  sections: SpineSection[];
};

const SHAPE_KEYWORDS: Record<ArticleShape, string[]> = {
  roster: ['roster', 'schedul', 'shift', 'staffing', 'timesheet', 'availability'],
  people: ['training', 'culture', 'leadership', 'onboard', 'judgment', 'people', 'capability'],
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
  incident: ['incident', 'outage', 'breach', 'disaster', 'recovery', 'security', 'fail'],
  compliance: ['compliance', 'audit', 'privacy', 'policy', 'retention', 'consent', 'record'],
  handover: ['handover', 'leave', 'continuity', 'deputy', 'cover', 'hand-off', 'handoff'],
  sequence: ['workflow', 'process', 'integrat', 'operat', 'pipeline', 'path', 'join'],
};

function blob(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function hashPick(text: string, shapes: ArticleShape[]): ArticleShape {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return shapes[h % shapes.length];
}

export function detectArticleShape(params: {
  industry?: string;
  topic?: string;
  title?: string;
  brief?: string;
}): ArticleShape {
  const text = blob([params.topic, params.title, params.brief, params.industry]);
  const order: ArticleShape[] = [
    'roster',
    'handover',
    'incident',
    'compliance',
    'people',
    'client',
    'sequence',
  ];
  for (const shape of order) {
    if (
      shape === 'compliance' &&
      /\b(operat|workflow|process)/.test(blob([params.topic])) &&
      !/audit|privacy|retention|consent/.test(text)
    ) {
      return 'sequence';
    }
    if (SHAPE_KEYWORDS[shape].some((token) => text.includes(token))) return shape;
  }
  return hashPick(text || 'article', order);
}

function spineForShape(shape: ArticleShape, topic: string, industry: string): SpineSection[] {
  switch (shape) {
    case 'roster':
      return [
        { level: 2, title: `Who is on for ${topic}, and who is not`, role: 'core', weight: 3 },
        { level: 3, title: `Coverage holes a ${industry} week already knows`, role: 'support', weight: 2 },
        { level: 2, title: 'The live roster path', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'Swaps, leave, and the 6am call', role: 'support', weight: 2 },
        { level: 4, title: 'A shift with no named owner', role: 'aside', weight: 1 },
        { level: 2, title: 'What the floor should refuse to guess', role: 'support', weight: 2 },
        { level: 2, title: 'Keep judgment on the swap', role: 'close', weight: 2 },
      ];
    case 'people':
      return [
        { level: 2, title: `The judgment ${topic} cannot automate`, role: 'core', weight: 3 },
        { level: 3, title: `What new ${industry} staff actually inherit`, role: 'support', weight: 2 },
        { level: 2, title: 'How the week teaches', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'Coaching that fits fifteen minutes', role: 'support', weight: 2 },
        { level: 4, title: 'When the deputy is also new', role: 'aside', weight: 1 },
        { level: 2, title: 'What stays human on purpose', role: 'close', weight: 2 },
      ];
    case 'client':
      return [
        { level: 2, title: `What the ${industry} client or patient actually waits on`, role: 'core', weight: 3 },
        { level: 3, title: 'The booking is not the relationship', role: 'support', weight: 2 },
        { level: 2, title: 'The path they can see', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'When the file and the conversation disagree', role: 'support', weight: 2 },
        { level: 4, title: 'A wait nobody named', role: 'aside', weight: 1 },
        { level: 2, title: `Where ${topic} should stay quiet`, role: 'close', weight: 2 },
      ];
    case 'incident':
      return [
        { level: 2, title: 'What broke, and who still owns the next step', role: 'core', weight: 3 },
        { level: 3, title: 'The first hour versus the folklore', role: 'support', weight: 2 },
        { level: 2, title: 'Recovery as a path', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'Who is told, and in what order', role: 'support', weight: 2 },
        { level: 4, title: 'The note that was never written', role: 'aside', weight: 1 },
        { level: 2, title: `What ${industry} should refuse to normalise`, role: 'close', weight: 2 },
      ];
    case 'compliance':
      return [
        { level: 2, title: `The record ${topic} has to be able to show`, role: 'core', weight: 3 },
        { level: 3, title: 'What an auditor would ask on Thursday', role: 'support', weight: 2 },
        { level: 2, title: 'Evidence along the path', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'Retention without a second folder', role: 'support', weight: 2 },
        { level: 4, title: 'A field nobody can explain', role: 'aside', weight: 1 },
        { level: 2, title: 'Keep the awkward call human', role: 'close', weight: 2 },
      ];
    case 'handover':
      return [
        { level: 2, title: 'What the next person must inherit', role: 'core', weight: 3 },
        { level: 3, title: `Leave should not reset ${topic}`, role: 'support', weight: 2 },
        { level: 2, title: 'The handoff picture', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'A deputy who can find the file', role: 'support', weight: 2 },
        { level: 4, title: 'When the owner is simply away', role: 'aside', weight: 1 },
        { level: 2, title: `Continuity ${industry} can brief from`, role: 'close', weight: 2 },
      ];
    default:
      return [
        { level: 2, title: `Why ${topic} is the operating problem`, role: 'core', weight: 3 },
        { level: 3, title: `What the ${industry} week actually costs`, role: 'support', weight: 2 },
        { level: 2, title: 'How work actually runs', role: 'core', weight: 3, diagram: true },
        { level: 3, title: 'One live path, then the join', role: 'support', weight: 2 },
        { level: 4, title: 'When something is late or incomplete', role: 'aside', weight: 1 },
        { level: 2, title: 'Risks if you leave it loose', role: 'support', weight: 2 },
        { level: 3, title: 'Two sources of truth', role: 'aside', weight: 1 },
        { level: 2, title: 'What to keep human', role: 'close', weight: 2 },
      ];
  }
}

function thesisForShape(shape: ArticleShape, topic: string, industry: string): string {
  switch (shape) {
    case 'roster':
      return `This page is about whether a ${industry} roster names who is on, who is covering, and what happens at 6am — not a staffing slogan. Spend length on that claim.`;
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

function classifyExistingHeading(title: string, index: number, total: number): SpineSection {
  const lower = title.toLowerCase();
  const diagram =
    /how work|path|picture|join|sequence|roster path|handoff|hand-off|recovery|evidence along/.test(lower);
  if (index === 0 || /why |main |operating problem|who is on|what broke|what the next|the record/.test(lower)) {
    return { level: 2, title, role: 'core', weight: 3, diagram };
  }
  if (index === total - 1 || /keep human|judgment|refuse|quiet|normalise|continuity/.test(lower)) {
    return { level: 2, title, role: 'close', weight: 2 };
  }
  if (/when |aside|note/.test(lower)) {
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
  const shape = detectArticleShape(params);
  const planned: ArticleStructurePlan = {
    shape,
    thesis: thesisForShape(shape, topic, industry),
    sections: spineForShape(shape, topic, industry),
  };
  if (params.existingMarkdown?.trim()) {
    return planFromExistingMarkdown(params.existingMarkdown, planned);
  }
  return planned;
}

export function documentSpine(
  topicLabel: string,
  industryLabel: string,
  extras?: { title?: string; brief?: string; existingMarkdown?: string },
): SpineSection[] {
  return planArticleStructure({
    topic: topicLabel,
    industry: industryLabel,
    title: extras?.title,
    brief: extras?.brief,
    existingMarkdown: extras?.existingMarkdown,
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
    `Shape for this article: ${plan.shape}. ${plan.thesis}`,
    'Do not reuse another article’s heading list. Titles below are a starting spine for this topic — rewrite a heading if the brief needs different emphasis, but keep importance and continuity.',
    'Do not write heading → one equal paragraph → heading. Give the main claim more room than asides.',
    'Use # once (title), ## for the two or three load-bearing claims, ### for supporting points that follow from the claim above, #### for tight asides.',
    'Open with two or three thesis paragraphs before the first ## — name the object of work, the owner, and what “done” looks like.',
    'Each section should follow from the one before it. Do not restart the argument under a new heading.',
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
    'If you need more length, deepen the main ## claims with extra paragraphs or a #### aside. Do not clone a heading. Add ### only where a supporting distinction is necessary.',
  );
  return lines.join('\n');
}
