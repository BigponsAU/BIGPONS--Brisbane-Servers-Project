export type PageValueProfile = 'foundation' | 'evidence' | 'utility';
export type PageZoomProfile = 'immersive' | 'balanced' | 'focused';
export type PageShellVariant = 'marketing' | 'portal';
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
  shellVariant: 'marketing',
  valueProfile: 'foundation',
  zoomProfile: 'balanced',
  density: 'comfortable',
};

const exactDescriptors: Record<string, PageDescriptor> = {
  '/': {
    pageId: 'home',
    shellVariant: 'marketing',
    valueProfile: 'foundation',
    zoomProfile: 'immersive',
    density: 'airy',
  },
  '/about': {
    pageId: 'about',
    shellVariant: 'marketing',
    valueProfile: 'foundation',
    zoomProfile: 'balanced',
    density: 'comfortable',
  },
  '/services': {
    pageId: 'services',
    shellVariant: 'marketing',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'comfortable',
  },
  '/projects': {
    pageId: 'projects',
    shellVariant: 'marketing',
    valueProfile: 'evidence',
    zoomProfile: 'balanced',
    density: 'comfortable',
  },
  '/resources': {
    pageId: 'resources',
    shellVariant: 'marketing',
    valueProfile: 'evidence',
    zoomProfile: 'focused',
    density: 'comfortable',
  },
  '/contribute': {
    pageId: 'contribute',
    shellVariant: 'marketing',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'compact',
  },
  '/portal': {
    pageId: 'portal',
    shellVariant: 'portal',
    valueProfile: 'utility',
    zoomProfile: 'focused',
    density: 'compact',
  },
  '/privacy-policy': {
    pageId: 'privacy-policy',
    shellVariant: 'marketing',
    valueProfile: 'evidence',
    zoomProfile: 'focused',
    density: 'compact',
  },
  '/terms-of-service': {
    pageId: 'terms-of-service',
    shellVariant: 'marketing',
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
      shellVariant: 'marketing',
      valueProfile: 'evidence',
      zoomProfile: 'focused',
      density: 'compact',
    },
  },
  {
    prefix: '/resources/',
    descriptor: {
      pageId: 'resource-topic',
      shellVariant: 'marketing',
      valueProfile: 'evidence',
      zoomProfile: 'focused',
      density: 'comfortable',
    },
  },
  {
    prefix: '/case-studies/',
    descriptor: {
      pageId: 'case-study',
      shellVariant: 'marketing',
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
