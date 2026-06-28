// Simplified main script — navigation, search, forms, progressive disclosure.
// Layout breakpoints: CSS media queries only (browser full-page zoom; no JS tier / zoom modeling).

import { closeDesktopNavDropdowns, closeMobileNav } from './nav-mobile';
import { resolveInquiryScrollTarget } from '../lib/inquiry-nav';
import { resolveContentPath } from '../lib/site-path';

function isAccountUtilityPage(): boolean {
  return document.body?.dataset.pageId === 'account';
}

function initializeNavDismissOnScrollAndNavigation(): void {
    let scrollTick = false;

    const dismissOpenNav = (): void => {
        closeMobileNav();
        closeDesktopNavDropdowns();
    };

    window.addEventListener(
        'scroll',
        () => {
            if (scrollTick) return;
            scrollTick = true;
            requestAnimationFrame(() => {
                scrollTick = false;
                dismissOpenNav();
            });
        },
        { passive: true },
    );

    document.addEventListener('click', (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest('.nav-menu a[href], .nav-mega__link[href]');
        if (!link) return;
        const href = link.getAttribute('href') ?? '';
        if (href.startsWith('#')) {
            closeDesktopNavDropdowns();
            return;
        }
        dismissOpenNav();
    });

    window.addEventListener('pageshow', dismissOpenNav);
}

// ===== NAVIGATION TOGGLE =====
document.addEventListener('DOMContentLoaded', function() {
    try { localStorage.removeItem('authToken'); } catch { /* legacy session cleanup */ }

    closeDesktopNavDropdowns();

    const hamburger = document.querySelector('.hamburger') as HTMLButtonElement | null;
    const mobileMenu = document.querySelector('.mobile-menu') as HTMLElement | null;
    
    if (hamburger && mobileMenu) {
        const menuButton = hamburger;
        const menuPanel = mobileMenu;

        function closeAllDesktopDropdowns(): void {
            closeDesktopNavDropdowns();
        }

        function setMobileNavOpen(open: boolean) {
            if (!open) {
                closeMobileNav();
                return;
            }
            menuButton.classList.add('active');
            menuPanel.classList.add('active');
            menuButton.setAttribute('aria-expanded', 'true');
            menuPanel.setAttribute('aria-hidden', 'false');
            document.body.classList.add('nav-mobile-open');
            closeAllDesktopDropdowns();
        }

        // Ensure closed on load (stale SSR/hydration or cached body class).
        closeMobileNav();

        const desktopNavMq = window.matchMedia('(min-width: 1024px)');
        const onViewportNavMode = (): void => {
            if (desktopNavMq.matches && menuButton.getAttribute('aria-expanded') === 'true') {
                setMobileNavOpen(false);
            }
        };
        desktopNavMq.addEventListener('change', onViewportNavMode);
        window.addEventListener('resize', onViewportNavMode);

        menuButton.addEventListener('click', function (e: MouseEvent) {
            e.stopPropagation();
            const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
            const next = !isExpanded;
            setMobileNavOpen(next);
            if (next) {
                const firstLink = menuPanel.querySelector('a') as HTMLElement;
                firstLink?.focus();
            }
        });

        menuButton.addEventListener('keydown', function (e: KeyboardEvent) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                menuButton.click();
            }
            if (e.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
                setMobileNavOpen(false);
                menuButton.focus();
            }
        });

        document.addEventListener('click', function (e: MouseEvent) {
            if (menuButton.getAttribute('aria-expanded') !== 'true') return;
            const target = e.target as HTMLElement;
            if (!menuButton.contains(target) && !menuPanel.contains(target)) {
                setMobileNavOpen(false);
            }
        });

        menuPanel.addEventListener('click', (e: MouseEvent) => {
            const link = (e.target as HTMLElement).closest('a[href]');
            if (!link) return;
            const href = link.getAttribute('href') ?? '';
            if (href.startsWith('#')) return;
            setMobileNavOpen(false);
        });

    }

    initializeNavDismissOnScrollAndNavigation();
    initializeInquireNavLinks();
    
    // Initialize dropdown menus with keyboard support
    initializeDropdownMenus();

    window.addEventListener('resize', () => {
        document.querySelectorAll('.nav-dropdown.is-open .nav-dropdown-menu').forEach((menu) => {
            clampDropdownToViewport(menu as HTMLElement);
        });
    });
    
    // Set active nav link based on current page
    setActiveNavLink();

    // Defer auth probe — avoids blocking first paint / interaction (Render cold-start).
    if (!isAccountUtilityPage()) {
        scheduleAccountLinkHydration();
    }
});

