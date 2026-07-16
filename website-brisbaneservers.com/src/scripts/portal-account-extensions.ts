/**
 * Account workspace extensions: passkeys, moderation, site review, client insights.
 */
import { startRegistration } from '@simplewebauthn/browser';
import { workspaceFetch } from '../lib/client-api';
import {
  isAdminMailboxKey,
  siteMailboxes,
  type AdminMailboxKey,
} from '../lib/site-mailboxes';
import { getPortalAccountContext } from './account-workspace-runtime';
import { runWorkspaceGuardedAction, setElementBusy } from './account-workspace-utils';

import { loadModerationQueue } from './account-admin-moderation';
import { bindOverviewBilling, loadOverviewAiBilling } from './account-billing';

export interface PortalAccountContext {
  apiBaseUrl: string;
  getAuthToken: () => string | null;
  hasWorkspaceSession?: () => boolean;
  setAuthToken: (token: string | null) => void;
  showDashboard: (user: { email?: string; role?: string }) => void;
  showLogin: () => void;
  showAuthBanner: (message: string, variant?: 'success' | 'error' | 'info' | 'warning') => void;
  navigateToPanel: (panel: string) => void;
  selectResource?: (resourceId: string) => void;
}

export { loadModerationQueue };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

const ADMIN_EMAIL_PREFS_KEY = 'bs-admin-email-mailboxes';

function readAdminMailboxSelect(id: string, fallback: AdminMailboxKey): AdminMailboxKey {
  const el = document.getElementById(id) as HTMLSelectElement | null;
  const value = el?.value ?? fallback;
  return isAdminMailboxKey(value) ? value : fallback;
}

