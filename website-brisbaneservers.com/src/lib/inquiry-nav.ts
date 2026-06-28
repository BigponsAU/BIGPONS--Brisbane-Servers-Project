/** Map public routes to their on-page inquiry section anchor ids. */
const INQUIRY_SECTION_BY_PATH: Record<string, string> = {
  '/services': 'consultation',
};

const DEFAULT_INQUIRY_SECTION = 'inquiry-section';

function pathHasInquirySection(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (normalized in INQUIRY_SECTION_BY_PATH || normalized === '/') return true;
  if (
    normalized === '/about' ||
    normalized === '/resources' ||
    normalized === '/brisbane-2032' ||
    normalized === '/case-studies'
  ) {
    return true;
  }
  if (normalized.startsWith('/case-studies/')) return true;
  if (normalized.startsWith('/resources/')) return true;
  return false;
}

export function inquirySectionId(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return INQUIRY_SECTION_BY_PATH[normalized] ?? DEFAULT_INQUIRY_SECTION;
}

export function inquiryNavHref(pathname: string, sitePath: (path: string) => string): string {
  if (pathname === '/account' || pathname.startsWith('/account/')) {
    return sitePath(`/#${DEFAULT_INQUIRY_SECTION}`);
  }

  const normalized = pathname.replace(/\/$/, '') || '/';
  if (!pathHasInquirySection(normalized)) {
    return sitePath(`/#${DEFAULT_INQUIRY_SECTION}`);
  }

  const sectionId = inquirySectionId(normalized);
  const base = normalized === '/' ? '/' : normalized;
  return sitePath(`${base}#${sectionId}`);
}

/** Prefer the form heading for scroll/focus — falls back to the section root. */
export function resolveInquiryScrollTarget(sectionId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const section = document.getElementById(sectionId);
  if (!section) return null;
  return (
    (section.querySelector('.inquiry-form-title') as HTMLElement | null) ??
    (section.querySelector('.inquiry-form') as HTMLElement | null) ??
    section
  );
}
