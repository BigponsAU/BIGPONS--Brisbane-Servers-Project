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

  if (!trimmed) {
    if (!hash) return SITE_BASE;
    const base = SITE_BASE.replace(/\/$/, '');
    return base ? `${base}${hash}` : `/${hash}`;
  }
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

/** Normalize search-index / content URLs to site-root paths (strip .html, apply BASE_URL). */
export function resolveContentPath(url: string | undefined, base: string = SITE_BASE): string {
  if (!url || url === '#') return '#';
  if (/^https?:\/\//i.test(url)) return url;

  let path = url.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
  if (!path.startsWith('/')) path = `/${path}`;

  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  if (trimmedBase && trimmedBase !== '' && trimmedBase !== '/') {
    if (!path.startsWith(trimmedBase)) {
      return `${trimmedBase}${path}`;
    }
  }
  return path;
}
