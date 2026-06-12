/** Shared desktop/mobile nav state — used by main.ts and account workspace cleanup. */

export function closeDesktopNavDropdowns(exceptParent?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('.nav-dropdown').forEach((node) => {
    const parent = node as HTMLElement;
    if (exceptParent && parent === exceptParent) return;

    const toggle = parent.querySelector('.nav-dropdown-toggle') as HTMLElement | null;
    const dropdown = toggle?.nextElementSibling as HTMLElement | null;
    if (!toggle) return;

    toggle.setAttribute('aria-expanded', 'false');
    parent.classList.remove('is-open');
    dropdown?.style.removeProperty('margin-left');
    dropdown?.style.removeProperty('left');
    dropdown?.style.removeProperty('right');
  });
}

export function closeMobileNav(): void {
  if (typeof document === 'undefined') return;

  const menuButton = document.querySelector('.hamburger') as HTMLButtonElement | null;
  const menuPanel = document.querySelector('.mobile-menu') as HTMLElement | null;
  if (!menuButton || !menuPanel) return;

  menuButton.classList.remove('active');
  menuPanel.classList.remove('active');
  menuButton.setAttribute('aria-expanded', 'false');
  menuPanel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('nav-mobile-open');
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

export function isMobileNavOpen(): boolean {
  const menuButton = document.querySelector('.hamburger') as HTMLButtonElement | null;
  return menuButton?.getAttribute('aria-expanded') === 'true';
}
