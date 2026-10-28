/**
 * Open/close workspace dialogs. BaseLayout used to stamp inline
 * display:none / pointer-events:none on every .modal, which CSS
 * [aria-hidden=false] cannot override — View full / Preview looked dead.
 */
export function revealWorkspaceModal(modal: HTMLElement): void {
  modal.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
    overlay.style.removeProperty('display');
    overlay.style.removeProperty('pointer-events');
  });
  modal.style.display = 'flex';
  modal.style.pointerEvents = 'auto';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function hideWorkspaceModal(modal: HTMLElement | null | undefined): void {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
  modal.style.pointerEvents = 'none';
  document.body.style.overflow = '';
}
