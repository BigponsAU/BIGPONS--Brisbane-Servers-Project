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

function paragraphsForWeight(
  weight: 1 | 2 | 3,
  topicLabel: string,
  industryLabel: string,
  title: string,
  diagram?: boolean,
): string[] {
  const object = `the job, episode, booking, or file that ${topicLabel} is supposed to move`;
  if (weight === 3) {
    const core = [
      `The main point of this page is not a platform slogan. It is whether ${industryLabel} staff can name ${object}, who owns the next step, and what “done” looks like before the week runs away. When ${topicLabel} lives in inboxes, side spreadsheets, and hallway updates, the same question is answered three times and still arrives late.`,
      `That shows up as overtime, missed handovers, and a public-facing story that does not match the floor. Treat the gap as an operating defect. Close it by putting the current fact and the next action in the same place the work lives — not in a slide that has to be rebuilt every Monday.`,
      `A useful ${topicLabel} practice is boring in the best way: status is current, exceptions are visible, and a new staff member can follow the path without a private legend. The rest of this article spends its length on that claim.`,
    ];
    if (diagram) {
      core.push(
        `Read the picture with the join in mind. Left to right it should name the object, the owner, and the exception path. If a supervisor cannot point at the figure during a Thursday huddle, the diagram is decoration and ${title.replace(/\.$/, '')} is still tribal.`,
      );
    }
    return core;
  }
  if (weight === 2) {
    return [
      `${title.replace(/\.$/, '')} only earns space if it changes a ${industryLabel} decision this week. Count the minutes spent reconstructing ${topicLabel} before a client or patient conversation — that tax is the supporting point, not a second manifesto.`,
      `Prefer “what is true as of this morning” over “the platform says”. If a label needs a glossary, rename it. Language people already use is part of the operating picture, not a later training module.`,
    ];
  }
  return [
    `${title.replace(/\.$/, '')} still has to fit a live ${industryLabel} week. One current fact, a named owner, and a next action that does not live in chat is enough. If it needs a meeting to interpret, it is still a brochure.`,
  ];
}

function diagramDiscussion(topicLabel: string, industryLabel: string): { before: string; after: string } {
  return {
    before: `The figure below is the join for ${topicLabel} — not a poster. Look for the object of work, the handoff, and where an exception leaves the happy path. ${industryLabel} supervisors should be able to stand at this picture and talk without rebuilding slides.`,
    after: `Once the picture is in view, use it as the Thursday check: is the live record showing the same path? If the floor and the figure disagree, believe the floor and fix the path. Widen to a second team only after a week of notes looks like a normal ${industryLabel} week.`,
  };
}

export const FILLER_HEADING_RE =
  /^(going deeper(?:\s+on)?|working detail:?|practice note(?:\s+\d+)?|more on|a closer look(?:\s+at)?|digging(?:\s+deeper)?\s+into|pilot notes|a tight operating aside|what follows from)\b/i;

const STOCK_HEADING_RE =
  /pilot notes|before you wide[nr]|ten minutes or it is decoration|shadows, drives|privacy as an operating note|what [“"']done[”"'] means without a meeting|cadence that fits a lean week|the exception that teaches/i;

function voiceHeadingBank(topicLabel: string, industryLabel: string): string[] {
  const plan = planArticleStructure({ topic: topicLabel, industry: industryLabel });
  const fromSpine = plan.sections.map((section) => section.title);
  const extras = overflowNotes(plan.shape, topicLabel, industryLabel).map((note) => note.title);
  return [...fromSpine, ...extras];
}

export function markdownHasFillerHeadings(markdown: string): boolean {
  return [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)].some((match) => {
    const title = match[1].trim();
    return FILLER_HEADING_RE.test(title) || STOCK_HEADING_RE.test(title);
  });
}

export function rewriteFillerHeadings(markdown: string, topic: string, industry: string): string {
  const topicLabel = humanize(topic) || 'this work';
  const industryLabel = humanize(industry) || 'this industry';
  const bank = voiceHeadingBank(topicLabel, industryLabel);
  let i = 0;
  const used = new Set<string>();
  return markdown.replace(/^(#{1,4})\s+(.+)$/gm, (_full, hashes: string, title: string) => {
    const trimmed = String(title).trim();
    if (!FILLER_HEADING_RE.test(trimmed) && !STOCK_HEADING_RE.test(trimmed)) {
      return `${hashes} ${trimmed}`;
    }
    let next = bank[i % bank.length];
    i += 1;
    while (used.has(next.toLowerCase())) {
      next = `${bank[i % bank.length]} — ${topicLabel}`;
      i += 1;
    }
    used.add(next.toLowerCase());
    return `${hashes} ${next}`;
  });
}

