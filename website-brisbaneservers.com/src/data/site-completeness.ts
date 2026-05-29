/**
 * Honest inventory of public-site content status — used on hubs and internal reference.
 */

export type CompletenessStatus = 'published' | 'overview-only' | 'planned';

export type SiteCompletenessItem = {
  id: string;
  label: string;
  status: CompletenessStatus;
  href?: string;
  note: string;
};

/** Industry hubs: topic guides vs overview-only */
export const industryHubStatus: SiteCompletenessItem[] = [
  {
    id: 'professional-services',
    label: 'Professional services',
    status: 'published',
    href: '/resources/professional-services',
    note: 'Full topic guides published.',
  },
  {
    id: 'retail',
    label: 'Retail and e-commerce',
    status: 'published',
    href: '/resources/retail',
    note: 'Full topic guides published.',
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    status: 'published',
    href: '/resources/healthcare',
    note: 'Full topic guides published.',
  },
  {
    id: 'hospitality',
    label: 'Hospitality',
    status: 'published',
    href: '/resources/hospitality',
    note: 'Full topic guides published.',
  },
  {
    id: 'construction',
    label: 'Construction and trades',
    status: 'overview-only',
    href: '/resources/construction',
    note: 'Industry overview guide live; topic guides expanding.',
  },
  {
    id: 'finance',
    label: 'Finance and accounting',
    status: 'overview-only',
    href: '/resources/finance',
    note: 'Industry overview guide live; topic guides expanding.',
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    status: 'overview-only',
    href: '/resources/manufacturing',
    note: 'Industry overview guide live; topic guides expanding.',
  },
];

/** Public web presences — curated client list */
export const clientPresenceStatus: SiteCompletenessItem[] = [
  {
    id: 'cool-finance',
    label: 'Cool Finance',
    status: 'published',
    href: 'https://coolfinance.com.au/',
    note: 'Live public site; listed on Projects and home.',
  },
];
