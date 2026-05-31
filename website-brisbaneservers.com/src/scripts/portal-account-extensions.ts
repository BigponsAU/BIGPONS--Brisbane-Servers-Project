/**
 * Account workspace extensions: passkeys, moderation, site review, client insights.
 */
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { workspaceFetch } from '../lib/client-api';

export interface PortalAccountContext {
  apiBaseUrl: string;
  getAuthToken: () => string | null;
  setAuthToken: (token: string | null) => void;
  showDashboard: (user: { email?: string; role?: string }) => void;
  showLogin: () => void;
  showAuthBanner: (message: string, isError?: boolean) => void;
  navigateToPanel: (panel: string) => void;
  selectResource?: (resourceId: string) => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasSession(ctx: PortalAccountContext): boolean {
  return Boolean(ctx.getAuthToken());
}

export async function loadClientWorkspaceData(ctx: PortalAccountContext): Promise<void> {
  if (!hasSession(ctx)) return;

  const balanceEl = document.getElementById('client-token-balance');
  const listEl = document.getElementById('client-contributions-list');

  try {
    const [tokensRes, contribRes] = await Promise.all([
      workspaceFetch(`${ctx.apiBaseUrl}/tokens/me`),
      workspaceFetch(`${ctx.apiBaseUrl}/community/my-contributions`)
    ]);

    if (tokensRes.ok) {
      const data = await tokensRes.json();
      if (balanceEl && data.success) balanceEl.textContent = String(data.balance ?? 0);
    }

    if (contribRes.ok && listEl) {
      const data = await contribRes.json();
      const items = Array.isArray(data.contributions) ? data.contributions : [];
      if (!items.length) {
        listEl.innerHTML = '<li class="empty-state">No contributions yet. Share context from a topic page to get started.</li>';
      } else {
        listEl.innerHTML = items.slice(0, 8).map((item: {
          status: string;
          payload?: { title?: string; industry?: string; topic?: string };
          createdAt?: string;
        }) => {
          const title = item.payload?.title || 'Contribution';
          const meta = [item.payload?.industry, item.payload?.topic].filter(Boolean).join(' · ');
          const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
          return `<li><strong>${escapeHtml(title)}</strong> — ${escapeHtml(item.status)}${meta ? ` · ${escapeHtml(meta)}` : ''}${date ? ` · ${escapeHtml(date)}` : ''}</li>`;
        }).join('');
      }
    }
  } catch (error) {
    console.warn('[Portal] Client workspace data failed:', error);
    if (balanceEl) balanceEl.textContent = '—';
    if (listEl) {
      listEl.innerHTML =
        '<li class="empty-state">Could not load contributions. Confirm the hosted API is reachable.</li>';
    }
  }
}

export async function loadPasskeyCredentials(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('passkey-credentials-list');
  if (!container) return;
  if (!hasSession(ctx)) return;

  container.innerHTML = '<p class="status-message">Loading passkeys…</p>';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/credentials`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      container.innerHTML = '<p class="status-message">Unable to load passkeys.</p>';
      return;
    }
    const creds = Array.isArray(data.credentials) ? data.credentials : [];
    if (!creds.length) {
      container.innerHTML = '<p class="status-message">No passkeys registered. Add one for phishing-resistant sign-in.</p>';
      return;
    }
    container.innerHTML = creds.map((c: { id: string; deviceType: string; backedUp: boolean; lastUsedAt?: string | null }) => `
      <motionless class="passkey-row">
        <span>${escapeHtml(c.deviceType)}${c.backedUp ? ' · synced' : ''}${c.lastUsedAt ? ` · last used ${escapeHtml(new Date(c.lastUsedAt).toLocaleDateString())}` : ''}</span>
        <button type="button" class="btn btn-secondary btn-sm" data-passkey-remove="${escapeHtml(c.id)}">Remove</button>
      </motionless>
    `.replaceAll('motionless', 'div')).join('');

    container.querySelectorAll('[data-passkey-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).getAttribute('data-passkey-remove');
        if (!id) return;
        await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/credentials`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialId: id })
        });
        await loadPasskeyCredentials(ctx);
      });
    });
  } catch {
    container.innerHTML = '<p class="status-message">Could not load passkeys.</p>';
  }
}

