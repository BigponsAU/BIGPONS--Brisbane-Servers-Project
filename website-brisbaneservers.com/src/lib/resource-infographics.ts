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

export function appendDiagramMarker(content: string, id: string): string {
  if (contentHasDiagramMarker(content, id)) return content;
  const trimmed = content.trimEnd();
  return `${trimmed}\n\n${diagramMarker(id)}\n`;
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
