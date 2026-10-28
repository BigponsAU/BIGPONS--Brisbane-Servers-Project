/**
 * Open/close workspace dialogs. BaseLayout used to stamp inline
 * display:none / pointer-events:none on every .modal, which CSS
 * [aria-hidden=false] cannot override — View full / Preview looked dead.
 *
 * Dialogs are moved to document.body so overflow-x:clip on the workspace
 * shell cannot crop them to half the viewport.
 */

const modalHomes = new WeakMap<HTMLElement, { parent: Node; next: ChildNode | null }>();
let openModalCount = 0;

function placeModalOnBody(modal: HTMLElement): void {
  if (!modalHomes.has(modal) && modal.parentNode) {
    modalHomes.set(modal, { parent: modal.parentNode, next: modal.nextSibling });
  }
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
}

function restoreModalHome(modal: HTMLElement): void {
  const home = modalHomes.get(modal);
  if (!home?.parent) return;
  if (home.next && home.next.parentNode === home.parent) {
    home.parent.insertBefore(modal, home.next);
  } else {
    home.parent.appendChild(modal);
  }
}

function syncModalOpenClass(): void {
  document.documentElement.classList.toggle('workspace-modal-open', openModalCount > 0);
  document.body.style.overflow = openModalCount > 0 ? 'hidden' : '';
}

export function revealWorkspaceModal(modal: HTMLElement): void {
  placeModalOnBody(modal);
  modal.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
    overlay.style.removeProperty('display');
    overlay.style.removeProperty('pointer-events');
  });
  modal.style.display = 'flex';
  modal.style.pointerEvents = 'auto';
  modal.setAttribute('aria-hidden', 'false');
  if (!modal.dataset.workspaceModalOpen) {
    modal.dataset.workspaceModalOpen = '1';
    openModalCount += 1;
  }
  syncModalOpenClass();
}

export function hideWorkspaceModal(modal: HTMLElement | null | undefined): void {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
  modal.style.pointerEvents = 'none';
  if (modal.dataset.workspaceModalOpen) {
    delete modal.dataset.workspaceModalOpen;
    openModalCount = Math.max(0, openModalCount - 1);
  }
  restoreModalHome(modal);
  syncModalOpenClass();
}

/** Close a dynamically created .modal (profiles, etc.) and release the open-count lock. */
export function dismissCreatedModal(from: HTMLElement | EventTarget | null): void {
  const el = from instanceof HTMLElement ? from : null;
  const modal = el?.closest('.modal') as HTMLElement | null;
  if (!modal) return;
  hideWorkspaceModal(modal);
  modal.remove();
}

/** Move overlays out of overflow-x:clip workspace so fixed dialogs fill the viewport. */
export function hoistWorkspaceOverlays(): void {
  const ids = ['portal-confirm-host', 'notification-container', 'info-card', 'view-resource-modal', 'preview-resource-modal', 'edit-resource-modal'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { dismissCreatedModal: typeof dismissCreatedModal }).dismissCreatedModal =
    dismissCreatedModal;
}
