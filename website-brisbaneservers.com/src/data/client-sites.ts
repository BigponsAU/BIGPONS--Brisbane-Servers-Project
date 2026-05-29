/**
 * Public web presences we have delivered — curated list; add entries as you ship more.
 * Optional `previewImage` is a path under `/public` (e.g. `/client-previews/example.webp`).
 */
export type ClientSite = {
  name: string;
  url: string;
  tagline: string;
  previewImage?: string;
};

export const clientSites: ClientSite[] = [
  {
    name: 'Cool Finance',
    url: 'https://coolfinance.com.au/',
    tagline: 'Finance brand site — public-facing presence and information architecture.',
    previewImage: '/client-previews/coolfinance.png',
  },
];
