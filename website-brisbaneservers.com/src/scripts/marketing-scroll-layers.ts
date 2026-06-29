/**
 * Layered scroll-over parallax for marketing canopies + dark-band scroll-under.
 * Respects prefers-reduced-motion; uses transform only.
 */

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function updateCanopy(canopy: HTMLElement): void {
    const planes = canopy.querySelectorAll<HTMLElement>('[data-parallax-rate]');
    const rect = canopy.getBoundingClientRect();
    const viewH = window.innerHeight;
    const total = viewH + rect.height;
    const progress = total > 0 ? (viewH - rect.top) / total : 0;
    const centered = progress - 0.5;

    planes.forEach((plane) => {
        const rate = Number.parseFloat(plane.dataset.parallaxRate ?? '0.2');
        const offset = centered * 160 * rate;
        plane.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    });
}

function updateScrollUnder(): void {
    const viewH = window.innerHeight;

    document.querySelectorAll<HTMLElement>('.section-scroll-under.section--hero-wash').forEach((darkBand) => {
        const rect = darkBand.getBoundingClientRect();
        const scrollProgress = Math.min(1, Math.max(0, (viewH * 0.55 - rect.bottom) / (viewH * 0.45)));
        const parallaxY = scrollProgress * 36;

        darkBand.style.setProperty('--scroll-under-progress', scrollProgress.toFixed(3));

        darkBand.querySelectorAll<HTMLElement>('.section-satellite--backdrop').forEach((backdrop) => {
            backdrop.style.setProperty('--backdrop-parallax-y', `${parallaxY.toFixed(1)}px`);
        });

        const nextPanel = darkBand.nextElementSibling;
        if (nextPanel instanceof HTMLElement && nextPanel.classList.contains('section')) {
            const lift = Math.min(48, scrollProgress * 64);
            nextPanel.style.setProperty('--scroll-over-lift', lift.toFixed(1));
        }
    });
}

export function bootMarketingScrollLayers(): void {
    const canopies = document.querySelectorAll<HTMLElement>('[data-scroll-canopy]');
    const hasScrollUnder = document.querySelector('.section-scroll-under') !== null;

    if (canopies.length === 0 && !hasScrollUnder) return;

    let scheduled = false;

    const tick = (): void => {
        scheduled = false;
        canopies.forEach(updateCanopy);
        if (!prefersReducedMotion()) {
            updateScrollUnder();
        }
    };

    const onScroll = (): void => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
}
