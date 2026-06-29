/**
 * API connectivity banner — surfaces reachability of the edge API on /account.
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
  banner.hidden = state === 'ok';
  banner.setAttribute('aria-hidden', state === 'ok' ? 'true' : 'false');

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

  setBannerState('warn', 'Checking API connectivity…', endpoint);

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