function restoreAdminEmailPrefs(): void {
  try {
    const raw = sessionStorage.getItem(ADMIN_EMAIL_PREFS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    const fromEl = document.getElementById('admin-email-from') as HTMLSelectElement | null;
    const toEl = document.getElementById('admin-email-to') as HTMLSelectElement | null;
    if (fromEl && parsed.from && isAdminMailboxKey(parsed.from)) fromEl.value = parsed.from;
    if (toEl && parsed.to && isAdminMailboxKey(parsed.to)) toEl.value = parsed.to;
  } catch {
    /* ignore */
  }
}

function persistAdminEmailPrefs(from: AdminMailboxKey, to: AdminMailboxKey): void {
  try {
    sessionStorage.setItem(ADMIN_EMAIL_PREFS_KEY, JSON.stringify({ from, to }));
  } catch {
    /* ignore */
  }
}

function bindAdminEmailPrefs(): void {
  restoreAdminEmailPrefs();
  const fromEl = document.getElementById('admin-email-from');
  const toEl = document.getElementById('admin-email-to');
  const save = () => {
    persistAdminEmailPrefs(
      readAdminMailboxSelect('admin-email-from', 'support'),
      readAdminMailboxSelect('admin-email-to', 'bigpons'),
    );
  };
  fromEl?.addEventListener('change', save);
  toEl?.addEventListener('change', save);
}

function sessionRequiredMessage(container: HTMLElement | null, message: string): void {
  if (container) {
    container.innerHTML = `<p class="status-message">${escapeHtml(message)}</p>`;
  }
}

export async function loadClientWorkspaceData(ctx: PortalAccountContext): Promise<void> {
  const balanceEl = document.getElementById('client-token-balance');
  const listEl = document.getElementById('client-contributions-list');
  const perksEl = document.getElementById('client-token-perks');
  const redeemStatus = document.getElementById('client-token-redeem-status');

  // Always refresh AI usage — do not leave Overview stuck on "Loading…"
  // if tokens/contributions fail or the session path returns early.
  void loadOverviewAiBilling(ctx);

  if (!hasSession(ctx)) {
    if (balanceEl) balanceEl.textContent = '—';
    if (perksEl) perksEl.innerHTML = '';
    if (listEl) {
      listEl.innerHTML = '<li class="empty-state">Sign in to see your contributions and token balance.</li>';
    }
    return;
  }

  try {
    const [tokensRes, contribRes, perksRes] = await Promise.all([
      workspaceFetch(`${ctx.apiBaseUrl}/tokens/me`),
      workspaceFetch(`${ctx.apiBaseUrl}/community/my-contributions`),
      workspaceFetch(`${ctx.apiBaseUrl}/tokens/perks`),
    ]);

    let balance = 0;
    if (tokensRes.ok) {
      const data = await tokensRes.json();
      if (data.success) {
        balance = Number(data.balance ?? 0);
        if (balanceEl) balanceEl.textContent = String(balance);
      } else if (balanceEl) {
        balanceEl.textContent = '—';
      }
    } else if (balanceEl) {
      balanceEl.textContent = '—';
    }

    if (perksRes.ok && perksEl) {
      const perksData = await perksRes.json();
      const perks = Array.isArray(perksData.perks) ? perksData.perks : [];
      if (!perks.length) {
        perksEl.innerHTML = '';
      } else {
        perksEl.innerHTML = perks
          .map(
            (p: { id: string; label: string; description: string; cost: number }) => `
          <li class="client-token-perk">
            <div class="client-token-perk-body">
              <strong>${escapeHtml(p.label)}</strong>
              <span class="client-token-perk-cost">${p.cost} tokens</span>
              <p class="client-token-perk-desc">${escapeHtml(p.description)}</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" data-redeem-perk="${escapeHtml(p.id)}" data-perk-cost="${p.cost}" ${
              balance < p.cost ? 'disabled' : ''
            }>Redeem</button>
          </li>`
          )
          .join('');

        perksEl.querySelectorAll<HTMLButtonElement>('[data-redeem-perk]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const perkId = btn.getAttribute('data-redeem-perk');
            const perkCost = Number(btn.getAttribute('data-perk-cost') ?? 0);
            if (!perkId) return;
            btn.disabled = true;
            if (redeemStatus) redeemStatus.textContent = 'Redeeming…';
            try {
              const res = await workspaceFetch(`${ctx.apiBaseUrl}/tokens/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perkId }),
              });
              const data = await res.json();
              if (!res.ok || !data.success) {
                if (redeemStatus) redeemStatus.textContent = data.error || 'Could not redeem.';
                btn.disabled = balance < perkCost;
                return;
              }
              if (redeemStatus) redeemStatus.textContent = data.message || 'Redeemed.';
              await loadClientWorkspaceData(ctx);
            } catch {
              if (redeemStatus) redeemStatus.textContent = 'Network error while redeeming.';
              btn.disabled = false;
            }
          });
        });
      }
    } else if (perksEl) {
      perksEl.innerHTML =
        perksRes.status === 404
          ? '<li class="empty-state">Token perks will appear after the next API deploy.</li>'
          : '';
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
    } else if (listEl) {
      listEl.innerHTML =
        '<li class="empty-state">Could not load contributions. Try Refresh, or check API connectivity.</li>';
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

function setPasskeyRegisterAvailability(hasPasskey: boolean): void {
  const registerBtn = document.getElementById('passkey-register-btn') as HTMLButtonElement | null;
  const actions = registerBtn?.closest('.insight-card__actions') as HTMLElement | null;
  if (!registerBtn) return;

  if (hasPasskey) {
    registerBtn.disabled = true;
    registerBtn.hidden = true;
    if (actions) actions.hidden = true;
  } else {
    registerBtn.disabled = false;
    registerBtn.hidden = false;
    registerBtn.textContent = 'Register passkey';
    if (actions) actions.hidden = false;
  }
}

export async function loadPasskeyCredentials(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('passkey-credentials-list');
  if (!container) return;
  if (!hasSession(ctx)) {
    container.innerHTML = '<p class="status-message">Sign in to manage your passkey.</p>';
    setPasskeyRegisterAvailability(false);
    return;
  }

  container.innerHTML = '<p class="status-message">Loading passkey…</p>';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/credentials`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      container.innerHTML = '<p class="status-message">Unable to load passkey.</p>';
      return;
    }
    const creds = Array.isArray(data.credentials) ? data.credentials : [];
    const hasPasskey = creds.length > 0;
    setPasskeyRegisterAvailability(hasPasskey);

    if (!hasPasskey) {
      container.innerHTML = '<p class="status-message">No passkey yet. Register one for phishing-resistant sign-in.</p>';
      return;
    }

    // One-of capacity going forward; still list all so legacy extras can be removed.
    container.innerHTML = creds.map((c: { id: string; deviceType: string; backedUp: boolean; lastUsedAt?: string | null }) => `
      <motionless class="passkey-row">
        <span>${escapeHtml(c.deviceType)}${c.backedUp ? ' · synced' : ''}${c.lastUsedAt ? ` · last used ${escapeHtml(new Date(c.lastUsedAt).toLocaleDateString())}` : ''}</span>
        <button type="button" class="btn btn-secondary btn-sm" data-passkey-remove="${escapeHtml(c.id)}">Remove</button>
      </motionless>
    `.replaceAll('motionless', 'div')).join('');

    if (creds.length > 1) {
      const note = document.createElement('p');
      note.className = 'status-message';
      note.textContent = 'Only one passkey is kept for sign-in. Remove extras, then keep a single device.';
      container.appendChild(note);
    }

    container.querySelectorAll('[data-passkey-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).getAttribute('data-passkey-remove');
        if (!id) return;
        const statusEl = document.getElementById('passkey-register-status');
        try {
          await runWorkspaceGuardedAction(`passkey:remove:${id}`, {
            onBusy: (busy) => setElementBusy(btn as HTMLButtonElement, busy, busy ? 'Removing…' : 'Remove'),
            run: async () => {
              const res = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/credentials`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credentialId: id }),
              });
              if (!res.ok) {
                let message = 'Could not remove passkey.';
                try {
                  const data = await res.json();
                  if (data?.error) message = String(data.error);
                } catch {
                  /* keep default */
                }
                throw new Error(message);
              }
              if (statusEl) statusEl.textContent = '';
              await loadPasskeyCredentials(ctx);
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not remove passkey.';
          if (statusEl) statusEl.textContent = message;
          ctx.showAuthBanner(message, 'error');
        }
      });
    });
  } catch {
    container.innerHTML = '<p class="status-message">Could not load passkey.</p>';
  }
}

export async function registerPasskey(ctx: PortalAccountContext): Promise<void> {
  const statusEl = document.getElementById('passkey-register-status');
  const registerBtn = document.getElementById('passkey-register-btn') as HTMLButtonElement | null;

  if (!hasSession(ctx)) {
    const message = 'Sign in again to register a passkey.';
    if (statusEl) statusEl.textContent = message;
    ctx.showAuthBanner(message, 'error');
    return;
  }

  if (!ctx.apiBaseUrl) {
    const message = 'Account API is not configured. Refresh the page and try again.';
    if (statusEl) statusEl.textContent = message;
    ctx.showAuthBanner(message, 'error');
    return;
  }

  if (statusEl) statusEl.textContent = 'Starting passkey registration…';
  if (registerBtn) {
    registerBtn.disabled = true;
    registerBtn.setAttribute('aria-busy', 'true');
  }

  try {
    const optRes = await workspaceFetch(`${ctx.apiBaseUrl}/auth/passkey/register-options`, {
      method: 'POST'
    });
    const optData = await optRes.json();
    if (!optRes.ok || !optData.success) throw new Error(optData.error || 'Could not start registration');

    if (statusEl) statusEl.textContent = 'Complete the passkey prompt on this device…';
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
    const message = error instanceof Error ? error.message : 'Passkey registration failed.';
    if (statusEl) statusEl.textContent = message;
    if (error instanceof Error && error.name === 'NotAllowedError') {
      ctx.showAuthBanner('Passkey registration was cancelled or timed out. Try again when ready.', 'error');
    }
  } finally {
    if (registerBtn && !registerBtn.hidden) {
      registerBtn.disabled = false;
      registerBtn.removeAttribute('aria-busy');
    } else if (registerBtn) {
      registerBtn.removeAttribute('aria-busy');
    }
  }
}

export async function loadSiteReviewSections(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('site-review-list');
  if (!container) return;
  if (!hasSession(ctx)) {
    sessionRequiredMessage(container, 'Sign in again to review public site sections.');
    return;
  }

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
  if (!hasSession(ctx)) {
    sessionRequiredMessage(container, 'Sign in again to view hosting status.');
    if (message) message.textContent = '';
    return;
  }

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
        (item: { key: string; required: boolean; configured: boolean | null; notes: string; setOn: string }) => {
          const rowClass =
            item.configured === true
              ? 'hosting-status-row--ok'
              : item.configured === null
                ? 'hosting-status-row--pages'
                : 'hosting-status-row--missing';
          const statusLabel =
            item.configured === true
              ? 'Configured'
              : item.configured === null
                ? 'Set on Pages'
                : item.required
                  ? 'Missing'
                  : 'Optional';
          return `
      <article class="hosting-status-row ${rowClass}">
        <strong>${escapeHtml(item.key)}</strong>
        <span>${statusLabel}</span>
        <p>${escapeHtml(item.notes)} <em>(${escapeHtml(item.setOn)})</em></p>
      </article>
    `;
        },
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
  if (!hasSession(ctx)) {
    if (message) message.textContent = 'Sign in again to email the hosting checklist.';
    return;
  }

  const fromMailbox = readAdminMailboxSelect('admin-email-from', 'support');
  const toMailbox = readAdminMailboxSelect('admin-email-to', 'bigpons');
  persistAdminEmailPrefs(fromMailbox, toMailbox);

  if (message) {
    message.textContent = `Sending checklist from ${siteMailboxes[fromMailbox]} to ${siteMailboxes[toMailbox]}…`;
  }

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/email-hosting-checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fromMailbox, toMailbox }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (message) message.textContent = data.error ?? 'Could not send checklist email.';
      return;
    }
    if (message) {
      const fromLabel = data.emailedFrom ?? siteMailboxes[fromMailbox];
      const toLabel = data.emailedTo ?? siteMailboxes[toMailbox];
      message.textContent = `Checklist sent from ${fromLabel} to ${toLabel}.`;
    }
  } catch {
    if (message) message.textContent = 'Could not send checklist email.';
  }
}

export function bindPortalAccountExtensions(resolveCtx: () => PortalAccountContext): void {
  bindAdminEmailPrefs();
  bindOverviewBilling(resolveCtx);

  // Passkey *login* is bound in account-auth.ts (always-loaded). Registration stays here.
  document.getElementById('passkey-register-btn')?.addEventListener('click', () => void registerPasskey(resolveCtx()));
  document.getElementById('refresh-moderation-btn')?.addEventListener('click', () => void loadModerationQueue(resolveCtx()));
  document.getElementById('refresh-site-review-btn')?.addEventListener('click', () => void loadSiteReviewSections(resolveCtx()));
  document.getElementById('refresh-hosting-status-btn')?.addEventListener('click', () => void loadHostingStatus(resolveCtx()));
  document.getElementById('email-hosting-checklist-btn')?.addEventListener('click', () => void emailHostingChecklist(resolveCtx()));
}
