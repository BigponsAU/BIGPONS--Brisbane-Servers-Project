/** Map public routes to their on-page inquiry section / form anchor ids. */
const INQUIRY_SECTION_BY_PATH: Record<string, string> = {
  '/services': 'consultation',
};

const DEFAULT_INQUIRY_SECTION = 'inquiry-section';

export function inquirySectionId(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return INQUIRY_SECTION_BY_PATH[normalized] ?? DEFAULT_INQUIRY_SECTION;
}

/** Hash target for the visible form card (not the page footer). */
export function inquiryFormHash(pathname: string): string {
  return `${inquirySectionId(pathname)}-form`;
}

export function inquiryNavHref(pathname: string, sitePath: (path: string) => string): string {
  if (pathname === '/account' || pathname.startsWith('/account/')) {
    return sitePath(`/#${DEFAULT_INQUIRY_SECTION}-form`);
  }

  const normalized = pathname.replace(/\/$/, '') || '/';
  const hash = inquiryFormHash(normalized);
  const base = normalized === '/' ? '/' : normalized;
  return sitePath(`${base}#${hash}`);
}
