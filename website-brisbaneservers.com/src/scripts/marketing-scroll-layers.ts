/**
 * Layered scroll-over parallax for marketing canopies + scroll transition decks.
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

function updateScrollDecks(): void {
    const viewH = window.innerHeight;

    document.querySelectorAll<HTMLElement>('[data-scroll-deck]').forEach((deck) => {
        const stage = deck.querySelector<HTMLElement>('.section-scroll-deck-stage');
        const exitCover = deck.querySelector<HTMLElement>('.section-scroll-deck-cover--exit');
        if (!stage) return;

        const isBottomEngulf = deck.classList.contains('scroll-transition-deck--bottom-engulf');
        const stageRect = stage.getBoundingClientRect();
        const exitRect = exitCover?.getBoundingClientRect();

        const coverStart = viewH * 0.9;
        const coverEnd = viewH * 0.2;
        let coverProgress = 0;

        if (exitRect) {
            coverProgress = Math.min(1, Math.max(0, (coverStart - exitRect.top) / (coverStart - coverEnd)));
        } else {
            coverProgress = Math.min(1, Math.max(0, (viewH * 0.72 - stageRect.bottom) / (viewH * 0.5)));
        }

        if (isBottomEngulf) {
            stage.style.setProperty('--deck-stage-y', '0');
            stage.style.setProperty('--deck-stage-shrink', '0');
            stage.style.setProperty('--deck-stage-fade', '0');
        } else {
            const stageY = coverProgress * -56;
            const stageShrink = coverProgress * 0.65;
            const stageFade = coverProgress * 0.85;

            stage.style.setProperty('--deck-stage-y', stageY.toFixed(1));
            stage.style.setProperty('--deck-stage-shrink', stageShrink.toFixed(3));
            stage.style.setProperty('--deck-stage-fade', stageFade.toFixed(3));
        }

        const approachParallax = Math.min(1, Math.max(0, (viewH * 0.55 - stageRect.top) / (viewH * 0.45)));
        const parallaxY = coverProgress * 44 + (1 - coverProgress) * approachParallax * 28;

        stage.querySelectorAll<HTMLElement>('.section-satellite--backdrop').forEach((backdrop) => {
            backdrop.style.setProperty('--backdrop-parallax-y', `${parallaxY.toFixed(1)}px`);
        });

        if (exitCover) {
            exitCover.style.setProperty('--deck-cover-progress', coverProgress.toFixed(3));
            const exitY = Math.min(10, Math.max(-36, (stageRect.bottom - viewH * 0.36) * -0.14));
            exitCover.style.setProperty('--deck-cover-y', exitY.toFixed(1));
        }
    });
}

function updateScrollUnder(): void {
    const viewH = window.innerHeight;

    document
        .querySelectorAll<HTMLElement>('.section-scroll-under.section--hero-wash:not(.section-scroll-deck-stage)')
        .forEach((darkBand) => {
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
    const hasScrollDeck = document.querySelector('[data-scroll-deck]') !== null;

    if (canopies.length === 0 && !hasScrollUnder && !hasScrollDeck) return;

    let scheduled = false;

    const tick = (): void => {
        scheduled = false;
        canopies.forEach(updateCanopy);
        if (!prefersReducedMotion()) {
            updateScrollDecks();
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
