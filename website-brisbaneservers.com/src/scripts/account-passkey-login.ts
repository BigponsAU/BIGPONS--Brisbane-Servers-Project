/**
 * Passkey sign-in for the unsigned login screen.
 * Must stay in the always-loaded auth chunk — not the post-auth extensions bundle.
 */
import { startAuthentication } from '@simplewebauthn/browser';
import { workspaceFetch } from '../lib/client-api';
import {
  applyLoginSession,
  getPortalRuntime,
  showAuthBanner,
  wakeApiBeforeAuth,
} from './account-workspace-runtime';

const ACCOUNT_LAST_EMAIL_KEY = 'accountLastEmail';

export type PasskeyLoginHandlers = {
  showDashboard: (user: unknown) => void | Promise<void>;
};

function resetPasskeyLoginButton(btn: HTMLButtonElement | null): void {
  if (!btn) return;
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.textContent = 'Sign in with passkey';
}

export async function loginWithPasskey(
  email: string,
  handlers: PasskeyLoginHandlers,
): Promise<void> {
  const rt = getPortalRuntime();
  const errorDiv = document.getElementById('login-error');
  const passkeyBtn = document.getElementById('passkey-login-btn') as HTMLButtonElement | null;
  const normalizedEmail = email.trim().toLowerCase();

  if (errorDiv) errorDiv.classList.remove('show');
  if (passkeyBtn) {
    passkeyBtn.disabled = true;
    passkeyBtn.setAttribute('aria-busy', 'true');
    passkeyBtn.textContent = 'Waiting for passkey…';
  }

  try {
    await wakeApiBeforeAuth();
    const optRes = await workspaceFetch(`${rt.voiceApiUrl}/auth/passkey/login-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    const optData = await optRes.json().catch(() => ({}));
    if (!optRes.ok || !optData.success) {
      throw new Error(optData.error || 'Passkey sign-in unavailable for this account');
    }

    const assertion = await startAuthentication({ optionsJSON: optData.options });
    const verifyRes = await workspaceFetch(`${rt.voiceApiUrl}/auth/passkey/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: optData.challengeId, response: assertion }),
    });
    const verifyData = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !verifyData.success) {
      throw new Error(verifyData.error || 'Passkey sign-in failed');
    }

    applyLoginSession(verifyData.token ?? null);
    localStorage.setItem(ACCOUNT_LAST_EMAIL_KEY, normalizedEmail);
    resetPasskeyLoginButton(passkeyBtn);
    await handlers.showDashboard(verifyData.user);
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Passkey sign-in failed';
    if (error instanceof Error && error.name === 'NotAllowedError') {
      message = 'Passkey sign-in was cancelled or timed out. Try again when ready.';
    }
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  } finally {
    resetPasskeyLoginButton(passkeyBtn);
  }
}

export function bindPasskeyLogin(handlers: PasskeyLoginHandlers): void {
  const btn = document.getElementById('passkey-login-btn');
  if (!btn || btn.dataset.passkeyLoginBound === 'true') return;
  btn.dataset.passkeyLoginBound = 'true';

  btn.addEventListener('click', () => {
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value?.trim();
    if (!email) {
      showAuthBanner('Enter your email first, then use passkey sign-in.', 'warning');
      const emailInput = document.getElementById('email') as HTMLInputElement | null;
      emailInput?.focus();
      return;
    }
    void loginWithPasskey(email, handlers);
  });
}
