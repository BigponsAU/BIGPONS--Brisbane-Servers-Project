/** Minimal header nav for /account — avoids loading full main.ts on sign-in. */
import { closeDesktopNavDropdowns, closeMobileNav } from './nav-mobile';

document.addEventListener('DOMContentLoaded', () => {
  closeMobileNav();

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('[data-account-link="true"]') as HTMLAnchorElement | null;
      if (!link) return;
      const signedIn = link.classList.contains('nav-account-cta--signed-in');
      const onAccountPage = document.body.dataset.pageId === 'account';
      if (signedIn && onAccountPage) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    true,
  );

  const menuButton = document.querySelector('.hamburger') as HTMLButtonElement | null;
  const menuPanel = document.querySelector('.mobile-menu') as HTMLElement | null;
  if (!menuButton || !menuPanel) return;

  function setMobileNavOpen(open: boolean): void {
    if (!menuButton || !menuPanel) return;
    if (!open) {
      closeMobileNav();
      return;
    }
    menuButton.classList.add('active');
    menuPanel.classList.add('active');
    menuButton.setAttribute('aria-expanded', 'true');
    menuPanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-mobile-open');
    closeDesktopNavDropdowns();
  }

  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    setMobileNavOpen(!isExpanded);
  });

  document.addEventListener('click', (e) => {
    if (menuButton.getAttribute('aria-expanded') !== 'true') return;
    const target = e.target as HTMLElement;
    if (!menuButton.contains(target) && !menuPanel.contains(target)) {
      setMobileNavOpen(false);
    }
  });

  menuPanel.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith('#')) return;
    setMobileNavOpen(false);
  });

  window.addEventListener(
    'scroll',
    () => {
      closeMobileNav();
      closeDesktopNavDropdowns();
    },
    { passive: true },
  );
});
