/**
 * Boots the lightweight auth chunk on /account (sign-in only).
 * Dashboard panels load lazily after successful authentication.
 */
import { bootAccountAuth, type AccountWorkspaceBootConfig } from './account-auth';

export type { AccountWorkspaceBootConfig };

let booted = false;

function showBootFailure(message: string): void {
  const banner = document.getElementById('auth-status-banner');
  if (banner) {
    banner.textContent = message;
    banner.style.display = 'block';
    banner.setAttribute('role', 'alert');
  }
  const loginError = document.getElementById('login-error');
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.add('show');
  }
}

function attachPreBootFormGuard(config: AccountWorkspaceBootConfig): void {
  const loginForm = document.getElementById('login-form');
  if (!loginForm || loginForm.dataset.preBootGuard === 'true') return;
  loginForm.dataset.preBootGuard = 'true';

  loginForm.addEventListener('submit', (event) => {
    if ((window as Window & { __portalBridge?: unknown }).__portalBridge) return;
    event.preventDefault();
    showBootFailure(
      'Sign-in is still loading. Wait a moment and try again. If this persists, refresh the page.',
    );
    try {
      startBoot(config);
    } catch {
      /* startBoot surfaces its own message */
    }
  });
}

function startBoot(config: AccountWorkspaceBootConfig): void {
  if (booted) return;
  booted = true;
  try {
    bootAccountAuth(config);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    showBootFailure(`Could not start the account workspace (${detail}). Refresh and try again.`);
    booted = false;
  }
}

export function bootAccountPage(config: AccountWorkspaceBootConfig): void {
  attachPreBootFormGuard(config);
  startBoot(config);
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
  bootAccountPage(readAccountBootConfigFromDom());
}
