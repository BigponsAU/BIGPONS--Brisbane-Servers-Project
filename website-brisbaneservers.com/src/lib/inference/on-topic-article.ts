import { containsDesignSystemJargon } from './topic-fidelity';

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function humanize(value: string): string {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimToMaxWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}…`;
}

/**
 * Deterministic consulting article that stays on industry/topic and hits the
 * selected word band. Used when the model is short, capped, or unavailable —
 * never a 30-word stub.
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
  const keepSeed =
    seed.length > 80 &&
    countWords(seed) >= 40 &&
    !containsDesignSystemJargon(seed) &&
    !/Knowledge base context:/i.test(seed);

  const blocks: string[] = [];
  if (keepSeed) {
    blocks.push(seed);
  } else {
    blocks.push(`# ${title}`);
    blocks.push(
      `${topicLabel} is how ${industryLabel} teams keep day-to-day work coherent — one picture of what is happening, who owns the next step, and what “done” looks like before the week runs away from you.`,
    );
    if (brief) blocks.push(brief);
  }

  const extras = [
    `## Why this matters for ${industryLabel}\n\nWhen ${topicLabel} lives in inboxes, side spreadsheets, and hallway updates, the same question is answered three times and still arrives late. Australian ${industryLabel} operators feel that as overtime, missed handovers, and a public-facing story that does not match the floor. A usable ${topicLabel} practice puts the operating facts in one place so managers can brief from evidence, not memory.`,
    `## What good looks like\n\nA healthy ${topicLabel} setup is boring in the best way: status is current, exceptions are visible, and new staff can follow the path without a private legend. For ${industryLabel} that means naming owners, timeboxes, and the few numbers that actually change a decision. If a dashboard cannot support a Monday stand-up in under ten minutes, it is decoration.`,
    `## How work actually runs\n\nMost ${industryLabel} groups already capture fragments of ${topicLabel} — a booking note here, a compliance folder there, a chat thread that “everyone knows”. The gap is the join. Sequence capture, review, and close-out so the next person inherits context instead of reconstructing it. Write the path as it is done on a busy Thursday, not as a brochure.`,
    `## Practical sequence\n\nStart with one live workflow, not a platform tour. Map the handoffs for ${topicLabel}, drop fields nobody uses, and agree the exception path when something is late or incomplete. Pilot with a single team in the ${industryLabel} setting, keep the language they already use, then widen only after the first week’s notes look like the real week.`,
    `## Risks if you leave it loose\n\nFragmented ${topicLabel} shows up as double handling, quiet non-compliance, and a client or patient story that contradicts the file. In ${industryLabel}, that is not a branding problem — it is a trust and audit problem. Name the failure modes (lost update, two sources of truth, no owner) and give each a short control, not a new slogan.`,
    `## Evidence you can brief from\n\nDecide three to five signals that prove ${topicLabel} is working: cycle time, exception count, completeness at handover, and whether the same fact appears twice. ${industryLabel} leaders should be able to point at those signals in a conversation with staff. If the metric cannot be explained in a sentence, drop it.`,
    `## Roles and cadence\n\nGive ${topicLabel} a named owner, a deputy, and a weekly fifteen-minute review. The owner is not “the system”; it is a person who can say yes or no. In ${industryLabel} shops that already run lean, cadence beats software. Publish the calendar, keep notes short, and close actions in the same place the work lives.`,
    `## What to keep human\n\nAutomation can move ${topicLabel} facts; it cannot own the awkward call. Keep judgment, client or patient language, and exception handling with people who understand ${industryLabel} context. Use the system to surface what is stale or missing so those conversations happen earlier, not to pretend the conversation is optional.`,
    `## Australian operating notes\n\nPrivacy, record-keeping, and “who can see this” are not afterthoughts. Design ${topicLabel} so access matches role, retention is obvious, and a staff member can explain the trail if asked. ${industryLabel} teams that export to a personal drive “just this once” recreate the fragmentation this page is trying to retire.`,
    `## A first ninety days\n\nDays 1–30: one workflow, one team, current ${topicLabel} facts only. Days 31–60: exceptions and a visible owner. Days 61–90: the briefing pack a manager can use without rebuilding slides. If ${industryLabel} leadership cannot run the last of those from the live record, you are not done.`,
    `## Language to use on the floor\n\nPrefer “what is true as of this morning” over “the platform says”. For ${topicLabel}, name the object (job, episode, booking, file) and the next action. ${industryLabel} staff trust tools that sound like their week. If a label needs a glossary, rename it.`,
    `## When to stop adding fields\n\nEvery extra field in ${topicLabel} is a tax. If it is not used in a decision this month, hide it. ${industryLabel} teams will invent shadow notes if the official form is a lecture. Completeness at the handoff beats completeness of the schema.`,
  ];

  let i = 0;
  while (countWords(blocks.join('\n\n')) < params.minWords && i < extras.length * 3) {
    const extra = extras[i % extras.length];
    const pass = Math.floor(i / extras.length);
    blocks.push(
      pass === 0
        ? extra
        : extra.replace(
            '## ',
            `## ${pass === 1 ? 'Going deeper on ' : 'Working detail: '}`,
          ),
    );
    i += 1;
  }

  return trimToMaxWords(blocks.join('\n\n'), params.maxWords);
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
  const words = countWords(content);
  if (words >= params.minWords) {
    return words > params.maxWords ? trimToMaxWords(content, params.maxWords) : content;
  }
  return buildOnTopicArticle({
    ...params,
    seed: content,
  });
}
