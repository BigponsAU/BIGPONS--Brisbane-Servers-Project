import type { SectionSatelliteVariant } from '../lib/section-satellite-graph';

/** Canonical semantic keys for home band satellites — shared by section + gutter echo so topology matches. */
export const HOME_BAND_SEMANTIC_KEYS: Record<SectionSatelliteVariant, string> = {
  strategy: 'clarify operating reality priorities path costs constraints outcomes',
  industry: 'regulations operational constraints sector patterns resources',
  proof: 'implementation proof measurable practical improvement evidence',
  contact: 'discuss technology needs Australian businesses consultation',
  about: 'BIGPONS mission truth technology Australian domestic growth',
  challenge: 'complex technology decisions operations evidence guidance context',
  solutions: 'documented implementations industry insights measurable value grants',
  partnership: 'research evaluation documentation tradeoffs Australian market regulatory',
};

export const HOME_BAND_ORDER: SectionSatelliteVariant[] = [
  'strategy',
  'industry',
  'proof',
  'contact',
  'about',
  'challenge',
  'solutions',
  'partnership',
];
