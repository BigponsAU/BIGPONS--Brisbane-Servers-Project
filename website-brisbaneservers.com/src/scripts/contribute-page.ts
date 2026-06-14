/**
 * /contribute — session-aware get-started section (no duplicate login wall when already signed in).
 */
import { workspaceFetch, setAccountNavSignedIn } from '../lib/client-api';

interface ContributePageConfig {
  apiBaseUrl: string;
  accountPath: string;
  resourcesPath: string;
  googleOAuthHref: string;
}

function setAuthStatus(el: HTMLElement | null, msg: string, isError = false): void {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--error-color, #c00)' : 'var(--text-secondary)';
}

function revealContributeAuth(signedIn: boolean): void {
  const pending = document.getElementById('contribute-auth-pending');
  const signedOut = document.getElementById('contribute-auth-signed-out');
  const signedInEl = document.getElementById('contribute-auth-signed-in');
  if (pending) pending.hidden = true;
  if (signedOut) signedOut.hidden = signedIn;
  if (signedInEl) signedInEl.hidden = !signedIn;
}

function showSignedInState(email: string, config: ContributePageConfig): void {
  revealContributeAuth(true);
  const emailEl = document.getElementById('contribute-signed-in-email');
  if (emailEl) emailEl.textContent = email;
  setAccountNavSignedIn(true);

  document.getElementById('contribute-go-account')?.setAttribute('href', config.accountPath);
  document.getElementById('contribute-go-resources')?.setAttribute('href', config.resourcesPath);
}

function showSignedOutState(config: ContributePageConfig): void {
  revealContributeAuth(false);

  const googleBtn = document.getElementById('contribute-google-oauth') as HTMLAnchorElement | null;
  if (googleBtn && config.googleOAuthHref) {
    googleBtn.href = config.googleOAuthHref;
  }
}

async function hydrateSession(config: ContributePageConfig): Promise<void> {
  try {
    const res = await workspaceFetch(`${config.apiBaseUrl}/auth/me`);
    if (res.ok) {
      const data = await res.json();
      if (data?.user?.email) {
        showSignedInState(data.user.email, config);
        return;
      }
    }
  } catch {
    /* treat as signed out */
  }
  showSignedOutState(config);
}

function bindForms(config: ContributePageConfig): void {
  const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const registerStatus = document.getElementById('register-status');
  const loginStatus = document.getElementById('login-status');

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    setAuthStatus(registerStatus, 'Creating account…');
    try {
      const res = await workspaceFetch(`${config.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthStatus(registerStatus, data.error || 'Registration failed', true);
        return;
      }
      setAuthStatus(registerStatus, 'Account created. You are signed in.');
      if (data?.user?.email) {
        showSignedInState(data.user.email, config);
      } else {
        window.location.href = config.accountPath;
      }
    } catch {
      setAuthStatus(registerStatus, 'Network error. Try again.', true);
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    setAuthStatus(loginStatus, 'Signing in…');
    try {
      const res = await workspaceFetch(`${config.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthStatus(loginStatus, data.error || 'Login failed', true);
        return;
      }
      setAuthStatus(loginStatus, 'Signed in.');
      showSignedInState(email, config);
    } catch {
      setAuthStatus(loginStatus, 'Network error. Try again.', true);
    }
  });
}

export function bootContributePage(config: ContributePageConfig): void {
  bindForms(config);
  void hydrateSession(config);
}
