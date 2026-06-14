import { hasAdminConsoleAccess } from '../lib/workspace-access';
import { workspaceModeDefaultPanel } from '../data/account-workspace';

export type WorkspaceMode = 'creator' | 'admin';

const MODE_STORAGE_KEY = 'bsWorkspaceMode';

function readStoredMode(): WorkspaceMode {
  try {
    const stored = sessionStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'admin' ? 'admin' : 'creator';
  } catch {
    return 'creator';
  }
}

function persistMode(mode: WorkspaceMode): void {
  try {
    sessionStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function setWorkspaceMode(mode: WorkspaceMode, navigate = true): void {
  const sessionUser = (window as Window & { __workspaceSessionUser?: { role?: string } }).__workspaceSessionUser;
  if (mode === 'admin' && !hasAdminConsoleAccess(sessionUser ?? {})) {
    mode = 'creator';
  }

  const root = document.querySelector('.account-workspace-root');
  const tracks = document.getElementById('sidebar-nav-tracks');
  const subtitle = document.getElementById('sidebar-mode-subtitle');

  root?.classList.toggle('account-workspace-root--admin-console', mode === 'admin');
  if (tracks) tracks.dataset.workspaceMode = mode;

  document.querySelectorAll<HTMLElement>('[data-workspace-mode]').forEach((btn) => {
    const isActive = btn.dataset.workspaceMode === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (subtitle) {
    subtitle.textContent =
      mode === 'admin'
        ? 'Growth, moderation, hosting, and ops'
        : 'Resources, profiles, and voice tools';
  }

  persistMode(mode);

  if (navigate) {
    const panel = workspaceModeDefaultPanel[mode];
    const nav = (window as Window & { navigateToPanel?: (p: string) => void }).navigateToPanel;
    nav?.(panel);
  }
}

export function initWorkspaceModeSwitcher(user: { role?: string }): void {
  if (!hasAdminConsoleAccess(user)) return;

  const switchers = [
    document.getElementById('workspace-mode-switcher'),
    document.getElementById('header-workspace-mode-switcher'),
  ];

  switchers.forEach((el) => {
    if (!el) return;
    el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');
    el.style.display = '';
  });

  const initial = readStoredMode();
  setWorkspaceMode(initial, false);

  const bind = (id: string, mode: WorkspaceMode): void => {
    document.getElementById(id)?.addEventListener('click', () => setWorkspaceMode(mode));
  };

  bind('workspace-mode-creator', 'creator');
  bind('workspace-mode-admin', 'admin');
  bind('header-workspace-mode-creator', 'creator');
  bind('header-workspace-mode-admin', 'admin');
}