export async function registerPasskey(ctx: PortalAccountContext): Promise<void> {
  const statusEl = document.getElementById('passkey-register-status');
  if (!hasSession(ctx)) return;
  if (statusEl) statusEl.textContent = 'Starting passkey registration…';

  try {
    const optRes = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/register-options`, {
      method: 'POST'
    });
    const optData = await optRes.json();
    if (!optRes.ok || !optData.success) throw new Error(optData.error || 'Could not start registration');

    const attestation = await startRegistration({ optionsJSON: optData.options });
    const verifyRes = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/register-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: optData.challengeId, response: attestation })
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.error || 'Registration failed');
    if (statusEl) statusEl.textContent = verifyData.message || 'Passkey registered.';
    await loadPasskeyCredentials(ctx);
  } catch (error) {
    if (statusEl) statusEl.textContent = error instanceof Error ? error.message : 'Passkey registration failed.';
  }
}

export async function loginWithPasskey(ctx: PortalAccountContext, email: string): Promise<void> {
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) errorDiv.classList.remove('show');

  try {
    const optRes = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/login-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const optData = await optRes.json();
    if (!optRes.ok || !optData.success) {
      throw new Error(optData.error || 'Passkey sign-in unavailable for this account');
    }

    const assertion = await startAuthentication({ optionsJSON: optData.options });
    const verifyRes = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: optData.challengeId, response: assertion })
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      throw new Error(verifyData.error || 'Passkey sign-in failed');
    }

    ctx.setAuthToken('cookie');
    ctx.showDashboard(verifyData.user);
  } catch (error) {
    if (errorDiv) {
      errorDiv.textContent = error instanceof Error ? error.message : 'Passkey sign-in failed';
      errorDiv.classList.add('show');
    }
  }
}

async function moderateContribution(
  ctx: PortalAccountContext,
  contributionId: string,
  action: 'approve' | 'reject'
): Promise<void> {
  if (!hasSession(ctx)) return;
  const endpoint = action === 'approve' ? 'approve' : 'reject';
  await workspaceFetch(`${ctx.apiBaseUrl}/community/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contributionId })
  });
  await loadModerationQueue(ctx);
}

export async function loadModerationQueue(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('moderation-queue');
  if (!container) return;
  if (!hasSession(ctx)) return;

  container.innerHTML = '<p class="status-message">Loading pending uploads…</p>';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/community/contributions`);
    if (!res.ok) {
      container.innerHTML = '<p class="status-message">Admin access required to view the moderation queue.</p>';
      return;
    }
    const data = await res.json();
    const items = (Array.isArray(data.contributions) ? data.contributions : [])
      .filter((c: { status: string }) => c.status === 'pending');

    if (!items.length) {
      container.innerHTML = '<p class="status-message">No pending community uploads or voice-dashboard submissions.</p>';
      return;
    }

    container.innerHTML = items.map((item: {
      id: string;
      userId: string;
      resourceId: string;
      type: string;
      payload?: { title?: string; industry?: string; topic?: string; contentSnippet?: string };
    }) => {
      const snippet = (item.payload?.contentSnippet || '').slice(0, 280);
      const ellipsis = (item.payload?.contentSnippet || '').length > 280 ? '…' : '';
      return `
        <article class="moderation-card" data-contribution-id="${escapeHtml(item.id)}" data-resource-id="${escapeHtml(item.resourceId)}">
          <header>
            <h4>${escapeHtml(item.payload?.title || 'Untitled upload')}</h4>
            <p class="moderation-meta">${escapeHtml(item.type)} · ${escapeHtml(item.payload?.industry || '—')} · ${escapeHtml(item.payload?.topic || '—')} · user ${escapeHtml(item.userId)}</p>
          </header>
          <p class="moderation-snippet">${escapeHtml(snippet)}${ellipsis}</p>
          <div class="moderation-actions">
            <button type="button" class="btn btn-primary btn-sm moderation-approve">Approve</button>
            <button type="button" class="btn btn-secondary btn-sm moderation-reject">Reject</button>
            <button type="button" class="btn btn-secondary btn-sm moderation-open-resource">Open in Resources</button>
          </div>
        </article>`;
    }).join('');

    container.querySelectorAll('.moderation-card').forEach((card) => {
      const id = (card as HTMLElement).dataset.contributionId;
      const resourceId = (card as HTMLElement).dataset.resourceId;
      if (!id) return;
      card.querySelector('.moderation-approve')?.addEventListener('click', () => void moderateContribution(ctx, id, 'approve'));
      card.querySelector('.moderation-reject')?.addEventListener('click', () => void moderateContribution(ctx, id, 'reject'));
      card.querySelector('.moderation-open-resource')?.addEventListener('click', () => {
        ctx.navigateToPanel('resources');
        if (resourceId && ctx.selectResource) {
          window.setTimeout(() => ctx.selectResource?.(resourceId), 150);
        }
      });
    });
  } catch {
    container.innerHTML = '<p class="status-message">Could not load moderation queue.</p>';
  }
}

export async function loadSiteReviewSections(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('site-review-list');
  if (!container) return;
  if (!hasSession(ctx)) return;

  container.innerHTML = '<p class="status-message">Loading public sections…</p>';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/site-sections`);
    if (!res.ok) {
      container.innerHTML = '<p class="status-message">Admin access required.</p>';
      return;
    }
    const data = await res.json();
    const sections = Array.isArray(data.sections) ? data.sections : [];
    container.innerHTML = sections.map((section: {
      id: string;
      title: string;
      href: string;
      description: string;
      category: string;
    }) => `
      <article class="site-review-card">
        <header>
          <h4>${escapeHtml(section.title)}</h4>
          <span class="site-review-category">${escapeHtml(section.category)}</span>
        </header>
        <p>${escapeHtml(section.description)}</p>
        <a class="btn btn-secondary btn-sm" href="${escapeHtml(section.href)}" target="_blank" rel="noopener noreferrer">Review on site</a>
      </article>
    `).join('');
  } catch {
    container.innerHTML = '<p class="status-message">Could not load site review sections.</p>';
  }
}

