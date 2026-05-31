export type PageValueProfile = 'foundation' | 'evidence' | 'utility';
export type PageZoomProfile = 'immersive' | 'balanced' | 'focused';
export type PageShellVariant = 'public' | 'portal' | 'marketing';
export type PageDensity = 'airy' | 'comfortable' | 'compact';

export interface PageDescriptor {
  pageId: string;
  shellVariant: PageShellVariant;
  valueProfile: PageValueProfile;
  zoomProfile: PageZoomProfile;
  density: PageDensity;
}

const defaultDescriptor: PageDescriptor = {
  pageId: 'default',
  shellVariant: 'public',
  valueProfile: 'foundation',
  zoomProfile: 'balanced',
  density: 'comfortable',
};

const exactDescriptors: Record<string, PageDescriptor> = {
  '/': {
    pageId: 'home',
    shellVariant: 'public',
    valueProfile: 'foundation',
    zoomProfile: 'immersive',
    density: 'airy',
  },
  '/about': {
    pageId: 'about',
    shellVariant: 'public',
    valueProfile: 'foundation',
    zoomProfile: 'balanced',
    density: 'comfortable',
  },
  '/services': {
    pageId: 'services',
    shellVariant: 'public',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'comfortable',
  },
  '/projects': {
    pageId: 'projects',
    shellVariant: 'public',
    valueProfile: 'evidence',
    zoomProfile: 'balanced',
    density: 'comfortable',
  },
  '/resources': {
    pageId: 'resources',
    shellVariant: 'public',
    valueProfile: 'evidence',
    zoomProfile: 'focused',
    density: 'comfortable',
  },
  '/contribute': {
    pageId: 'contribute',
    shellVariant: 'public',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'compact',
  },
  '/account': {
    pageId: 'account',
    shellVariant: 'marketing',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'comfortable',
  },
  '/portal': {
    pageId: 'account',
    shellVariant: 'marketing',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'comfortable',
  },
  '/privacy-policy': {
    pageId: 'privacy-policy',
    shellVariant: 'public',
    valueProfile: 'evidence',
    zoomProfile: 'focused',
    density: 'compact',
  },
  '/terms-of-service': {
    pageId: 'terms-of-service',
    shellVariant: 'public',
    valueProfile: 'evidence',
    zoomProfile: 'focused',
    density: 'compact',
  },
};

const prefixDescriptors: Array<{ prefix: string; descriptor: PageDescriptor }> = [
  {
    prefix: '/resources/item',
    descriptor: {
      pageId: 'resource-detail',
      shellVariant: 'public',
      valueProfile: 'evidence',
      zoomProfile: 'focused',
      density: 'compact',
    },
  },
  {
    prefix: '/resources/',
    descriptor: {
      pageId: 'resource-topic',
      shellVariant: 'public',
      valueProfile: 'evidence',
      zoomProfile: 'focused',
      density: 'comfortable',
    },
  },
  {
    prefix: '/case-studies/',
    descriptor: {
      pageId: 'case-study',
      shellVariant: 'public',
      valueProfile: 'evidence',
      zoomProfile: 'balanced',
      density: 'comfortable',
    },
  },
];

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '');
}

export function getPageDescriptor(pathname: string): PageDescriptor {
  const normalizedPathname = normalizePathname(pathname);

  if (exactDescriptors[normalizedPathname]) {
    return exactDescriptors[normalizedPathname];
  }

  const prefixMatch = prefixDescriptors.find(({ prefix }) => normalizedPathname.startsWith(prefix));
  if (prefixMatch) {
    return prefixMatch.descriptor;
  }

  return {
    ...defaultDescriptor,
    pageId: normalizedPathname === '/' ? defaultDescriptor.pageId : normalizedPathname.slice(1).replace(/\//g, '-'),
  };
}