function scheduleAccountLinkHydration(): void {
    if (document.body.dataset.pageId === 'account') return;

    const accountLinks = document.querySelectorAll('[data-account-link="true"]');
    if (!accountLinks.length) return;

    const run = (): void => {
        void hydrateAccountLinks();
    };

    const idle = (window as Window & { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
    if (typeof idle === 'function') {
        idle(run, { timeout: 3000 });
    } else {
        setTimeout(run, 1200);
    }
}

function initializeInquireNavLinks(): void {
    const scrollToInquiry = (sectionId: string, behavior: ScrollBehavior = 'smooth'): boolean => {
        const scrollTarget = resolveInquiryScrollTarget(sectionId);
        if (!scrollTarget) return false;
        closeDesktopNavDropdowns();
        closeMobileNav();
        scrollTarget.scrollIntoView({ behavior, block: 'start' });
        return true;
    };

    document.querySelectorAll('[data-nav-inquire="true"]').forEach((node) => {
        node.addEventListener('click', (event) => {
            const link = event.currentTarget as HTMLAnchorElement;
            const href = link.getAttribute('href') ?? '';
            const hashIndex = href.indexOf('#');
            if (hashIndex < 0) return;

            const hash = href.slice(hashIndex);
            const sectionId = hash.slice(1);
            if (!sectionId) return;

            const pathOnly = href.slice(0, hashIndex) || window.location.pathname;
            const onSamePage =
                pathOnly === window.location.pathname ||
                (pathOnly === '/' &&
                    (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')));

            if (!onSamePage) return;

            event.preventDefault();
            if (!scrollToInquiry(sectionId)) return;
            window.history.pushState(null, '', hash);
        });
    });

    const initialHash = window.location.hash.slice(1);
    if (initialHash && (initialHash === 'inquiry-section' || initialHash === 'consultation')) {
        requestAnimationFrame(() => {
            scrollToInquiry(initialHash, 'auto');
        });
    }
}

// ===== DROPDOWN MENU KEYBOARD NAVIGATION =====
const NAV_DROPDOWN_CLOSE_DELAY_MS = 120;

function initializeDropdownMenus(): void {
    const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
    const closeTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

    document.addEventListener('pointerdown', (e: PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.nav-dropdown') || target.closest('.nav-account-cta') || target.closest('.nav-inquire-cta')) {
            return;
        }
        closeDesktopNavDropdowns();
    });
    
    dropdownToggles.forEach((toggle) => {
        const toggleElement = toggle as HTMLElement;
        const dropdown = toggleElement.nextElementSibling as HTMLElement;
        const parent = toggleElement.closest('.nav-dropdown') as HTMLElement;
        
        if (!dropdown || !parent) return;

        const clearCloseTimer = (): void => {
            const timer = closeTimers.get(parent);
            if (timer) {
                clearTimeout(timer);
                closeTimers.delete(parent);
            }
        };

        const scheduleClose = (): void => {
            clearCloseTimer();
            closeTimers.set(
                parent,
                setTimeout(() => {
                    if (parent.matches(':hover') || parent.contains(document.activeElement)) return;
                    closeDropdown(toggleElement, dropdown);
                }, NAV_DROPDOWN_CLOSE_DELAY_MS),
            );
        };
        
        // Mouse events — exclusive: only one mega menu open at a time
        parent.addEventListener('mouseenter', () => {
            clearCloseTimer();
            closeDesktopNavDropdowns(parent);
            openDropdown(toggleElement, dropdown);
        });

        parent.addEventListener('mouseleave', (e: MouseEvent) => {
            const related = e.relatedTarget as Node | null;
            if (related && parent.contains(related)) return;
            scheduleClose();
        });
        
        // Keyboard events
        toggleElement.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const isExpanded = toggleElement.getAttribute('aria-expanded') === 'true';
                if (isExpanded) {
                    closeDropdown(toggleElement, dropdown);
                } else {
                    openDropdown(toggleElement, dropdown);
                    const firstLink = dropdown.querySelector('a') as HTMLElement;
                    firstLink?.focus();
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                openDropdown(toggleElement, dropdown);
                const firstLink = dropdown.querySelector('a') as HTMLElement;
                firstLink?.focus();
            } else if (e.key === 'Escape') {
                closeDropdown(toggleElement, dropdown);
                toggleElement.focus();
            }
        });
        
        // Keyboard navigation within dropdown
        const links = dropdown.querySelectorAll('a');
        links.forEach((link, index) => {
            link.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextLink = links[index + 1] as HTMLElement;
                    nextLink?.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (index === 0) {
                        toggleElement.focus();
                    } else {
                        const prevLink = links[index - 1] as HTMLElement;
                        prevLink?.focus();
                    }
                } else if (e.key === 'Escape') {
                    closeDropdown(toggleElement, dropdown);
                    toggleElement.focus();
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    (links[0] as HTMLElement)?.focus();
                } else if (e.key === 'End') {
                    e.preventDefault();
                    (links[links.length - 1] as HTMLElement)?.focus();
                }
            });
        });
        
        // Focus management
        parent.addEventListener('focusin', () => {
            clearCloseTimer();
            if (parent.matches(':focus-within')) {
                closeDesktopNavDropdowns(parent);
                openDropdown(toggleElement, dropdown);
            }
        });
        
        parent.addEventListener('focusout', (e: FocusEvent) => {
            // Close if focus leaves the dropdown
            setTimeout(() => {
                if (!parent.contains(document.activeElement)) {
                    closeDropdown(toggleElement, dropdown);
                }
            }, 100);
        });
    });
}

