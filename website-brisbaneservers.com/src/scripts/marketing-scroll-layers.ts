/**
 * Layered scroll-over parallax for marketing canopies.
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

export function bootMarketingScrollLayers(): void {
    if (prefersReducedMotion()) return;

    const canopies = document.querySelectorAll<HTMLElement>('[data-scroll-canopy]');
    if (canopies.length === 0) return;

    let scheduled = false;

    const tick = (): void => {
        scheduled = false;
        canopies.forEach(updateCanopy);
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
