import type { InfographicSpec } from '../infographic-types';
import { infographicSpecs } from './specs';

export function getGuideInfographicKey(industrySlug: string, topicSlug?: string): string {
  if (topicSlug) {
    return `${industrySlug}/${topicSlug}`;
  }
  return `${industrySlug}/overview`;
}

export function getInfographicSpec(industrySlug: string, topicSlug?: string): InfographicSpec | undefined {
  return infographicSpecs[getGuideInfographicKey(industrySlug, topicSlug)];
}

export { infographicSpecs };