const NAV_DROPDOWN_VIEWPORT_PAD = 16;

function resetDropdownViewportPosition(dropdown: HTMLElement): void {
    dropdown.style.removeProperty('margin-left');
    dropdown.style.removeProperty('left');
    dropdown.style.removeProperty('right');
}

function clampDropdownToViewport(dropdown: HTMLElement): void {
    if (window.innerWidth < 1024) {
        resetDropdownViewportPosition(dropdown);
        return;
    }

    resetDropdownViewportPosition(dropdown);

    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const maxRight = window.innerWidth - NAV_DROPDOWN_VIEWPORT_PAD - scrollbarWidth;
    const minLeft = NAV_DROPDOWN_VIEWPORT_PAD;

    let rect = dropdown.getBoundingClientRect();

    if (rect.right > maxRight) {
        dropdown.style.marginLeft = `${maxRight - rect.right}px`;
        rect = dropdown.getBoundingClientRect();
    }

    if (rect.left < minLeft) {
        const currentMargin = parseFloat(dropdown.style.marginLeft || '0') || 0;
        dropdown.style.marginLeft = `${currentMargin + (minLeft - rect.left)}px`;
    }
}

function openDropdown(toggle: HTMLElement, dropdown: HTMLElement): void {
    const parent = toggle.closest('.nav-dropdown') as HTMLElement;
    closeDesktopNavDropdowns(parent);
    toggle.setAttribute('aria-expanded', 'true');
    parent?.classList.add('is-open');
    requestAnimationFrame(() => {
        clampDropdownToViewport(dropdown);
    });
}

function closeDropdown(toggle: HTMLElement, dropdown: HTMLElement): void {
    const parent = toggle.closest('.nav-dropdown') as HTMLElement;
    toggle.setAttribute('aria-expanded', 'false');
    parent?.classList.remove('is-open');
    resetDropdownViewportPosition(dropdown);
}

// ===== SET ACTIVE NAVIGATION LINK =====
function setActiveNavLink(): void {
    const base = document.body?.dataset.siteBase ?? '/';
    const pathname = window.location.pathname;
    const currentPage =
        base !== '/' && (pathname === base || pathname === base.replace(/\/$/, ''))
            ? '/'
            : base !== '/' && pathname.startsWith(base)
              ? `/${pathname.slice(base.length).replace(/^\/+/, '')}` || '/'
              : pathname;
    const navLinks = document.querySelectorAll(
        '.nav-menu a, .nav-mega__link, .mobile-menu__block-link, .mobile-menu__strip-link, .mobile-menu__feature-title, .mobile-menu__account',
    );
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const hrefPath = href?.split('#')[0] ?? '';
        const logicalHref =
            base !== '/' && hrefPath.startsWith(base)
                ? `/${hrefPath.slice(base.length).replace(/^\/+/, '')}` || '/'
                : hrefPath;
        if (logicalHref === currentPage || 
            (currentPage === '/' || currentPage === '/index.html') && (logicalHref === '/' || logicalHref === '/index.html')) {
            link.classList.add('active');
        }
    });
}

async function hydrateAccountLinks(): Promise<void> {
    const accountLinks = document.querySelectorAll('[data-account-link="true"]');
    if (!accountLinks.length) return;

    const { resolveNavApiBaseUrl, setAccountNavSignedIn, workspaceFetch, restorePersistedSessionToken, usesSessionStorageAuth } = await import('../lib/client-api');

    const apiBase = resolveNavApiBaseUrl();
    if (usesSessionStorageAuth(apiBase)) {
      restorePersistedSessionToken(apiBase);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);

    try {
        const response = await workspaceFetch(`${apiBase}/auth/me`, { signal: controller.signal });
        setAccountNavSignedIn(response.ok);
    } catch {
        setAccountNavSignedIn(false);
    } finally {
        window.clearTimeout(timeout);
    }
}

// ===== SEMANTIC SEARCH FUNCTIONALITY =====
interface SearchIndexItem {
    id: string;
    title: string;
    description: string;
    url?: string;
    industry?: string;
    topics?: string[];
    keywords?: string[];
    element?: Element;
    score?: number;
    strength?: number;
    matchSource?: 'semantic' | 'keyword' | 'hybrid';
    matchedKeywords?: string[];
}

