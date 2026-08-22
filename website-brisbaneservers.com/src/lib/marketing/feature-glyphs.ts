/**
 * Named inline SVG glyphs for marketing and chrome.
 * Geometric stroke marks — unique to purpose, not generic icon-font metaphors.
 */

export const FEATURE_GLYPH_NAMES = [
  'semantic-search',
  'spelling-tolerant',
  'industry-index',
  'web-presence',
  'automation',
  'data-systems',
  'integration',
  'evidence',
  'phi-node',
  'professional-services',
  'retail',
  'healthcare',
  'hospitality',
  'construction',
  'finance',
  'manufacturing',
  'clients',
  'documents',
  'billing',
  'practice',
  'inventory',
  'commerce',
  'loyalty',
  'clinical',
  'privacy',
  'appointments',
  'booking',
  'pos',
  'quoting',
  'site-compliance',
  'reporting',
  'workflow',
  'shop-floor',
  'quality-trace',
  'insight',
  'partnership',
  'city',
  'credential',
  'location',
  'time',
  'complexity',
  'mission',
  'design',
  'delivery',
  'results',
  'grants',
  'community',
  'publishing',
  'tokens',
  'visibility',
  'identity',
  'book',
  'tradeoffs',
  'next',
  'conversation',
  'network',
  'server',
  'lock',
  'verified',
  'logistics',
  'craft',
  'warning',
  'send',
  'envelope',
  'pressure',
  'sliders',
  'map',
  'sequence',
  'speed',
  'layer',
  'check-double',
  'calendar',
  'robot',
  'approved',
  'growth',
  'plug',
  'check',
] as const;

export type FeatureGlyphName = (typeof FEATURE_GLYPH_NAMES)[number];

const FEATURE_GLYPH_NAME_SET = new Set<string>(FEATURE_GLYPH_NAMES);

export function isFeatureGlyphName(value: string | undefined): value is FeatureGlyphName {
  return Boolean(value && FEATURE_GLYPH_NAME_SET.has(value));
}

