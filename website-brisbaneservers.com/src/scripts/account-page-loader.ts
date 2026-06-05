/**
 * Loads the account workspace app in a separate chunk so sign-in HTML/CSS can paint first.
 */
import type { AccountWorkspaceBootConfig } from './account-workspace-app';

export type { AccountWorkspaceBootConfig };

let bootPromise: Promise<void> | null = null;

function needsImmediateBoot(config: AccountWorkspaceBootConfig): boolean {
  if (config.initialVerifyToken || config.initialResetToken) return true;
  const search = window.location.search;
  return search.includes('code=') || search.includes('oauth') || search.includes('token=');
}

function startBoot(config: AccountWorkspaceBootConfig): Promise<void> {
  if (!bootPromise) {
    bootPromise = import('./account-workspace-app.ts').then(({ bootAccountWorkspace }) => {
      bootAccountWorkspace(config);
    });
  }
  return bootPromise;
}

export function bootAccountPage(config: AccountWorkspaceBootConfig): void {
  let started = false;
  const start = (): void => {
    if (started) return;
    started = true;
    void startBoot(config);
  };

  if (needsImmediateBoot(config)) {
    start();
    return;
  }

  const portal = document.getElementById('admin-portal');
  portal?.addEventListener('pointerdown', start, { once: true, capture: true });
  portal?.querySelector('#login-form, #create-account-section, #passkey-login-btn')?.addEventListener(
    'focusin',
    start,
    { once: true },
  );

  const idle = (window as Window & { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
  if (typeof idle === 'function') {
    idle(start, { timeout: 900 });
  } else {
    window.setTimeout(start, 600);
  }
}
