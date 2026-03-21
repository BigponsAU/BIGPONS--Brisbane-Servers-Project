// Simplified main script - removed complex state management and scaling systems
// Focus on essential functionality: navigation, search, forms, and progressive disclosure

// Zoom compensation is disabled - content scales naturally with browser zoom
// Navbar and footer stay fixed via CSS (px units)
// Content scales via rem/em/vw/vh units

// Initialize Lanczos scaling manager for geometric pattern quality
import { getLanczosScalingManager } from './lanczos-scaling';

// ===== INITIALIZE SYSTEMS =====
// Initialize all systems on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure DOM is fully ready before initializing systems
    setTimeout(() => {
        // Zoom compensation is disabled - content now scales naturally with browser zoom
        // Navbar and footer stay fixed via CSS (px units)
        // Content scales via rem/em/vw/vh units
        
        // Initialize Lanczos scaling for geometric patterns
        try {
            getLanczosScalingManager();
            // Lanczos tokens: init + orientation only (not resize/zoom)
        } catch (error) {
            console.error('[Main] Error initializing Lanczos scaling:', error);
        }
        
        // Initialize text-length-aware sizing
        try {
            applyTextLengthAwareSizing();
        } catch (error) {
            console.error('[Main] Error applying text-length sizing:', error);
        }
    }, 100); // Small delay to ensure DOM is fully ready
});

// ===== TEXT-LENGTH-AWARE PHI SIZING =====
/**
 * Apply text-length-aware phi sizing to elements
 * Short text (<100 chars): Tighter spacing, smaller sizing
 * Medium text (100-200 chars): Base phi sizing
 * Long text (>200 chars): Larger sizing, adjusted line-height
 * 
 * NOTE: Applied with requestAnimationFrame to prevent visual glitches during page transitions
 */
function applyTextLengthAwareSizing(): void {
    // Use requestAnimationFrame to prevent visual glitches during page transitions
    requestAnimationFrame(() => {
        // Elements to check for text length
        const textElements = document.querySelectorAll(
            '.card-description, .section-description, .hero-subtitle, .card-title, .section-title, p:not(.footer-description):not(.form-disclaimer)'
        );
        
        textElements.forEach((element) => {
            const text = element.textContent || '';
            const textLength = text.length;
            
            // Remove existing classes
            element.classList.remove('text-short', 'text-medium', 'text-long');
            
            // Apply appropriate class based on text length
            if (textLength < 100) {
                element.classList.add('text-short');
            } else if (textLength > 200) {
                element.classList.add('text-long');
            } else {
                element.classList.add('text-medium');
            }
        });
    });
}

// ===== NAVIGATION TOGGLE =====
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger') as HTMLButtonElement | null;
    const mobileMenu = document.querySelector('.mobile-menu') as HTMLElement | null;
    
    if (hamburger && mobileMenu) {
        // Toggle mobile menu
        hamburger.addEventListener('click', function() {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', (!isExpanded).toString());
            mobileMenu.setAttribute('aria-hidden', isExpanded.toString());
            
            // Focus management
            if (!isExpanded) {
                const firstLink = mobileMenu.querySelector('a') as HTMLElement;
                firstLink?.focus();
            }
        });
        
        // Keyboard support for hamburger
        hamburger.addEventListener('keydown', function(e: KeyboardEvent) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                hamburger.click();
            }
            if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
                hamburger.click();
                hamburger.focus();
            }
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (!hamburger.contains(target) && !mobileMenu.contains(target)) {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                mobileMenu.setAttribute('aria-hidden', 'true');
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function(e: KeyboardEvent) {
            if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
                hamburger.click();
            }
        });
    }
    
    // Initialize dropdown menus with keyboard support
    initializeDropdownMenus();
    
    // Set active nav link based on current page
    setActiveNavLink();
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

function openDropdown(toggle: HTMLElement, dropdown: HTMLElement): void {
    const parent = toggle.closest('.nav-dropdown') as HTMLElement;
    toggle.setAttribute('aria-expanded', 'true');
    parent?.classList.add('active');
}

function closeDropdown(toggle: HTMLElement, dropdown: HTMLElement): void {
    const parent = toggle.closest('.nav-dropdown') as HTMLElement;
    toggle.setAttribute('aria-expanded', 'false');
    parent?.classList.remove('active');
}

// ===== SET ACTIVE NAVIGATION LINK =====
function setActiveNavLink(): void {
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-menu a, .mobile-menu a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || 
            (currentPage === '/' || currentPage === '/index.html') && href === '/index.html') {
            link.classList.add('active');
        }
    });
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
                console.log('Search index loaded:', this.loadedIndex.length, 'items');
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
            this.searchInput.setAttribute('aria-busy', 'false');
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
document.addEventListener('DOMContentLoaded', function() {
    const inquiryForms = document.querySelectorAll('.inquiry-form');
    
    inquiryForms.forEach(form => {
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
