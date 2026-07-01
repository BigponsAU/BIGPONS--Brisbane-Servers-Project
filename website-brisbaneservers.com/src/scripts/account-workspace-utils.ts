/**
 * Shared utilities for account workspace client bundles.
 */

export function escapeHtml(text: unknown): string {
  const value = String(text ?? '');
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeJsString(text: unknown): string {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

export function treeGroupLabel(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function treeSlug(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'item';
}

export function formatInferenceBadge(metadata: Record<string, unknown> | undefined): string {
  const mode = metadata?.inferenceMode as string | undefined;
  if (!mode) return '';
  const model = metadata?.inferenceModelId as string | null | undefined;
  let label = mode;
  if (model && model !== 'voice-framework-template') {
    const short = String(model).includes('/') ? String(model).split('/').pop() : model;
    label = `${mode} · ${short}`;
  }
  return `<span class="badge badge-draft inference-badge" title="Last inference: ${escapeHtml(label)}">${escapeHtml(label)}</span>`;
}

export function resourceExcerpt(
  resource: { description?: unknown; content?: unknown },
  maxLen = 150,
): string {
  const pick = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.length > maxLen ? trimmed.substring(0, maxLen) : trimmed;
  };
  return pick(resource.description) || pick(resource.content);
}

export type WorkspaceNotificationType = 'success' | 'error' | 'warning' | 'info';

export function dismissWorkspaceNotifications(
  type?: WorkspaceNotificationType | 'all',
): void {
  const container = document.getElementById('notification-container');
  if (!container) return;
  container.querySelectorAll('.notification').forEach((node) => {
    const el = node as HTMLElement;
    if (type && type !== 'all' && !el.classList.contains(type)) return;
    el.classList.add('hiding');
    window.setTimeout(() => el.remove(), 300);
  });
}

export function showWorkspaceNotification(
  message: string,
  type: WorkspaceNotificationType = 'info',
  duration = 5000,
): void {
  const container = document.getElementById('notification-container');
  if (!container) {
    console.warn('[Portal] Notification container not found');
    return;
  }

  // Replace prior sticky progress toasts (duration 0) when showing a new alert
  if (type !== 'info') {
    dismissWorkspaceNotifications('info');
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute('role', 'alert');

  let iconSvg = '';
  switch (type) {
    case 'success':
      iconSvg =
        '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      break;
    case 'error':
      iconSvg =
        '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      break;
    case 'warning':
      iconSvg =
        '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      break;
    default:
      iconSvg =
        '<svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  notification.innerHTML = `
    ${iconSvg}
    <span class="notification-message">${escapeHtml(message)}</span>
    <button class="notification-close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  const closeBtn = notification.querySelector('.notification-close');
  const removeNotification = () => {
    notification.classList.add('hiding');
    setTimeout(() => {
      notification.parentNode?.removeChild(notification);
    }, 300);
  };

  closeBtn?.addEventListener('click', removeNotification);
  container.appendChild(notification);

  if (duration > 0) {
    setTimeout(removeNotification, duration);
  }
}

const inFlightWorkspaceActions = new Set<string>();

export function isWorkspaceActionInFlight(key: string): boolean {
  return inFlightWorkspaceActions.has(key);
}

function tryAcquireWorkspaceAction(key: string): boolean {
  if (inFlightWorkspaceActions.has(key)) return false;
  inFlightWorkspaceActions.add(key);
  return true;
}

function releaseWorkspaceAction(key: string): void {
  inFlightWorkspaceActions.delete(key);
}

/** Run async work once per key; returns undefined if already in flight. */
export async function withWorkspaceActionGuard<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  if (!tryAcquireWorkspaceAction(key)) return undefined;
  try {
    return await fn();
  } finally {
    releaseWorkspaceAction(key);
  }
}

/**
 * Hold an in-flight guard from first click through confirm + API work.
 * `onBusy(true)` runs immediately; `onBusy(false)` runs in finally (including cancel).
 */
export async function runWorkspaceGuardedAction(
  key: string,
  options: {
    confirm?: () => Promise<boolean>;
    onBusy?: (busy: boolean) => void;
    run: () => Promise<void>;
  },
): Promise<void> {
  if (!tryAcquireWorkspaceAction(key)) return;
  options.onBusy?.(true);
  try {
    if (options.confirm) {
      const ok = await options.confirm();
      if (!ok) return;
    }
    await options.run();
  } finally {
    options.onBusy?.(false);
    releaseWorkspaceAction(key);
  }
}

export function setElementBusy(
  el: HTMLElement | null | undefined,
  busy: boolean,
  busyLabel?: string,
): void {
  if (!el || el.tagName !== 'BUTTON') return;
  const btn = el as HTMLButtonElement;
  if (busy) {
    if (!btn.dataset.workspaceBusyOriginal) {
      btn.dataset.workspaceBusyOriginal = btn.textContent ?? '';
    }
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (busyLabel) btn.textContent = busyLabel;
  } else {
    if (btn.dataset.workspaceBusyOriginal) {
      btn.textContent = btn.dataset.workspaceBusyOriginal;
      delete btn.dataset.workspaceBusyOriginal;
    }
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
  }
}

/** Disable all matching action buttons (list row + detail panel). */
export function setResourceActionButtonsBusy(
  actionName: string,
  resourceId: string,
  busy: boolean,
  busyLabel?: string,
): void {
  document.querySelectorAll(`button[onclick*="${actionName}"]`).forEach((node) => {
    const onclick = node.getAttribute('onclick') ?? '';
    if (!onclick.includes(resourceId)) return;
    setElementBusy(node as HTMLButtonElement, busy, busyLabel);
  });
}

export function setBulkActionsBusy(busy: boolean, busyLabel?: string): void {
  document.getElementById('bulk-actions')?.querySelectorAll('button').forEach((btn) => {
    setElementBusy(btn as HTMLButtonElement, busy, busyLabel);
  });
}

export function setStarterBlockCardsBusy(starterBlockId: string, busy: boolean): void {
  document.querySelectorAll('.starter-block-card').forEach((card) => {
    const htmlCard = card as HTMLElement;
    const onclick = htmlCard.getAttribute('onclick') ?? '';
    const matches =
      onclick.includes(starterBlockId) ||
      Boolean(htmlCard.querySelector(`button[onclick*="${starterBlockId}"]`));
    if (!matches) return;
    htmlCard.classList.toggle('starter-block-card--busy', busy);
    htmlCard.style.pointerEvents = busy ? 'none' : '';
    htmlCard.querySelectorAll('button').forEach((btn) => {
      setElementBusy(btn as HTMLButtonElement, busy, busy ? 'Creating…' : undefined);
    });
  });
}
