import type { InfographicSpec } from '../data/topic-guides/infographic-types';
import type { Resource } from './resource-types';
import { normalizeInfographicSpec } from './resource-infographic-spec';

export const MAX_RESOURCE_DIAGRAMS = 4;

export function listResourceInfographics(resource: Pick<Resource, 'metadata'> | null | undefined): InfographicSpec[] {
  const meta = resource?.metadata;
  if (!meta) return [];
  const raw = Array.isArray(meta.infographics)
    ? meta.infographics
    : meta.infographic
      ? [meta.infographic]
      : [];
  const out: InfographicSpec[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const spec = normalizeInfographicSpec(item, `diagram-${out.length + 1}`);
    if (!spec || seen.has(spec.id)) continue;
    seen.add(spec.id);
    out.push(spec);
  }
  return out;
}

export function diagramMarker(id: string): string {
  return `:::diagram ${id}:::`;
}

export function contentHasDiagramMarker(content: string, id: string): boolean {
  return content.includes(diagramMarker(id));
}

export function contentHasAnyDiagramMarker(content: string): boolean {
  return /:::diagram\s+\S+:::/.test(content);
}

const DIAGRAM_SLOT = ':::diagram-here:::';

const DIAGRAM_HEADING_SCORES: Array<{ re: RegExp; score: number }> = [
  { re: /how work actually runs|operating sequence|the join|live path|workflow/i, score: 10 },
  { re: /picture sits|diagram|figure|map the handoff/i, score: 8 },
  { re: /what good looks like|one live path|sequence/i, score: 6 },
  { re: /why .+ (matters|is the operating problem)|main point/i, score: 3 },
];

function headingScore(line: string): number {
  if (!/^#{1,4}\s+/.test(line)) return 0;
  let best = 0;
  for (const rule of DIAGRAM_HEADING_SCORES) {
    if (rule.re.test(line) && rule.score > best) best = rule.score;
  }
  return best;
}

function insertAfterFirstParagraph(lines: string[], headingAt: number, marker: string): string[] {
  let insertAt = headingAt + 1;
  while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt += 1;
  while (insertAt < lines.length && lines[insertAt].trim() !== '' && !/^#{1,4}\s+/.test(lines[insertAt])) {
    insertAt += 1;
  }
  const before = 'Read the picture with the sequence in mind: object of work, owner, exception path.';
  const after = 'Once the figure is in view, check whether the live record shows the same path. If the floor and the picture disagree, believe the floor.';
  const nearby = lines.slice(Math.max(0, headingAt), Math.min(lines.length, insertAt + 4)).join(' ');
  const discussed = /figure|picture|diagram|left to right/i.test(nearby);
  const chunk = discussed ? ['', marker, ''] : ['', before, '', marker, '', after, ''];
  lines.splice(insertAt, 0, ...chunk);
  return lines;
}

function discussExistingMarker(content: string, marker: string): string {
  const at = content.indexOf(marker);
  if (at < 0) return content;
  const window = content.slice(Math.max(0, at - 420), Math.min(content.length, at + marker.length + 420));
  if (/figure|picture|diagram|left to right/i.test(window.replace(marker, ''))) return content;
  return content.replace(
    marker,
    `Read the picture with the sequence in mind: object of work, owner, exception path.\n\n${marker}\n\nOnce the figure is in view, check whether the live record shows the same path.`,
  );
}

/**
 * Put the diagram beside the operating sequence and keep a short reading of the picture.
 */
export function insertDiagramAtRelevantPosition(content: string, id: string): string {
  if (contentHasDiagramMarker(content, id)) {
    return discussExistingMarker(content, diagramMarker(id));
  }
  const marker = diagramMarker(id);
  if (content.includes(DIAGRAM_SLOT)) {
    return discussExistingMarker(content.replace(DIAGRAM_SLOT, marker), marker);
  }
  const trimmed = content.trimEnd();
  const lines = trimmed.split('\n');
  let bestAt = -1;
  let bestScore = 0;
  lines.forEach((line, index) => {
    const score = headingScore(line);
    if (score > bestScore) {
      bestScore = score;
      bestAt = index;
    }
  });
  if (bestAt >= 0) {
    return insertAfterFirstParagraph(lines, bestAt, marker).join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const firstH2 = lines.findIndex((line) => /^##\s+/.test(line));
  if (firstH2 >= 0) {
    return insertAfterFirstParagraph(lines, firstH2, marker).join('\n').replace(/\n{3,}/g, '\n\n');
  }
  return discussExistingMarker(`${trimmed}\n\n${marker}\n`, marker);
}

export function appendDiagramMarker(content: string, id: string): string {
  return insertDiagramAtRelevantPosition(content, id);
}

export function stripDiagramSlot(content: string): string {
  return content.replace(/\n*:::diagram-here:::\n*/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function mergeResourceInfographics(
  existing: InfographicSpec[],
  next: InfographicSpec,
  replaceId?: string,
): InfographicSpec[] {
  if (replaceId) {
    const idx = existing.findIndex((s) => s.id === replaceId);
    if (idx >= 0) {
      const copy = [...existing];
      copy[idx] = { ...next, id: replaceId };
      return copy;
    }
  }
  if (existing.some((s) => s.id === next.id)) {
    return existing.map((s) => (s.id === next.id ? next : s));
  }
  return [...existing, next].slice(0, MAX_RESOURCE_DIAGRAMS);
}

export function infographicsMetadata(specs: InfographicSpec[]): {
  infographic?: InfographicSpec;
  infographics: InfographicSpec[];
} {
  return {
    infographic: specs[0],
    infographics: specs,
  };
}
