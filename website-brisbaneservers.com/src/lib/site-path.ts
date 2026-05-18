const SITE_BASE = import.meta.env.BASE_URL;

/** Prefix an app path with Astro `base` (e.g. GitHub Pages project subpath). */
export function sitePath(path: string): string {
  if (!path) return SITE_BASE;
  if (/^(?:https?:|mailto:|tel:)/i.test(path)) return path;
  if (path.startsWith('#')) return path;

  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const pathOnly = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const trimmed = pathOnly.replace(/^\//, '').replace(/\/+$/, '');

  if (!trimmed) return `${SITE_BASE}${hash}`.replace(/\/#/, '#') || SITE_BASE;
  return `${SITE_BASE}${trimmed}${hash}`;
}

export function siteBase(): string {
  return SITE_BASE;
}

/** Pathname with Astro base stripped — for client-side route matching. */
export function stripSiteBase(pathname: string): string {
  const base = SITE_BASE;
  if (base === '/') return pathname || '/';
  if (pathname === base || pathname === base.replace(/\/$/, '')) return '/';
  if (pathname.startsWith(base)) {
    const rest = pathname.slice(base.length - 1);
    return rest || '/';
  }
  return pathname;
}
