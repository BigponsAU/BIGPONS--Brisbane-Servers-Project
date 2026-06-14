// @ts-nocheck — lightweight sign-in chunk; dashboard loads after authentication.
import {
  workspaceFetch,
  hasActiveSession,
  setAccountNavSignedIn,
  restorePersistedSessionToken,
  usesHttpOnlyCookieAuth,
  usesSessionStorageAuth,
  getInMemorySessionToken,
} from '../lib/client-api';
import { closeMobileNav } from './nav-mobile';
import {
  type AccountWorkspaceBootConfig,
  initPortalRuntime,
  getPortalRuntime,
  applyLoginSession,
  applySessionToken,
  clearSessionToken,
  syncAccountPageTitle,
  setMessage,
  showAuthBanner,
  setResendVerificationVisibility,
  maybeAppendPreviewLink,
  wakeApiBeforeAuth,
  ensureReachableApiBase,
  isProductionSiteHost,
  publishPortalBridge,
  LOGIN_TIMEOUT_MS,
} from './account-workspace-runtime';

export type { AccountWorkspaceBootConfig };

const ACCOUNT_LAST_EMAIL_KEY = 'accountLastEmail';

let authBooted = false;
let dashboardLoadPromise: Promise<void> | null = null;

function forcePortalCleanup(): void {
  if (typeof document === 'undefined') return;
  try {
    closeMobileNav();
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.body.style.touchAction = '';

    document.querySelectorAll('.modal').forEach((modal: Element) => {
      const htmlModal = modal as HTMLElement;
      htmlModal.setAttribute('aria-hidden', 'true');
      htmlModal.style.display = 'none';
      htmlModal.classList.remove('active');
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay: Element) => {
      (overlay as HTMLElement).style.pointerEvents = 'none';
    });

    const infoCard = document.getElementById('info-card');
    if (infoCard) {
      infoCard.classList.remove('active', 'railed');
      infoCard.setAttribute('aria-hidden', 'true');
      (infoCard as HTMLElement).style.pointerEvents = 'none';
    }

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      (mainContent as HTMLElement).style.pointerEvents = '';
    }

    const adminPortal = document.getElementById('admin-portal');
    if (adminPortal) {
      (adminPortal as HTMLElement).style.pointerEvents = '';
    }
  } catch {
    /* best-effort */
  }
}

function setGoogleOAuthVisible(visible: boolean, href?: string): void {
  document.querySelectorAll('.oauth-google-btn').forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    if (href) anchor.href = href;
    anchor.style.display = visible ? 'block' : 'none';
  });
  document.querySelectorAll('.oauth-divider').forEach((node) => {
    (node as HTMLElement).style.display = visible ? 'block' : 'none';
  });
  document.querySelectorAll('.login-oauth-note').forEach((node) => {
    (node as HTMLElement).style.display = visible ? 'block' : 'none';
  });
}

async function loadOAuthProviders(): Promise<void> {
  const rt = getPortalRuntime();
  const googleStartHref = `${rt.voiceApiUrl.replace(/\/+$/, '')}/auth/oauth/google/start`;
  if (isProductionSiteHost()) {
    setGoogleOAuthVisible(true, googleStartHref);
    return;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/oauth/status`, {
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.google) {
        setGoogleOAuthVisible(true, googleStartHref);
        return;
      }
      if (response.ok && !data.google) {
        setGoogleOAuthVisible(false);
        return;
      }
    } catch {
      /* retry once */
    }
  }
}

function setupPasswordVisibilityToggles(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-password-toggle-target]').forEach((toggle) => {
    const inputId = toggle.dataset.passwordToggleTarget;
    if (!inputId) return;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;

    const setState = (show: boolean): void => {
      input.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} password`);
      toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
    };

    setState(false);
    toggle.addEventListener('click', () => {
      const shouldShow = input.type === 'password';
      setState(shouldShow);
      input.focus({ preventScroll: true });
    });
  });
}

