import { workspaceFetch } from '../lib/client-api';
import { showConfirmDialog, showPromptDialog } from './portal-confirm-dialog';
import { showWorkspaceNotification, workspaceErrorMessage } from './account-workspace-utils';
import { hasWorkspaceAccess } from '../lib/workspace-access';

type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  workspaceEnabled?: boolean;
  workspaceAccess?: boolean;
  workspaceLockedByRole?: boolean;
  removedAt?: string | null;
  removedBy?: string | null;
  removalReason?: string | null;
};

type AuthAuditRow = {
  createdAt: string;
  eventType: string;
  email?: string | null;
  userId?: string | null;
};

const LOAD_TIMEOUT_MS = 20_000;
const AUDIT_PAGE_SIZE = 25;

let usersCache: AdminUserRow[] = [];
let removedCache: AdminUserRow[] = [];
let panelBound = false;
let lastApiBaseUrl = '';
let auditOffset = 0;
let auditTotal = 0;
let auditLoading = false;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function filteredUsers(query: string): AdminUserRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return usersCache;
  return usersCache.filter((u) => u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
}

function setUsersLoadingState(message: string, summaryMessage: string): void {
  const tbody = document.getElementById('admin-users-tbody');
  const summary = document.getElementById('admin-users-summary');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  if (summary) summary.textContent = summaryMessage;
}

function setAuditLoadingState(message: string): void {
  const tbody = document.getElementById('admin-auth-audit-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="4">${escapeHtml(message)}</td></tr>`;
}

function updateAuditPager(): void {
  const prev = document.getElementById('admin-auth-audit-prev-btn') as HTMLButtonElement | null;
  const next = document.getElementById('admin-auth-audit-next-btn') as HTMLButtonElement | null;
  const subtitle = document.getElementById('admin-auth-audit-subtitle');
  const from = auditTotal === 0 ? 0 : auditOffset + 1;
  const to = Math.min(auditOffset + AUDIT_PAGE_SIZE, auditTotal);
  if (subtitle) {
    subtitle.textContent =
      auditTotal === 0
        ? 'Logins, registrations, password resets, and OAuth.'
        : `Showing ${from}–${to} of ${auditTotal} auth events.`;
  }
  if (prev) prev.disabled = auditLoading || auditOffset <= 0;
  if (next) next.disabled = auditLoading || auditOffset + AUDIT_PAGE_SIZE >= auditTotal;
}

function renderRemovedTable(apiBaseUrl: string): void {
  const section = document.getElementById('admin-users-removed-section');
  const tbody = document.getElementById('admin-users-removed-tbody');
  if (!section || !tbody) return;

  if (removedCache.length === 0) {
    section.hidden = true;
    tbody.innerHTML = '<tr><td colspan="5">None</td></tr>';
    return;
  }

  section.hidden = false;
  tbody.innerHTML = removedCache
    .map((user) => {
      return `<tr data-user-id="${escapeHtml(user.id)}">
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${escapeHtml(user.removedAt ? formatDate(user.removedAt) : '—')}</td>
        <td>${escapeHtml(user.removalReason || '—')}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm admin-users-restore-btn" data-user-id="${escapeHtml(user.id)}">Restore</button>
        </td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll<HTMLButtonElement>('.admin-users-restore-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      if (!userId) return;
      const user = removedCache.find((u) => u.id === userId);
      const ok = await showConfirmDialog({
        title: 'Restore account',
        message: `Restore ${user?.email || 'this account'}?`,
        details: 'Sign-in will work again and the account returns to the active users list.',
        confirmLabel: 'Restore',
      });
      if (!ok) return;
      btn.disabled = true;
      try {
        const res = await workspaceFetch(`${apiBaseUrl}/admin/users/${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Restore failed');
        }
        showWorkspaceNotification('Account restored.', 'success');
        await loadAdminUsersPanel(apiBaseUrl);
      } catch (err) {
        showWorkspaceNotification(workspaceErrorMessage(err), 'error');
        btn.disabled = false;
      }
    });
  });
}

