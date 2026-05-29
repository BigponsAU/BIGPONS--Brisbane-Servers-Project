/**
 * Remote fallback thumbnail when no local `/public/client-previews/*` asset exists.
 * Prefer committing `previewImage` in client-sites.ts for production reliability.
 */
export function clientSitePreviewSrc(url: string, width = 1200): string {
  const target = url.trim();
  if (!target) return '';
  const encoded = encodeURIComponent(target);
  return `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`;
}
