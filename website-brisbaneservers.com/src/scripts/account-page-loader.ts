/**
 * Loads the account workspace app in a separate chunk so sign-in HTML/CSS can paint first.
 */
import type { AccountWorkspaceBootConfig } from './account-workspace-app';

export type { AccountWorkspaceBootConfig };

let bootPromise: Promise<void> | null = null;

function startBoot(config: AccountWorkspaceBootConfig): Promise<void> {
  if (!bootPromise) {
    bootPromise = import('./account-workspace-app.ts').then(({ bootAccountWorkspace }) => {
      bootAccountWorkspace(config);
    });
  }
  return bootPromise;
}

export function bootAccountPage(config: AccountWorkspaceBootConfig): void {
  void startBoot(config);
}

/** Reads boot config from `#admin-portal` dataset (account page markup). */
export function readAccountBootConfigFromDom(): AccountWorkspaceBootConfig {
  const root = document.getElementById('admin-portal');
  const dataset = root?.dataset ?? {};
  return {
    publicApiBaseUrl: dataset.publicApiBaseUrl ?? '',
    accountPath: dataset.accountPath ?? '/account/',
    pageTitleSignedOut: dataset.pageTitleSignedOut ?? 'Sign in · Account workspace',
    pageTitleSignedIn: dataset.pageTitleSignedIn ?? 'Workspace · Account workspace',
    initialVerifyToken: dataset.verifyToken ?? '',
    initialResetToken: dataset.resetToken ?? '',
  };
}

export function bootAccountPageFromDom(): void {
  const config = readAccountBootConfigFromDom();
  const start = (): void => bootAccountPage(config);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(start));
  } else {
    setTimeout(start, 0);
  }
}