interface RemoteSearchHit {
    id: string;
    title: string;
    description: string;
    url: string;
    industry?: string;
    topic?: string;
    score: number;
    strength: number;
    matchSource: 'semantic' | 'keyword' | 'hybrid';
    matchedKeywords?: string[];
}

class SemanticSearch {
    private searchRoot: HTMLElement | null;
    private searchInput: HTMLInputElement | null;
    private searchResults: HTMLElement | null;
    private searchInputWrapper: HTMLElement | null;
    private searchIndex: SearchIndexItem[];
    private loadedIndex: SearchIndexItem[] | null;
    private searchIndexPath: string;
    private searchDebounce: ReturnType<typeof setTimeout> | null;
    private apiBaseUrl: string;
    private siteBase: string;
    private semanticAbort: AbortController | null;
    
    constructor() {
        this.searchRoot = document.querySelector('.search-bar') as HTMLElement | null;
        this.searchInput = this.searchRoot?.querySelector('.search-input') as HTMLInputElement | null;
        this.searchResults = this.searchRoot?.querySelector('.search-results') as HTMLElement | null;
        this.searchInputWrapper = this.searchRoot?.querySelector('.search-input-wrapper') as HTMLElement | null;
        this.searchIndex = [];
        this.loadedIndex = null;
        this.searchIndexPath = this.searchRoot?.dataset.searchIndexPath ?? '/search-index.json';
        this.searchDebounce = null;
        this.apiBaseUrl = (this.searchRoot?.dataset.publicApiUrl ?? '').replace(/\/+$/, '');
        this.siteBase = document.body?.dataset.siteBase ?? '/';
        this.semanticAbort = null;
        this.init();
    }
    
