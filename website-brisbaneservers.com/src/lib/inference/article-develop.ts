/**
 * Developmental editing: deepen a claim, add supporting, or add an aside
 * without flattening the article into equal heading/paragraph blocks.
 */

import { ARTICLE_DIAGRAM_SLOT, humanizeLabel, planArticleStructure } from './article-structure-seed';

export type DevelopMode = 'expand' | 'support' | 'aside' | 'continue';

export type ArticleChunk = {
  heading: string | null;
  level: 0 | 1 | 2 | 3 | 4;
  body: string;
};

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function splitArticleChunks(markdown: string): ArticleChunk[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const chunks: ArticleChunk[] = [{ heading: null, level: 0, body: '' }];
  for (const line of lines) {
    const match = /^(#{1,4})\s+(.+)$/.exec(line);
    if (match) {
      chunks.push({
        heading: match[2].trim(),
        level: match[1].length as 1 | 2 | 3 | 4,
        body: '',
      });
    } else {
      chunks[chunks.length - 1].body += `${chunks[chunks.length - 1].body ? '\n' : ''}${line}`;
    }
  }
  return chunks;
}

export function joinArticleChunks(chunks: ArticleChunk[]): string {
  return chunks
    .map((chunk) => {
      const heading = chunk.heading ? `${'#'.repeat(chunk.level || 2)} ${chunk.heading}` : '';
      const body = chunk.body.replace(/^\n+/, '').replace(/\n+$/, '');
      return [heading, body].filter(Boolean).join('\n\n');
    })
    .filter((part) => part.trim())
    .join('\n\n');
}

function usedHeadings(chunks: ArticleChunk[]): Set<string> {
  return new Set(chunks.map((chunk) => (chunk.heading || '').trim().toLowerCase()).filter(Boolean));
}

function uniqueTitle(base: string, used: Set<string>): string {
  let title = base;
  let n = 2;
  while (used.has(title.toLowerCase())) {
    title = `${base} (${n})`;
    n += 1;
  }
  used.add(title.toLowerCase());
  return title;
}

function findTargetIndex(chunks: ArticleChunk[], heading?: string): number {
  if (heading) {
    const needle = heading.trim().toLowerCase();
    const exact = chunks.findIndex((chunk) => (chunk.heading || '').trim().toLowerCase() === needle);
    if (exact >= 0) return exact;
    const partial = chunks.findIndex((chunk) => (chunk.heading || '').toLowerCase().includes(needle));
    if (partial >= 0) return partial;
  }
  let best = -1;
  let bestWords = -1;
  chunks.forEach((chunk, index) => {
    if (chunk.level === 2) {
      const words = countWords(chunk.body);
      if (words > bestWords) {
        bestWords = words;
        best = index;
      }
    }
  });
  if (best >= 0) return best;
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    if (chunks[i].heading) return i;
  }
  return Math.max(0, chunks.length - 1);
}

function expandParagraphs(topic: string, industry: string, heading: string): string[] {
  return [
    `Stay with ${heading.replace(/\.$/, '')}. In a live ${industry} week the next useful sentence is still the current fact, the named owner, and the next action for ${topic} — written where the work already lives, not in a parallel note.`,
    `If this section still needs a meeting to interpret, it is not finished. Tighten the language the floor already uses until a deputy can brief from it without calling the person who wrote it.`,
  ];
}

function supportParagraph(topic: string, industry: string, parent: string): { title: string; body: string } {
  return {
    title: `What follows from ${parent.replace(/\.$/, '')}`,
    body: `This supporting note only exists because ${parent.replace(/\.$/, '')} is true. In ${industry}, ${topic} still fails when the follow-on step is implied. Name the join: who picks it up, by when, and where it is written.`,
  };
}

function asideParagraph(topic: string, industry: string): { title: string; body: string } {
  return {
    title: 'A tight operating aside',
    body: `One check: if this ${topic} detail is not used in a ${industry} decision this month, hide it. Extra fields become shadow notes.`,
  };
}

function insertAfterSection(chunks: ArticleChunk[], index: number, piece: ArticleChunk): ArticleChunk[] {
  const next = chunks.slice();
  let at = index + 1;
  const parentLevel = chunks[index]?.level || 2;
  while (at < next.length && next[at].level > parentLevel) at += 1;
  next.splice(at, 0, piece);
  return next;
}

