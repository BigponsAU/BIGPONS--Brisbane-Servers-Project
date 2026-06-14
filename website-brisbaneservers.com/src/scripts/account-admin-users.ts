import { workspaceFetch } from '../lib/client-api';

type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  workspaceEnabled?: boolean;
};

type AuthAuditRow = {
  createdAt: string;
  eventType: string;
  email?: string | null;
  userId?: string | null;
};

let usersCache: AdminUserRow[] = [];
let panelBound = false;

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

function renderUsersTable(apiBaseUrl: string, query = ''): void {
  const tbody = document.getElementById('admin-users-tbody');
  const summary = document.getElementById('admin-users-summary');
  if (!tbody) return;

  const rows = filteredUsers(query);
  if (summary) {
    summary.textContent = `${rows.length} of ${usersCache.length} registered users`;
  }

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No users match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((user) => {
      const checked = user.workspaceEnabled ? 'checked' : '';
      const toggleId = `workspace-toggle-${user.id}`;
      return `<tr data-user-id="${escapeHtml(user.id)}">
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${user.emailVerified ? 'Yes' : 'No'}</td>
        <td>${escapeHtml(formatDate(user.createdAt))}</td>
        <td>
          <label class="admin-users-workspace-toggle" for="${toggleId}">
            <input type="checkbox" id="${toggleId}" class="admin-users-workspace-input" data-user-id="${escapeHtml(user.id)}" ${checked} />
            <span>Workspace</span>
          </label>
        </td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll<HTMLInputElement>('.admin-users-workspace-input').forEach((input) => {
    input.addEventListener('change', async () => {
      const userId = input.dataset.userId;
      if (!userId) return;
      const enabled = input.checked;
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
        if (cached) cached.workspaceEnabled = enabled;
      } catch (err) {
        input.checked = !enabled;
        console.error('[Admin users] workspace toggle failed:', err);
        window.alert(err instanceof Error ? err.message : 'Could not update workspace access.');
      } finally {
        input.disabled = false;
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
  const header = ['email', 'role', 'verified', 'joined', 'workspace_enabled'];
  const lines = usersCache.map((u) =>
    [u.email, u.role, u.emailVerified ? 'yes' : 'no', u.createdAt, u.workspaceEnabled ? 'yes' : 'no']
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

function bindAdminUsersPanel(apiBaseUrl: string): void {
  if (panelBound) return;
  panelBound = true;

  document.getElementById('admin-users-refresh-btn')?.addEventListener('click', () => {
    void loadAdminUsersPanel(apiBaseUrl);
  });
  document.getElementById('admin-users-export-btn')?.addEventListener('click', exportUsersCsv);
  document.getElementById('admin-users-search')?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value;
    renderUsersTable(apiBaseUrl, query);
  });
}

export async function loadAdminUsersPanel(apiBaseUrl: string): Promise<void> {
  bindAdminUsersPanel(apiBaseUrl);
  const tbody = document.getElementById('admin-users-tbody');
  const summary = document.getElementById('admin-users-summary');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
  if (summary) summary.textContent = 'Loading users…';

  try {
    const [usersRes, auditRes] = await Promise.all([
      workspaceFetch(`${apiBaseUrl}/admin/users`),
      workspaceFetch(`${apiBaseUrl}/admin/auth-audit?limit=100`),
    ]);
    const usersData = usersRes.ok ? await usersRes.json() : null;
    const auditData = auditRes.ok ? await auditRes.json() : null;

    usersCache = Array.isArray(usersData?.users) ? usersData.users : [];
    const search = (document.getElementById('admin-users-search') as HTMLInputElement | null)?.value ?? '';
    renderUsersTable(apiBaseUrl, search);
    renderAuditTable(Array.isArray(auditData?.events) ? auditData.events : []);
  } catch (err) {
    console.error('[Admin users] load failed:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="5">Could not load users.</td></tr>';
    if (summary) summary.textContent = 'Failed to load users.';
  }
}
