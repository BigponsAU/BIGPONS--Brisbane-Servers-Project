/** Minimal header nav for /account — avoids loading full main.ts on sign-in. */
import { bindNavMobileDimmer, closeDesktopNavDropdowns, closeMobileNav, setMobileNavOpen } from './nav-mobile';

document.addEventListener('DOMContentLoaded', () => {
  closeMobileNav();
  bindNavMobileDimmer();

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

  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    setMobileNavOpen(!isExpanded);
  });

  document.addEventListener('click', (e) => {
    if (menuButton.getAttribute('aria-expanded') !== 'true') return;
    const target = e.target as HTMLElement;
    if (target.closest?.('#nav-mobile-dimmer')) return;
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
      // Do not close the phone burger on scroll — iOS chrome/rubber-band fires spurious scrolls.
      closeDesktopNavDropdowns();
    },
    { passive: true },
  );

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMobileNavOpen(false);
      menuButton.focus();
    }
  });
});