/** Inner SVG markup (viewBox 0 0 24 24, stroke inherited). */
export const FEATURE_GLYPH_INNER: Record<FeatureGlyphName, string> = {
  'semantic-search':
    '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><circle cx="8" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M8 13.5c1.2 1 2.8 1 4 0"/>',
  'spelling-tolerant':
    '<path d="M4 7h12"/><path d="M4 12h9"/><path d="M4 17h6"/><path d="M17 14l2 2 4-4"/><path d="M16 7c.5-1 1.5-1.5 2.5-1" opacity="0.55"/>',
  'industry-index':
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="17.5" r="1" fill="currentColor" stroke="none"/>',
  'web-presence':
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 3 2.5 15 0 18"/><path d="M12 3c-2.5 3-2.5 15 0 18"/>',
  automation:
    '<rect x="4" y="8" width="16" height="10" rx="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M8 17h8"/>',
  'data-systems':
    '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  integration:
    '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.7 10.8L15.3 7.2"/><path d="M8.7 13.2l6.6 3.6"/>',
  evidence:
    '<path d="M6 4h9l3 3v13H6z"/><path d="M15 4v3h3"/><path d="M9 12h6"/><path d="M9 16h4"/><circle cx="9" cy="8" r="1" fill="currentColor" stroke="none"/>',
  'phi-node':
    '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3"/><path d="M14 12h3"/>',
  'professional-services':
    '<rect x="4" y="8" width="16" height="11" rx="1.5"/><path d="M8 8V7a4 4 0 0 1 8 0v1"/><path d="M4 12h16"/><path d="M12 12v3"/>',
  retail:
    '<path d="M4 10l1.5-5h13L20 10"/><path d="M4 10v9h16v-9"/><path d="M9 19v-5h6v5"/><path d="M4 10h16"/><path d="M7 6.5h10" opacity="0.55"/>',
  healthcare:
    '<path d="M4 13c0-4 3.2-7 8-8 4.8 1 8 4 8 8 0 3.2-2.2 6.2-8 9-5.8-2.8-8-5.8-8-9z"/><path d="M8.5 13h7"/><path d="M12 9.5v7"/>',
  hospitality:
    '<circle cx="12" cy="13" r="6.5"/><path d="M12 6.5V4"/><path d="M9 4h6"/><path d="M8 13h8" opacity="0.55"/><path d="M12 13v6.5"/>',
  construction:
    '<path d="M5 20V10l7-5 7 5v10"/><path d="M9 20v-6h6v6"/><path d="M5 10h14"/><path d="M8 6.2l4-2.8 4 2.8" opacity="0.7"/>',
  finance:
    '<path d="M4 19V9"/><path d="M10 19V6"/><path d="M16 19v-8"/><path d="M22 19H2"/><path d="M4 9l6-3 6 5"/>',
  manufacturing:
    '<path d="M3 20V11l5-3v3l5-4v4l5-3v12z"/><path d="M8 20v-4h5v4"/><path d="M18 7v-3h3"/>',
  clients:
    '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8.5" r="2"/><path d="M3.5 19c.4-3.2 2.6-5 4.5-5s4.1 1.8 4.5 5"/><path d="M13 19c.3-2.4 1.8-3.8 3.2-3.8 1.5 0 2.9 1.3 3.3 3.8"/>',
  documents:
    '<path d="M7 4h8l4 4v12H7z"/><path d="M15 4v4h4"/><path d="M10 12h6"/><path d="M10 16h4"/><circle cx="10" cy="8.5" r="0.9" fill="currentColor" stroke="none"/>',
  billing:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8"/><path d="M9.5 10.2c.6-1 1.5-1.4 2.5-1.4 1.4 0 2.4.8 2.4 1.9 0 2.6-4.8 1.5-4.8 4.1 0 1.1 1 2 2.5 2 1.1 0 2-.5 2.5-1.3"/>',
  practice:
    '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-7h6v7"/><path d="M10 9h4"/><path d="M12 9V6.5"/>',
  inventory:
    '<path d="M4 8.5L12 4l8 4.5v9L12 22l-8-4.5z"/><path d="M12 13v9"/><path d="M4 8.5L12 13l8-4.5"/>',
  commerce:
    '<path d="M6 8h12l-1.2 9.5H7.2z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/><circle cx="9.5" cy="19.5" r="1"/><circle cx="15.5" cy="19.5" r="1"/>',
  loyalty:
    '<path d="M12 3.5l2.1 5.3 5.7.3-4.4 3.6 1.4 5.5L12 15.4 7.2 18.2l1.4-5.5L4.2 9.1l5.7-.3z"/><circle cx="12" cy="11.5" r="1.4" fill="currentColor" stroke="none"/>',
  clinical:
    '<rect x="5" y="4" width="14" height="16" rx="3"/><path d="M12 8v8"/><path d="M8 12h8"/>',
  privacy:
    '<path d="M12 3.5l7 3v5.5c0 4.4-3 7.4-7 8.5-4-1.1-7-4.1-7-8.5V6.5z"/><path d="M9 12.2l2 2 4-4.2"/>',
  appointments:
    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M9 15l2 2 4-4"/>',
  booking:
    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><circle cx="8.5" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="17.5" r="1" fill="currentColor" stroke="none"/>',
  pos:
    '<rect x="5" y="3.5" width="14" height="11" rx="1.5"/><path d="M8 18h8"/><path d="M10 14.5v3.5"/><path d="M14 14.5v3.5"/><path d="M8 8h8"/><path d="M8 11h5"/>',
  quoting:
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h3"/><path d="M13 8h3"/><path d="M8 12h3"/><path d="M13 12h3"/><path d="M8 16h8"/>',
  'site-compliance':
    '<path d="M8 5h8l2 2v13H6V7z"/><path d="M16 5v2h2"/><path d="M9 12l2 2 4-4"/><path d="M9 17h6"/>',
  reporting:
    '<path d="M6 4h9l3 3v13H6z"/><path d="M15 4v3h3"/><path d="M9 11h2v6H9z"/><path d="M13 9h2v8h-2z"/>',
  workflow:
    '<rect x="3" y="8" width="6" height="6" rx="1"/><rect x="15" y="8" width="6" height="6" rx="1"/><path d="M9 11h6"/><path d="M13.5 9l2 2-2 2"/><circle cx="12" cy="18" r="2"/>',
  'shop-floor':
    '<path d="M3 16h18"/><path d="M5 16V9h4v7"/><path d="M11 16V7h4v9"/><path d="M17 16v-5h3"/><path d="M3 19h18" opacity="0.45"/>',
  'quality-trace':
    '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/><path d="M7.5 10h5"/><path d="M10 7.5v5"/><circle cx="10" cy="10" r="1.5" opacity="0.6"/>',
  insight:
    '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.4V16H8v-2.6A6 6 0 0 1 12 3z"/><path d="M12 8v2.5"/>',
  partnership:
    '<circle cx="7" cy="9" r="2.5"/><circle cx="17" cy="9" r="2.5"/><path d="M4 19c.5-3.2 2.2-5 3.8-5 1.3 0 2.4 1 3.2 2.6"/><path d="M13 16.6c.8-1.6 1.9-2.6 3.2-2.6 1.6 0 3.3 1.8 3.8 5"/><path d="M10.2 12.2l3.6 0"/>',
  city:
    '<path d="M3 20h18"/><path d="M5 20V10h4v10"/><path d="M11 20V6h5v14"/><path d="M18 20v-7h3v7"/><path d="M13 9h1"/><path d="M13 12h1"/>',
  credential:
    '<circle cx="12" cy="10" r="5.5"/><path d="M8.5 15.2L7 21l5-2.2L17 21l-1.5-5.8"/><circle cx="12" cy="10" r="2" fill="currentColor" stroke="none"/>',
  location:
    '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/>',
  time:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.5 2"/>',
  complexity:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4"/><circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none"/><path d="M8 10.5h2" opacity="0.55"/><path d="M14 10.5h2" opacity="0.55"/>',
  mission:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  design:
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v4"/><path d="M12 17v4"/><path d="M5.6 6.4l2.8 2.8"/><path d="M15.6 14.8l2.8 2.8"/><path d="M3 12h4"/><path d="M17 12h4"/>',
  delivery:
    '<circle cx="8" cy="12" r="3.2"/><circle cx="16" cy="12" r="3.2"/><path d="M8 8.8V5"/><path d="M16 15.2V19"/><path d="M11.2 12h1.6"/>',
  results:
    '<path d="M4 19V9"/><path d="M10 19v-7"/><path d="M16 19V6"/><path d="M4 19h16"/>',
  grants:
    '<circle cx="12" cy="11" r="6"/><path d="M12 8.2v5.6"/><path d="M9.8 10c.5-.9 1.4-1.3 2.2-1.3 1.2 0 2.1.7 2.1 1.7 0 2.2-4.2 1.3-4.2 3.5 0 .9.8 1.6 2.1 1.6.9 0 1.7-.4 2.2-1.1"/><path d="M8 20h8" opacity="0.7"/>',
  community:
    '<circle cx="12" cy="7.5" r="2.4"/><circle cx="6.5" cy="9" r="1.8"/><circle cx="17.5" cy="9" r="1.8"/><path d="M7.2 19c.4-3 2.2-4.6 4.8-4.6s4.4 1.6 4.8 4.6"/><path d="M3.8 18.5c.3-2 1.5-3.2 3-3.2"/><path d="M17.2 15.3c1.5 0 2.7 1.2 3 3.2"/>',
  publishing:
    '<rect x="3.5" y="5" width="7.5" height="14" rx="1"/><rect x="13" y="5" width="7.5" height="14" rx="1"/><path d="M5.5 9h3.5"/><path d="M15 9h3.5"/><path d="M5.5 12h3.5"/><path d="M15 12h3.5"/>',
  tokens:
    '<ellipse cx="12" cy="8" rx="6.5" ry="2.6"/><path d="M5.5 8v4c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6V8"/><path d="M5.5 12v4c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6v-4"/>',
  visibility:
    '<path d="M2.8 12S6.5 6.5 12 6.5 21.2 12 21.2 12 17.5 17.5 12 17.5 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.6"/>',
  identity:
    '<circle cx="12" cy="8" r="3"/><path d="M5 20c.6-4 3-6.2 7-6.2S18.4 16 19 20"/>',
  book:
    '<path d="M4 5.5c2.2-1 4.4-.8 8 .8 3.6-1.6 5.8-1.8 8-.8v13c-2.2-1-4.4-.8-8 .8-3.6-1.6-5.8-1.8-8-.8z"/><path d="M12 6.3v13"/>',
  tradeoffs:
    '<path d="M12 3v4"/><path d="M12 7l-7 4h14z"/><path d="M7 11v3"/><path d="M17 11v3"/><circle cx="7" cy="16.5" r="2.5"/><circle cx="17" cy="16.5" r="2.5"/>',
  next: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  conversation:
    '<path d="M4 6h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2l-3-2"/>',
  network:
    '<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="7" r="2.2"/><circle cx="12" cy="17" r="2.2"/><circle cx="6" cy="17" r="2.2"/><path d="M8.1 7h7.8"/><path d="M7.4 9l3.4 6"/><path d="M16.6 9l-3.4 6"/><path d="M8.2 17H9.8"/>',
  server:
    '<rect x="4" y="4" width="16" height="5" rx="1.2"/><rect x="4" y="10" width="16" height="5" rx="1.2"/><rect x="4" y="16" width="16" height="4" rx="1.2"/><circle cx="7.2" cy="6.5" r="0.7" fill="currentColor" stroke="none"/><circle cx="7.2" cy="12.5" r="0.7" fill="currentColor" stroke="none"/>',
  lock:
    '<rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11"/><circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none"/>',
  verified:
    '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.2l2.6 2.6L16.4 9"/>',
  logistics:
    '<path d="M3 16V8h11v8"/><path d="M14 11h4.5L21 14.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  craft:
    '<circle cx="12" cy="12" r="3"/><path d="M12 5v2"/><path d="M12 17v2"/><path d="M6.4 7.6l1.5 1.5"/><path d="M16.1 14.9l1.5 1.5"/><path d="M5 12h2"/><path d="M17 12h2"/><path d="M6.4 16.4l1.5-1.5"/><path d="M16.1 9.1l1.5-1.5"/>',
  warning:
    '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="16.6" r="0.7" fill="currentColor" stroke="none"/>',
  send:
    '<path d="M4 12l16-8-6 16-2.5-7z"/><path d="M11.5 13L20 4"/>',
  envelope:
    '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 7l8.5 6.5L20.5 7"/>',
  pressure:
    '<path d="M8 4v6"/><path d="M16 4v6"/><path d="M5 10h14"/><path d="M8 20v-6"/><path d="M16 20v-6"/><path d="M5 14h14"/><path d="M12 8v8"/>',
  sliders:
    '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/><circle cx="9" cy="7" r="1.8" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="1.8" fill="currentColor" stroke="none"/>',
  map:
    '<path d="M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z"/><path d="M9 5v12"/><path d="M15 7v12"/><circle cx="12" cy="12" r="1.4"/>',
  sequence:
    '<path d="M4 7h10"/><path d="M4 12h16"/><path d="M4 17h10"/><path d="M14 5l4 2-4 2"/><path d="M14 15l4 2-4 2"/>',
  speed:
    '<path d="M13 3L5 14h6l-1 7 9-12h-6z"/>',
  layer:
    '<path d="M12 4l9 4.5-9 4.5L3 8.5z"/><path d="M4 12.5L12 17l8-4.5"/><path d="M4 16L12 20.5 20 16"/>',
  'check-double':
    '<path d="M3.5 12.5l3.5 3.5 7-8"/><path d="M10 15.5l2.5 2.5 8-9"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/>',
  robot:
    '<rect x="6" y="8" width="12" height="10" rx="2"/><path d="M12 8V5"/><circle cx="12" cy="4.2" r="1"/><circle cx="9.5" cy="12.2" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12.2" r="1" fill="currentColor" stroke="none"/><path d="M9 16h6"/><path d="M4 12h2"/><path d="M18 12h2"/>',
  approved:
    '<circle cx="9" cy="8" r="3"/><path d="M3.8 19c.5-3.4 2.6-5.2 5.2-5.2 1.6 0 3 .7 4 1.9"/><path d="M13 14.5l2.4 2.4L21 11.5"/>',
  growth:
    '<path d="M4 18h16"/><path d="M6 14l5-5 3 3 5-6"/><path d="M15 6h4v4"/>',
  plug:
    '<path d="M9 7V3"/><path d="M15 7V3"/><path d="M8 7h8v5a4 4 0 0 1-4 4v5"/><path d="M8 10H6"/><path d="M18 10h-2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

/** Hero satellite nodes — same stroke family as marketing glyphs. */
export const SATELLITE_GLYPH_NAMES: FeatureGlyphName[] = [
  'delivery',
  'speed',
  'data-systems',
  'privacy',
  'web-presence',
  'inventory',
  'design',
  'network',
  'insight',
  'automation',
  'lock',
  'sequence',
  'community',
  'results',
  'plug',
];

const FA_TO_GLYPH: Record<string, FeatureGlyphName> = {
  briefcase: 'professional-services',
  store: 'retail',
  heartbeat: 'healthcare',
  utensils: 'hospitality',
  'hard-hat': 'construction',
  'chart-line': 'finance',
  industry: 'manufacturing',
  users: 'clients',
  'file-alt': 'documents',
  'dollar-sign': 'grants',
  building: 'practice',
  boxes: 'inventory',
  'shopping-cart': 'commerce',
  star: 'loyalty',
  'user-md': 'clinical',
  'shield-alt': 'privacy',
  'calendar-check': 'appointments',
  'calendar-alt': 'booking',
  'cash-register': 'pos',
  calculator: 'quoting',
  'clipboard-check': 'site-compliance',
  'clipboard-list': 'site-compliance',
  'file-invoice': 'reporting',
  tasks: 'workflow',
  'conveyor-belt-boxes': 'shop-floor',
  'magnifying-glass-chart': 'quality-trace',
  search: 'semantic-search',
  'info-circle': 'complexity',
  clock: 'time',
  cogs: 'delivery',
  cog: 'delivery',
  'chart-bar': 'results',
  'hand-holding-usd': 'grants',
  plug: 'plug',
  database: 'data-systems',
  robot: 'robot',
  'drafting-compass': 'design',
  lightbulb: 'insight',
  handshake: 'partnership',
  city: 'city',
  certificate: 'credential',
  'map-marker-alt': 'location',
  bullseye: 'mission',
  bolt: 'speed',
  columns: 'publishing',
  coins: 'tokens',
  eye: 'visibility',
  'user-circle': 'identity',
  book: 'book',
  'balance-scale': 'tradeoffs',
  'arrow-right': 'next',
  comments: 'conversation',
  'network-wired': 'network',
  server: 'server',
  lock: 'lock',
  'check-circle': 'verified',
  'check-double': 'check-double',
  truck: 'logistics',
  palette: 'craft',
  'exclamation-triangle': 'warning',
  'paper-plane': 'send',
  'envelope-open-text': 'envelope',
  envelope: 'envelope',
  'compress-alt': 'pressure',
  'sliders-h': 'sliders',
  'map-marked-alt': 'map',
  stream: 'sequence',
  'layer-group': 'layer',
  'user-check': 'approved',
  'arrow-up': 'growth',
  check: 'check',
};

function faToken(value: string): string {
  const parts = value.trim().split(/\s+/);
  const marked = parts.find((part) => part.startsWith('fa-')) ?? parts[parts.length - 1] ?? '';
  return marked.replace(/^fa-/, '');
}

/**
 * Accept a glyph name or leftover Font Awesome class and return a FeatureGlyphName.
 */
export function resolveFeatureGlyph(
  value?: string | FeatureGlyphName | null,
): FeatureGlyphName | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (isFeatureGlyphName(trimmed)) return trimmed;
  const token = faToken(trimmed);
  if (isFeatureGlyphName(token)) return token;
  return FA_TO_GLYPH[token];
}

export function featureGlyphInner(name: FeatureGlyphName): string {
  return FEATURE_GLYPH_INNER[name];
}