function overflowNotes(
  shape: ReturnType<typeof planArticleStructure>['shape'],
  topicLabel: string,
  industryLabel: string,
): Array<{ title: string; body: string }> {
  if (shape === 'compliance') {
    return [
      {
        title: 'What the file has to prove',
        body: `A ${industryLabel} ${topicLabel} record is useful only if someone can produce it on Thursday: who acted, when, and under which rule. If the answer lives in email, the evidence is already gone.`,
      },
      {
        title: 'Retention in the same system',
        body: `Keep the working file and the retained file in one path. A second “compliance folder” is how ${topicLabel} forks and how an auditor is shown the wrong version.`,
      },
      {
        title: 'Access that matches the role',
        body: `Who can see a ${topicLabel} file is part of the work, not a later IT ticket. Role, retention, and a trail a staff member can explain keep this ${industryLabel} practice publishable.`,
      },
      {
        title: 'The awkward call stays human',
        body: `Automation can surface a missing consent or an overdue review. It cannot take the client conversation. ${industryLabel} judgment stays with the person who can say yes or no.`,
      },
    ];
  }
  if (shape === 'roster') {
    return [
      {
        title: 'The 6am gap',
        body: `If nobody is named for the next ${topicLabel} block, ${industryLabel} already knows the call will land on the person who always picks up. Write the cover before the gap.`,
      },
      {
        title: 'Swaps that leave a trail',
        body: `A swap that exists only in a message is not coverage. The live ${topicLabel} record should show who is on after the change.`,
      },
    ];
  }
  if (shape === 'handover') {
    return [
      {
        title: 'What leave must not reset',
        body: `The next person inherits the object, the owner, and the next action. If they ask “where are we?”, ${topicLabel} is still tribal in this ${industryLabel} shop.`,
      },
    ];
  }
  return [
    {
      title: `What a ${industryLabel} week actually costs`,
      body: `Count the minutes spent reconstructing ${topicLabel} before a client conversation. That tax is the supporting point — not a second manifesto.`,
    },
    {
      title: 'One live path, then the join',
      body: `Late and dual-record cases should sit on one list with an age. Hide them in chat and they become folklore. Surface them in the same ${topicLabel} view used on Monday.`,
    },
    {
      title: 'A briefing from the live record',
      body: `${industryLabel} leaders should talk from the current ${topicLabel} record. If the pack is rebuilt in slides every week, the operating picture is a performance.`,
    },
  ];
}

function existingHeadings(markdown: string): Set<string> {
  return new Set(
    [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1].trim().toLowerCase()),
  );
}

/**
 * Deterministic consulting article: thesis, weighted headings, diagram with discussion.
 * Length bands deepen the main claim — they do not clone heading/paragraph blocks.
 */
export function buildOnTopicArticle(params: {
  industry: string;
  topic: string;
  title: string;
  brief?: string;
  minWords: number;
  maxWords: number;
  seed?: string;
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
    existingMarkdown: keepSeed ? seed : undefined,
  });
  const spine = plan.sections;
  const extras = overflowNotes(plan.shape, topicLabel, industryLabel);
  const used = keepSeed ? existingHeadings(seed) : new Set<string>();
  const picture = diagramDiscussion(topicLabel, industryLabel);

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

  const includeAsides = params.minWords >= 1100;
  const includeSupports = params.minWords >= 700;
  for (const section of spine) {
    if (section.role === 'aside' && !includeAsides) continue;
    if (section.role === 'support' && !includeSupports) continue;
    pushSection({
      title: section.title,
      level: section.level,
      paragraphs: paragraphsForWeight(
        section.weight,
        topicLabel,
        industryLabel,
        section.title,
        section.diagram,
      ),
      diagram: section.diagram,
    });
  }

  if (!parts.join('\n').includes(ARTICLE_DIAGRAM_SLOT) && !/:::diagram\s+\S+:::/.test(parts.join('\n'))) {
    parts.push(picture.before, ARTICLE_DIAGRAM_SLOT, picture.after);
  }

  let extra = 0;
  while (countWords(parts.join('\n\n')) < params.minWords && extra < extras.length) {
    const note = extras[extra];
    extra += 1;
    const key = note.title.trim().toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    parts.push(`#### ${note.title}`, note.body);
  }

  let markdown = parts.join('\n\n');
  if (countWords(markdown) < params.minWords) {
    markdown = fillArticleToBand(markdown, {
      industry: params.industry,
      topic: params.topic,
      title,
      minWords: params.minWords,
      maxWords: params.maxWords,
    });
  }
  return trimToMaxWords(markdown, params.maxWords);
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
  const rewritten = rewriteFillerHeadings(content, params.industry, params.topic);
  const stillFiller = markdownHasFillerHeadings(rewritten);
  const words = countWords(rewritten);
  if (words >= params.minWords && !stillFiller) {
    return words > params.maxWords ? trimToMaxWords(rewritten, params.maxWords) : rewritten;
  }
  const headingCount = splitArticleChunks(rewritten).filter((chunk) => chunk.level >= 2).length;
  if (!stillFiller && headingCount >= 2) {
    return fillArticleToBand(rewritten, params);
  }
  return buildOnTopicArticle({
    ...params,
    seed: stillFiller ? '' : rewritten,
  });
}
