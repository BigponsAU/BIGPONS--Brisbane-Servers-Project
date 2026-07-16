/**
 * User-facing site cache reset — clears Cache Storage + soft-reloads with a bust token.
 * Auth session tokens in localStorage/sessionStorage are preserved unless `full=1`.
 */

const BUILD_KEY = 'bs.siteBuild';
const RELOAD_GUARD_KEY = 'bs.cacheReloadOnce';

export function getSiteBuildStamp(): string {
  return (
    document.documentElement.getAttribute('data-build') ||
    document.body?.dataset?.build ||
    'unknown'
  );
}

export async function refreshSiteCache(options?: { full?: boolean }): Promise<void> {
  const build = getSiteBuildStamp();
  const full = Boolean(options?.full);

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }

  if (full) {
    try {
      const keep = new Set([BUILD_KEY, RELOAD_GUARD_KEY]);
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && !keep.has(k)) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  try {
    localStorage.setItem(BUILD_KEY, build);
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('refresh');
  url.searchParams.delete('cache');
  url.searchParams.set('_v', build.slice(0, 12));
  window.location.replace(url.toString());
}

declare global {
  interface Window {
    __bsRefreshSite?: (opts?: { full?: boolean }) => void;
  }
}

export function installSiteCacheRefreshApi(): void {
  window.__bsRefreshSite = (opts) => {
    void refreshSiteCache(opts);
  };

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const trigger = target?.closest?.('[data-site-cache-refresh]') as HTMLElement | null;
    if (!trigger) return;
    event.preventDefault();
    const full = trigger.getAttribute('data-site-cache-refresh') === 'full';
    void refreshSiteCache({ full });
  });
}
