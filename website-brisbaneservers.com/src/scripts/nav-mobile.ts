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

let mobileMenuHome: Element | null = null;

function syncNavMobileDimmer(open: boolean): void {
  const dimmer = document.getElementById('nav-mobile-dimmer') as HTMLButtonElement | null;
  if (!dimmer) return;
  dimmer.hidden = !open;
  dimmer.setAttribute('aria-hidden', open ? 'false' : 'true');
  dimmer.classList.toggle('is-visible', open);
}

/** Ensure the panel escapes header/shell stacking contexts on phones. */
function syncMobileMenuMount(menuPanel: HTMLElement, open: boolean): void {
  if (open) {
    if (menuPanel.parentElement !== document.body) {
      mobileMenuHome = menuPanel.parentElement;
      document.body.appendChild(menuPanel);
    }
    return;
  }
  if (menuPanel.parentElement === document.body && mobileMenuHome?.isConnected) {
    mobileMenuHome.appendChild(menuPanel);
    mobileMenuHome = null;
    return;
  }
  if (menuPanel.parentElement === document.body) {
    const nav = document.querySelector('header[role="banner"] nav');
    (nav || document.querySelector('header[role="banner"]'))?.appendChild(menuPanel);
  }
}

export function setMobileNavOpen(open: boolean): void {
  if (typeof document === 'undefined') return;

  const menuButton = document.querySelector('.hamburger') as HTMLButtonElement | null;
  const menuPanel = document.querySelector('.mobile-menu') as HTMLElement | null;
  if (!menuButton || !menuPanel) return;

  if (!open) {
    menuButton.classList.remove('active');
    menuPanel.classList.remove('active');
    menuButton.setAttribute('aria-expanded', 'false');
    menuPanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-mobile-open');
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    syncNavMobileDimmer(false);
    syncMobileMenuMount(menuPanel, false);
    return;
  }

  menuButton.classList.add('active');
  menuPanel.classList.add('active');
  menuButton.setAttribute('aria-expanded', 'true');
  menuPanel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('nav-mobile-open');
  syncMobileMenuMount(menuPanel, true);
  syncNavMobileDimmer(true);
  closeDesktopNavDropdowns();
}

export function closeMobileNav(): void {
  setMobileNavOpen(false);
}

export function isMobileNavOpen(): boolean {
  const menuButton = document.querySelector('.hamburger') as HTMLButtonElement | null;
  return menuButton?.getAttribute('aria-expanded') === 'true';
}

export function bindNavMobileDimmer(): void {
  const dimmer = document.getElementById('nav-mobile-dimmer');
  if (!dimmer || (dimmer as HTMLElement).dataset.bound === '1') return;
  (dimmer as HTMLElement).dataset.bound = '1';
  dimmer.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMobileNav();
  });
}

export function bindMobileMenuAccordions(): void {
  const menuPanel = document.querySelector('.mobile-menu') as HTMLElement | null;
  if (!menuPanel || menuPanel.dataset.accordionBound === '1') return;
  menuPanel.dataset.accordionBound = '1';
  menuPanel.addEventListener('toggle', (event) => {
    const details = event.target as HTMLDetailsElement;
    if (!details?.classList?.contains('mobile-menu__feature') || !details.open) return;
    // Keep expanded section in view inside the scrollable panel.
    window.requestAnimationFrame(() => {
      details.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
}
