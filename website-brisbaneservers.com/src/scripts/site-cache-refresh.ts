/**
 * Deploy-aware cache reset. Auth cookies and cookie-consent stay.
 * HTML can be stale; /build-id.txt is never stored, so a new Pages deploy is visible
 * without a manual refresh.
 */

const BUILD_KEY = 'bs.siteBuild';
const RELOAD_GUARD_KEY = 'bs.cacheReloadOnce';
const BUILD_ID_URL = '/build-id.txt';

export function getSiteBuildStamp(): string {
  return (
    document.documentElement.getAttribute('data-build') ||
    document.body?.dataset?.build ||
    'unknown'
  );
}

async function readRemoteBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`${BUILD_ID_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'text/plain' },
    });
    if (!response.ok) return null;
    const id = (await response.text()).trim().slice(0, 40);
    if (!id || id === 'local-dev') return null;
    return id;
  } catch {
    return null;
  }
}

async function dropHttpCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
}

export async function refreshSiteCache(options?: { full?: boolean; remoteBuild?: string }): Promise<void> {
  const build = options?.remoteBuild || getSiteBuildStamp();
  const full = Boolean(options?.full);

  await dropHttpCaches();

  if (full) {
    try {
      const keep = new Set([BUILD_KEY, RELOAD_GUARD_KEY, 'cookie-consent-preference']);
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
    sessionStorage.setItem(RELOAD_GUARD_KEY, build);
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('refresh');
  url.searchParams.delete('cache');
  url.searchParams.set('_b', build.slice(0, 12));
  window.location.replace(url.toString());
}

async function applyRemoteBuildIfNewer(): Promise<void> {
  const remote = await readRemoteBuildId();
  if (!remote) return;
  let prev: string | null = null;
  let looping = false;
  try {
    prev = localStorage.getItem(BUILD_KEY);
    looping = sessionStorage.getItem(RELOAD_GUARD_KEY) === remote;
  } catch {
    /* ignore */
  }
  const htmlStamp = getSiteBuildStamp();
  if (looping) return;
  if (prev === remote && htmlStamp === remote) return;
  await refreshSiteCache({ remoteBuild: remote });
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

  void applyRemoteBuildIfNewer();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void applyRemoteBuildIfNewer();
  });
  window.setInterval(() => {
    void applyRemoteBuildIfNewer();
  }, 120000);
}