export async function loadHostingStatus(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('hosting-status-list');
  const message = document.getElementById('hosting-status-message');
  if (!container) return;
  if (!hasSession(ctx)) return;

  container.innerHTML = '<p class="status-message">Loading environment status…</p>';
  if (message) message.textContent = '';

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/hosting-status`);
    if (!res.ok) {
      container.innerHTML = '<p class="status-message">Super-admin access required.</p>';
      return;
    }
    const data = await res.json();
    const checklist = Array.isArray(data.checklist) ? data.checklist : [];
    container.innerHTML = checklist
      .map(
        (item: { key: string; required: boolean; configured: boolean; notes: string; setOn: string }) => `
      <article class="hosting-status-row ${item.configured ? 'hosting-status-row--ok' : 'hosting-status-row--missing'}">
        <strong>${escapeHtml(item.key)}</strong>
        <span>${item.configured ? 'Configured' : item.required ? 'Missing' : 'Optional'}</span>
        <p>${escapeHtml(item.notes)} <em>(${escapeHtml(item.setOn)})</em></p>
      </article>
    `,
      )
      .join('');
    if (message) {
      message.textContent = data.ready
        ? 'Required production variables appear configured on the API host.'
        : `Missing required: ${(data.missingRequired ?? []).join(', ')}`;
    }
  } catch {
    container.innerHTML = '<p class="status-message">Could not load hosting status.</p>';
  }
}

export async function emailHostingChecklist(ctx: PortalAccountContext): Promise<void> {
  const message = document.getElementById('hosting-status-message');
  if (!hasSession(ctx)) return;
  if (message) message.textContent = 'Sending checklist email…';

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/email-hosting-checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'bigpons@brisbaneservers.com' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (message) message.textContent = data.error ?? 'Could not send checklist email.';
      return;
    }
    if (message) {
      message.textContent = `Checklist emailed to ${data.emailedTo ?? 'bigpons@brisbaneservers.com'}.`;
    }
  } catch {
    if (message) message.textContent = 'Could not send checklist email.';
  }
}

export function bindPortalAccountExtensions(ctx: PortalAccountContext): void {
  document.getElementById('passkey-login-btn')?.addEventListener('click', () => {
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value?.trim();
    if (!email) {
      ctx.showAuthBanner('Enter your email first, then use passkey sign-in.', true);
      return;
    }
    void loginWithPasskey(ctx, email);
  });

  document.getElementById('passkey-register-btn')?.addEventListener('click', () => void registerPasskey(ctx));
  document.getElementById('refresh-moderation-btn')?.addEventListener('click', () => void loadModerationQueue(ctx));
  document.getElementById('refresh-site-review-btn')?.addEventListener('click', () => void loadSiteReviewSections(ctx));
  document.getElementById('refresh-hosting-status-btn')?.addEventListener('click', () => void loadHostingStatus(ctx));
  document.getElementById('email-hosting-checklist-btn')?.addEventListener('click', () => void emailHostingChecklist(ctx));
}
