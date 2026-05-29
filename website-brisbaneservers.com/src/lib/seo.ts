/**
 * SEO helpers — titles, canonical URLs, and JSON-LD graph nodes.
 */

export const SEO_BRAND = 'Brisbane Servers';
export const SEO_TITLE_SUFFIX = ` | ${SEO_BRAND}`;
export const SEO_LOCALE = 'en_AU';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/** Normalize page titles to `{Page} | Brisbane Servers`. */
export function formatPageTitle(pageTitle: string): string {
  const trimmed = pageTitle.trim();
  if (!trimmed) return SEO_BRAND;

  if (trimmed.endsWith(SEO_TITLE_SUFFIX)) {
    return trimmed;
  }

  const legacySuffix = ` - ${SEO_BRAND}`;
  if (trimmed.endsWith(legacySuffix)) {
    return `${trimmed.slice(0, -legacySuffix.length)}${SEO_TITLE_SUFFIX}`;
  }

  if (trimmed === `${SEO_BRAND} - Elite Technology Solutions`) {
    return `Elite Technology Solutions${SEO_TITLE_SUFFIX}`;
  }

  if (trimmed.startsWith(`${SEO_BRAND} - `)) {
    return `${trimmed.slice(`${SEO_BRAND} - `.length)}${SEO_TITLE_SUFFIX}`;
  }

  if (trimmed === SEO_BRAND) {
    return SEO_BRAND;
  }

  return `${trimmed}${SEO_TITLE_SUFFIX}`;
}

/** Build an absolute canonical URL, respecting Astro `base` when pathname omits it. */
export function buildCanonicalUrl(pathname: string, siteOrigin: string, baseUrl = '/'): string {
  const origin = siteOrigin.replace(/\/$/, '');
  const base = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const withBase =
    base && !path.startsWith(base)
      ? `${base}${path}`.replace(/\/{2,}/g, '/')
      : path;
  return new URL(withBase, `${origin}/`).href;
}

export function buildWebSiteJsonLd(siteOrigin: string, description: string): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    name: SEO_BRAND,
    url: siteOrigin,
    description,
    inLanguage: 'en-AU',
  };
}

export function buildOrganizationJsonLd(siteOrigin: string): Record<string, unknown> {
  return {
    '@type': 'Organization',
    name: SEO_BRAND,
    url: siteOrigin,
    email: 'support@brisbaneservers.com',
    logo: buildCanonicalUrl('/src/logo.png', siteOrigin),
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'BIGPONS',
    },
  };
}

export function buildBreadcrumbListJsonLd(
  items: BreadcrumbItem[],
  siteOrigin: string,
  baseUrl = '/',
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const entry: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
      };
      if (item.href) {
        entry.item = buildCanonicalUrl(item.href, siteOrigin, baseUrl);
      }
      return entry;
    }),
  };
}

export type ArticleJsonLdInput = {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  articleSection?: string;
};

export function buildArticleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  const graph: Record<string, unknown> = {
    '@type': 'TechArticle',
    headline: input.headline,
    description: input.description,
    url: input.url,
    inLanguage: 'en-AU',
    publisher: {
      '@type': 'Organization',
      name: SEO_BRAND,
    },
  };

  if (input.datePublished) graph.datePublished = input.datePublished;
  if (input.dateModified) graph.dateModified = input.dateModified;
  if (input.articleSection) graph.articleSection = input.articleSection;
  if (input.authorName) {
    graph.author = { '@type': 'Organization', name: input.authorName };
  }

  return graph;
}

export function mergeJsonLdGraph(
  ...nodes: Array<Record<string, unknown> | undefined | null>
): string {
  const graph = nodes.filter(Boolean) as Record<string, unknown>[];
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

/** ISO date (YYYY-MM-DD) for sitemap lastmod. */
export function toSitemapLastmod(value?: string | Date): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}
