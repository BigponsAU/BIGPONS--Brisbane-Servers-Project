// Simplified main script — navigation, search, forms, progressive disclosure.
// Layout breakpoints: CSS media queries only (browser full-page zoom; no JS tier / zoom modeling).

import { closeMobileNav } from './nav-mobile';

// ===== NAVIGATION TOGGLE =====
document.addEventListener('DOMContentLoaded', function() {
    try { localStorage.removeItem('authToken'); } catch { /* legacy session cleanup */ }

    const hamburger = document.querySelector('.hamburger') as HTMLButtonElement | null;
    const mobileMenu = document.querySelector('.mobile-menu') as HTMLElement | null;
    
    if (hamburger && mobileMenu) {
        const menuButton = hamburger;
        const menuPanel = mobileMenu;

        function closeAllDesktopDropdowns(): void {
            document.querySelectorAll('.nav-dropdown-toggle').forEach((toggle) => {
                const el = toggle as HTMLElement;
                const parent = el.closest('.nav-dropdown');
                el.setAttribute('aria-expanded', 'false');
                parent?.classList.remove('active');
            });
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

    }
    
    // Initialize dropdown menus with keyboard support
    initializeDropdownMenus();

    window.addEventListener('resize', () => {
        document.querySelectorAll('.nav-dropdown.active .nav-dropdown-menu').forEach((menu) => {
            clampDropdownToViewport(menu as HTMLElement);
        });
    });
    
    // Set active nav link based on current page
    setActiveNavLink();

        // Reflect auth state in account links
        hydrateAccountLinks();
});

// ===== DROPDOWN MENU KEYBOARD NAVIGATION =====
function initializeDropdownMenus(): void {
    const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
    
    dropdownToggles.forEach((toggle) => {
        const toggleElement = toggle as HTMLElement;
        const dropdown = toggleElement.nextElementSibling as HTMLElement;
        const parent = toggleElement.closest('.nav-dropdown') as HTMLElement;
        
        if (!dropdown || !parent) return;
        
        // Mouse events
        toggleElement.addEventListener('mouseenter', () => {
            openDropdown(toggleElement, dropdown);
        });
        
        parent.addEventListener('mouseleave', () => {
            closeDropdown(toggleElement, dropdown);
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
            if (parent.matches(':focus-within')) {
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
    toggle.setAttribute('aria-expanded', 'true');
    parent?.classList.add('active');
    requestAnimationFrame(() => {
        clampDropdownToViewport(dropdown);
    });
}

function closeDropdown(toggle: HTMLElement, dropdown: HTMLElement): void {
    const parent = toggle.closest('.nav-dropdown') as HTMLElement;
    toggle.setAttribute('aria-expanded', 'false');
    parent?.classList.remove('active');
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

    try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        const isSignedIn = response.ok;

        accountLinks.forEach((link) => {
            const anchor = link as HTMLAnchorElement;
            anchor.href = '/account';
            anchor.textContent = isSignedIn ? 'Workspace' : 'Sign in';
            anchor.setAttribute('aria-label', isSignedIn ? 'Open your account workspace' : 'Sign in to your account');
        });
    } catch {
        accountLinks.forEach((link) => {
            const anchor = link as HTMLAnchorElement;
            anchor.href = '/account';
            anchor.textContent = 'Sign in';
            anchor.setAttribute('aria-label', 'Sign in to your account');
        });
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
}

class SemanticSearch {
    private searchInput: HTMLInputElement | null;
    private searchResults: HTMLElement | null;
    private searchInputWrapper: HTMLElement | null;
    private searchIndex: SearchIndexItem[];
    private loadedIndex: SearchIndexItem[] | null;
    private searchIndexPath: string;
    
    constructor() {
        this.searchInput = document.querySelector('.search-input') as HTMLInputElement | null;
        this.searchResults = document.querySelector('.search-results') as HTMLElement | null;
        this.searchInputWrapper = document.querySelector('.search-input-wrapper') as HTMLElement | null;
        this.searchIndex = [];
        this.loadedIndex = null;
        this.searchIndexPath = '/search-index.json';
        this.init();
    }
    
    async init(): Promise<void> {
        if (!this.searchInput || !this.searchResults) return;
        
        // Load search index from JSON file
        await this.loadSearchIndex();
        
        // Build search index from page content (fallback)
        this.buildSearchIndex();
        
        // Listen for input
        this.searchInput.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            this.handleSearch(target.value);
        });
        
        // Close results on outside click
        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.search-bar')) {
                this.searchResults?.classList.remove('active');
            }
        });
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
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        return [...new Set(words)];
    }
    
    handleSearch(query: string): void {
        if (!this.searchInput || !this.searchResults) return;
        
        if (!query.trim()) {
            this.searchResults.classList.remove('active');
            this.searchInputWrapper?.classList.remove('loading');
            this.searchInput.setAttribute('aria-expanded', 'false');
            return;
        }
        
        this.searchInputWrapper?.classList.add('loading');
        this.searchInput.setAttribute('aria-busy', 'true');
        
        setTimeout(() => {
            const results = this.search(query);
            this.displayResults(results);
            if (this.searchResults) {
                this.searchResults.classList.add('active');
            }
            this.searchInputWrapper?.classList.remove('loading');
            this.searchInput?.setAttribute('aria-busy', 'false');
        }, 300);
    }
    
    search(query: string): SearchIndexItem[] {
        if (!query.trim()) return [];
        
        const queryWords = this.extractKeywords(query);
        const scoredResults: SearchIndexItem[] = [];
        
        const indexToSearch = this.loadedIndex && this.loadedIndex.length > 0 ? this.loadedIndex : this.searchIndex;
        
        indexToSearch.forEach(item => {
            let score = 0;
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const keywords = item.keywords || [];
            const searchText = (title + ' ' + description + ' ' + keywords.join(' ')).toLowerCase();
            
            queryWords.forEach(queryWord => {
                if (title.includes(queryWord)) score += 10;
                if (keywords.some(kw => kw.toLowerCase().includes(queryWord))) score += 7;
                if (item.topics && item.topics.some(topic => topic.toLowerCase().includes(queryWord))) score += 6;
                if (item.industry && item.industry.toLowerCase().includes(queryWord)) score += 5;
                if (description.includes(queryWord)) score += 2;
                if (searchText.includes(queryWord)) score += 1;
            });
            
            if (score > 0) {
                scoredResults.push({ ...item, score });
            }
        });
        
        return scoredResults
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 8);
    }
    
    displayResults(results: SearchIndexItem[]): void {
        if (!this.searchResults || !this.searchInput) return;
        
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="search-result-item" role="option" aria-selected="false">No results found</div>';
            this.searchInput.setAttribute('aria-expanded', 'false');
            return;
        }
        
        this.searchInput.setAttribute('aria-expanded', 'true');
        this.searchResults.setAttribute('aria-label', `${results.length} search results`);
        
        this.searchResults.innerHTML = results.map((result, index) => {
            const url = result.url || '#';
            const industry = result.industry ? `<span class="search-result-industry">${this.formatIndustry(result.industry)}</span>` : '';
            return `
                <a href="${url}" class="search-result-item" role="option" aria-selected="false" tabindex="0" id="search-result-${index}">
                    <div class="search-result-title">${this.escapeHtml(result.title)}</div>
                    ${industry}
                    <div class="search-result-description">${this.escapeHtml((result.description || '').substring(0, 120))}...</div>
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

// Initialize search
document.addEventListener('DOMContentLoaded', () => {
    new SemanticSearch();
});

// ===== FORM HANDLING =====
/** JS-handled forms: secure defaults so browsers allow autofill (no mailto/http actions). */
function applySecureFormDefaults(): void {
    const selectors = [
        '.inquiry-form form',
        'form.auth-form',
        '#community-upload-form',
        'form.resource-form',
        '#edit-resource-form',
        'form.login-form',
    ];

    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
            const form = node as HTMLFormElement;
            if (!form.getAttribute('method')) {
                form.method = 'post';
            }
            const action = form.getAttribute('action') ?? '';
            if (!action || action.startsWith('mailto:')) {
                form.setAttribute('action', '#');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    applySecureFormDefaults();

    document.querySelectorAll('.inquiry-form form').forEach((form) => {
        form.addEventListener('submit', handleFormSubmit);
    });
});

function handleFormSubmit(e: Event): void {
    e.preventDefault();
    
    try {
        const form = e.target as HTMLFormElement;
        if (!form) {
            console.error('Form submission error: form element not found');
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData) as Record<string, string>;
        
        // Validate email using proper regex
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
        } else {
            if (emailInput) {
                emailInput.setAttribute('aria-invalid', 'false');
                emailInput.classList.remove('error');
            }
            if (emailError) {
                emailError.textContent = '';
            }
        }
    
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitBtn) {
        submitBtn.classList.add('success');
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Message Sent';
    }
    
    form.querySelectorAll('.form-group').forEach(group => {
        group.classList.add('success');
    });
    
    const subject = `Inquiry from ${data.name || 'Guest'}`;
    const body = `
Name: ${data.name || 'Not provided'}
Email: ${data.email || 'Not provided'}
Industry: ${data.industry || 'Not specified'}
${data.message ? `\nMessage:\n${data.message}` : ''}
    `.trim();
    
    const mailtoLink = `mailto:connect@brisbaneservers.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    showFormMessage(form, 'Opening email client...', 'success');
    
        setTimeout(() => {
            try {
                window.location.href = mailtoLink;
            } catch (error) {
                console.error('Error opening mailto link:', error);
                showFormMessage(form, 'Please contact us directly at connect@brisbaneservers.com', 'error');
            }
        }, 1000);
    } catch (error) {
        console.error('Form submission error:', error);
        const form = e.target as HTMLFormElement;
        if (form) {
            showFormMessage(form, 'An error occurred. Please try again or contact us directly.', 'error');
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