export function developArticle(params: {
  content: string;
  industry: string;
  topic: string;
  title?: string;
  mode: DevelopMode;
  heading?: string;
}): string {
  const topic = humanizeLabel(params.topic) || 'this work';
  const industry = humanizeLabel(params.industry) || 'this industry';
  const chunks = splitArticleChunks(params.content.trim() || `# ${params.title || topic}`);
  const used = usedHeadings(chunks);
  const index = findTargetIndex(chunks, params.heading);
  const target = chunks[index];
  const heading = target?.heading || params.heading || topic;

  if (params.mode === 'expand' || params.mode === 'continue') {
    const extra = expandParagraphs(topic, industry, heading);
    chunks[index] = {
      ...target,
      body: `${target.body.replace(/\s+$/, '')}\n\n${extra.join('\n\n')}`,
    };
    return joinArticleChunks(chunks);
  }

  if (params.mode === 'support') {
    const support = supportParagraph(topic, industry, heading);
    return joinArticleChunks(
      insertAfterSection(chunks, index, {
        heading: uniqueTitle(support.title, used),
        level: 3,
        body: support.body,
      }),
    );
  }

  const aside = asideParagraph(topic, industry);
  return joinArticleChunks(
    insertAfterSection(chunks, index, {
      heading: uniqueTitle(aside.title, used),
      level: 4,
      body: aside.body,
    }),
  );
}

const FILL_ASIDES = [
  ['Handover completeness', 'At each handoff the next person inherits the object, the owner, and the next action.'],
  ['Exceptions that stay visible', 'Late and dual-record cases sit on one list with an age, not in a chat thread.'],
  ['A briefing without rebuilding slides', 'Leaders should talk from the live record, not a weekly performance pack.'],
  ['Ten minutes or it is decoration', 'If “what is true this morning?” takes longer than ten minutes, strip the board.'],
  ['One object, one next action', 'Status words without a verb are how the week stalls.'],
];

export function fillArticleToBand(
  content: string,
  params: {
    industry: string;
    topic: string;
    title: string;
    minWords: number;
    maxWords: number;
  },
): string {
  let next = content.trim();
  const topic = humanizeLabel(params.topic) || 'this work';
  const industry = humanizeLabel(params.industry) || 'this industry';
  let guard = 0;
  while (countWords(next) < params.minWords && guard < 24) {
    const chunks = splitArticleChunks(next);
    const cores = chunks.filter((chunk) => chunk.level === 2);
    const mode: DevelopMode = guard % 3 === 1 ? 'support' : guard % 3 === 2 ? 'aside' : 'continue';
    if (mode === 'aside' && guard > 2) {
      const used = usedHeadings(chunks);
      const pick = FILL_ASIDES[guard % FILL_ASIDES.length];
      const title = uniqueTitle(pick[0], used);
      next = joinArticleChunks([
        ...chunks,
        {
          heading: title,
          level: 4,
          body: `${pick[1]} ${industry} still has to do this for ${topic} without a second folder.`,
        },
      ]);
    } else {
      next = developArticle({
        content: next,
        industry,
        topic,
        title: params.title,
        mode,
        heading: cores[0]?.heading || undefined,
      });
    }
    guard += 1;
  }
  const words = next.trim().split(/\s+/).filter(Boolean);
  if (words.length <= params.maxWords) return next.trim();
  return `${words.slice(0, params.maxWords).join(' ')}…`;
}

export function developPromptInstructions(params: {
  mode: DevelopMode;
  heading?: string;
  industry: string;
  topic: string;
}): string {
  const heading = params.heading?.trim() || 'the main claim';
  const base = [
    `Develop the existing ${params.industry} / ${params.topic} article. Keep every current heading unless it is filler.`,
    'Do not flatten into equal heading/paragraph blocks. Deepen what is already the main point.',
    'Keep continuity: a new supporting heading must follow from the parent claim, not restart the article.',
    'Keep :::diagram-here::: (or the existing figure) next to the operating join and discuss the picture.',
  ];
  if (params.mode === 'expand' || params.mode === 'continue') {
    base.push(`Add depth under “${heading}”: two or three refined paragraphs, not a new cloned heading.`);
  } else if (params.mode === 'support') {
    base.push(`Add one ### supporting section that is necessary because “${heading}” is true. Then stop.`);
  } else {
    base.push(`Add one short #### aside near “${heading}”. One paragraph. Then stop.`);
  }
  return base.join('\n');
}

export function articlePlanNotes(content: string, industry: string, topic: string): string {
  const plan = planArticleStructure({ industry, topic, existingMarkdown: content });
  const diagram = plan.sections.find((section) => section.diagram);
  return [
    `Article shape: ${plan.shape}. ${plan.thesis}`,
    `Diagram belongs with: ${diagram?.title || 'the operating-join section'}.`,
    'Heading levels already in the draft mark importance. Raise or lower a heading only if the claim’s priority changed.',
  ].join('\n');
}

export { ARTICLE_DIAGRAM_SLOT };
