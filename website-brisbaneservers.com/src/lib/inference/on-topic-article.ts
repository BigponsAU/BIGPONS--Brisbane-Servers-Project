import { ARTICLE_DIAGRAM_SLOT, humanizeLabel, planArticleStructure } from './article-structure-seed';
import { fillArticleToBand, splitArticleChunks } from './article-develop';
import { containsDesignSystemJargon } from './topic-fidelity';

export { ARTICLE_DIAGRAM_SLOT };

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const humanize = humanizeLabel;

function trimToMaxWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}…`;
}

type BodyBlock = { title: string; level: 2 | 3 | 4; paragraphs: string[]; diagram?: boolean };

function paragraphsForSection(params: {
  weight: 1 | 2 | 3;
  topicLabel: string;
  industryLabel: string;
  title: string;
  brief?: string;
  diagram?: boolean;
}): string[] {
  const { weight, topicLabel, industryLabel, title, brief, diagram } = params;
  const claim = title.replace(/\.$/, '');
  if (weight === 3) {
    const core = [
      `${claim} is the load-bearing point of this ${industryLabel} page. Staff should be able to use it this week: name the object of ${topicLabel}, who owns the next step, and what “done” looks like before the week runs away.`,
      `When ${topicLabel} lives in inboxes, side spreadsheets, and hallway updates, the same question is answered three times and still arrives late. Treat that as an operating defect in ${industryLabel}, not a training gap.`,
      `Close it by putting the current fact and the next action in the same place the work lives. A useful practice is boring: status is current, exceptions are visible, and a new staff member can follow the path without a private legend.`,
    ];
    if (brief) core.push(`The brief for this article is specific: ${brief.replace(/\s+/g, ' ').trim()} Honour that; do not genericise it into a platform slogan.`);
    if (diagram) {
      core.push(
        `Read the picture with ${claim} in mind. Left to right it should name the object, the owner, and the exception path. If a supervisor cannot point at the figure during a Thursday huddle, the diagram is decoration.`,
      );
    }
    return core;
  }
  if (weight === 2) {
    return [
      `${claim} only earns space because it changes a ${industryLabel} ${topicLabel} decision this week. Count the minutes spent reconstructing the picture before a client conversation — that tax is the supporting point, not a second manifesto.`,
      `Prefer “what is true as of this morning” over “the platform says”. If a label needs a glossary, rename it in the language the floor already uses.`,
    ];
  }
  return [
    `${claim} is a short check, not a new chapter. If it is not used in a ${industryLabel} ${topicLabel} decision this month, leave it out.`,
  ];
}

function diagramDiscussion(topicLabel: string, industryLabel: string, joinTitle: string): { before: string; after: string } {
  return {
    before: `The figure below is the join for ${joinTitle} — not a poster. Look for the object of ${topicLabel}, the handoff, and where an exception leaves the happy path. ${industryLabel} supervisors should be able to stand at this picture and talk without rebuilding slides.`,
    after: `Once the picture is in view, use it as the Thursday check: is the live ${topicLabel} record showing the same path? If the floor and the figure disagree, believe the floor and fix the path.`,
  };
}

export const FILLER_HEADING_RE =
  /^(going deeper(?:\s+on)?|working detail:?|practice note(?:\s+\d+)?|more on|a closer look(?:\s+at)?|digging(?:\s+deeper)?\s+into|pilot notes|a tight operating aside|what follows from)\b/i;

const STOCK_HEADING_RE =
  /pilot notes|before you wide[nr]|ten minutes or it is decoration|shadows, drives|privacy as an operating note|what [“"']done[”"'] means without a meeting|cadence that fits a lean week|the exception that teaches/i;

function voiceHeadingBank(topicLabel: string, industryLabel: string, title?: string, brief?: string): string[] {
  const plan = planArticleStructure({ topic: topicLabel, industry: industryLabel, title, brief });
  return plan.sections.map((section) => section.title);
}

export function markdownHasFillerHeadings(markdown: string): boolean {
  return [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)].some((match) => {
    const heading = match[1].trim();
    return FILLER_HEADING_RE.test(heading) || STOCK_HEADING_RE.test(heading);
  });
}

export function rewriteFillerHeadings(
  markdown: string,
  topic: string,
  industry: string,
  title?: string,
  brief?: string,
): string {
  const topicLabel = humanize(topic) || 'this work';
  const industryLabel = humanize(industry) || 'this industry';
  const bank = voiceHeadingBank(topicLabel, industryLabel, title, brief);
  let i = 0;
  const used = new Set<string>();
  return markdown.replace(/^(#{1,4})\s+(.+)$/gm, (_full, hashes: string, heading: string) => {
    const trimmed = String(heading).trim();
    if (!FILLER_HEADING_RE.test(trimmed) && !STOCK_HEADING_RE.test(trimmed)) {
      used.add(trimmed.toLowerCase());
      return `${hashes} ${trimmed}`;
    }
    let next = bank[i % Math.max(1, bank.length)] || `${topicLabel} in ${industryLabel}`;
    i += 1;
    let guard = 0;
    while (used.has(next.toLowerCase()) && guard < bank.length + 4) {
      next = `${bank[i % Math.max(1, bank.length)]} (${topicLabel})`;
      i += 1;
      guard += 1;
    }
    used.add(next.toLowerCase());
    return `${hashes} ${next}`;
  });
}

function existingHeadings(markdown: string): Set<string> {
  return new Set(
    [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1].trim().toLowerCase()),
  );
}

/**
 * Deterministic consulting article from THIS plan. Writes the planned sections
 * and stops. Word targets are a ceiling, not a reason to invent headings.
 */
export function buildOnTopicArticle(params: {
  industry: string;
  topic: string;
  title: string;
  brief?: string;
  minWords?: number;
  maxWords: number;
  seed?: string;
  kind?: 'guide' | 'case_study';
}): string {
  const topicLabel = humanize(params.topic) || 'this work';
  const industryLabel = humanize(params.industry) || 'this industry';
  const title = params.title.trim() || `${topicLabel} for ${industryLabel}`;
  const brief = (params.brief || '').trim();
  const seed = (params.seed || '').trim();
  const contaminated =
    containsDesignSystemJargon(seed) ||
    /Knowledge base context:/i.test(seed) ||
    markdownHasFillerHeadings(seed);

  const keepSeed = seed.length > 80 && countWords(seed) >= 40 && !contaminated;
  const plan = planArticleStructure({
    industry: params.industry,
    topic: params.topic,
    title,
    brief,
    kind: params.kind,
    existingMarkdown: keepSeed ? seed : undefined,
  });
  const used = keepSeed ? existingHeadings(seed) : new Set<string>();
  const join = plan.sections.find((section) => section.diagram);
  const picture = diagramDiscussion(topicLabel, industryLabel, join?.title || topicLabel);

  const parts: string[] = [];
  if (keepSeed) {
    parts.push(seed);
  } else {
    parts.push(`# ${title}`);
    parts.push(
      `${topicLabel} is how ${industryLabel} teams keep day-to-day work coherent — one picture of what is happening, who owns the next step, and what “done” looks like before the week runs away from you.`,
    );
    parts.push(plan.thesis);
    if (brief) parts.push(brief);
  }

  const pushSection = (block: BodyBlock) => {
    const key = block.title.trim().toLowerCase();
    if (used.has(key)) return;
    used.add(key);
    parts.push(`${'#'.repeat(block.level)} ${block.title}`);
    const paras = [...block.paragraphs];
    if (block.diagram) {
      const mid = Math.max(1, Math.ceil(paras.length / 2));
      parts.push(...paras.slice(0, mid));
      if (!parts.join('\n').includes(ARTICLE_DIAGRAM_SLOT) && !/:::diagram\s+\S+:::/.test(parts.join('\n'))) {
        parts.push(picture.before, ARTICLE_DIAGRAM_SLOT, picture.after);
      }
      parts.push(...paras.slice(mid));
    } else {
      parts.push(...paras);
    }
  };

  for (const section of plan.sections) {
    pushSection({
      title: section.title,
      level: section.level,
      paragraphs: paragraphsForSection({
        weight: section.weight,
        topicLabel,
        industryLabel,
        title: section.title,
        brief,
        diagram: section.diagram,
      }),
      diagram: section.diagram,
    });
  }

  if (!parts.join('\n').includes(ARTICLE_DIAGRAM_SLOT) && !/:::diagram\s+\S+:::/.test(parts.join('\n'))) {
    parts.push(picture.before, ARTICLE_DIAGRAM_SLOT, picture.after);
  }

  return trimToMaxWords(parts.join('\n\n'), params.maxWords);
}

export function ensureArticleWordBand(
  content: string,
  params: {
    industry: string;
    topic: string;
    title: string;
    brief?: string;
    minWords: number;
    maxWords: number;
  },
): string {
  const rewritten = rewriteFillerHeadings(
    content,
    params.industry,
    params.topic,
    params.title,
    params.brief,
  );
  const stillFiller = markdownHasFillerHeadings(rewritten);
  const headingCount = splitArticleChunks(rewritten).filter((chunk) => chunk.level >= 2).length;
  if (stillFiller || headingCount < 2) {
    return buildOnTopicArticle({
      ...params,
      seed: stillFiller ? '' : rewritten,
    });
  }
  const words = countWords(rewritten);
  if (words > params.maxWords) return trimToMaxWords(rewritten, params.maxWords);
  return rewritten;
}

export { fillArticleToBand };