    async init(): Promise<void> {
        if (!this.searchInput || !this.searchResults || !this.searchRoot) return;

        const searchForm = this.searchInput.closest('.search-input-group') as HTMLFormElement | null;
        searchForm?.addEventListener('submit', (e: Event) => {
            e.preventDefault();
            void this.submitSearch();
        });

        // Attach listeners before async index load so the first keystroke is not lost.
        this.searchInput.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            void this.runSearch(target.value);
        });

        this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                void this.submitSearch();
            } else if (e.key === 'ArrowDown') {
                if (!this.searchResults?.classList.contains('active')) {
                    void this.runSearch(this.searchInput?.value ?? '', true);
                }
                const firstLink = this.searchResults?.querySelector('a.search-result-item') as HTMLAnchorElement | null;
                if (firstLink) {
                    e.preventDefault();
                    firstLink.focus();
                }
            } else if (e.key === 'Escape') {
                this.searchResults?.classList.remove('active');
                this.searchInput?.setAttribute('aria-expanded', 'false');
            }
        });

        this.searchInput.addEventListener('focus', () => {
            const query = this.searchInput?.value.trim() ?? '';
            if (!query) {
                this.displayBrowseHints();
            } else {
                void this.runSearch(query, true);
            }
        });

        this.searchRoot.querySelectorAll<HTMLElement>('.search-browse-chip[data-search-term]').forEach((chip) => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const term = chip.getAttribute('data-search-term') ?? '';
                if (!this.searchInput || !term) return;
                this.searchInput.value = term;
                this.searchInput.focus();
                void this.runSearch(term, true);
            });
        });

        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.search-bar')) {
                this.searchResults?.classList.remove('active');
                this.searchInput?.setAttribute('aria-expanded', 'false');
            }
        });

        await this.loadSearchIndex();
        this.buildSearchIndex();

        const currentQuery = this.searchInput.value.trim();
        if (currentQuery) {
            void this.runSearch(currentQuery, true);
        } else if (document.activeElement === this.searchInput) {
            this.displayBrowseHints();
        }
    }
    
    async loadSearchIndex(): Promise<void> {
        try {
            const response = await fetch(this.searchIndexPath);
            if (response.ok) {
                const data = await response.json();
                this.loadedIndex = Array.isArray(data?.items) ? data.items : [];
                console.log('Search index loaded:', this.loadedIndex?.length ?? 0, 'items');
            } else {
                console.warn('Search index not available (status:', response.status, '), using page content fallback');
            }
        } catch (error) {
            console.warn('Could not load search-index.json, using page content:', error);
            // Graceful degradation: continue with page content search
            this.loadedIndex = [];
        }
    }
    
    buildSearchIndex(): void {
        const cards = document.querySelectorAll('.card');
        const articles = document.querySelectorAll('article');
        const sections = document.querySelectorAll('section');
        
        [...cards, ...articles, ...sections].forEach((element, index) => {
            const titleEl = element.querySelector('h1, h2, h3, .card-title');
            const title = titleEl?.textContent || '';
            const descEl = element.querySelector('.card-description, p');
            const description = descEl?.textContent || '';
            const keywords = this.extractKeywords(title + ' ' + description);
            
            if (title || description) {
                this.searchIndex.push({
                    id: index.toString(),
                    title,
                    description,
                    keywords,
                    element
                });
            }
        });
    }
    
    extractKeywords(text: string): string[] {
        const words = text.toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length >= 2);
        
        return [...new Set(words)];
    }
    
    runSearch(query: string, immediate = false): Promise<void> {
        if (!this.searchInput || !this.searchResults) return Promise.resolve();

        if (this.searchDebounce) {
            clearTimeout(this.searchDebounce);
            this.searchDebounce = null;
        }

        const execute = async (): Promise<void> => {
            if (!query.trim()) {
                if (document.activeElement === this.searchInput) {
                    this.displayBrowseHints();
                } else {
                    this.searchResults!.classList.remove('active');
                    this.searchInput!.setAttribute('aria-expanded', 'false');
                }
                this.searchInputWrapper?.classList.remove('loading');
                return;
            }

            this.searchInputWrapper?.classList.add('loading');
            this.searchInput!.setAttribute('aria-busy', 'true');

            let results = this.search(query);
            if (this.apiBaseUrl && query.trim().length >= 2) {
                try {
                    const remote = await this.fetchSemanticResults(query.trim());
                    results = this.mergeResults(results, remote);
                } catch {
                    /* keep keyword index results */
                }
            }

            this.displayResults(results);
            this.searchResults!.classList.add('active');
            this.searchInputWrapper?.classList.remove('loading');
            this.searchInput!.setAttribute('aria-busy', 'false');
        };

        if (immediate) {
            return execute();
        }

        return new Promise((resolve) => {
            this.searchDebounce = setTimeout(() => {
                void execute().then(resolve);
            }, 120);
        });
    }

    async submitSearch(): Promise<void> {
        const query = this.searchInput?.value ?? '';
        await this.runSearch(query, true);
        const firstLink = this.searchResults?.querySelector('a.search-result-item') as HTMLAnchorElement | null;
        if (firstLink?.href && !this.isPlaceholderSearchUrl(firstLink.href)) {
            window.location.assign(firstLink.href);
            return;
        }
        firstLink?.focus();
    }

    isPlaceholderSearchUrl(href: string): boolean {
        const normalized = href.split('#')[0].replace(/\/$/, '') || '/';
        const current = window.location.href.split('#')[0].replace(/\/$/, '') || '/';
        return normalized === current && !href.includes('#');
    }
    
    handleSearch(query: string): void {
        void this.runSearch(query);
    }
    
    search(query: string): SearchIndexItem[] {
        if (!query.trim()) return [];
        
        const normalizedQuery = query.toLowerCase().trim().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
        const queryWords = this.extractKeywords(query);
        const scoredResults: SearchIndexItem[] = [];
        
        const indexToSearch = this.getActiveIndex();
        
        indexToSearch.forEach(item => {
            let score = 0;
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const keywords = item.keywords || [];
            const industry = (item.industry || '').toLowerCase();
            const topics = (item.topics || []).join(' ').toLowerCase();
            const searchText = (title + ' ' + description + ' ' + keywords.join(' ') + ' ' + industry + ' ' + topics).toLowerCase();

            if (normalizedQuery.length >= 2 && searchText.includes(normalizedQuery)) {
                score += 12;
            }

            if (normalizedQuery.length >= 4) {
                const prefix = normalizedQuery.slice(0, 4);
                const tokens = searchText.split(/[\s\-_/]+/);
                if (tokens.some((token) => token.startsWith(prefix))) {
                    score += 9;
                }
            }
            
            queryWords.forEach(queryWord => {
                if (title.includes(queryWord)) score += 10;
                if (keywords.some(kw => kw.toLowerCase().includes(queryWord))) score += 7;
                if (item.topics && item.topics.some(topic => topic.toLowerCase().includes(queryWord))) score += 6;
                if (item.industry && item.industry.toLowerCase().includes(queryWord)) score += 5;
                if (description.includes(queryWord)) score += 2;
                if (searchText.includes(queryWord)) score += 1;
                if (queryWord.length >= 4) {
                    const prefix = queryWord.slice(0, 4);
                    if (searchText.split(/[\s\-_/]+/).some((token) => token.startsWith(prefix))) score += 6;
                }
            });
            
            if (score > 0) {
                scoredResults.push({ ...item, score });
            }
        });
        
        return scoredResults
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 8);
    }

    async fetchSemanticResults(query: string): Promise<RemoteSearchHit[]> {
        if (!this.apiBaseUrl) return [];
        this.semanticAbort?.abort();
        this.semanticAbort = new AbortController();
        const url = `${this.apiBaseUrl}/resources/search?q=${encodeURIComponent(query)}&limit=8`;
        const res = await fetch(url, {
            signal: this.semanticAbort.signal,
            credentials: 'omit',
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { success?: boolean; results?: RemoteSearchHit[] };
        return Array.isArray(data.results) ? data.results : [];
    }

    mergeResults(local: SearchIndexItem[], remote: RemoteSearchHit[]): SearchIndexItem[] {
        const byKey = new Map<string, SearchIndexItem>();

        const keyFor = (item: { id?: string; url?: string }) =>
            item.id || this.normalizeSearchUrl(item.url);

        for (const item of local) {
            byKey.set(keyFor(item), { ...item, matchSource: item.matchSource ?? 'keyword' });
        }

        for (const hit of remote) {
            const key = keyFor(hit);
            const existing = byKey.get(key);
            const remoteItem: SearchIndexItem = {
                id: hit.id,
                title: hit.title,
                description: hit.description,
                url: hit.url,
                industry: hit.industry,
                topics: hit.topic ? [hit.topic] : undefined,
                score: hit.score,
                strength: hit.strength,
                matchSource: hit.matchSource,
                matchedKeywords: hit.matchedKeywords,
            };

            if (!existing) {
                byKey.set(key, remoteItem);
                continue;
            }

            const mergedScore = Math.max(existing.score ?? 0, hit.score);
            const matchSource: SearchIndexItem['matchSource'] =
                existing.matchSource && existing.matchSource !== hit.matchSource
                    ? 'hybrid'
                    : hit.matchSource;

            byKey.set(key, {
                ...existing,
                ...remoteItem,
                score: mergedScore,
                strength: Math.max(existing.strength ?? 0, hit.strength),
                matchSource,
                matchedKeywords: [
                    ...new Set([...(existing.matchedKeywords ?? []), ...(hit.matchedKeywords ?? [])]),
                ],
            });
        }

        return [...byKey.values()]
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, 8);
    }

    formatMatchBadge(item: SearchIndexItem): string {
        if (!item.matchSource || item.matchSource === 'keyword') return '';
        const label =
            item.matchSource === 'hybrid'
                ? 'RAG + keyword'
                : 'Semantic match';
        const strength =
            typeof item.strength === 'number' && item.strength > 0
                ? ` · ${item.strength}%`
                : '';
        return `<span class="search-result-match-badge" title="Retrieved from semantic index">${this.escapeHtml(label)}${strength}</span>`;
    }
    
    displayBrowseHints(): void {
        if (!this.searchResults || !this.searchInput) return;

        const index = this.getActiveIndex();
        const hubs = index
            .filter((item) => item.id?.endsWith('-index'))
            .slice(0, 8);

        this.searchInput.setAttribute('aria-expanded', hubs.length > 0 ? 'true' : 'false');
        this.searchResults.classList.add('active');
        this.searchResults.setAttribute('aria-label', 'Browse searchable content');

        if (hubs.length === 0) {
            this.searchResults.innerHTML =
                '<div class="search-result-item search-result-hint" role="status">Loading searchable industries and guides…</div>';
            return;
        }

        const hubItems = hubs.map((hub, index) => {
            const url = this.normalizeSearchUrl(hub.url);
            const industry = hub.industry
                ? `<span class="search-result-industry">${this.escapeHtml(this.formatIndustry(hub.industry))}</span>`
                : '';
            return `
                <a href="${url}" class="search-result-item" role="option" aria-selected="false" tabindex="0" id="search-hint-${index}">
                    <div class="search-result-title">${this.escapeHtml(hub.title)}</div>
                    ${industry}
                    <div class="search-result-description">${this.escapeHtml((hub.description || '').substring(0, 120))}…</div>
                </a>
            `;
        }).join('');

        this.searchResults.innerHTML = `
            <div class="search-result-item search-result-hint" role="presentation">
                Browse industry hubs, topic guides, case studies, and published resources
            </div>
            ${hubItems}
        `;
    }

    displayResults(results: SearchIndexItem[]): void {
        if (!this.searchResults || !this.searchInput) return;
        
        if (results.length === 0) {
            this.searchResults.innerHTML =
                '<div class="search-result-item search-result-empty" role="status">No results found. Try an industry name, topic, or keyword from the chips below.</div>';
            this.searchResults.classList.add('active');
            this.searchInput.setAttribute('aria-expanded', 'true');
            return;
        }
        
        this.searchInput.setAttribute('aria-expanded', 'true');
        this.searchResults.setAttribute('aria-label', `${results.length} search results`);

        const queryLabel = this.escapeHtml(this.searchInput.value.trim());
        const header = queryLabel
            ? `<div class="search-result-item search-result-hint" role="presentation">${results.length} result${results.length === 1 ? '' : 's'} for “${queryLabel}”</div>`
            : '';

        this.searchResults.innerHTML = header + results.map((result, index) => {
            const url = this.normalizeSearchUrl(result.url);
            const industry = result.industry ? `<span class="search-result-industry">${this.escapeHtml(this.formatIndustry(result.industry))}</span>` : '';
            const matchBadge = this.formatMatchBadge(result);
            const description = (result.description || '').trim();
            const descriptionHtml = description
                ? `<div class="search-result-description">${this.escapeHtml(description.substring(0, 120))}${description.length > 120 ? '…' : ''}</div>`
                : '';
            const keywordHint =
                result.matchedKeywords && result.matchedKeywords.length > 0
                    ? `<div class="search-result-keywords">${result.matchedKeywords
                          .slice(0, 4)
                          .map((k) => `<span class="search-result-keyword">${this.escapeHtml(k)}</span>`)
                          .join('')}</div>`
                    : '';
            return `
                <a href="${url}" class="search-result-item" role="option" aria-selected="false" tabindex="0" id="search-result-${index}">
                    <div class="search-result-title-row">
                        <div class="search-result-title">${this.escapeHtml(result.title)}</div>
                        ${matchBadge}
                    </div>
                    ${industry}
                    ${descriptionHtml}
                    ${keywordHint}
                </a>
            `;
        }).join('');
        
        // Add keyboard navigation to search results
        const resultItems = this.searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach((item, index) => {
            item.addEventListener('keydown', (e: Event) => {
                const keyEvent = e as KeyboardEvent;
                const target = keyEvent.target as HTMLElement;
                if (keyEvent.key === 'ArrowDown') {
                    keyEvent.preventDefault();
                    const nextItem = resultItems[index + 1] as HTMLElement;
                    if (nextItem) {
                        nextItem.focus();
                        nextItem.setAttribute('aria-selected', 'true');
                        target.setAttribute('aria-selected', 'false');
                    }
                } else if (keyEvent.key === 'ArrowUp') {
                    keyEvent.preventDefault();
                    if (index === 0) {
                        this.searchInput?.focus();
                    } else {
                        const prevItem = resultItems[index - 1] as HTMLElement;
                        prevItem?.focus();
                        prevItem.setAttribute('aria-selected', 'true');
                        target.setAttribute('aria-selected', 'false');
                    }
                } else if (keyEvent.key === 'Escape') {
                    this.searchResults?.classList.remove('active');
                    this.searchInput?.setAttribute('aria-expanded', 'false');
                    this.searchInput?.focus();
                }
            });
        });
    }
    
    getActiveIndex(): SearchIndexItem[] {
        return this.loadedIndex && this.loadedIndex.length > 0 ? this.loadedIndex : this.searchIndex;
    }

    normalizeSearchUrl(url: string | undefined): string {
        return resolveContentPath(url, this.siteBase);
    }

    escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatIndustry(industry: string): string {
        const industries: Record<string, string> = {
            'professional-services': 'Professional Services',
            'retail': 'Retail',
            'healthcare': 'Healthcare',
            'hospitality': 'Hospitality',
            'construction': 'Construction',
            'finance': 'Finance',
            'manufacturing': 'Manufacturing'
        };
        return industries[industry] || industry;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (isAccountUtilityPage()) return;
    if (document.querySelector('.search-bar')) {
        new SemanticSearch();
    }
});

