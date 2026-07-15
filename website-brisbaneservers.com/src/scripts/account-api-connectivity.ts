/**
 * API connectivity banner — surfaces reachability of the edge API on /account.
 * Stays hidden on the healthy path so sign-in does not flash an API endpoint strip.
 */
import { getPortalRuntime, isApiBaseHealthy } from './account-workspace-runtime';

type BannerState = 'ok' | 'warn' | 'error';

function getBanner(): HTMLElement | null {
  return document.getElementById('api-connectivity-banner');
}

function setBannerState(state: BannerState, message: string, endpoint: string): void {
  const banner = getBanner();
  if (!banner) return;

  banner.dataset.state = state;
  // Only surface the banner when the API is unreachable — never during routine checks.
  banner.hidden = state !== 'error';
  banner.setAttribute('aria-hidden', state === 'error' ? 'false' : 'true');

  const messageEl = banner.querySelector('[data-connectivity-message]');
  if (messageEl) messageEl.textContent = message;

  const endpointEl = banner.querySelector('.api-connectivity-endpoint');
  if (endpointEl) endpointEl.textContent = endpoint;
}

export async function syncApiConnectivityBanner(): Promise<void> {
  const banner = getBanner();
  if (!banner) return;

  const rt = getPortalRuntime();
  const endpoint = (rt.voiceApiUrl || '/api').replace(/\/+$/, '');

  const healthy = await isApiBaseHealthy(endpoint);
  if (healthy) {
    setBannerState('ok', 'API connected.', endpoint);
    return;
  }

  setBannerState(
    'error',
    'Cannot reach the API. Sign-in, resources, and voice tools may not work until connectivity is restored.',
    endpoint,
  );
}

export function initApiConnectivityBanner(): void {
  void syncApiConnectivityBanner();

  document.getElementById('api-connectivity-retry')?.addEventListener('click', () => {
    void syncApiConnectivityBanner();
  });
}
