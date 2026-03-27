/**
 * Origin for same-origin fetches during Astro SSR.
 * Always use the incoming request origin so `/api/*` hits the same host:port as the page
 * (fixes dev mismatches like default port 4321 vs actual 3000).
 */
export function getInternalFetchOrigin(astro: { url: URL }): string {
  return astro.url.origin;
}
