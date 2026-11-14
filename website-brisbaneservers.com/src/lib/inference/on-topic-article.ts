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
  /^(going deeper(?:\s+on)?|working detail:?|practice note(?:\s+\d+)?|more on|a closer look(?:\s+at)?|digging(?:\s+deeper)?\s+into)\b/i;

function voiceHeadingBank(topicLabel: string, industryLabel: string): string[] {
  return [
    `What ${topicLabel} costs by Thursday`,
    `How ${industryLabel} staff actually brief`,
    `The exception that teaches`,
    `Handover that survives leave`,
    `Language the floor already uses`,
    `When not to add another field`,
    `Cadence that fits a lean week`,
    `Privacy as an operating note`,
    `What “done” means without a meeting`,
    `Pilot notes before you widen`,
    `Shadows, drives, and why they exist`,
    `Ten minutes or it is decoration`,
    `One object, one next action`,
    `The deputy when the owner is away`,
    `Close-out in the same record`,
    `Signals you can say in a sentence`,
    `Trust when the file and the floor disagree`,
    `A Monday pack that is not a performance`,
    `Where judgment stays human`,
    `What ${industryLabel} should refuse to automate`,
    `The first week’s real notes`,
    `Ageing exceptions, not folklore`,
    `A trail a staff member can explain`,
    `Why ${topicLabel} still stalls in chat`,
  ];
}

export function markdownHasFillerHeadings(markdown: string): boolean {
  return [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].some((match) =>
    FILLER_HEADING_RE.test(match[1].trim()),
  );
}

export function rewriteFillerHeadings(markdown: string, topic: string, industry: string): string {
  const topicLabel = humanize(topic) || 'this work';
  const industryLabel = humanize(industry) || 'this industry';
  const bank = voiceHeadingBank(topicLabel, industryLabel);
  let i = 0;
  const used = new Set<string>();
  return markdown.replace(/^(#{1,3})\s+(.+)$/gm, (_full, hashes: string, title: string) => {
    const trimmed = String(title).trim();
    if (!FILLER_HEADING_RE.test(trimmed)) return `${hashes} ${trimmed}`;
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

function overflowNotes(topicLabel: string, industryLabel: string): SubSection[] {
  return [
    {
      title: 'Handover completeness',
      body: `At each handoff, the next person should inherit the object, the owner, and the next action. If they have to ask “where are we?” then ${topicLabel} is still tribal knowledge in this ${industryLabel} shop.`,
    },
    {
      title: 'Exceptions that stay visible',
      body: `Late, incomplete, and dual-record cases should sit on one list with an age. Hide them in a chat thread and they become folklore. Surface them in the same ${topicLabel} view used on Monday.`,
    },
    {
      title: 'A briefing without rebuilding slides',
      body: `${industryLabel} leaders should be able to talk from the live record. If the pack is rebuilt in PowerPoint every week, the operating picture is a performance, not a practice.`,
    },
    {
      title: 'Access that matches the role',
      body: `Who can see a file is part of ${topicLabel}, not a later IT ticket. Role, retention, and a trail a staff member can explain are the Australian operating notes that keep this work publishable.`,
    },
    {
      title: 'Pilot notes from week one',
      body: `Write what actually happened: which field was skipped, which exception fired, who was away. Those notes are the spec. Widen the ${topicLabel} path only when they look like a normal ${industryLabel} week.`,
    },
    {
      title: 'Signals you can say in a sentence',
      body: `If a metric needs a footnote, drop it. Cycle time, exception count, and completeness at handover are enough for most ${industryLabel} stand-ups. Three numbers beat a decorated dashboard.`,
    },
    {
      title: 'The deputy and the calendar',
      body: `If the owner is away, ${topicLabel} still has to move. Name a deputy and put the fifteen-minute review on a calendar ${industryLabel} staff can see. Cadence that lives in someone’s head is not cadence.`,
    },
    {
      title: 'Close-out, not another folder',
      body: `When the job, episode, or booking is done, close it in the same record. A second “archive” folder is how ${topicLabel} forks. ${industryLabel} teams should find the end of the path without asking who keeps the real file.`,
    },
    {
      title: 'Shadows and personal drives',
      body: `If people keep a private spreadsheet “just in case”, the official ${topicLabel} path is too slow or too preachy. Shorten it. Then retire the shadow. Australian ${industryLabel} operators will not wait for a perfect schema.`,
    },
    {
      title: 'Ten minutes or it is decoration',
      body: `Time a real stand-up against the live view. If it takes longer than ten minutes to answer “what is true this morning?”, strip the ${topicLabel} board until it can. Decoration is worse than a short list.`,
    },
    {
      title: 'One object, one next action',
      body: `Every row should name the object and the next action. Status words without a verb are how ${industryLabel} work stalls. ${topicLabel} is a path, not a mood.`,
    },
    {
      title: 'What “done” looks like this Thursday',
      body: `Write done as a check a new staff member can apply: complete record, named owner, no open exception. If done needs a meeting to interpret, ${topicLabel} is still a brochure.`,
    },
    {
      title: 'Widen only after the notes look real',
      body: `A second team inherits the path that survived week one, not the slide. If ${industryLabel} leadership skips the notes, they will scale a fiction. Keep ${topicLabel} expansion boring and earned.`,
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
  const extras = overflowNotes(topicLabel, industryLabel);
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

  while (countWords(parts.join('\n\n')) < params.minWords) {
    const n = extra;
    extra += 1;
    const heading = voiceHeadingBank(topicLabel, industryLabel)[n % voiceHeadingBank(topicLabel, industryLabel).length];
    const key = heading.toLowerCase();
    if (used.has(key)) {
      if (extra > 40) break;
      continue;
    }
    used.add(key);
    parts.push(
      `#### ${heading}`,
      `On a live ${industryLabel} week, ${topicLabel} still needs a current fact, a named owner, and a next action that does not live in chat. Write it once, in the language the floor already uses.`,
    );
    if (extra > 40) break;
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