// ===== FORM HANDLING =====
/** JS-handled forms: block native navigation; handlers attach via addEventListener. */
function applySecureFormDefaults(): void {
    const selectors = [
        '.inquiry-form form',
        'form.auth-form',
        '#community-upload-form',
        'form.resource-form',
        '#edit-resource-form',
        'form.login-form',
        '.search-input-group',
    ];

    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
            const form = node as HTMLFormElement;
            form.removeAttribute('method');
            const action = form.getAttribute('action') ?? '';
            if (!action || action === '#' || action.startsWith('mailto:')) {
                form.setAttribute('action', 'javascript:void(0)');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    applySecureFormDefaults();

    if (isAccountUtilityPage()) return;

    document.querySelectorAll('.inquiry-form form').forEach((form) => {
        form.addEventListener('submit', handleFormSubmit);
    });
});

function handleFormSubmit(e: Event): void {
    e.preventDefault();
    void submitInquiryForm(e.target as HTMLFormElement);
}

async function submitInquiryForm(form: HTMLFormElement | null): Promise<void> {
    try {
        if (!form) {
            console.error('Form submission error: form element not found');
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData) as Record<string, string>;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailInput = form.querySelector('#email') as HTMLInputElement;
        const emailError = form.querySelector('#email-error') as HTMLElement;
        
        if (!data.email || !emailRegex.test(data.email.trim())) {
            const errorMessage = 'Please provide a valid email address';
            showFormMessage(form, errorMessage, 'error');
            if (emailInput) {
                emailInput.setAttribute('aria-invalid', 'true');
                emailInput.classList.add('error');
            }
            if (emailError) {
                emailError.textContent = errorMessage;
            }
            emailInput?.focus();
            return;
        }

        if (emailInput) {
            emailInput.setAttribute('aria-invalid', 'false');
            emailInput.classList.remove('error');
        }
        if (emailError) {
            emailError.textContent = '';
        }

        if (!data.message?.trim()) {
            showFormMessage(form, 'Please include a message with your enquiry.', 'error');
            (form.querySelector('#message') as HTMLTextAreaElement | null)?.focus();
            return;
        }
    
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        const originalBtnHtml = submitBtn?.innerHTML ?? '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span> Sending…</span>';
        }

        showFormMessage(form, 'Sending your enquiry…', 'success');

        const { resolveNavApiBaseUrl } = await import('../lib/client-api');
        const apiBase = resolveNavApiBaseUrl();
        const response = await fetch(`${apiBase}/contact/inquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: data.name?.trim() || undefined,
                email: data.email.trim(),
                industry: data.industry?.trim() || undefined,
                location: data.location?.trim() || undefined,
                preference: data.preference?.trim() || undefined,
                message: data.message.trim(),
                sourcePath: window.location.pathname,
            }),
        });

        const payload = await response.json().catch(() => ({}));

        if (response.ok && payload.success) {
            if (submitBtn) {
                submitBtn.classList.add('success');
                submitBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span> Enquiry sent</span>';
            }
            form.querySelectorAll('.form-group').forEach(group => {
                group.classList.add('success');
            });
            showFormMessage(
                form,
                payload.message || 'Thanks — your enquiry was sent. We will reply to the email you provided.',
                'success',
            );
            form.reset();
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
        showFormMessage(
            form,
            payload.error || 'Could not send your enquiry. Please try again or email connect@brisbaneservers.com.',
            'error',
        );
    } catch (error) {
        console.error('Form submission error:', error);
        if (form) {
            showFormMessage(form, 'An error occurred. Please try again or email connect@brisbaneservers.com directly.', 'error');
            const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
            if (submitBtn) submitBtn.disabled = false;
        }
    }
}

function showFormMessage(form: HTMLFormElement, message: string, type: 'success' | 'error'): void {
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message form-message-${type}`;
    messageDiv.textContent = message;
    messageDiv.setAttribute('role', 'alert');
    messageDiv.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    messageDiv.setAttribute('aria-atomic', 'true');
    form.appendChild(messageDiv);
    
    // Focus the message for screen readers
    messageDiv.focus();
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Progressive disclosure - expand cards
function expandCards(button: HTMLElement): void {
    const section = button.closest('.section') as HTMLElement | null;
    if (section) {
        const cardGrid = section.querySelector('.card-grid.progressive') as HTMLElement | null;
        if (cardGrid) {
            cardGrid.classList.add('expanded');
            button.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (isAccountUtilityPage()) return;

    document.addEventListener('click', function(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const expandButton = target.closest('[data-expand-cards]') as HTMLElement | null;
        if (expandButton) {
            expandCards(expandButton);
        }
    });
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(this: HTMLAnchorElement, e: Event) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href) {
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ===== INDUSTRY FILTERING =====
document.addEventListener('DOMContentLoaded', function() {
    if (isAccountUtilityPage()) return;

    const filterButtons = document.querySelectorAll('.filter-btn');
    const resourceItems = document.querySelectorAll('.resource-item');
    const projectItems = document.querySelectorAll('.project-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function(this: HTMLElement) {
            const filter = this.dataset.filter;
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            resourceItems.forEach(item => {
                if (filter === 'all') {
                    (item as HTMLElement).style.display = '';
                    item.classList.remove('hidden');
                } else {
                    const itemIndustry = (item as HTMLElement).dataset.industry;
                    if (itemIndustry === filter) {
                        (item as HTMLElement).style.display = '';
                        item.classList.remove('hidden');
                    } else {
                        (item as HTMLElement).style.display = 'none';
                        item.classList.add('hidden');
                    }
                }
            });
            
            projectItems.forEach(item => {
                if (filter === 'all') {
                    (item as HTMLElement).style.display = '';
                    item.classList.remove('hidden');
                } else {
                    const itemIndustry = (item as HTMLElement).dataset.industry;
                    if (itemIndustry === filter) {
                        (item as HTMLElement).style.display = '';
                        item.classList.remove('hidden');
                    } else {
                        (item as HTMLElement).style.display = 'none';
                        item.classList.add('hidden');
                    }
                }
            });
        });
    });
});