function prefillLoginEmail(): void {
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const last = localStorage.getItem(ACCOUNT_LAST_EMAIL_KEY);
  if (emailInput && last && !emailInput.value) {
    emailInput.value = last;
  }
}

function updateRememberedSessionHint(): void {
  const hint = document.getElementById('login-remember-hint') as HTMLElement | null;
  if (!hint) return;
  hint.hidden = !getPortalRuntime().sessionActive;
}

function resetLoginSubmitButton(submitBtn: HTMLButtonElement | null): void {
  if (!submitBtn) return;
  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign in';
}

function hideRegisterSuccessPanel(): void {
  const panel = document.getElementById('register-success-panel') as HTMLElement | null;
  const form = document.getElementById('register-form') as HTMLElement | null;
  const submitBtn = document.getElementById('register-submit-btn') as HTMLButtonElement | null;
  if (panel) panel.hidden = true;
  if (form) form.style.display = '';
  if (submitBtn) submitBtn.disabled = false;
  setResendVerificationVisibility(false);
}

function showRegisterSuccessPanel(email: string, deliveryWarning = false): void {
  const panel = document.getElementById('register-success-panel') as HTMLElement | null;
  const emailEl = document.getElementById('register-success-email');
  const form = document.getElementById('register-form') as HTMLElement | null;
  const submitBtn = document.getElementById('register-submit-btn') as HTMLButtonElement | null;
  const resendEmail = document.getElementById('resend-email') as HTMLInputElement | null;
  if (emailEl) emailEl.textContent = email;
  if (resendEmail) resendEmail.value = email;
  if (form) form.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;
  if (panel) {
    panel.hidden = false;
    panel.classList.toggle('auth-confirmation-panel--warning', deliveryWarning);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  setResendVerificationVisibility(true);
}

function showResetPasswordForm(): void {
  const rt = getPortalRuntime();
  const resetForm = document.getElementById('reset-password-form') as HTMLElement | null;
  if (resetForm) {
    resetForm.style.display = 'flex';
  }
  const usernameField = resetForm?.querySelector('input[name="username"]') as HTMLInputElement | null;
  if (usernameField) {
    const forgotEmail = (document.getElementById('forgot-email') as HTMLInputElement | null)?.value?.trim();
    const lastEmail = localStorage.getItem(ACCOUNT_LAST_EMAIL_KEY)?.trim();
    usernameField.value = forgotEmail || lastEmail || '';
  }
  showAuthBanner('Choose a new password for your account.');
}

function showLogin(): void {
  const rt = getPortalRuntime();
  document.getElementById('login-screen')!.style.display = 'flex';
  document.getElementById('admin-dashboard')!.style.display = 'none';
  prefillLoginEmail();
  updateRememberedSessionHint();
  resetLoginSubmitButton(document.getElementById('login-submit-btn') as HTMLButtonElement | null);
  setAccountNavSignedIn(false);
  syncAccountPageTitle(false);
  if (rt.pendingResetToken) {
    showResetPasswordForm();
  }
}

async function ensureDashboardLoaded(): Promise<void> {
  if (!dashboardLoadPromise) {
    dashboardLoadPromise = import('./account-workspace-app.ts').then((mod) => {
      mod.bootAccountWorkspaceDashboard();
    });
  }
  await dashboardLoadPromise;
}

async function showDashboard(user: unknown): Promise<void> {
  await ensureDashboardLoaded();
  const rt = getPortalRuntime();
  if (rt.showDashboardImpl) {
    rt.showDashboardImpl(user);
    return;
  }
  const bridge = (window as Window & { __portalBridge?: { showDashboard?: (u: unknown) => void } }).__portalBridge;
  bridge?.showDashboard?.(user);
}

function consumeOAuthSessionFromHash(): void {
  const rt = getPortalRuntime();
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = hashParams.get('session');
  if (!token) return;
  if (usesHttpOnlyCookieAuth(rt.voiceApiUrl)) {
    window.history.replaceState({}, '', rt.accountPath + window.location.search);
    return;
  }
  applyLoginSession(token);
  window.history.replaceState({}, '', rt.accountPath + window.location.search);
}

function handleOAuthReturn(): void {
  const rt = getPortalRuntime();
  consumeOAuthSessionFromHash();
  const params = new URLSearchParams(window.location.search);
  const oauthSuccess = params.get('oauth') === 'success';
  const oauthError = params.get('oauth_error');
  if (oauthSuccess) {
    window.history.replaceState({}, '', rt.accountPath);
    void verifyToken().then(() => updateRememberedSessionHint());
    return;
  }
  if (oauthError) {
    showAuthBanner(decodeURIComponent(oauthError), 'error');
    window.history.replaceState({}, '', rt.accountPath);
  }
}

async function handleVerificationToken(): Promise<void> {
  const rt = getPortalRuntime();
  if (!rt.verifyToken) return;
  try {
    const response = await workspaceFetch(
      `${rt.voiceApiUrl}/auth/verify-email?token=${encodeURIComponent(rt.verifyToken)}`,
    );
    const data = await response.json();
    if (response.ok && data.success) {
      hideRegisterSuccessPanel();
      showAuthBanner(
        data.message || 'Email verified. You can sign in now with your email and password.',
        'success',
      );
      const loginEmail = document.getElementById('email') as HTMLInputElement | null;
      if (loginEmail && data.email) loginEmail.value = data.email;
      window.history.replaceState({}, '', rt.accountPath);
      document.getElementById('auth-status-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      showAuthBanner(data.error || 'Verification link is invalid or expired.', 'error');
    }
  } catch {
    showAuthBanner('Verification failed. Please try again.', 'error');
  }
}

async function verifyToken(): Promise<void> {
  const rt = getPortalRuntime();
  try {
    const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/me`);
    if (response.ok) {
      const data = await response.json();
      rt.sessionActive = true;
      await showDashboard(data.user);
    } else if (response.status >= 500) {
      rt.sessionActive = false;
      showLogin();
    } else {
      clearSessionToken();
      if (usesHttpOnlyCookieAuth(rt.voiceApiUrl)) {
        try {
          await workspaceFetch(`${rt.voiceApiUrl}/auth/logout`, { method: 'POST' });
        } catch {
          /* best-effort */
        }
      }
      showLogin();
    }
  } catch (error) {
    console.error('Auth verification failed:', error);
    if (!getInMemorySessionToken()) {
      rt.sessionActive = false;
      showLogin();
    }
  }
}

async function checkAuth(): Promise<void> {
  const rt = getPortalRuntime();
  if (usesSessionStorageAuth(rt.voiceApiUrl)) {
    restorePersistedSessionToken(rt.voiceApiUrl);
  }
  if (getInMemorySessionToken()) {
    rt.sessionActive = true;
    await verifyToken();
    return;
  }
  const active = await hasActiveSession(rt.voiceApiUrl);
  if (active) {
    rt.sessionActive = true;
    await verifyToken();
    return;
  }
  rt.sessionActive = false;
  showLogin();
}

function bindAuthForms(): void {
  const rt = getPortalRuntime();

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn') as HTMLButtonElement | null;
    if (errorDiv) errorDiv.classList.remove('show');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';
    }

    try {
      await wakeApiBeforeAuth();
      const controller = new AbortController();
      const loginTimeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
      let response = await workspaceFetch(`${rt.voiceApiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      window.clearTimeout(loginTimeout);

      if (!response.ok && response.status >= 500) {
        await wakeApiBeforeAuth();
        const retryController = new AbortController();
        const retryTimeout = window.setTimeout(() => retryController.abort(), LOGIN_TIMEOUT_MS);
        response = await workspaceFetch(`${rt.voiceApiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: retryController.signal,
        });
        window.clearTimeout(retryTimeout);
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        applyLoginSession(data.token);
        localStorage.setItem(ACCOUNT_LAST_EMAIL_KEY, email.trim().toLowerCase());
        resetLoginSubmitButton(submitBtn);
        await showDashboard(data.user);
        return;
      }

      if (errorDiv) {
        errorDiv.textContent = data.error || 'Login failed';
        errorDiv.classList.add('show');
      }
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        const resendEmail = document.getElementById('resend-email') as HTMLInputElement | null;
        if (resendEmail) resendEmail.value = email;
        setResendVerificationVisibility(true);
        showAuthBanner(
          'This account is not verified yet. Use "Resend verification email" in the panel on the right, open the link in your inbox, then sign in again.',
          'warning',
        );
      }
      if (data.code === 'USE_OAUTH') {
        document.querySelector('.oauth-google-btn')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        (document.querySelector('.oauth-google-btn') as HTMLElement | null)?.focus();
      }
    } catch (error) {
      if (errorDiv) {
        const timedOut = error instanceof DOMException && error.name === 'AbortError';
        errorDiv.textContent = timedOut
          ? 'Sign-in timed out while the API was waking up. Wait a few seconds, then try again or use Continue with Google.'
          : 'Connection error. Please try again.';
        errorDiv.classList.add('show');
      }
    } finally {
      resetLoginSubmitButton(submitBtn);
    }
  });

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const errorDiv = document.getElementById('register-error');
    const submitBtn = document.getElementById('register-submit-btn') as HTMLButtonElement | null;
    if (errorDiv) errorDiv.classList.remove('show');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';
    }

    try {
      await wakeApiBeforeAuth();
      const controller = new AbortController();
      const registerTimeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
      const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      window.clearTimeout(registerTimeout);

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        form.reset();
        showRegisterSuccessPanel(email, false);
        showAuthBanner(
          maybeAppendPreviewLink(
            'Account created. Check your email and click the verification link before signing in.',
            data.previewUrl,
          ),
          'success',
        );
      } else if (data.code === 'VERIFICATION_EMAIL_FAILED' && data.accountCreated) {
        form.reset();
        showRegisterSuccessPanel(email, true);
        showAuthBanner(
          maybeAppendPreviewLink(
            'Account created, but the verification email could not be sent. Use "Resend verification email" below, or contact support if this keeps happening.',
            data.previewUrl,
          ),
          'warning',
        );
      } else if (response.status === 409 || data.code === 'EMAIL_IN_USE') {
        hideRegisterSuccessPanel();
        const loginEmail = document.getElementById('email') as HTMLInputElement | null;
        if (loginEmail) loginEmail.value = email.trim().toLowerCase();
        const forgotEmail = document.getElementById('forgot-email') as HTMLInputElement | null;
        if (forgotEmail) forgotEmail.value = email.trim().toLowerCase();
        showAuthBanner(
          data.error || 'If that email is eligible for an account, sign in or use forgot password to continue.',
          'info',
        );
        if (errorDiv) {
          errorDiv.textContent = data.error || 'If that email is eligible for an account, sign in or use forgot password to continue.';
          errorDiv.classList.add('show');
        }
        document.querySelector('.login-card:not(.login-card--secondary)')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      } else if (errorDiv) {
        errorDiv.textContent = data.error || 'Account creation failed';
        errorDiv.classList.add('show');
      }
    } catch (error) {
      if (errorDiv) {
        const timedOut = error instanceof DOMException && error.name === 'AbortError';
        errorDiv.textContent = timedOut
          ? 'Sign-up timed out. The API may be waking up — wait a moment and try again.'
          : 'Connection error. Please try again.';
        errorDiv.classList.add('show');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
      }
    }
  });

  document.getElementById('resend-verification-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    setMessage('resend-verification-error', 'Sending verification email...');
    try {
      await ensureReachableApiBase();
      const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        showAuthBanner(
          maybeAppendPreviewLink(
            data.message || `Verification email sent to ${email}. Open the link, then sign in.`,
            data.previewUrl,
          ),
          'success',
        );
        setMessage('resend-verification-error', 'Email sent — check your inbox (and spam).', false);
      } else {
        showAuthBanner(data.error || 'Could not send verification email.', 'error');
        setMessage('resend-verification-error', data.error || 'Could not send verification email.', true);
      }
    } catch {
      showAuthBanner('Connection error. Could not send verification email.', 'error');
      setMessage('resend-verification-error', 'Connection error. Please try again.', true);
    }
  });

  document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    setMessage('forgot-password-error', 'Sending reset link...');
    try {
      await ensureReachableApiBase();
      const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(
        'forgot-password-error',
        maybeAppendPreviewLink(data.message || 'If the account exists, a reset link has been sent.', data.previewUrl),
        !response.ok,
      );
    } catch {
      setMessage('forgot-password-error', 'Connection error. Please try again.', true);
    }
  });

  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!rt.pendingResetToken) {
      setMessage('reset-password-error', 'Reset link is invalid or missing.', true);
      return;
    }

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const password = formData.get('password') as string;
    setMessage('reset-password-error', 'Updating password...');
    try {
      const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rt.pendingResetToken, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        rt.pendingResetToken = null;
        form.reset();
        showAuthBanner(data.message || 'Password updated. You can now sign in.');
        window.history.replaceState({}, '', rt.accountPath);
        (document.getElementById('reset-password-form') as HTMLElement | null)?.style.setProperty('display', 'none');
      }
      setMessage('reset-password-error', data.message || data.error || 'Password reset failed.', !response.ok);
    } catch {
      setMessage('reset-password-error', 'Connection error. Please try again.', true);
    }
  });

  const handleLogout = async () => {
    try {
      await workspaceFetch(`${rt.voiceApiUrl}/auth/logout`, { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearSessionToken();
    showLogin();
  };

  document.getElementById('revoke-all-sessions-btn')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('revoke-all-sessions-status');
    if (statusEl) {
      statusEl.textContent = 'Revoking all sessions...';
      statusEl.classList.remove('error');
      statusEl.classList.add('show');
    }

    try {
      const response = await workspaceFetch(`${rt.voiceApiUrl}/auth/revoke-all`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to revoke sessions.');
      }
      if (statusEl) {
        statusEl.textContent = data.message || 'All sessions revoked.';
      }
      clearSessionToken();
      window.setTimeout(() => showLogin(), 500);
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = error instanceof Error ? error.message : 'Unable to revoke sessions.';
        statusEl.classList.add('error');
      }
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', handleLogout);
}

export function bootAccountAuth(config: AccountWorkspaceBootConfig): void {
  if (authBooted) return;
  authBooted = true;

  forcePortalCleanup();
  const rt = initPortalRuntime(config);

  if (window.location.pathname.replace(/\/+$/, '') === '/portal') {
    window.location.replace(rt.accountPath);
  }

  publishPortalBridge({
    showLogin,
    showAuthBanner,
    showDashboard: (user: unknown) => {
      void showDashboard(user);
    },
  });

  bindAuthForms();
  setupPasswordVisibilityToggles();
  setResendVerificationVisibility(false);
  showLogin();

  if (isProductionSiteHost()) {
    const googleStartHref = `${rt.voiceApiUrl.replace(/\/+$/, '')}/auth/oauth/google/start`;
    setGoogleOAuthVisible(true, googleStartHref);
  }

  void (async () => {
    const authStatusBanner = document.getElementById('auth-status-banner') as HTMLElement | null;
    try {
      await ensureReachableApiBase({ fast: true });
      handleOAuthReturn();
      await handleVerificationToken();
      if (rt.pendingResetToken) {
        showResetPasswordForm();
      }
      await Promise.all([checkAuth(), loadOAuthProviders()]);
      if (window.location.hash === '#create-account' && !rt.sessionActive) {
        document.getElementById('create-account-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        (document.getElementById('register-email') as HTMLInputElement | null)?.focus();
      }
    } catch {
      showLogin();
      showAuthBanner('Could not reach the sign-in service. Try again in a moment.', 'warning');
    } finally {
      if (authStatusBanner && !authStatusBanner.textContent?.trim()) {
        authStatusBanner.style.display = 'none';
      }
      resetLoginSubmitButton(document.getElementById('login-submit-btn') as HTMLButtonElement | null);
    }
  })();
}
