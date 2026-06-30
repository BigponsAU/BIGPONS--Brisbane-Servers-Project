/**
 * Styled confirmation dialog — replaces window.confirm() across the account workspace.
 */
import { escapeHtml } from './account-workspace-utils';

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'primary' | 'danger';
};

export type PromptDialogOptions = {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'url';
};

function getConfirmHost(): HTMLElement {
  let host = document.getElementById('portal-confirm-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'portal-confirm-host';
    document.body.appendChild(host);
  }
  return host;
}

export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = getConfirmHost();
    const confirmLabel = options.confirmLabel ?? 'Confirm';
    const cancelLabel = options.cancelLabel ?? 'Cancel';
    const variant = options.variant ?? 'default';
    const confirmClass =
      variant === 'danger'
        ? 'btn btn-danger'
        : variant === 'primary'
          ? 'btn btn-primary'
          : 'btn btn-secondary';

    host.innerHTML = `
      <div class="modal portal-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="portal-confirm-title" aria-hidden="false">
        <div class="modal-overlay" data-portal-confirm-cancel></div>
        <div class="modal-content portal-confirm-modal__content">
          <div class="modal-header">
            <h2 id="portal-confirm-title">${escapeHtml(options.title)}</h2>
          </div>
          <div class="modal-body portal-confirm-modal__body">
            <p class="portal-confirm-modal__message">${escapeHtml(options.message)}</p>
            ${
              options.details
                ? `<p class="portal-confirm-modal__details">${escapeHtml(options.details)}</p>`
                : ''
            }
          </div>
          <div class="modal-footer portal-confirm-modal__footer">
            <button type="button" class="btn btn-secondary" data-portal-confirm-cancel>${escapeHtml(cancelLabel)}</button>
            <button type="button" class="${confirmClass}" data-portal-confirm-ok>${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `;

    const modal = host.querySelector('.modal') as HTMLElement;
    const okBtn = host.querySelector('[data-portal-confirm-ok]') as HTMLButtonElement;
    const cancelBtns = host.querySelectorAll('[data-portal-confirm-cancel]');

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const finish = (accepted: boolean) => {
      document.body.style.overflow = previousOverflow;
      modal.setAttribute('aria-hidden', 'true');
      host.innerHTML = '';
      document.removeEventListener('keydown', onKeyDown);
      resolve(accepted);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    };

    okBtn?.focus();
    okBtn?.addEventListener('click', () => finish(true));
    cancelBtns.forEach((btn) => btn.addEventListener('click', () => finish(false)));
    document.addEventListener('keydown', onKeyDown);
  });
}

export function showPromptDialog(options: PromptDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const host = getConfirmHost();
    const confirmLabel = options.confirmLabel ?? 'OK';
    const cancelLabel = options.cancelLabel ?? 'Cancel';
    const inputType = options.inputType ?? 'text';

    host.innerHTML = `
      <div class="modal portal-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="portal-prompt-title" aria-hidden="false">
        <div class="modal-overlay" data-portal-prompt-cancel></div>
        <div class="modal-content portal-confirm-modal__content">
          <div class="modal-header">
            <h2 id="portal-prompt-title">${escapeHtml(options.title)}</h2>
          </div>
          <div class="modal-body portal-confirm-modal__body">
            ${options.message ? `<p class="portal-confirm-modal__message">${escapeHtml(options.message)}</p>` : ''}
            <input type="${inputType}" class="portal-prompt-input" data-portal-prompt-input value="${escapeHtml(options.defaultValue ?? '')}" placeholder="${escapeHtml(options.placeholder ?? '')}" />
          </div>
          <div class="modal-footer portal-confirm-modal__footer">
            <button type="button" class="btn btn-secondary" data-portal-prompt-cancel>${escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn btn-primary" data-portal-prompt-ok>${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `;

    const input = host.querySelector('[data-portal-prompt-input]') as HTMLInputElement;
    const okBtn = host.querySelector('[data-portal-prompt-ok]') as HTMLButtonElement;
    const cancelBtns = host.querySelectorAll('[data-portal-prompt-cancel]');

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const finish = (value: string | null) => {
      document.body.style.overflow = previousOverflow;
      host.innerHTML = '';
      document.removeEventListener('keydown', onKeyDown);
      resolve(value);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
      if (event.key === 'Enter' && document.activeElement === input) {
        event.preventDefault();
        finish(input.value.trim() || null);
      }
    };

    input?.focus();
    input?.select();
    okBtn?.addEventListener('click', () => finish(input?.value.trim() || null));
    cancelBtns.forEach((btn) => btn.addEventListener('click', () => finish(null)));
    document.addEventListener('keydown', onKeyDown);
  });
}