function renderUsersTable(apiBaseUrl: string, query = ''): void {
  const tbody = document.getElementById('admin-users-tbody');
  const summary = document.getElementById('admin-users-summary');
  if (!tbody) return;

  const rows = filteredUsers(query);
  if (summary) {
    summary.textContent = `${rows.length} active · ${removedCache.length} removed · ${usersCache.length + removedCache.length} total`;
  }

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No users match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((user) => {
      const locked = Boolean(user.workspaceLockedByRole ?? hasWorkspaceAccess({ role: user.role, workspaceEnabled: false }));
      const checked = (user.workspaceAccess ?? user.workspaceEnabled) ? 'checked' : '';
      const disabled = locked ? 'disabled' : '';
      const toggleId = `workspace-toggle-${user.id}`;
      const canRemove = true;
      return `<tr data-user-id="${escapeHtml(user.id)}">
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${user.emailVerified ? 'Yes' : 'No'}</td>
        <td>${escapeHtml(formatDate(user.createdAt))}</td>
        <td>
          <label class="admin-users-workspace-toggle" for="${toggleId}">
            <input type="checkbox" id="${toggleId}" class="admin-users-workspace-input" data-user-id="${escapeHtml(user.id)}" ${checked} ${disabled} />
            <span>${locked ? 'Via role' : 'Workspace'}</span>
          </label>
        </td>
        <td>
          ${
            canRemove
              ? `<button type="button" class="btn btn-danger btn-sm admin-users-remove-btn" data-user-id="${escapeHtml(user.id)}">Remove</button>`
              : '—'
          }
        </td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll<HTMLInputElement>('.admin-users-workspace-input').forEach((input) => {
    input.addEventListener('change', async () => {
      const userId = input.dataset.userId;
      if (!userId) return;
      const enabled = input.checked;
      if (!enabled) {
        const ok = await showConfirmDialog({
          title: 'Disable workspace access',
          message: 'Remove editor workspace tools for this user?',
          details: 'They keep contributor account access but lose Create, Voice studio, and Insights panels.',
          confirmLabel: 'Disable workspace',
          variant: 'danger',
        });
        if (!ok) {
          input.checked = true;
          return;
        }
      }
      input.disabled = true;
      try {
        const res = await workspaceFetch(`${apiBaseUrl}/admin/users/${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceEnabled: enabled }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Update failed');
        }
        const cached = usersCache.find((u) => u.id === userId);
        if (cached) {
          cached.workspaceEnabled = enabled;
          cached.workspaceAccess = Boolean(data.user?.workspaceAccess ?? enabled);
        }
      } catch (err) {
        input.checked = !enabled;
        console.error('[Admin users] workspace toggle failed:', err);
        showWorkspaceNotification(
          err instanceof Error ? err.message : 'Could not update workspace access.',
          'error',
        );
      } finally {
        const cached = usersCache.find((u) => u.id === userId);
        const locked = Boolean(cached?.workspaceLockedByRole);
        input.disabled = locked;
      }
    });
  });

  tbody.querySelectorAll<HTMLButtonElement>('.admin-users-remove-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      if (!userId) return;
      const user = usersCache.find((u) => u.id === userId);
      const ok = await showConfirmDialog({
        title: 'Remove account',
        message: `Soft-remove ${user?.email || 'this account'}?`,
        details: 'They will be blocked from sign-in until restored. A backup snapshot is kept.',
        confirmLabel: 'Remove account',
        variant: 'danger',
      });
      if (!ok) return;
      const reasonRaw = await showPromptDialog({
        title: 'Removal reason (optional)',
        message: 'Add a short reason for the audit trail, or leave blank and confirm.',
        placeholder: 'e.g. duplicate signup, requested removal',
        defaultValue: ' ',
        confirmLabel: 'Continue',
      });
      if (reasonRaw === null) return;
      const reason = reasonRaw.trim();
      btn.disabled = true;
      try {
        const res = await workspaceFetch(`${apiBaseUrl}/admin/users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Remove failed');
        }
        showWorkspaceNotification('Account removed (can be restored).', 'success');
        await loadAdminUsersPanel(apiBaseUrl);
      } catch (err) {
        showWorkspaceNotification(workspaceErrorMessage(err), 'error');
        btn.disabled = false;
      }
    });
  });
}

function renderAuditTable(events: AuthAuditRow[]): void {
  const tbody = document.getElementById('admin-auth-audit-tbody');
  if (!tbody) return;
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="4">No recent auth events.</td></tr>';
    return;
  }
  tbody.innerHTML = events
    .map(
      (ev) => `<tr>
        <td>${escapeHtml(formatDate(ev.createdAt))}</td>
        <td>${escapeHtml(ev.eventType)}</td>
        <td>${escapeHtml(ev.email ?? '—')}</td>
        <td>${escapeHtml(ev.userId ?? '—')}</td>
      </tr>`,
    )
    .join('');
}

function exportUsersCsv(): void {
  const header = ['email', 'role', 'verified', 'joined', 'workspace_enabled', 'status', 'removed_at'];
  const all = [...usersCache, ...removedCache];
  const lines = all.map((u) =>
    [
      u.email,
      u.role,
      u.emailVerified ? 'yes' : 'no',
      u.createdAt,
      u.workspaceEnabled ? 'yes' : 'no',
      u.removedAt ? 'removed' : 'active',
      u.removedAt || '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `brisbane-servers-users-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadAuthAuditPage(apiBaseUrl: string, offset: number): Promise<void> {
  auditLoading = true;
  updateAuditPager();
  setAuditLoadingState('Loading…');
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  try {
    const result = await fetchJsonWithTimeout(
      `${apiBaseUrl}/admin/auth-audit?limit=${AUDIT_PAGE_SIZE}&offset=${offset}`,
      controller.signal,
    );
    if (!result.ok) {
      setAuditLoadingState(result.error || 'Could not load auth events.');
      return;
    }
    const events = Array.isArray(result.data?.events) ? (result.data.events as AuthAuditRow[]) : [];
    auditOffset = typeof result.data?.offset === 'number' ? (result.data.offset as number) : offset;
    auditTotal = typeof result.data?.total === 'number' ? (result.data.total as number) : events.length;
    renderAuditTable(events);
  } finally {
    window.clearTimeout(timeoutId);
    auditLoading = false;
    updateAuditPager();
  }
}

function bindAdminUsersPanel(apiBaseUrl: string): void {
  lastApiBaseUrl = apiBaseUrl;
  if (panelBound) return;
  panelBound = true;

  document.getElementById('admin-users-refresh-btn')?.addEventListener('click', () => {
    void loadAdminUsersPanel(lastApiBaseUrl || apiBaseUrl);
  });
  document.getElementById('admin-users-export-btn')?.addEventListener('click', exportUsersCsv);
  document.getElementById('admin-users-search')?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value;
    renderUsersTable(lastApiBaseUrl || apiBaseUrl, query);
  });
  document.getElementById('admin-auth-audit-prev-btn')?.addEventListener('click', () => {
    const nextOffset = Math.max(0, auditOffset - AUDIT_PAGE_SIZE);
    void loadAuthAuditPage(lastApiBaseUrl || apiBaseUrl, nextOffset);
  });
  document.getElementById('admin-auth-audit-next-btn')?.addEventListener('click', () => {
    if (auditOffset + AUDIT_PAGE_SIZE >= auditTotal) return;
    void loadAuthAuditPage(lastApiBaseUrl || apiBaseUrl, auditOffset + AUDIT_PAGE_SIZE);
  });
}

async function fetchJsonWithTimeout(
  url: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null; error?: string }> {
  try {
    const res = await workspaceFetch(url, { signal });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const err =
        data && typeof data.error === 'string'
          ? data.error
          : `Request failed (${res.status})`;
      return { ok: false, status: res.status, data, error: err };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    if (signal.aborted) {
      return { ok: false, status: 0, data: null, error: 'Timed out waiting for the admin API.' };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function loadAdminUsersPanel(apiBaseUrl: string): Promise<void> {
  const base = (apiBaseUrl || lastApiBaseUrl || '').replace(/\/+$/, '');
  bindAdminUsersPanel(base);
  setUsersLoadingState('Loading…', 'Loading users…');
  setAuditLoadingState('Loading…');

  if (!base) {
    setUsersLoadingState('Could not load users.', 'API base URL is not configured.');
    setAuditLoadingState('Could not load auth events.');
    return;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

  try {
    const [usersResult, auditResult] = await Promise.all([
      fetchJsonWithTimeout(`${base}/admin/users?includeRemoved=1`, controller.signal),
      fetchJsonWithTimeout(
        `${base}/admin/auth-audit?limit=${AUDIT_PAGE_SIZE}&offset=${auditOffset}`,
        controller.signal,
      ),
    ]);

    if (!usersResult.ok) {
      setUsersLoadingState('Could not load users.', usersResult.error || 'Failed to load users.');
    } else {
      const all = Array.isArray(usersResult.data?.users)
        ? (usersResult.data.users as AdminUserRow[])
        : [];
      usersCache = all.filter((u) => !u.removedAt);
      removedCache = all.filter((u) => Boolean(u.removedAt));
      const search = (document.getElementById('admin-users-search') as HTMLInputElement | null)?.value ?? '';
      renderUsersTable(base, search);
      renderRemovedTable(base);
    }

    if (!auditResult.ok) {
      setAuditLoadingState(auditResult.error || 'Could not load auth events.');
    } else {
      const events = Array.isArray(auditResult.data?.events)
        ? (auditResult.data.events as AuthAuditRow[])
        : [];
      auditOffset =
        typeof auditResult.data?.offset === 'number' ? (auditResult.data.offset as number) : 0;
      auditTotal =
        typeof auditResult.data?.total === 'number' ? (auditResult.data.total as number) : events.length;
      renderAuditTable(events);
      updateAuditPager();
    }
  } catch (err) {
    console.error('[Admin users] load failed:', err);
    setUsersLoadingState('Could not load users.', 'Failed to load users.');
    setAuditLoadingState('Could not load auth events.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}
