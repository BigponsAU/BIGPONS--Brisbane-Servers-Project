// Dashboard Application
const API_BASE = window.location.origin;

// Utility function for safe element access
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`[ERROR] Element not found: ${id}`);
    }
    return element;
}

function getElementBySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`[ERROR] Element not found by selector: ${selector}`);
    }
    return element;
}

/**
 * Safely extract error message from unknown error type
 * Handles Error objects, strings, and other types gracefully
 * @param {unknown} error - The error to extract message from
 * @returns {string} - Safe error message string
 */
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}

function parseServerErrorText(errorText) {
    const text = typeof errorText === 'string' ? errorText.trim() : '';
    if (!text) return 'Unknown server error';

    const cannotRouteMatch = text.match(/Cannot\s+(GET|POST|PUT|DELETE|PATCH)\s+([^\s<]+)/i);
    if (cannotRouteMatch) {
        const method = cannotRouteMatch[1].toUpperCase();
        const route = cannotRouteMatch[2];
        return `Route unavailable (${method} ${route}). Restart dashboard server to load latest API routes.`;
    }

    const preBlock = text.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (preBlock && preBlock[1]) {
        return preBlock[1].trim();
    }

    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getAuthHeaders() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

function isAuthenticated() {
    return Boolean(authToken && currentUser);
}

async function initializeAuthSession() {
    if (!authToken) {
        currentUser = null;
        updateAuthUi();
        return;
    }

    try {
        const result = await apiCall('auth/me', 'GET');
        currentUser = result.user || null;
        updateAuthUi();
    } catch (_error) {
        authToken = '';
        currentUser = null;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        updateAuthUi();
    }
}

async function handleAuthLogin() {
    const emailEl = document.getElementById('authEmail');
    const passwordEl = document.getElementById('authPassword');
    const email = (emailEl?.value || '').trim();
    const password = passwordEl?.value || '';

    if (!email || !password) {
        updateStatus('error', 'Email and password are required');
        return;
    }

    try {
        const result = await apiCall('auth/login', 'POST', { email, password });
        if (!result?.token || !result?.user) {
            throw new Error('Login succeeded but no session token was returned');
        }
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        if (passwordEl) passwordEl.value = '';
        updateAuthUi();
        updateStatus('success', `Signed in as ${currentUser.email}`);
        await loadResourcesList();
    } catch (error) {
        updateStatus('error', `Sign in failed: ${getErrorMessage(error)}`);
    }
}

async function handleAuthLogout() {
    try {
        if (authToken) {
            await apiCall('auth/logout', 'POST', {});
        }
    } catch (_error) {
        // Ignore logout API failures; always clear local session state.
    } finally {
        authToken = '';
        currentUser = null;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        updateAuthUi();
        updateStatus('success', 'Signed out');
        loadResourcesList();
    }
}

function updateAuthUi() {
    const statusEl = document.getElementById('authStatus');
    const loginBtn = document.getElementById('authLoginBtn');
    const logoutBtn = document.getElementById('authLogoutBtn');
    const emailEl = document.getElementById('authEmail');
    const passwordEl = document.getElementById('authPassword');

    const signedIn = isAuthenticated();
    if (statusEl) {
        statusEl.textContent = signedIn
            ? `Signed in: ${currentUser.email} (${currentUser.role})`
            : 'Signed out. Resource management requires sign-in.';
    }
    if (loginBtn) loginBtn.disabled = signedIn;
    if (logoutBtn) logoutBtn.disabled = !signedIn;
    if (emailEl) emailEl.disabled = signedIn;
    if (passwordEl) passwordEl.disabled = signedIn;
}

function normalizeReadablePreview(text, maxLen = 200) {
    const raw = typeof text === 'string' ? text : '';
    if (!raw) return '';
    const compact = raw
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!compact) return '';
    const symbolCount = (compact.match(/[^A-Za-z0-9\s.,;:!?'"()\-/%]/g) || []).length;
    const symbolRatio = symbolCount / Math.max(compact.length, 1);
    if (symbolRatio > 0.28) return '[Filtered noisy sample content]';
    if (compact.length <= maxLen) return compact;
    return `${compact.substring(0, maxLen)}...`;
}

function hasSemanticSignalText(text) {
    const value = String(text || '').trim();
    if (!value) return false;
    const words = value.split(/\s+/).filter(Boolean);
    const hasLongWord = words.some(word => /[A-Za-z]{4,}/.test(word));
    const letters = (value.match(/[A-Za-z]/g) || []).length;
    const digits = (value.match(/[0-9]/g) || []).length;
    const symbolCount = (value.match(/[^A-Za-z0-9\s.,;:!?'"()\-/%]/g) || []).length;
    const symbolRatio = symbolCount / Math.max(value.length, 1);
    const codeLikePattern = /\b(var|const|let|function|return|opacity|calc|rgba|background)\b|--|=>|\{|\}|\[|\]|::/i;
    if (letters < 3 || words.length < 2 || !hasLongWord) return false;
    if (digits > letters * 2) return false;
    if (symbolRatio > 0.2) return false;
    if (/[{}[\]|=>]/.test(value)) return false;
    if (codeLikePattern.test(value)) return false;
    return true;
}

// State
let currentSection = 'workspace';
let currentAnalysisType = 'all';
let currentLibraryTab = 'samples';
let currentTestingTab = 'run';
let testResults = [];
let lastAnalysisResult = null;
let lastGeneratedText = null;
let topology3D = null;
const TOPOLOGY_SENSITIVITY_KEY = 'voiceDashboardTopologySensitivity';
const AUTH_TOKEN_KEY = 'voiceDashboardAuthToken';
let topologySensitivity = Number(localStorage.getItem(TOPOLOGY_SENSITIVITY_KEY) || '50');
let selectedProfileId = localStorage.getItem('voiceDashboardSelectedProfileId') || '';
let defaultProfileId = '';
let dashboardProfiles = [];
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
let currentUser = null;

// Markov Chain Tracker Integration
function wrapFunction(functionName, fn, context = {}) {
    if (!window.markovTracker) {
        console.warn('Markov tracker not loaded, function tracking disabled');
        return fn;
    }
    
    window.markovTracker.registerFunction(functionName, context);
    
    return function(...args) {
        const page = window.markovTracker.getCurrentPage();
        window.markovTracker.trackCall(functionName, { ...context, page });
        
        try {
            const result = fn.apply(this, args);
            
            // Handle promises
            if (result instanceof Promise) {
                return result.catch(error => {
                    window.markovTracker.trackError(functionName, error, { ...context, page });
                    throw error;
                });
            }
            
            return result;
        } catch (error) {
            window.markovTracker.trackError(functionName, error, { ...context, page });
            throw error;
        }
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT] DOMContentLoaded - Starting initialization');
    const initStartTime = performance.now();
    
    // Track initialization
    if (window.markovTracker) {
        window.markovTracker.trackCall('DOMContentLoaded', { type: 'initialization', page: 'home' });
        console.log('[INIT] Markov tracker available');
    } else {
        console.warn('[INIT] Markov tracker not available');
    }
    
    try {
        console.log('[INIT] Initializing navigation...');
        initializeNavigation();
        
        console.log('[INIT] Initializing sidebar panels...');
        initializeSidebarPanels();
        
        console.log('[INIT] Initializing event listeners...');
        initializeEventListeners();

        console.log('[INIT] Initializing auth session...');
        await initializeAuthSession();
        
        console.log('[INIT] Checking health...');
        checkHealth();
        
        console.log('[INIT] Loading profiles...');
        loadProfilesToSelect();
        
        // Initialize Markov chain analysis UI if tracker is available
        if (window.markovTracker) {
            console.log('[INIT] Initializing Markov analysis UI...');
            initializeMarkovAnalysisUI();
        }
        
        const initDuration = (performance.now() - initStartTime).toFixed(2);
        console.log(`[INIT] Initialization complete (${initDuration}ms)`);
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('[INIT] Initialization error:', errorMessage, error);
        updateStatus('error', `Initialization Error: ${errorMessage}`);
    }
});

// Navigation
function initializeNavigation() {
    // Top nav tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach((tab, index) => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const section = tab.dataset.section;
            switchSection(section);
        });
        
        // Keyboard navigation for tabs
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const tabs = Array.from(navTabs);
                const currentIndex = tabs.indexOf(tab);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                } else {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                }
                
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
            } else if (e.key === 'Home') {
                e.preventDefault();
                navTabs[0].focus();
                navTabs[0].click();
            } else if (e.key === 'End') {
                e.preventDefault();
                navTabs[navTabs.length - 1].focus();
                navTabs[navTabs.length - 1].click();
            }
        });
    });

    // Analysis tabs
    const analysisTabs = document.querySelectorAll('.analysis-tab');
    analysisTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            analysisTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentAnalysisType = tab.dataset.analysis;
        });
        
        // Keyboard navigation for analysis tabs
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const tabs = Array.from(analysisTabs);
                const currentIndex = tabs.indexOf(tab);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                } else {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                }
                
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
            }
        });
    });

    // Library tabs
    const libraryTabs = document.querySelectorAll('.library-tab');
    libraryTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            libraryTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentLibraryTab = tab.dataset.library;
            
            document.querySelectorAll('.library-content').forEach(content => {
                content.classList.remove('active');
                content.setAttribute('aria-hidden', 'true');
            });
            const contentId = `library${currentLibraryTab.charAt(0).toUpperCase() + currentLibraryTab.slice(1)}`;
            const contentElement = document.getElementById(contentId);
            if (contentElement) {
                contentElement.classList.add('active');
                contentElement.setAttribute('aria-hidden', 'false');
            }
        });
        
        // Keyboard navigation for library tabs
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const tabs = Array.from(libraryTabs);
                const currentIndex = tabs.indexOf(tab);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                } else {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                }
                
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
            }
        });
    });

    // Testing tabs
    const testingTabs = document.querySelectorAll('.testing-tab');
    testingTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            testingTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentTestingTab = tab.dataset.testing;
            
            document.querySelectorAll('.testing-content').forEach(content => {
                content.classList.remove('active');
                content.setAttribute('aria-hidden', 'true');
            });
            const contentId = `testing${currentTestingTab.charAt(0).toUpperCase() + currentTestingTab.slice(1)}`;
            const contentElement = document.getElementById(contentId);
            if (contentElement) {
                contentElement.classList.add('active');
                contentElement.setAttribute('aria-hidden', 'false');
            }
        });
        
        // Keyboard navigation for testing tabs
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const tabs = Array.from(testingTabs);
                const currentIndex = tabs.indexOf(tab);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                } else {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                }
                
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
            }
        });
    });
}

async function switchSection(section) {
    console.log(`[NAV] Switching section: ${currentSection} → ${section}`);
    
    // Track page transition
    if (window.markovTracker) {
        window.markovTracker.trackPageTransition(currentSection, section);
    }
    
    // Update nav tabs with ARIA states
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    const targetNavTab = document.querySelector(`[data-section="${section}"]`);
    if (!targetNavTab) {
        console.error(`[NAV] Navigation tab not found for section: ${section}`);
        return;
    }
    targetNavTab.classList.add('active');
    targetNavTab.setAttribute('aria-selected', 'true');

    // Update content sections with ARIA states
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
        sec.setAttribute('aria-hidden', 'true');
    });
    
    const targetSection = document.getElementById(section);
    if (!targetSection) {
        console.error(`[NAV] Content section not found: ${section}`);
        return;
    }
    targetSection.classList.add('active');
    targetSection.setAttribute('aria-hidden', 'false');
    
    // Focus management - move focus to the section for screen readers
    targetSection.setAttribute('tabindex', '-1');
    targetSection.focus();
    targetSection.removeAttribute('tabindex');

    currentSection = section;
    console.log(`[NAV] Section switched successfully to: ${section}`);

    // Load data when switching to Library (await to prevent race conditions)
    if (section === 'library') {
        if (currentLibraryTab === 'samples') {
            await loadLibrarySamples();
        } else if (currentLibraryTab === 'principles') {
            await loadLibraryPrinciples();
        } else if (currentLibraryTab === 'profiles') {
            await loadLibraryProfiles();
        } else if (currentLibraryTab === 'resources') {
            await loadResourcesList();
        }
    }

    // Initialize topology when switching to topology section
    if (section === 'topology') {
        initializeTopology();
    }
}

// Sidebar Panel Management
function initializeSidebarPanels() {
    const panelHeaders = document.querySelectorAll('.panel-header');
    panelHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const panel = header.closest('.sidebar-panel');
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            const panelContent = panel.querySelector('.panel-content');
            
            panel.classList.toggle('collapsed');
            header.setAttribute('aria-expanded', (!isExpanded).toString());
            
            if (panelContent) {
                panelContent.setAttribute('aria-hidden', isExpanded.toString());
            }
        });
        
        // Keyboard support for panel headers
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });

    // Load initial sidebar data
    loadRecentSamples();
    loadRecentPrinciples();
    loadProfilesToSelect();
}

// Event Listeners
function initializeEventListeners() {
    // Unified Analysis
    const unifiedAnalyzeBtn = getElement('unifiedAnalyzeBtn');
    if (unifiedAnalyzeBtn) {
        unifiedAnalyzeBtn.addEventListener('click', handleUnifiedAnalyze);
    }
    
    // Unified Generation
    const unifiedGenerateBtn = getElement('unifiedGenerateBtn');
    if (unifiedGenerateBtn) {
        unifiedGenerateBtn.addEventListener('click', handleUnifiedGenerate);
    }
    
    const unifiedExpansionLevel = getElement('unifiedExpansionLevel');
    const unifiedExpansionValue = getElement('unifiedExpansionValue');
    if (unifiedExpansionLevel && unifiedExpansionValue) {
        unifiedExpansionLevel.addEventListener('input', (e) => {
            unifiedExpansionValue.textContent = e.target.value;
        });
    }
    
    // Mode selector changes
    document.querySelectorAll('input[name="genMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const expansionGroup = getElement('expansionLevelGroup');
            if (!expansionGroup) return;
            if (e.target.value === 'extrapolate') {
                expansionGroup.style.display = 'block';
            } else {
                expansionGroup.style.display = 'none';
            }
        });
    });

    // Output Actions - Analysis
    const saveAnalysisToStorageBtn = getElement('saveAnalysisToStorage');
    if (saveAnalysisToStorageBtn) {
        saveAnalysisToStorageBtn.addEventListener('click', () => saveAnalysisToStorage());
    }
    
    const addAnalysisPrincipleBtn = getElement('addAnalysisPrinciple');
    if (addAnalysisPrincipleBtn) {
        addAnalysisPrincipleBtn.addEventListener('click', () => addAnalysisPrinciple());
    }

    // Output Actions - Generation
    const saveGeneratedToStorageBtn = getElement('saveGeneratedToStorage');
    if (saveGeneratedToStorageBtn) {
        saveGeneratedToStorageBtn.addEventListener('click', () => saveGeneratedToStorage());
    }
    
    const extrapolateGeneratedBtn = getElement('extrapolateGenerated');
    if (extrapolateGeneratedBtn) {
        extrapolateGeneratedBtn.addEventListener('click', () => extrapolateGenerated());
    }
    
    const validateGeneratedBtn = getElement('validateGenerated');
    if (validateGeneratedBtn) {
        validateGeneratedBtn.addEventListener('click', () => validateGenerated());
    }

    // Sidebar Quick Actions
    const quickAddSampleBtn = getElement('quickAddSample');
    if (quickAddSampleBtn) {
        quickAddSampleBtn.addEventListener('click', () => quickAddSample());
    }
    
    const quickAddPrincipleBtn = getElement('quickAddPrinciple');
    if (quickAddPrincipleBtn) {
        quickAddPrincipleBtn.addEventListener('click', () => quickAddPrinciple());
    }
    
    const quickProfileSelect = getElement('quickProfileSelect');
    if (quickProfileSelect) {
        quickProfileSelect.addEventListener('change', (e) => applySelectedProfile(e.target.value));
    }

    const setDefaultProfileBtn = getElement('setDefaultProfileBtn');
    if (setDefaultProfileBtn) {
        setDefaultProfileBtn.addEventListener('click', setSelectedProfileAsDefault);
    }

    const deleteProfileBtn = getElement('deleteProfileBtn');
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', deleteSelectedProfile);
    }

    const pruneProfilesBtn = getElement('pruneProfilesBtn');
    if (pruneProfilesBtn) {
        pruneProfilesBtn.addEventListener('click', pruneLegacyProfiles);
    }

    const authLoginBtn = getElement('authLoginBtn');
    if (authLoginBtn) {
        authLoginBtn.addEventListener('click', handleAuthLogin);
    }

    const authLogoutBtn = getElement('authLogoutBtn');
    if (authLogoutBtn) {
        authLogoutBtn.addEventListener('click', handleAuthLogout);
    }

    const useSiteVoiceProfileBtn = getElement('useSiteVoiceProfileBtn');
    if (useSiteVoiceProfileBtn) {
        useSiteVoiceProfileBtn.addEventListener('click', useSiteVoiceProfile);
    }

    const reloadProfilesBtn = getElement('reloadProfilesBtn');
    if (reloadProfilesBtn) {
        reloadProfilesBtn.addEventListener('click', loadProfilesToSelect);
    }

    const syncDefaultCorpusBtn = getElement('syncDefaultCorpusBtn');
    if (syncDefaultCorpusBtn) {
        syncDefaultCorpusBtn.addEventListener('click', syncDefaultCorpus);
    }

    const rebuildActiveProfileBtn = getElement('rebuildActiveProfileBtn');
    if (rebuildActiveProfileBtn) {
        rebuildActiveProfileBtn.addEventListener('click', rebuildActiveProfileCorpus);
    }

    ['profileSelect', 'panningProfile', 'panningProfileContent', 'topologyProfile'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', (e) => {
                if (e.target.value) applySelectedProfile(e.target.value, { syncControls: true });
            });
        }
    });

    // Library Actions
    const libraryLoadSamplesBtn = getElement('libraryLoadSamples');
    if (libraryLoadSamplesBtn) {
        libraryLoadSamplesBtn.addEventListener('click', loadLibrarySamples);
    }
    
    const libraryAddSampleBtn = getElement('libraryAddSample');
    if (libraryAddSampleBtn) {
        libraryAddSampleBtn.addEventListener('click', () => libraryAddSample());
    }
    
    const libraryLoadPrinciplesBtn = getElement('libraryLoadPrinciples');
    if (libraryLoadPrinciplesBtn) {
        libraryLoadPrinciplesBtn.addEventListener('click', loadLibraryPrinciples);
    }
    
    const libraryAddPrincipleBtn = getElement('libraryAddPrinciple');
    if (libraryAddPrincipleBtn) {
        libraryAddPrincipleBtn.addEventListener('click', () => libraryAddPrinciple());
    }
    
    const libraryLoadProfilesBtn = getElement('libraryLoadProfiles');
    if (libraryLoadProfilesBtn) {
        libraryLoadProfilesBtn.addEventListener('click', loadLibraryProfiles);
    }
    
    const libraryLoadDefaultProfileBtn = getElement('libraryLoadDefaultProfile');
    if (libraryLoadDefaultProfileBtn) {
        libraryLoadDefaultProfileBtn.addEventListener('click', loadLibraryDefaultProfile);
    }
    
    const libraryBuildProfileBtn = getElement('libraryBuildProfile');
    if (libraryBuildProfileBtn) {
        libraryBuildProfileBtn.addEventListener('click', handleLibraryBuildProfile);
    }
    
    const saveBuiltProfileBtn = getElement('saveBuiltProfile');
    if (saveBuiltProfileBtn) {
        saveBuiltProfileBtn.addEventListener('click', () => saveBuiltProfile());
    }

    // Testing
    const runABTestsBtn = getElement('runABTestsBtn');
    if (runABTestsBtn) {
        runABTestsBtn.addEventListener('click', handleRunTests);
    }
    
    const runTestsBtn = getElement('runTestsBtn');
    if (runTestsBtn) {
        runTestsBtn.addEventListener('click', () => {
            switchSection('testing');
            handleRunTests();
        });
    }

    // Quick Actions
    const clearAllInputsBtn = getElement('clearAllInputs');
    if (clearAllInputsBtn) {
        clearAllInputsBtn.addEventListener('click', clearAllInputs);
    }
    
    const loadFromStorageBtn = getElement('loadFromStorage');
    if (loadFromStorageBtn) {
        loadFromStorageBtn.addEventListener('click', loadFromStorage);
    }

    // Search
    const sampleSearch = getElement('sampleSearch');
    if (sampleSearch) {
        sampleSearch.addEventListener('input', (e) => filterSamples(e.target.value));
    }
    
    const principleSearch = getElement('principleSearch');
    if (principleSearch) {
        principleSearch.addEventListener('input', (e) => filterPrinciples(e.target.value));
    }

    // Document Upload
    const uploadDocumentBtn = getElement('uploadDocumentBtn');
    if (uploadDocumentBtn) {
        uploadDocumentBtn.addEventListener('click', handleDocumentUpload);
    }
    
    const processDocumentBtn = getElement('processDocumentBtn');
    if (processDocumentBtn) {
        processDocumentBtn.addEventListener('click', handleDocumentProcess);
    }
    
    // Setup processing mode handlers
    setupProcessingModeHandlers();
    
    // Load profiles for panning dropdowns
    loadPanningProfiles();
    
    // Folder Upload
    const folderUpload = getElement('folderUpload');
    const folderUploadBtn = getElement('uploadFolderBtn');
    const folderFileCount = getElement('folderFileCount');
    
    if (folderUpload && folderUploadBtn && folderFileCount) {
        folderUpload.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                folderFileCount.textContent = `${files.length} file(s) selected`;
                folderFileCount.style.display = 'block';
                folderUploadBtn.style.display = 'inline-block';
            } else {
                folderFileCount.style.display = 'none';
                folderUploadBtn.style.display = 'none';
            }
        });
        
        folderUploadBtn.addEventListener('click', handleFolderUpload);
    }

    // Resource Upload
    const uploadResourceBtn = getElement('uploadResourceBtn');
    if (uploadResourceBtn) {
        uploadResourceBtn.addEventListener('click', handleResourceUpload);
    }
    
    const processResourceContentBtn = getElement('processResourceContentBtn');
    if (processResourceContentBtn) {
        processResourceContentBtn.addEventListener('click', handleResourceProcess);
    }
    
    const refreshResourcesBtn = getElement('refreshResourcesBtn');
    if (refreshResourcesBtn) {
        refreshResourcesBtn.addEventListener('click', loadResourcesList);
    }

    const resourcesListEl = document.getElementById('resourcesList');
    if (resourcesListEl) {
        resourcesListEl.addEventListener('click', onResourceActionClick);
        resourcesListEl.addEventListener('click', onResourceCardHeadClick);
        resourcesListEl.addEventListener('keydown', onResourceCardHeadKeydown);
    }

    const resourceSearchEl = document.getElementById('resourceSearch');
    if (resourceSearchEl) {
        resourceSearchEl.addEventListener('input', filterResourceList);
        resourceSearchEl.addEventListener('change', filterResourceList);
    }

    // Load resources list when resources tab is shown
    const resourcesTab = document.querySelector('[data-library="resources"]');
    if (resourcesTab) {
        resourcesTab.addEventListener('click', () => {
            setTimeout(loadResourcesList, 100);
        });
    }

    // Topology
    const topologyView = getElement('topologyView');
    if (topologyView) {
        topologyView.addEventListener('change', (e) => {
            const profileGroup = getElement('profileSelectGroup');
            if (profileGroup) {
                if (e.target.value === 'profiles') {
                    profileGroup.style.display = 'block';
                    loadTopologyProfiles();
                } else {
                    profileGroup.style.display = 'none';
                    if (topology3D) {
                        topology3D.loadData('all');
                    }
                }
            }
        });
    }
    
    const topologyProfile = getElement('topologyProfile');
    if (topologyProfile) {
        topologyProfile.addEventListener('change', (e) => {
            if (topology3D && e.target.value) {
                topology3D.loadData('profile', e.target.value);
            }
        });
    }
    
    const refreshTopologyBtn = getElement('refreshTopologyBtn');
    if (refreshTopologyBtn) {
        refreshTopologyBtn.addEventListener('click', () => {
            if (topology3D) {
                const viewEl = getElement('topologyView');
                if (viewEl) {
                    const view = viewEl.value;
                    if (view === 'profiles') {
                        topology3D.loadProfilesView();
                    } else {
                        const profileEl = getElement('topologyProfile');
                        if (profileEl) {
                            const profileId = profileEl.value;
                            topology3D.loadData(profileId ? 'profile' : 'all', profileId);
                        }
                    }
                }
            }
        });
    }

    const topologySensitivityInput = getElement('topologySensitivity');
    if (topologySensitivityInput) {
        topologySensitivityInput.value = String(clampTopologySensitivity(topologySensitivity));
        updateTopologySensitivityLabel(topologySensitivityInput.value);
        topologySensitivityInput.addEventListener('input', (e) => {
            applyTopologySensitivity(e.target.value, { persist: true });
        });
    }

    const resetTopologyCameraBtn = getElement('resetTopologyCameraBtn');
    if (resetTopologyCameraBtn) {
        resetTopologyCameraBtn.addEventListener('click', () => {
            if (topology3D && typeof topology3D.resetCamera === 'function') {
                topology3D.resetCamera();
            }
        });
    }
}

// API Calls
async function apiCall(endpoint, method = 'GET', data = null) {
    const startTime = performance.now();
    const logPrefix = `[API ${method} /api/${endpoint}]`;
    
    try {
        console.log(`${logPrefix} Starting request`, data ? { dataSize: JSON.stringify(data).length } : '');
        
        const options = {
            method,
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                ...getAuthHeaders(),
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE}/api/${endpoint}`, options);
        const duration = (performance.now() - startTime).toFixed(2);
        
        if (!response.ok) {
            console.error(`${logPrefix} HTTP ${response.status} ${response.statusText} (${duration}ms)`);
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: parseServerErrorText(errorText) };
            }
            if (response.status === 401 && endpoint !== 'auth/login') {
                currentUser = null;
                updateAuthUi();
            }
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const raw = await response.text();
            const preview = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
            throw new Error(`Expected JSON from /api/${endpoint}, got ${contentType || 'unknown type'} (${preview || 'empty response'})`);
        }

        const result = await response.json();
        // Health endpoint doesn't have success field, so check for status or success
        const isSuccess = result.success !== false && (result.success === true || result.status === 'ok' || response.ok);
        console.log(`${logPrefix} Success (${duration}ms)`, isSuccess ? '✓' : '✗');

        if (!result.success && result.error) {
            console.error(`${logPrefix} API returned error:`, result.error);
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        const duration = (performance.now() - startTime).toFixed(2);
        const errorMessage = getErrorMessage(error);
        console.error(`${logPrefix} Error after ${duration}ms:`, errorMessage, error);
        throw error;
    }
}

// Health Check
async function checkHealth() {
    try {
        const result = await apiCall('health');
        updateStatus('ready', 'Ready');
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Connection Error: ${errorMessage}`);
    }
}

function updateStatus(status, message) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('span:last-child');
    
    if (!dot || !text) return;
    
    dot.className = 'status-dot';
    if (status === 'ready' || status === 'success') {
        dot.style.background = '#10b981';
    } else if (status === 'loading') {
        dot.style.background = '#f59e0b';
    } else if (status === 'warning') {
        dot.style.background = '#f59e0b';
    } else {
        dot.style.background = '#ef4444';
    }
    
    text.textContent = message;
    
    // Auto-clear success messages after 3 seconds
    if (status === 'success') {
        setTimeout(() => {
            if (text.textContent === message) {
                updateStatus('ready', 'Ready');
            }
        }, 3000);
    }
}

// Unified Analysis Handler
async function handleUnifiedAnalyze() {
    console.log('[ANALYZE] Starting unified analysis');
    const analyzeStartTime = performance.now();
    
    const inputElement = document.getElementById('unifiedAnalyzeInput');
    const output = document.getElementById('unifiedAnalysisOutput');
    const actions = document.getElementById('analysisActions');
    const runAllCheckbox = document.getElementById('runAllAnalysis');
    
    if (!inputElement || !output || !actions || !runAllCheckbox) {
        console.error('[ANALYZE] Required elements not found');
        return;
    }
    
    const text = inputElement.value;
    const runAll = runAllCheckbox.checked;

    if (!text.trim()) {
        console.warn('[ANALYZE] Empty input provided');
        output.textContent = 'Please enter text to analyze.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    // Validate text length
    if (text.length > 50000) {
        console.warn('[ANALYZE] Text too long');
        output.textContent = 'Text is too long. Please limit to 50,000 characters.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    if (text.length < 10) {
        console.warn('[ANALYZE] Text too short');
        output.textContent = 'Text is too short. Please provide at least 10 characters for meaningful analysis.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }

    console.log(`[ANALYZE] Text length: ${text.length}, Run all: ${runAll}, Type: ${currentAnalysisType}`);
    output.textContent = 'Analyzing...';
    output.className = 'output-area';
    actions.style.display = 'none';
    updateStatus('loading', 'Analyzing...');

    try {
        let results = {};
        let outputText = '';

        if (runAll || currentAnalysisType === 'all' || currentAnalysisType === 'tone') {
            const toneResult = await apiCall('analyze', 'POST', { text, profileId: getActiveProfileId() });
            results.tone = toneResult;
            outputText += `\n=== TONE ANALYSIS ===\n`;
            outputText += `Technical Term Density: ${typeof toneResult.analysis.technicalTermDensity === 'number' ? toneResult.analysis.technicalTermDensity.toFixed(2) : toneResult.analysis.technicalTermDensity}\n`;
            outputText += `Numerical Precision: ${toneResult.analysis.numericalPrecision}\n`;
            outputText += `Sentence Complexity: ${typeof toneResult.analysis.sentenceComplexity === 'number' ? toneResult.analysis.sentenceComplexity.toFixed(2) : toneResult.analysis.sentenceComplexity}\n`;
            outputText += `Structural Patterns: ${toneResult.analysis.structuralPatterns?.length || 0} found\n`;
            outputText += `Voice Match Score: ${typeof toneResult.match?.overallMatch === 'number' ? (toneResult.match.overallMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `- Tone Match: ${typeof toneResult.match?.toneMatch === 'number' ? (toneResult.match.toneMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `- Vocabulary Match: ${typeof toneResult.match?.vocabularyMatch === 'number' ? (toneResult.match.vocabularyMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `- Structure Match: ${typeof toneResult.match?.structureMatch === 'number' ? (toneResult.match.structureMatch * 100).toFixed(1) : 'N/A'}%\n`;
        }

        if (runAll || currentAnalysisType === 'all' || currentAnalysisType === 'patterns') {
            const patternResult = await apiCall('extract-patterns', 'POST', { text, profileId: getActiveProfileId() });
            results.patterns = patternResult;
            outputText += `\n=== PATTERN EXTRACTION ===\n`;
            
            const patterns = patternResult?.patterns || {};
            const sentencePatterns = patterns.sentencePatterns || [];
            const phrasePatterns = patterns.phrasePatterns || [];
            const terminologyPatterns = patterns.terminologyPatterns || [];
            
            outputText += `Sentence Patterns: ${sentencePatterns.length} found\n`;
            if (sentencePatterns.length > 0) {
                outputText += sentencePatterns.slice(0, 5).map((p, i) => `${i + 1}. ${p || ''}`).join('\n') + '\n';
            }
            outputText += `Phrase Patterns: ${phrasePatterns.length} found\n`;
            if (phrasePatterns.length > 0) {
                outputText += phrasePatterns.slice(0, 5).map((p, i) => `${i + 1}. ${(p && p.pattern) || ''} (${(p && p.category) || 'unknown'})`).join('\n') + '\n';
            }
            outputText += `Terminology: ${terminologyPatterns.slice(0, 10).join(', ') || 'none'}\n`;
        }

        if (runAll || currentAnalysisType === 'all' || currentAnalysisType === 'shredder') {
            const shredResult = await apiCall('shred', 'POST', { text, profileId: getActiveProfileId() });
            results.shredder = shredResult;
            outputText += `\n=== SHREDDER ANALYSIS ===\n`;
            outputText += `Total Truths: ${shredResult.analysis.summary.totalTruths}\n`;
            outputText += `Facts/Values: ${shredResult.analysis.summary.factCount}\n`;
            outputText += `Definitions: ${shredResult.analysis.summary.definitionCount}\n`;
            outputText += `Average Confidence: ${typeof shredResult.analysis.summary.averageConfidence === 'number' ? (shredResult.analysis.summary.averageConfidence * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `Objective Voice: ${shredResult.analysis.objectiveVoice?.tone || 'N/A'}\n`;
            outputText += `Formality: ${typeof shredResult.analysis.objectiveVoice?.formality === 'number' ? (shredResult.analysis.objectiveVoice.formality * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `Precision: ${typeof shredResult.analysis.objectiveVoice?.precision === 'number' ? (shredResult.analysis.objectiveVoice.precision * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `Complexity: ${typeof shredResult.analysis.objectiveVoice?.complexity === 'number' ? (shredResult.analysis.objectiveVoice.complexity * 100).toFixed(1) : 'N/A'}%\n`;
        }

        lastAnalysisResult = { text, results };
        const analyzeDuration = (performance.now() - analyzeStartTime).toFixed(2);
        console.log(`[ANALYZE] Analysis complete (${analyzeDuration}ms)`, {
            tone: !!results.tone,
            patterns: !!results.patterns,
            shredder: !!results.shredder
        });
        
        output.textContent = outputText.trim();
        output.className = 'output-area success';
        actions.style.display = 'flex';
        updateStatus('ready', 'Ready');
    } catch (error) {
        const analyzeDuration = (performance.now() - analyzeStartTime).toFixed(2);
        console.error(`[ANALYZE] Error after ${analyzeDuration}ms:`, error);
        const errorMessage = getErrorMessage(error);
        output.textContent = `Error: ${errorMessage}`;
        output.className = 'output-area error';
        actions.style.display = 'none';
        updateStatus('error', 'Error');
    }
}

// Unified Generation Handler
async function handleUnifiedGenerate() {
    console.log('[GENERATE] Starting text generation');
    const generateStartTime = performance.now();
    
    const inputElement = getElement('unifiedGenerateInput');
    const modeRadio = document.querySelector('input[name="genMode"]:checked');
    const lengthSelect = getElement('unifiedLengthSelect');
    const styleSelect = getElement('unifiedStyleSelect');
    const expansionLevelInput = getElement('unifiedExpansionLevel');
    const output = getElement('unifiedGenerateOutput');
    const actions = getElement('generateActions');
    
    if (!inputElement || !modeRadio || !lengthSelect || !styleSelect || !expansionLevelInput || !output || !actions) {
        console.error('[GENERATE] Required elements not found');
        if (output) {
            output.textContent = 'Error: Required UI elements not found. Please refresh the page.';
            output.className = 'output-area error';
        }
        return;
    }
    
    const input = inputElement.value;
    const mode = modeRadio.value;
    const length = lengthSelect.value;
    const style = styleSelect.value;
    const expansionLevel = parseInt(expansionLevelInput.value);

    if (!input.trim()) {
        console.warn('[GENERATE] Empty input provided');
        output.textContent = 'Please enter topic or seed text.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    // Validate input length
    if (input.length > 1000) {
        console.warn('[GENERATE] Input too long');
        output.textContent = 'Input is too long. Please limit to 1,000 characters.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    if (input.length < 3) {
        console.warn('[GENERATE] Input too short');
        output.textContent = 'Input is too short. Please provide at least 3 characters.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    // Validate expansion level
    if (mode === 'extrapolate' && (isNaN(expansionLevel) || expansionLevel < 1 || expansionLevel > 10)) {
        console.warn('[GENERATE] Invalid expansion level');
        output.textContent = 'Expansion level must be between 1 and 10.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }

    console.log(`[GENERATE] Mode: ${mode}, Length: ${length}, Style: ${style}, Expansion: ${expansionLevel}`);
    output.textContent = 'Generating...';
    output.className = 'output-area';
    actions.style.display = 'none';
    updateStatus('loading', 'Generating...');

    try {
        let generatedText = '';
        let validationResult = null;

        if (mode === 'generate' || mode === 'generate-validate') {
            const result = await apiCall('generate', 'POST', {
                topic: input,
                profileId: getActiveProfileId(),
                options: { length, style, includeExamples: true }
            });
            generatedText = result.text;
            lastGeneratedText = generatedText;
        } else if (mode === 'extrapolate') {
            const result = await apiCall('extrapolate', 'POST', {
                text: input,
                profileId: getActiveProfileId(),
                options: { expansionLevel }
            });
            generatedText = result.text;
            lastGeneratedText = generatedText;
        }

        let outputText = generatedText;

        if (mode === 'generate-validate' && generatedText) {
            const matchResult = await apiCall('match-voice', 'POST', { text: generatedText, profileId: getActiveProfileId() });
            validationResult = matchResult;
            outputText += `\n\n=== VOICE VALIDATION ===\n`;
            outputText += `Match Score: ${typeof matchResult.match?.overallMatch === 'number' ? (matchResult.match.overallMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `- Tone: ${typeof matchResult.match?.toneMatch === 'number' ? (matchResult.match.toneMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `- Vocabulary: ${typeof matchResult.match?.vocabularyMatch === 'number' ? (matchResult.match.vocabularyMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `- Structure: ${typeof matchResult.match?.structureMatch === 'number' ? (matchResult.match.structureMatch * 100).toFixed(1) : 'N/A'}%\n`;
            outputText += `Valid: ${matchResult.validation?.isValid ? '✓' : '✗'}\n`;
        }

        const generateDuration = (performance.now() - generateStartTime).toFixed(2);
        console.log(`[GENERATE] Generation complete (${generateDuration}ms)`, {
            mode,
            textLength: generatedText.length,
            validated: !!validationResult
        });
        
        output.textContent = outputText;
        output.className = 'output-area success';
        actions.style.display = 'flex';
        updateStatus('ready', 'Ready');
    } catch (error) {
        const generateDuration = (performance.now() - generateStartTime).toFixed(2);
        console.error(`[GENERATE] Error after ${generateDuration}ms:`, error);
        const errorMessage = getErrorMessage(error);
        output.textContent = `Error: ${errorMessage}`;
        output.className = 'output-area error';
        actions.style.display = 'none';
        updateStatus('error', 'Error');
    }
}

// Output Action Handlers
async function saveAnalysisToStorage() {
    if (!lastAnalysisResult) return;
    const text = prompt('Enter category (optional):') || undefined;
    const tags = prompt('Tags (comma-separated, optional):');
    const tagArray = tags ? tags.split(',').map(t => t.trim()) : undefined;
    
    try {
        await apiCall('storage/samples', 'POST', {
            text: lastAnalysisResult.text,
            category: text,
            tags: tagArray
        });
        updateStatus('success', 'Saved to storage!');
        loadRecentSamples();
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

async function addAnalysisPrinciple() {
    if (!lastAnalysisResult) return;
    const principle = prompt('Principle name:');
    if (!principle) return;
    const description = prompt('Description (optional):') || undefined;
    
    try {
        await apiCall('storage/principles', 'POST', {
            principle,
            description,
            category: 'analysis-derived'
        });
        updateStatus('success', 'Principle added!');
        loadRecentPrinciples();
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

async function saveGeneratedToStorage() {
    if (!lastGeneratedText) return;
    const category = prompt('Category (optional):') || undefined;
    const tags = prompt('Tags (comma-separated, optional):');
    const tagArray = tags ? tags.split(',').map(t => t.trim()) : undefined;
    
    try {
        await apiCall('storage/samples', 'POST', {
            text: lastGeneratedText,
            category,
            tags: tagArray
        });
        updateStatus('success', 'Saved to storage!');
        loadRecentSamples();
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

async function extrapolateGenerated() {
    if (!lastGeneratedText) return;
    const generateInput = getElement('unifiedGenerateInput');
    if (generateInput) {
        generateInput.value = lastGeneratedText;
    }
    const extrapolateRadio = getElementBySelector('input[name="genMode"][value="extrapolate"]');
    if (extrapolateRadio) {
        extrapolateRadio.checked = true;
    }
    const expansionGroup = getElement('expansionLevelGroup');
    if (expansionGroup) {
        expansionGroup.style.display = 'block';
    }
    handleUnifiedGenerate();
}

async function validateGenerated() {
    if (!lastGeneratedText) return;
    try {
        const result = await apiCall('match-voice', 'POST', { text: lastGeneratedText, profileId: getActiveProfileId() });
        const output = getElement('unifiedGenerateOutput');
        if (!output) {
            console.error('[VALIDATE] Output element not found');
            return;
        }
        const currentText = output.textContent.split('\n\n=== VOICE VALIDATION ===')[0];
        output.textContent = currentText + `\n\n=== VOICE VALIDATION ===\n` +
            `Match Score: ${typeof result.match?.overallMatch === 'number' ? (result.match.overallMatch * 100).toFixed(1) : 'N/A'}%\n` +
            `- Tone: ${typeof result.match?.toneMatch === 'number' ? (result.match.toneMatch * 100).toFixed(1) : 'N/A'}%\n` +
            `- Vocabulary: ${typeof result.match?.vocabularyMatch === 'number' ? (result.match.vocabularyMatch * 100).toFixed(1) : 'N/A'}%\n` +
            `- Structure: ${typeof result.match?.structureMatch === 'number' ? (result.match.structureMatch * 100).toFixed(1) : 'N/A'}%\n` +
            `Valid: ${result.validation.isValid ? '✓' : '✗'}\n`;
        output.className = 'output-area success';
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

// Sidebar Functions
async function loadRecentSamples() {
    try {
        const result = await apiCall('storage/samples', 'GET');
        const container = document.getElementById('recentSamples');
        if (!result || !result.samples || !Array.isArray(result.samples)) {
            container.innerHTML = '<div class="panel-list-item">No samples</div>';
            return;
        }
        
        if (result.samples.length === 0) {
            container.innerHTML = '<div class="panel-list-item">No samples</div>';
        } else {
            container.innerHTML = result.samples.slice(0, 5).map(s => 
                `<div class="panel-list-item" title="${escapeHtml(normalizeReadablePreview(s.text || '', 120))}">${escapeHtml(normalizeReadablePreview(s.text || '', 65))}</div>`
            ).join('');
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Error loading samples:', errorMessage, error);
        const container = document.getElementById('recentSamples');
        if (container) {
            container.innerHTML = `<div class="panel-list-item">Error loading: ${errorMessage}</div>`;
        }
    }
}

async function loadRecentPrinciples() {
    try {
        const result = await apiCall('storage/principles', 'GET');
        const container = document.getElementById('recentPrinciples');
        if (!result || !result.principles || !Array.isArray(result.principles)) {
            container.innerHTML = '<div class="panel-list-item">No principles</div>';
            return;
        }
        
        const cleanPrinciples = result.principles.filter(p => hasSemanticSignalText(p.principle));
        if (cleanPrinciples.length === 0) {
            container.innerHTML = '<div class="panel-list-item">No principles</div>';
        } else {
            container.innerHTML = cleanPrinciples.slice(0, 5).map(p => 
                `<div class="panel-list-item">${p.principle || 'Unnamed principle'}</div>`
            ).join('');
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Error loading principles:', errorMessage, error);
        const container = document.getElementById('recentPrinciples');
        if (container) {
            container.innerHTML = `<div class="panel-list-item">Error loading: ${errorMessage}</div>`;
        }
    }
}

async function loadProfilesToSelect() {
    try {
        const result = await apiCall('profiles', 'GET');
        const quickSelect = document.getElementById('quickProfileSelect');
        const profileSelect = document.getElementById('profileSelect');
        const currentProfile = document.getElementById('currentProfile');
        
        if (!quickSelect || !profileSelect) return;
        
        quickSelect.innerHTML = '<option value="">Select profile...</option>';
        profileSelect.innerHTML = '<option value="">Stored default profile</option>';
        
        if (result && result.profiles && Array.isArray(result.profiles)) {
            dashboardProfiles = result.profiles.map(normalizeProfileMeta).filter(Boolean);
            const defaultProfile = dashboardProfiles.find(profile => profile.isDefault);
            defaultProfileId = defaultProfile?.id || dashboardProfiles[0]?.id || '';

            dashboardProfiles.forEach(profile => {
                const suffix = profile.isDefault ? ' - default' : '';
                const option = `<option value="${escapeHtml(profile.id || '')}">${escapeHtml(profile.name || 'Unnamed')}${suffix}</option>`;
                quickSelect.innerHTML += option;
                profileSelect.innerHTML += option;
            });

            const storedStillExists = dashboardProfiles.some(profile => profile.id === selectedProfileId);
            applySelectedProfile(storedStillExists ? selectedProfileId : defaultProfileId, { persist: false, syncControls: true });
            await refreshCorpusPanel();
            updateProfileActionButtons();
        } else {
            dashboardProfiles = [];
            defaultProfileId = '';
            selectedProfileId = '';
            localStorage.removeItem('voiceDashboardSelectedProfileId');
            if (currentProfile) currentProfile.textContent = 'No profiles available';
            updateProfileHealthCard();
            const output = document.getElementById('corpusPanelOutput');
            if (output) output.innerHTML = '<p class="profile-health-warning">No profiles available.</p>';
            updateProfileActionButtons();
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Error loading profiles:', errorMessage, error);
        dashboardProfiles = [];
        updateProfileHealthCard(`Profiles unavailable: ${errorMessage}`);
        updateProfileActionButtons();
    }
}

function normalizeProfileMeta(profile) {
    if (!profile) return null;
    const meta = profile.metadata || profile;
    if (!meta.id) return null;
    return meta;
}

function applySelectedProfile(profileId, options = {}) {
    const { persist = true, syncControls = true } = options;
    selectedProfileId = profileId || '';

    if (persist) {
        if (selectedProfileId) localStorage.setItem('voiceDashboardSelectedProfileId', selectedProfileId);
        else localStorage.removeItem('voiceDashboardSelectedProfileId');
    }

    if (syncControls) {
        ['quickProfileSelect', 'profileSelect', 'panningProfile', 'panningProfileContent', 'topologyProfile'].forEach(id => {
            const select = document.getElementById(id);
            if (select && Array.from(select.options || []).some(option => option.value === selectedProfileId)) {
                select.value = selectedProfileId;
            }
        });
    }

    const profile = dashboardProfiles.find(item => item.id === getActiveProfileId());
    const currentProfile = document.getElementById('currentProfile');
    if (currentProfile) {
        currentProfile.textContent = profile
            ? `Active: ${profile.name || 'Unnamed'}${profile.id === defaultProfileId ? ' (default)' : ' (session)'}`
            : 'Active: stored default profile';
    }
    updateProfileHealthCard();
    refreshCorpusPanel();
    updateProfileActionButtons();
}

function updateProfileActionButtons() {
    const deleteBtn = document.getElementById('deleteProfileBtn');
    const pruneBtn = document.getElementById('pruneProfilesBtn');
    const quickSelect = document.getElementById('quickProfileSelect');
    if (!deleteBtn || !quickSelect) return;

    const selectedId = (quickSelect.value || '').trim();
    const selected = dashboardProfiles.find(profile => profile.id === selectedId);
    const blocked = !selected || dashboardProfiles.length <= 1 || selected.isDefault;
    deleteBtn.disabled = blocked;
    if (!selected) {
        deleteBtn.title = 'Select a non-default profile to delete';
    } else if (dashboardProfiles.length <= 1) {
        deleteBtn.title = 'Cannot delete the only profile';
    } else if (selected.isDefault) {
        deleteBtn.title = 'Set another default profile first';
    } else {
        deleteBtn.title = 'Delete selected profile';
    }

    if (pruneBtn) {
        const pruneBlocked = dashboardProfiles.length <= 1;
        pruneBtn.disabled = pruneBlocked;
        pruneBtn.title = pruneBlocked ? 'Need at least two profiles to prune' : 'Prune duplicate legacy profiles';
    }
}

function getActiveProfileId() {
    return selectedProfileId || defaultProfileId || '';
}

async function setSelectedProfileAsDefault() {
    const id = getActiveProfileId();
    if (!id) {
        updateStatus('error', 'Select a profile first');
        return;
    }
    try {
        await apiCall('profiles/default', 'POST', { id });
        defaultProfileId = id;
        selectedProfileId = id;
        localStorage.setItem('voiceDashboardSelectedProfileId', id);
        await loadProfilesToSelect();
        updateStatus('success', 'Default profile updated');
    } catch (error) {
        updateStatus('error', `Could not set default profile: ${getErrorMessage(error)}`);
    }
}

async function deleteSelectedProfile() {
    const quickSelect = document.getElementById('quickProfileSelect');
    const id = (quickSelect?.value || '').trim();
    if (!id) {
        updateStatus('error', 'Select a profile from the Profiles panel before deleting');
        return;
    }

    if (dashboardProfiles.length <= 1) {
        updateStatus('error', 'Cannot delete the only profile');
        return;
    }

    const profile = dashboardProfiles.find(item => item.id === id);
    if (!profile) {
        updateStatus('error', 'Selected profile is invalid or out of date. Reload profiles and try again.');
        return;
    }
    if (profile.isDefault) {
        updateStatus('error', 'Set another default profile before deleting this one');
        return;
    }

    const label = profile?.name || id;
    const confirmed = confirm(`Delete profile "${label}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
        await apiCall(`profiles/${encodeURIComponent(id)}`, 'DELETE');
        if (selectedProfileId === id) {
            selectedProfileId = '';
            localStorage.removeItem('voiceDashboardSelectedProfileId');
        }
        await loadProfilesToSelect();
        await refreshCorpusPanel();
        updateStatus('success', `Deleted profile: ${label}`);
    } catch (error) {
        updateStatus('error', `Could not delete profile: ${getErrorMessage(error)}`);
    }
}

async function pruneLegacyProfiles() {
    const confirmed = confirm('Prune legacy duplicate profiles? Keeps default and latest profile per name.');
    if (!confirmed) return;

    updateStatus('loading', 'Pruning legacy profiles...');
    try {
        const result = await apiCall('profiles/prune', 'POST', {});
        await loadProfilesToSelect();
        await refreshCorpusPanel();
        const removedCount = Array.isArray(result.removedIds) ? result.removedIds.length : 0;
        updateStatus('success', `Pruned ${removedCount} legacy profile${removedCount === 1 ? '' : 's'}`);
    } catch (error) {
        updateStatus('error', `Could not prune profiles: ${getErrorMessage(error)}`);
    }
}

async function useSiteVoiceProfile() {
    await syncDefaultCorpus();
}

function updateProfileHealthCard(message) {
    const card = document.getElementById('profileHealthCard');
    if (!card) return;

    if (message) {
        card.innerHTML = `<p class="profile-health-warning">${escapeHtml(message)}</p>`;
        return;
    }

    const active = dashboardProfiles.find(profile => profile.id === getActiveProfileId());
    const defaultProfile = dashboardProfiles.find(profile => profile.id === defaultProfileId);

    if (!active) {
        card.innerHTML = `
            <p class="profile-health-warning">No active profile selected.</p>
            <p>Use the site voice profile action to bind generation, analysis, topology, resources, and moderation metadata.</p>
        `;
        return;
    }

    card.innerHTML = `
        <p class="profile-health-name">${escapeHtml(active.name || 'Unnamed profile')}</p>
        <p>${active.id === defaultProfileId ? 'Stored default' : 'Session override'}</p>
        <p>Default: ${escapeHtml(defaultProfile?.name || 'not set')}</p>
        <p>Corpus: ${(active.corpusResourceCount ?? active.corpusResourceIds?.length ?? 0)} resources linked</p>
        <p>Pipeline: generation, analysis, resources, topology</p>
    `;
}

async function refreshCorpusPanel() {
    const output = document.getElementById('corpusPanelOutput');
    const profileId = getActiveProfileId();
    if (!output) return;
    if (!profileId) {
        output.innerHTML = '<p class="profile-health-warning">Select or set a default profile to view corpus status.</p>';
        return;
    }

    try {
        const result = await apiCall(`profiles/${encodeURIComponent(profileId)}/corpus`, 'GET');
        const corpus = result.corpus || {};
        const metadata = result.metadata || {};
        output.innerHTML = `
            <p><strong>${escapeHtml(metadata.name || profileId)}</strong></p>
            <p>Corpus resources: ${Number(corpus.resourceCount || 0)}</p>
            <p>Indexed resources: ${Number(corpus.indexedCount || 0)}</p>
            <p>Last rebuilt: ${escapeHtml(corpus.lastBuiltAt || 'not rebuilt yet')}</p>
        `;
    } catch (error) {
        const message = getErrorMessage(error);
        output.innerHTML = `<p class="profile-health-warning">Could not load corpus: ${escapeHtml(message)}</p>`;
    }
}

async function syncDefaultCorpus() {
    const output = document.getElementById('corpusPanelOutput');
    if (output) output.textContent = 'Syncing BIGPONS corpus...';
    updateStatus('loading', 'Syncing BIGPONS corpus...');
    try {
        const result = await apiCall('profiles/default/sync-corpus', 'POST', {});
        await loadProfilesToSelect();
        await refreshCorpusPanel();
        updateStatus('success', `Synced BIGPONS corpus (${result.corpus?.resourceCount || 0} resources)`);
    } catch (error) {
        const message = getErrorMessage(error);
        if (output) output.innerHTML = `<p class="profile-health-warning">Sync failed: ${escapeHtml(message)}</p>`;
        updateStatus('error', 'BIGPONS sync failed');
    }
}

async function rebuildActiveProfileCorpus() {
    const output = document.getElementById('corpusPanelOutput');
    const profileId = getActiveProfileId();
    if (!profileId) {
        if (output) output.innerHTML = '<p class="profile-health-warning">Select a profile first.</p>';
        updateStatus('error', 'Select a profile first');
        return;
    }
    if (output) output.textContent = 'Rebuilding active profile from corpus...';
    updateStatus('loading', 'Rebuilding profile...');
    try {
        const result = await apiCall(`profiles/${encodeURIComponent(profileId)}/rebuild-from-corpus`, 'POST', {});
        await loadProfilesToSelect();
        await refreshCorpusPanel();
        updateStatus('success', `Rebuilt ${result.metadata?.name || 'profile'} from corpus`);
    } catch (error) {
        const message = getErrorMessage(error);
        if (output) output.innerHTML = `<p class="profile-health-warning">Rebuild failed: ${escapeHtml(message)}</p>`;
        updateStatus('error', 'Profile rebuild failed');
    }
}

async function quickAddSample() {
    const text = prompt('Enter text sample:');
    if (!text) return;
    const category = prompt('Category (optional):') || undefined;
    
    try {
        await apiCall('storage/samples', 'POST', { text, category });
        updateStatus('success', 'Sample added!');
        loadRecentSamples();
        if (currentSection === 'library' && currentLibraryTab === 'samples') {
            loadLibrarySamples();
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

async function quickAddPrinciple() {
    const principle = prompt('Principle name:');
    if (!principle) return;
    const description = prompt('Description (optional):') || undefined;
    
    try {
        await apiCall('storage/principles', 'POST', { principle, description });
        updateStatus('success', 'Principle added!');
        loadRecentPrinciples();
        if (currentSection === 'library' && currentLibraryTab === 'principles') {
            loadLibraryPrinciples();
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

// Library Functions
async function loadLibrarySamples() {
    const container = document.getElementById('librarySamplesList');
    container.innerHTML = 'Loading...';
    
    try {
        const result = await apiCall('storage/samples', 'GET');
        if (!result || !result.samples || !Array.isArray(result.samples)) {
            container.innerHTML = '<p class="empty-state">Error: Invalid response from server</p>';
            return;
        }
        
        if (result.samples.length === 0) {
            container.innerHTML = '<p class="empty-state">No samples stored yet.</p>';
        } else {
            container.innerHTML = result.samples.map(s => `
                <div class="library-item">
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">${escapeHtml(normalizeReadablePreview(s.text || '', 220))}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        Category: ${escapeHtml(s.category || 'uncategorized')} | 
                        Tags: ${escapeHtml((s.tags || []).join(', ') || 'none')}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        container.innerHTML = `<p class="empty-state">Error: ${errorMessage || 'Failed to load samples'}</p>`;
    }
}

async function loadLibraryPrinciples() {
    const container = document.getElementById('libraryPrinciplesList');
    container.innerHTML = 'Loading...';
    
    try {
        const result = await apiCall('storage/principles', 'GET');
        if (!result || !result.principles || !Array.isArray(result.principles)) {
            container.innerHTML = '<p class="empty-state">Error: Invalid response from server</p>';
            return;
        }
        
        const cleanPrinciples = result.principles.filter(p => hasSemanticSignalText(p.principle));
        if (cleanPrinciples.length === 0) {
            container.innerHTML = '<p class="empty-state">No principles stored yet.</p>';
        } else {
            container.innerHTML = cleanPrinciples.map(p => `
                <div class="library-item">
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">${p.principle || 'Unnamed principle'}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        ${p.description || 'No description'} | Category: ${p.category || 'uncategorized'}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        container.innerHTML = `<p class="empty-state">Error: ${errorMessage || 'Failed to load principles'}</p>`;
    }
}

async function loadLibraryProfiles() {
    const container = document.getElementById('libraryProfilesList');
    container.innerHTML = 'Loading...';
    
    try {
        const result = await apiCall('profiles', 'GET');
        if (!result || !result.profiles || !Array.isArray(result.profiles)) {
            container.innerHTML = '<p class="empty-state">Error: Invalid response from server</p>';
            return;
        }
        
        const profiles = result.profiles.map(normalizeProfileMeta).filter(Boolean);
        if (profiles.length === 0) {
            container.innerHTML = '<p class="empty-state">No profiles stored yet.</p>';
        } else {
            container.innerHTML = profiles.map(profile => `
                <div class="library-item">
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">
                        ${escapeHtml(profile.name || 'Unnamed profile')} ${profile.isDefault ? '(Default)' : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        v${escapeHtml(profile.version || 'n/a')} | ${escapeHtml(profile.description || 'No description')}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        container.innerHTML = `<p class="empty-state">Error: ${errorMessage}</p>`;
    }
}

async function loadLibraryDefaultProfile() {
    const container = document.getElementById('libraryProfilesList');
    container.innerHTML = 'Loading...';
    
    try {
        const result = await apiCall('profiles/default', 'GET');
        const metadata = result.metadata || normalizeProfileMeta(result.profile) || {};
        container.innerHTML = `
            <div class="library-item">
                <div style="font-weight: 500; margin-bottom: 0.5rem;">${escapeHtml(metadata.name || 'Unnamed profile')} (Default)</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                    v${escapeHtml(metadata.version || 'n/a')} | ${escapeHtml(metadata.description || 'No description')}
                </div>
            </div>
        `;
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        container.innerHTML = `<p class="empty-state">Error: ${errorMessage}</p>`;
    }
}

async function libraryAddSample() {
    const text = prompt('Enter text sample:');
    if (!text) return;
    const category = prompt('Category (optional):') || undefined;
    const tags = prompt('Tags (comma-separated, optional):');
    const tagArray = tags ? tags.split(',').map(t => t.trim()) : undefined;
    
    try {
        await apiCall('storage/samples', 'POST', { text, category, tags: tagArray });
        updateStatus('success', 'Sample added!');
        loadLibrarySamples();
        loadRecentSamples();
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

async function libraryAddPrinciple() {
    const principle = prompt('Principle name:');
    if (!principle) return;
    const description = prompt('Description (optional):') || undefined;
    const category = prompt('Category (optional):') || undefined;
    
    try {
        await apiCall('storage/principles', 'POST', { principle, description, category });
        updateStatus('success', 'Principle added!');
        loadLibraryPrinciples();
        loadRecentPrinciples();
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

let lastBuiltProfile = null;

async function handleLibraryBuildProfile() {
    const samplesInput = getElement('libraryBuilderSamples');
    const nameInput = getElement('libraryProfileName');
    const descriptionInput = getElement('libraryProfileDescription');
    const output = getElement('libraryBuilderOutput');
    const actions = getElement('builderActions');
    
    if (!samplesInput || !nameInput || !output || !actions) {
        console.error('[BUILD PROFILE] Required elements not found');
        return;
    }
    
    const samplesText = samplesInput.value;
    const name = nameInput.value;
    const description = descriptionInput ? descriptionInput.value : '';

    if (!samplesText.trim()) {
        output.textContent = 'Please enter text samples.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }

    const samples = samplesText.split('\n').filter(s => s.trim());
    if (samples.length === 0) {
        output.textContent = 'Please enter at least one text sample.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    // Validate minimum sample count
    if (samples.length < 3) {
        output.textContent = 'Please provide at least 3 text samples for better profile accuracy.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    // Validate name
    if (!name.trim()) {
        output.textContent = 'Please enter a profile name.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }
    
    if (name.length > 100) {
        output.textContent = 'Profile name is too long. Please limit to 100 characters.';
        output.className = 'output-area error';
        actions.style.display = 'none';
        return;
    }

    output.textContent = 'Building profile...';
    output.className = 'output-area';
    actions.style.display = 'none';
    updateStatus('loading', 'Building...');

    try {
        const result = await apiCall('profile-builder/build', 'POST', {
            samples,
            options: {
                name: name || 'Generated Profile',
                description: description || undefined
            }
        });

        lastBuiltProfile = result.profile;

        const profileText = `
✅ Profile Built Successfully!

Voice Name: ${result.profile.voiceName}
Version: ${result.profile.version || '1.0.0'}

Tone Characteristics:
- Formality: ${result.profile.characteristics.tone.formality}
- Technicality: ${result.profile.characteristics.tone.technicality}
- Precision: ${result.profile.characteristics.tone.precision}

Vocabulary:
- Technical Terms: ${result.profile.characteristics.linguisticPatterns.vocabulary.technicalTerms.length} terms
- Descriptive Terms: ${result.profile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms.length} terms
        `.trim();

        output.textContent = profileText;
        output.className = 'output-area success';
        actions.style.display = 'flex';
        updateStatus('ready', 'Ready');
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        output.textContent = `Error: ${errorMessage}`;
        output.className = 'output-area error';
        actions.style.display = 'none';
        updateStatus('error', 'Error');
    }
}

async function saveBuiltProfile() {
    if (!lastBuiltProfile) return;
    const name = prompt('Profile name:', lastBuiltProfile.voiceName) || lastBuiltProfile.voiceName;
    const description = prompt('Description (optional):') || undefined;
    const version = prompt('Version:', '1.0.0') || '1.0.0';
    
    try {
        await apiCall('profiles', 'POST', {
            profile: lastBuiltProfile,
            metadata: {
                name,
                description,
                version,
                isDefault: false
            }
        });
        updateStatus('success', 'Profile saved!');
        loadLibraryProfiles();
        loadProfilesToSelect();
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        updateStatus('error', `Error: ${errorMessage}`);
    }
}

// Testing
async function handleRunTests() {
    const suiteType = document.getElementById('testSuiteSelect').value;
    const output = document.getElementById('testOutput');
    const progressContainer = document.getElementById('testProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    output.textContent = '';
    output.className = 'output-area';
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Initializing tests...';
    updateStatus('loading', 'Running Tests...');

    let progressInterval;
    try {
        let progress = 0;
        progressInterval = setInterval(() => {
            progress += 10;
            progressFill.style.width = `${Math.min(progress, 90)}%`;
        }, 200);

        const result = await apiCall('run-tests', 'POST', { suiteType });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        progressText.textContent = 'Tests completed!';

        testResults.push({
            timestamp: new Date().toISOString(),
            suite: suiteType,
            result: result.result
        });

        displayTestResults(result.result, output);

        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 2000);

        updateStatus('ready', 'Ready');
        
        if (currentTestingTab === 'results') {
            displayAllResults();
        }
    } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        progressContainer.style.display = 'none';
        const errorMessage = getErrorMessage(error);
        output.textContent = `Error: ${errorMessage}`;
        output.className = 'output-area error';
        updateStatus('error', 'Error');
    }
}

function displayTestResults(result, container) {
    if (!result) {
        container.innerHTML = '<p class="empty-state">No test results available</p>';
        container.className = 'output-area error';
        return;
    }
    
    const summary = result.summary || {};
    const testItems = Array.isArray(result.results) ? result.results : [];
    let html = `<h3>Test Suite: ${escapeHtml(result.suiteName || 'Unknown')}</h3>`;
    html += `<p><strong>Total Tests:</strong> ${Number(summary.total || 0)}</p>`;
    html += `<p><strong>Passed:</strong> ${Number(summary.passed || 0)}</p>`;
    html += `<p><strong>Failed:</strong> ${Number(summary.failed || 0)}</p>`;
    html += `<p><strong>Pass Rate:</strong> ${Number(summary.passRate || 0).toFixed(1)}%</p>`;

    if (!testItems.length) {
        html += '<p class="empty-state">No test results to display</p>';
        container.innerHTML = html;
        container.className = 'output-area';
        return;
    }

    testItems.forEach(testResult => {
        html += `<div class="test-result">`;
        html += `<h3>${escapeHtml(testResult.testCaseName || 'Unnamed test')}</h3>`;
        html += `<p>${testResult.passed ? 'Passed' : 'Failed'} in ${Number(testResult.duration || 0)}ms</p>`;

        if (testResult.variantResults && Array.isArray(testResult.variantResults)) {
            html += `<div class="comparison-result">`;
            testResult.variantResults.forEach((variant, index) => {
                if (index < 2) {
                    const isWinner = testResult.comparison?.winner === variant.variantId;
                    html += `<div class="variant-result ${isWinner ? 'winner' : ''}">`;
                    html += `<h4>${escapeHtml(variant.variantName || `Variant ${index + 1}`)} ${isWinner ? '🏆' : ''}</h4>`;
                    html += `<div class="metrics">`;
                    if (variant.metrics && typeof variant.metrics === 'object') {
                        Object.entries(variant.metrics).forEach(([key, value]) => {
                            html += `<div class="metric">`;
                            html += `<div class="metric-label">${key}</div>`;
                            html += `<div class="metric-value">${typeof value === 'number' ? value.toFixed(2) : value}</div>`;
                            html += `</div>`;
                        });
                    }
                    html += `</div>`; // Close metrics div
                    html += `</div>`; // Close variant-result div - each variant (index < 2) is now in its own separate container
                }
            });
            html += `</div>`;
        }

        html += `</div>`;
    });

    container.innerHTML = html;
    container.className = 'output-area success';
}

function displayAllResults() {
    const container = document.querySelector('#testingResults .results-container') || 
                      document.querySelector('#testing .results-container') ||
                      document.getElementById('resultsContainer');
    if (!container) return;
    
    container.innerHTML = '<p class="empty-state">Loading test history...</p>';
    apiCall('test-results', 'GET')
        .then((response) => {
            const records = Array.isArray(response.results) ? response.results : [];
            if (!records.length) {
                container.innerHTML = '<p class="empty-state">No test results yet. Run tests to see results here.</p>';
                return;
            }

            let html = '';
            records.forEach((record, index) => {
                html += `<div class="test-result">`;
                html += `<h3>Test Run ${index + 1}</h3>`;
                html += `<p><strong>Suite:</strong> ${escapeHtml(record.suiteName || record.suiteType || 'unknown')}</p>`;
                html += `<p><strong>Time:</strong> ${new Date(record.createdAt).toLocaleString()}</p>`;
                html += `<p><strong>Total Tests:</strong> ${Number(record.summary?.total || 0)}</p>`;
                html += `<p><strong>Passed:</strong> ${Number(record.summary?.passed || 0)}</p>`;
                html += `<p><strong>Failed:</strong> ${Number(record.summary?.failed || 0)}</p>`;
                html += `</div>`;
            });
            container.innerHTML = html;
        })
        .catch((error) => {
            container.innerHTML = `<p class="empty-state">Could not load test history: ${escapeHtml(getErrorMessage(error))}</p>`;
        });
}

// Utility Functions
function clearAllInputs() {
    document.getElementById('unifiedAnalyzeInput').value = '';
    document.getElementById('unifiedGenerateInput').value = '';
    document.getElementById('unifiedAnalysisOutput').textContent = '';
    document.getElementById('unifiedGenerateOutput').textContent = '';
    document.getElementById('analysisActions').style.display = 'none';
    document.getElementById('generateActions').style.display = 'none';
}

function loadFromStorage() {
    switchSection('library');
}

function filterSamples(query) {
    // Simple client-side filtering - could be enhanced
    const items = document.querySelectorAll('#librarySamplesList .library-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
    });
}

function filterPrinciples(query) {
    const items = document.querySelectorAll('#libraryPrinciplesList .library-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
    });
}

// Setup processing mode handlers (case method)
function setupProcessingModeHandlers() {
    const processingMode = getElement('processingMode');
    const processingModeContent = getElement('processingModeContent');
    
    [processingMode, processingModeContent].forEach(modeSelect => {
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                const isContent = e.target.id === 'processingModeContent';
                updateProcessingOptions(mode, isContent);
            });
            // Initialize on load
            updateProcessingOptions(modeSelect.value, modeSelect.id === 'processingModeContent');
        }
    });
    
    // Panning checkbox handlers
    const enablePanning = getElement('enablePanning');
    const enablePanningContent = getElement('enablePanningContent');
    
    if (enablePanning) {
        enablePanning.addEventListener('change', (e) => {
            const panningProfileSelect = getElement('panningProfileSelect');
            if (panningProfileSelect) {
                panningProfileSelect.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
    
    if (enablePanningContent) {
        enablePanningContent.addEventListener('change', (e) => {
            const panningProfileSelect = getElement('panningProfileSelectContent');
            if (panningProfileSelect) {
                panningProfileSelect.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
    
    // Profile creation checkbox handlers
    const enableProfileCreation = getElement('enableProfileCreation');
    const enableProfileCreationContent = getElement('enableProfileCreationContent');
    
    if (enableProfileCreation) {
        enableProfileCreation.addEventListener('change', (e) => {
            const profileNamingOptions = getElement('profileNamingOptions');
            if (profileNamingOptions) {
                profileNamingOptions.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
    
    if (enableProfileCreationContent) {
        enableProfileCreationContent.addEventListener('change', (e) => {
            const profileNamingOptions = getElement('profileNamingOptionsContent');
            if (profileNamingOptions) {
                profileNamingOptions.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
}

function updateProcessingOptions(mode, isContent) {
    const prefix = isContent ? 'Content' : '';
    const panningOptions = getElement(`panningOptions${prefix}`);
    const profileCreationOptions = getElement(`profileCreationOptions${prefix}`);
    const vectorizationOptions = getElement(`vectorizationOptions${prefix}`);
    
    // Show/hide options based on mode
    switch(mode) {
        case 'basic':
            if (panningOptions) panningOptions.style.display = 'none';
            if (profileCreationOptions) profileCreationOptions.style.display = 'none';
            if (vectorizationOptions) vectorizationOptions.style.display = 'block';
            break;
        case 'vectorized':
            if (panningOptions) panningOptions.style.display = 'none';
            if (profileCreationOptions) profileCreationOptions.style.display = 'none';
            if (vectorizationOptions) vectorizationOptions.style.display = 'block';
            break;
        case 'panned':
            if (panningOptions) panningOptions.style.display = 'block';
            if (profileCreationOptions) profileCreationOptions.style.display = 'none';
            if (vectorizationOptions) vectorizationOptions.style.display = 'block';
            // Auto-enable panning for this mode
            const enablePanning = getElement(`enablePanning${prefix}`);
            if (enablePanning) enablePanning.checked = true;
            const panningProfileSelect = getElement(`panningProfileSelect${prefix}`);
            if (panningProfileSelect) panningProfileSelect.style.display = 'block';
            break;
        case 'profiles':
            if (panningOptions) panningOptions.style.display = 'block';
            if (profileCreationOptions) profileCreationOptions.style.display = 'block';
            if (vectorizationOptions) vectorizationOptions.style.display = 'block';
            // Auto-enable both for this mode
            if (enablePanning) enablePanning.checked = true;
            if (panningProfileSelect) panningProfileSelect.style.display = 'block';
            const enableProfileCreation = getElement(`enableProfileCreation${prefix}`);
            if (enableProfileCreation) enableProfileCreation.checked = true;
            const profileNamingOptions = getElement(`profileNamingOptions${prefix}`);
            if (profileNamingOptions) profileNamingOptions.style.display = 'block';
            break;
    }
}

async function loadPanningProfiles() {
    try {
        const result = await apiCall('profiles', 'GET');
        const panningProfile = getElement('panningProfile');
        const panningProfileContent = getElement('panningProfileContent');
        
        const profiles = result && result.profiles ? result.profiles.map(normalizeProfileMeta).filter(Boolean) : [];
        
        [panningProfile, panningProfileContent].forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Select Profile...</option>';
                profiles.forEach(profile => {
                    const option = document.createElement('option');
                    option.value = profile.id || '';
                    option.textContent = `${profile.name || 'Unnamed Profile'}${profile.isDefault ? ' - default' : ''}`;
                    select.appendChild(option);
                });
                if (getActiveProfileId() && Array.from(select.options || []).some(option => option.value === getActiveProfileId())) {
                    select.value = getActiveProfileId();
                }
            }
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Failed to load profiles for panning:', errorMessage, error);
    }
}

// Document Upload Handlers
async function handleDocumentUpload() {
    const fileInput = document.getElementById('documentUpload');
    const statusDiv = document.getElementById('documentUploadStatus');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        statusDiv.textContent = 'Please select a file to upload.';
        statusDiv.className = 'output-area error';
        statusDiv.style.display = 'block';
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', document.getElementById('documentCategory').value || 'document');
    formData.append('tags', document.getElementById('documentTags').value || '');
    formData.append('autoStore', document.getElementById('documentAutoStore').checked);
    
    // Get processing options
    const processingOptions = getProcessingOptions(false);
    
    // Handle FormData - convert objects to JSON strings, send voiceProfileId instead of voiceProfile
    if (processingOptions.vectorize !== undefined) {
        formData.append('vectorize', processingOptions.vectorize);
    }
    if (processingOptions.pan !== undefined) {
        formData.append('pan', processingOptions.pan);
    }
    if (processingOptions.voiceProfileId) {
        formData.append('voiceProfileId', processingOptions.voiceProfileId);
    }
    if (processingOptions.createProfiles !== undefined) {
        formData.append('createProfiles', processingOptions.createProfiles);
    }
    if (processingOptions.profileOptions && Object.keys(processingOptions.profileOptions).length > 0) {
        formData.append('profileOptions', JSON.stringify(processingOptions.profileOptions));
    }

    statusDiv.textContent = 'Uploading and processing document...';
    statusDiv.className = 'output-area';
    statusDiv.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/api/documents/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            const processed = result.processed;
            let html = '<h4>Document Processed Successfully!</h4>';
            html += `<p><strong>File:</strong> ${processed.document.filename}</p>`;
            html += `<p><strong>Type:</strong> ${processed.document.fileType}</p>`;
            html += `<p><strong>Words:</strong> ${processed.document.metadata.words}</p>`;
            
            // Vectorization results
            if (processed.documentVector) {
                html += `<h4>📊 Vectorization Results:</h4>`;
                html += `<p><strong>Vector ID:</strong> ${processed.documentVector.id}</p>`;
                html += `<p><strong>Vector Size:</strong> ${processed.documentVector.vector.length} dimensions</p>`;
            }
            
            html += `<h4>Shredder Results:</h4>`;
            html += `<p><strong>Total Truths:</strong> ${processed.shredderAnalysis.summary.totalTruths}</p>`;
            html += `<p><strong>Facts:</strong> ${processed.shredderAnalysis.summary.factCount}</p>`;
            html += `<p><strong>Definitions:</strong> ${processed.shredderAnalysis.summary.definitionCount}</p>`;
            
            // Panning results
            if (processed.pannedResults) {
                html += `<h4>⛏️ Panning Results:</h4>`;
                html += `<p><strong>Gold Truths (Kept):</strong> ${processed.pannedResults.statistics.kept}</p>`;
                html += `<p><strong>Discarded:</strong> ${processed.pannedResults.statistics.discarded}</p>`;
                html += `<p><strong>Average Relevance Score:</strong> ${(processed.pannedResults.statistics.averageScore * 100).toFixed(1)}%</p>`;
                html += `<p><strong>Threshold:</strong> ${(processed.pannedResults.statistics.threshold * 100).toFixed(0)}%</p>`;
            }
            
            html += `<h4>Storage Results:</h4>`;
            html += `<p><strong>Samples Added:</strong> ${processed.storageResults.samplesAdded}</p>`;
            html += `<p><strong>Principles Added:</strong> ${processed.storageResults.principlesAdded}</p>`;
            html += `<p><strong>Relationships Added:</strong> ${processed.storageResults.relationshipsAdded}</p>`;
            
            // Profile creation results
            if (processed.topicProfile) {
                html += `<h4>📋 Topic Profile Created:</h4>`;
                html += `<p><strong>Name:</strong> ${processed.topicProfile.voiceName}</p>`;
                html += `<p><strong>Version:</strong> ${processed.topicProfile.version}</p>`;
            }
            
            if (processed.wholeTopicProfile) {
                html += `<h4>📋 Whole Topic Profile Created:</h4>`;
                html += `<p><strong>Name:</strong> ${processed.wholeTopicProfile.voiceName}</p>`;
                html += `<p><strong>Version:</strong> ${processed.wholeTopicProfile.version}</p>`;
            }
            
            statusDiv.innerHTML = html;
            statusDiv.className = 'output-area success';
            
            // Refresh library if on library tab
            if (currentSection === 'library' && currentLibraryTab === 'principles') {
                loadLibraryPrinciples();
            }
            if (currentSection === 'library' && currentLibraryTab === 'profiles') {
                loadLibraryProfiles();
            }
        } else {
            throw new Error(result.error || 'Failed to process document');
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        statusDiv.textContent = `Error: ${errorMessage}`;
        statusDiv.className = 'output-area error';
    }
}

function getProcessingOptions(isContent) {
    const prefix = isContent ? 'Content' : '';
    const processingMode = getElement(`processingMode${prefix}`);
    const mode = processingMode ? processingMode.value : 'vectorized';
    
    const options = {
        vectorize: mode !== 'basic',
        pan: false,
        voiceProfile: null,
        createProfiles: false,
        profileOptions: {}
    };
    
    // Get panning options
    if (mode === 'panned' || mode === 'profiles') {
        const enablePanning = getElement(`enablePanning${prefix}`);
        if (enablePanning && enablePanning.checked) {
            options.pan = true;
            const panningProfile = getElement(`panningProfile${prefix}`);
            if (panningProfile && panningProfile.value) {
                // We need to fetch the full profile, but for now we'll send the ID
                // The backend will need to handle fetching the profile
                options.voiceProfileId = panningProfile.value;
            }
        }
    }
    
    // Get profile creation options
    if (mode === 'profiles') {
        const enableProfileCreation = getElement(`enableProfileCreation${prefix}`);
        if (enableProfileCreation && enableProfileCreation.checked) {
            options.createProfiles = true;
            const topicName = getElement(`topicProfileName${prefix}`);
            const wholeTopicName = getElement(`wholeTopicProfileName${prefix}`);
            if (topicName && topicName.value) {
                options.profileOptions.topicName = topicName.value;
            }
            if (wholeTopicName && wholeTopicName.value) {
                options.profileOptions.wholeTopicName = wholeTopicName.value;
            }
        }
    }
    
    return options;
}

async function handleFolderUpload() {
    const folderInput = document.getElementById('folderUpload');
    const statusDiv = document.getElementById('folderUploadStatus');
    
    if (!folderInput.files || folderInput.files.length === 0) {
        statusDiv.textContent = 'Please select a folder to upload.';
        statusDiv.className = 'output-area error';
        statusDiv.style.display = 'block';
        return;
    }

    const files = Array.from(folderInput.files);
    const formData = new FormData();
    
    // Add all files to FormData
    files.forEach(file => {
        formData.append('documents', file);
    });
    
    formData.append('category', document.getElementById('documentCategory').value || 'document');
    formData.append('tags', document.getElementById('documentTags').value || '');
    formData.append('autoStore', document.getElementById('documentAutoStore').checked);
    
    // Get processing options (use same options as single file upload)
    const processingOptions = getProcessingOptions(false);
    
    // Handle FormData - convert objects to JSON strings, send voiceProfileId instead of voiceProfile
    if (processingOptions.vectorize !== undefined) {
        formData.append('vectorize', processingOptions.vectorize);
    }
    if (processingOptions.pan !== undefined) {
        formData.append('pan', processingOptions.pan);
    }
    if (processingOptions.voiceProfileId) {
        formData.append('voiceProfileId', processingOptions.voiceProfileId);
    }
    if (processingOptions.createProfiles !== undefined) {
        formData.append('createProfiles', processingOptions.createProfiles);
    }
    if (processingOptions.profileOptions && Object.keys(processingOptions.profileOptions).length > 0) {
        formData.append('profileOptions', JSON.stringify(processingOptions.profileOptions));
    }

    // Warn about large folders
    if (files.length > 1000) {
        const proceed = confirm(`You are about to process ${files.length} files. This may take a long time and use significant resources. Continue?`);
        if (!proceed) {
            statusDiv.style.display = 'none';
            return;
        }
    }

    statusDiv.innerHTML = `<p>Processing ${files.length} file(s)... This may take a while for large folders.</p><div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>`;
    statusDiv.className = 'output-area';
    statusDiv.style.display = 'block';

    try {
        const response = await fetch('/api/documents/upload-folder', {
            method: 'POST',
            body: formData,
            // Increase timeout for large uploads
            signal: AbortSignal.timeout(600000) // 10 minutes
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 500));
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Check if it's an HTML error page
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                throw new Error(`Server returned HTML error page (status ${response.status}). This usually means the request was too large or the route wasn't found. Try processing fewer files at once (max 1000 recommended).`);
            }
            
            throw new Error(`Server returned ${response.status}: ${response.statusText}. Expected JSON but got ${contentType}`);
        }

        const result = await response.json();

        if (result.success) {
            const { totals, summary } = result;
            let html = `<div class="success-message">`;
            html += `<h4>✅ Folder Processing Complete!</h4>`;
            html += `<p><strong>Files Processed:</strong> ${totals.filesProcessed}</p>`;
            html += `<p><strong>Total Truths Extracted:</strong> ${totals.totalTruths}</p>`;
            html += `<p><strong>Samples Added:</strong> ${totals.totalSamples}</p>`;
            html += `<p><strong>Principles Added:</strong> ${totals.totalPrinciples}</p>`;
            html += `<p><strong>Relationships Added:</strong> ${totals.totalRelationships}</p>`;
            html += `</div>`;
            
            // Show file-by-file results
            if (summary && summary.length > 0) {
                html += `<details style="margin-top: 1rem;"><summary>File Details</summary><ul style="margin-top: 0.5rem; max-height: 300px; overflow-y: auto;">`;
                summary.forEach((file, idx) => {
                    html += `<li style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 0.25rem;">`;
                    html += `<strong>${file.filename}</strong> (${file.fileType}) - ${file.words} words, ${file.truths} truths, ${file.principlesAdded} principles`;
                    html += `</li>`;
                });
                html += `</ul></details>`;
            }
            
            statusDiv.innerHTML = html;
            statusDiv.className = 'output-area success';
            
            // Refresh storage displays if on library tab
            if (currentSection === 'library') {
                if (currentLibraryTab === 'samples') {
                    loadLibrarySamples();
                } else if (currentLibraryTab === 'principles') {
                    loadLibraryPrinciples();
                }
            }
        } else {
            statusDiv.textContent = `Error: ${result.error}`;
            statusDiv.className = 'output-area error';
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        statusDiv.textContent = `Error uploading folder: ${errorMessage}`;
        statusDiv.className = 'output-area error';
    }
}

async function handleDocumentProcess() {
    const content = document.getElementById('documentContent').value;
    const filename = document.getElementById('documentFilename').value || 'untitled.txt';
    const fileType = document.getElementById('documentFileType').value;
    const statusDiv = document.getElementById('documentProcessStatus');

    if (!content.trim()) {
        statusDiv.textContent = 'Please enter document content.';
        statusDiv.className = 'output-area error';
        statusDiv.style.display = 'block';
        return;
    }

    statusDiv.textContent = 'Processing document...';
    statusDiv.className = 'output-area';
    statusDiv.style.display = 'block';

    try {
        // Get processing options
        const processingOptions = getProcessingOptions(true);
        
        const requestData = {
            content,
            filename,
            fileType,
            category: document.getElementById('documentCategory').value || 'document',
            tags: document.getElementById('documentTags').value.split(',').map(t => t.trim()).filter(Boolean),
            autoStore: document.getElementById('documentAutoStore').checked,
            ...processingOptions
        };
        
        // If panning is enabled, we need to fetch the profile first
        if (processingOptions.pan && processingOptions.voiceProfileId) {
            try {
                const profileResult = await apiCall(`profiles/${processingOptions.voiceProfileId}`, 'GET');
                if (profileResult && profileResult.profile) {
                    requestData.voiceProfile = profileResult.profile;
                }
                delete requestData.voiceProfileId;
            } catch (error) {
                const errorMessage = getErrorMessage(error);
                console.warn('Failed to load profile for panning:', errorMessage, error);
            }
        }

        const result = await apiCall('documents/process', 'POST', requestData);

        if (result.success) {
            const processed = result.processed;
            let html = '<h4>Document Processed Successfully!</h4>';
            html += `<p><strong>File:</strong> ${processed.document.filename}</p>`;
            html += `<p><strong>Words:</strong> ${processed.document.metadata.words}</p>`;
            
            // Vectorization results
            if (processed.documentVector) {
                html += `<h4>📊 Vectorization Results:</h4>`;
                html += `<p><strong>Vector ID:</strong> ${processed.documentVector.id}</p>`;
                html += `<p><strong>Vector Size:</strong> ${processed.documentVector.vector.length} dimensions</p>`;
            }
            
            html += `<h4>Shredder Results:</h4>`;
            html += `<p><strong>Total Truths:</strong> ${processed.shredderAnalysis.summary.totalTruths}</p>`;
            html += `<p><strong>Facts:</strong> ${processed.shredderAnalysis.summary.factCount}</p>`;
            html += `<p><strong>Definitions:</strong> ${processed.shredderAnalysis.summary.definitionCount}</p>`;
            
            // Panning results
            if (processed.pannedResults) {
                html += `<h4>⛏️ Panning Results:</h4>`;
                html += `<p><strong>Gold Truths (Kept):</strong> ${processed.pannedResults.statistics.kept}</p>`;
                html += `<p><strong>Discarded:</strong> ${processed.pannedResults.statistics.discarded}</p>`;
                html += `<p><strong>Average Relevance Score:</strong> ${(processed.pannedResults.statistics.averageScore * 100).toFixed(1)}%</p>`;
            }
            
            html += `<h4>Storage Results:</h4>`;
            html += `<p><strong>Samples Added:</strong> ${processed.storageResults.samplesAdded}</p>`;
            html += `<p><strong>Principles Added:</strong> ${processed.storageResults.principlesAdded}</p>`;
            html += `<p><strong>Relationships Added:</strong> ${processed.storageResults.relationshipsAdded}</p>`;
            
            // Profile creation results
            if (processed.topicProfile) {
                html += `<h4>📋 Topic Profile Created:</h4>`;
                html += `<p><strong>Name:</strong> ${processed.topicProfile.voiceName}</p>`;
            }
            
            if (processed.wholeTopicProfile) {
                html += `<h4>📋 Whole Topic Profile Created:</h4>`;
                html += `<p><strong>Name:</strong> ${processed.wholeTopicProfile.voiceName}</p>`;
            }
            
            statusDiv.innerHTML = html;
            statusDiv.className = 'output-area success';
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        statusDiv.textContent = `Error: ${errorMessage}`;
        statusDiv.className = 'output-area error';
    }
}

// Topology Functions
function initializeTopology() {
    const canvas = document.getElementById('topologyCanvas');
    if (!canvas) return;

    // Initialize 3D visualization if Three.js is available
    if (typeof THREE !== 'undefined' && typeof Topology3D !== 'undefined') {
        if (!topology3D) {
            topology3D = new Topology3D('topologyCanvas');
        }
        applyTopologySensitivity(topologySensitivity, { persist: false });
        topology3D.loadData('all');
        updateTopologyInfo();
    } else {
        document.getElementById('topologyInfo').innerHTML = 
            '<p class="error">Three.js not loaded. Please check your internet connection.</p>';
    }
}

function clampTopologySensitivity(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 50;
    return Math.max(10, Math.min(100, Math.round(numeric)));
}

function updateTopologySensitivityLabel(value) {
    const label = document.getElementById('topologySensitivityValue');
    if (label) {
        label.textContent = `${clampTopologySensitivity(value)}%`;
    }
}

function applyTopologySensitivity(value, { persist = true } = {}) {
    const clamped = clampTopologySensitivity(value);
    topologySensitivity = clamped;
    updateTopologySensitivityLabel(clamped);

    const input = document.getElementById('topologySensitivity');
    if (input && Number(input.value) !== clamped) {
        input.value = String(clamped);
    }

    if (persist) {
        localStorage.setItem(TOPOLOGY_SENSITIVITY_KEY, String(clamped));
    }
    if (topology3D && typeof topology3D.setInteractionSensitivity === 'function') {
        topology3D.setInteractionSensitivity(clamped);
    }
}

async function loadTopologyProfiles() {
    try {
        const result = await apiCall('profiles');
        const select = document.getElementById('topologyProfile');
        select.innerHTML = '<option value="">All Profiles</option>';
        
        if (result && result.profiles && Array.isArray(result.profiles)) {
            result.profiles.map(normalizeProfileMeta).filter(Boolean).forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.id || '';
                option.textContent = `${profile.name || 'Unnamed Profile'}${profile.isDefault ? ' - default' : ''}`;
                select.appendChild(option);
            });
            if (getActiveProfileId() && Array.from(select.options || []).some(option => option.value === getActiveProfileId())) {
                select.value = getActiveProfileId();
            }
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Failed to load profiles:', errorMessage, error);
    }
}

async function updateTopologyInfo() {
    try {
        const result = await apiCall('topology/principles');
        const infoDiv = document.getElementById('topologyInfo');
        
        if (result.success) {
            infoDiv.innerHTML = `
                <p><strong>Total Principles:</strong> ${result.total}</p>
                <p><strong>Connections:</strong> ${result.connections.length}</p>
                <p>Use the sensitivity slider for control feel and Reset Camera to re-center instantly.</p>
            `;
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Failed to update topology info:', errorMessage, error);
    }
}

// Markov Chain Analysis UI
function initializeMarkovAnalysisUI() {
    if (!window.markovTracker) return;
    
    // Register all functions for tracking (functions are already defined at this point)
    const functionNames = [
        { name: 'initializeNavigation', context: { category: 'initialization' } },
        { name: 'switchSection', context: { category: 'navigation' } },
        { name: 'initializeSidebarPanels', context: { category: 'initialization' } },
        { name: 'initializeEventListeners', context: { category: 'initialization' } },
        { name: 'apiCall', context: { category: 'api' } },
        { name: 'checkHealth', context: { category: 'api' } },
        { name: 'updateStatus', context: { category: 'ui' } },
        { name: 'handleUnifiedAnalyze', context: { category: 'analysis' } },
        { name: 'handleUnifiedGenerate', context: { category: 'generation' } },
        { name: 'saveAnalysisToStorage', context: { category: 'storage' } },
        { name: 'addAnalysisPrinciple', context: { category: 'storage' } },
        { name: 'saveGeneratedToStorage', context: { category: 'storage' } },
        { name: 'extrapolateGenerated', context: { category: 'generation' } },
        { name: 'validateGenerated', context: { category: 'validation' } },
        { name: 'loadRecentSamples', context: { category: 'storage' } },
        { name: 'loadRecentPrinciples', context: { category: 'storage' } },
        { name: 'loadProfilesToSelect', context: { category: 'profiles' } },
        { name: 'quickAddSample', context: { category: 'storage' } },
        { name: 'quickAddPrinciple', context: { category: 'storage' } },
        { name: 'loadLibrarySamples', context: { category: 'library' } },
        { name: 'loadLibraryPrinciples', context: { category: 'library' } },
        { name: 'loadLibraryProfiles', context: { category: 'library' } },
        { name: 'loadLibraryDefaultProfile', context: { category: 'library' } },
        { name: 'libraryAddSample', context: { category: 'library' } },
        { name: 'libraryAddPrinciple', context: { category: 'library' } },
        { name: 'handleLibraryBuildProfile', context: { category: 'profiles' } },
        { name: 'saveBuiltProfile', context: { category: 'profiles' } },
        { name: 'handleRunTests', context: { category: 'testing' } },
        { name: 'displayTestResults', context: { category: 'testing' } },
        { name: 'displayAllResults', context: { category: 'testing' } },
        { name: 'debugFromMarkovChain', context: { category: 'testing' } },
        { name: 'extrapolateIssuesFromChain', context: { category: 'testing' } },
        { name: 'clearAllInputs', context: { category: 'ui' } },
        { name: 'loadFromStorage', context: { category: 'navigation' } },
        { name: 'filterSamples', context: { category: 'ui' } },
        { name: 'filterPrinciples', context: { category: 'ui' } },
        { name: 'handleDocumentUpload', context: { category: 'documents' } },
        { name: 'handleFolderUpload', context: { category: 'documents' } },
        { name: 'handleDocumentProcess', context: { category: 'documents' } },
        { name: 'initializeTopology', context: { category: 'topology' } },
        { name: 'loadTopologyProfiles', context: { category: 'topology' } },
        { name: 'updateTopologyInfo', context: { category: 'topology' } }
    ];

    // Register all functions
    functionNames.forEach(({ name, context }) => {
        if (typeof window[name] === 'function') {
            window.markovTracker.registerFunction(name, context);
            // Wrap the function
            const originalFn = window[name];
            window[name] = wrapFunction(name, originalFn, context);
        }
    });

    // Add Markov Chain Analysis section to Testing tab
    addMarkovAnalysisSection();
}

function addMarkovAnalysisSection() {
    // Add a new tab for Markov Chain Analysis in the Testing section
    const testingTabs = document.querySelector('.testing-tabs');
    if (testingTabs && !document.getElementById('markovAnalysisTab')) {
        const markovTab = document.createElement('button');
        markovTab.className = 'testing-tab';
        markovTab.id = 'markovAnalysisTab';
        markovTab.dataset.testing = 'markov';
        markovTab.textContent = 'Markov Chain Analysis';
        markovTab.addEventListener('click', () => {
            document.querySelectorAll('.testing-tab').forEach(t => t.classList.remove('active'));
            markovTab.classList.add('active');
            currentTestingTab = 'markov';
            document.querySelectorAll('.testing-content').forEach(c => c.classList.remove('active'));
            const markovContent = document.getElementById('testingMarkov');
            if (markovContent) {
                markovContent.classList.add('active');
                displayMarkovAnalysis();
            }
        });
        testingTabs.appendChild(markovTab);
    }

    // Add content section
    const testingSection = document.getElementById('testing');
    if (testingSection && !document.getElementById('testingMarkov')) {
        const markovContent = document.createElement('div');
        markovContent.className = 'testing-content';
        markovContent.id = 'testingMarkov';
        markovContent.innerHTML = `
            <div class="card">
                <h3>Markov Chain Analysis</h3>
                <div style="margin-bottom: 1rem;">
                    <button id="refreshMarkovAnalysis" class="btn btn-primary">Refresh Analysis</button>
                    <button id="debugFromMarkov" class="btn btn-primary">Debug from Chain</button>
                    <button id="extrapolateIssues" class="btn btn-secondary">Extrapolate Issues</button>
                    <button id="exportMarkovData" class="btn btn-secondary">Export Data</button>
                    <button id="resetMarkovData" class="btn btn-secondary">Reset Tracker</button>
                </div>
                <div id="markovAnalysisOutput" class="output-area"></div>
                <div id="markovDebugOutput" class="output-area" style="display: none; margin-top: 1rem;"></div>
            </div>
        `;
        testingSection.querySelector('.content-area')?.appendChild(markovContent) || 
        testingSection.appendChild(markovContent);

        // Add event listeners
        document.getElementById('refreshMarkovAnalysis')?.addEventListener('click', displayMarkovAnalysis);
        document.getElementById('debugFromMarkov')?.addEventListener('click', debugFromMarkovChain);
        document.getElementById('extrapolateIssues')?.addEventListener('click', extrapolateIssuesFromChain);
        document.getElementById('exportMarkovData')?.addEventListener('click', exportMarkovData);
        document.getElementById('resetMarkovData')?.addEventListener('click', resetMarkovData);
    }
}

function displayMarkovAnalysis() {
    if (!window.markovTracker) {
        document.getElementById('markovAnalysisOutput').innerHTML = 
            '<p class="error">Markov tracker not available</p>';
        return;
    }

    const report = window.markovTracker.getAnalysisReport();
    const output = document.getElementById('markovAnalysisOutput');
    
    let html = '<div style="font-family: monospace; line-height: 1.6;">';
    
    // Summary
    html += '<h4>📊 Summary</h4>';
    html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
    html += `<p><strong>Total Functions:</strong> ${report.summary.totalFunctions}</p>`;
    html += `<p><strong>Used Functions:</strong> ${report.summary.usedFunctions}</p>`;
    html += `<p><strong>Unused Functions:</strong> ${report.summary.unusedFunctions}</p>`;
    html += `<p><strong>Total Calls:</strong> ${report.summary.totalCalls}</p>`;
    html += `<p><strong>Total Errors:</strong> ${report.summary.totalErrors}</p>`;
    html += `<p><strong>Error Rate:</strong> ${report.summary.errorRate}</p>`;
    html += `<p><strong>Chain Length:</strong> ${report.summary.chainLength}</p>`;
    html += `<p><strong>Session Duration:</strong> ${report.summary.sessionDuration}</p>`;
    html += '</div>';

    // Unused Functions
    if (report.unusedFunctions.length > 0) {
        html += '<h4>⚠️ Unused Functions</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
        html += '<ul>';
        report.unusedFunctions.forEach(func => {
            html += `<li><strong>${func.name}</strong> (registered: ${new Date(func.registered).toLocaleTimeString()})</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    // Functions with Errors
    if (report.functionsWithErrors.length > 0) {
        html += '<h4>❌ Functions with Errors</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><th>Function</th><th>Calls</th><th>Errors</th><th>Error Rate</th></tr>';
        report.functionsWithErrors.forEach(func => {
            html += `<tr>
                <td>${func.name}</td>
                <td>${func.callCount}</td>
                <td>${func.errorCount}</td>
                <td>${func.errorRate.toFixed(2)}%</td>
            </tr>`;
        });
        html += '</table>';
        html += '</div>';
    }

    // Common Transitions
    if (report.commonTransitions.length > 0) {
        html += '<h4>🔄 Common Transitions</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; max-height: 300px; overflow-y: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><th>From</th><th>To</th><th>Count</th><th>Pages</th></tr>';
        report.commonTransitions.forEach(trans => {
            html += `<tr>
                <td>${trans.from}</td>
                <td>${trans.to}</td>
                <td>${trans.count}</td>
                <td>${trans.pages.join(', ') || 'N/A'}</td>
            </tr>`;
        });
        html += '</table>';
        html += '</div>';
    }

    // Error-Prone Transitions
    if (report.errorProneTransitions.length > 0) {
        html += '<h4>🚨 Error-Prone Transitions</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
        html += '<ul>';
        report.errorProneTransitions.forEach(trans => {
            html += `<li><strong>${trans.transition}</strong> - ${trans.errorCount} error(s)</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    // Recent Errors
    if (report.recentErrors.length > 0) {
        html += '<h4>📋 Recent Errors</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; max-height: 300px; overflow-y: auto;">';
        report.recentErrors.forEach(error => {
            html += `<div style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: 0.25rem;">`;
            html += `<strong>${error.functionName}</strong> - ${error.error}<br>`;
            html += `<small>Page: ${error.page} | Time: ${new Date(error.timestamp).toLocaleTimeString()}</small>`;
            html += `</div>`;
        });
        html += '</div>';
    }

    html += '</div>';
    output.innerHTML = html;
    output.className = 'output-area success';
}

function exportMarkovData() {
    if (!window.markovTracker) {
        updateStatus('warning', 'Markov tracker not available');
        return;
    }

    const data = window.markovTracker.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markov-chain-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function resetMarkovData() {
    if (!window.markovTracker) {
        updateStatus('warning', 'Markov tracker not available');
        return;
    }

    if (confirm('Are you sure you want to reset all Markov chain tracking data? This cannot be undone.')) {
        window.markovTracker.reset();
        displayMarkovAnalysis();
        updateStatus('success', 'Markov chain tracker has been reset.');
    }
}

// Debug functions using Markov Chain Analysis
async function debugFromMarkovChain() {
    if (!window.markovTracker) {
        updateStatus('warning', 'Markov tracker not available');
        return;
    }

    const debugOutput = document.getElementById('markovDebugOutput');
    debugOutput.style.display = 'block';
    debugOutput.textContent = 'Analyzing Markov chain for debugging insights...';
    debugOutput.className = 'output-area';

    try {
        const report = window.markovTracker.getAnalysisReport();
        const data = window.markovTracker.exportData();
        
        // Analyze the chain to identify issues
        const debugInsights = analyzeChainForDebugging(report, data);
        
        // Generate debug report
        let html = '<div style="font-family: monospace; line-height: 1.6;">';
        html += '<h4>🔍 Debug Analysis from Markov Chain</h4>';
        
        // Critical Issues
        if (debugInsights.criticalIssues.length > 0) {
            html += '<h4 style="color: #ef4444;">🚨 Critical Issues</h4>';
            html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
            debugInsights.criticalIssues.forEach(issue => {
                html += `<div style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-left: 3px solid #ef4444; border-radius: 0.25rem;">`;
                html += `<strong>${issue.title}</strong><br>`;
                html += `<small>${issue.description}</small><br>`;
                if (issue.suggestion) {
                    html += `<em style="color: #10b981;">💡 Suggestion: ${issue.suggestion}</em>`;
                }
                html += `</div>`;
            });
            html += '</div>';
        }

        // Warning Issues
        if (debugInsights.warnings.length > 0) {
            html += '<h4 style="color: #f59e0b;">⚠️ Warnings</h4>';
            html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
            debugInsights.warnings.forEach(warning => {
                html += `<div style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-left: 3px solid #f59e0b; border-radius: 0.25rem;">`;
                html += `<strong>${warning.title}</strong><br>`;
                html += `<small>${warning.description}</small>`;
                if (warning.suggestion) {
                    html += `<br><em style="color: #10b981;">💡 Suggestion: ${warning.suggestion}</em>`;
                }
                html += `</div>`;
            });
            html += '</div>';
        }

        // Performance Insights
        if (debugInsights.performance.length > 0) {
            html += '<h4>⚡ Performance Insights</h4>';
            html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
            debugInsights.performance.forEach(perf => {
                html += `<div style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: 0.25rem;">`;
                html += `<strong>${perf.title}</strong><br>`;
                html += `<small>${perf.description}</small>`;
                html += `</div>`;
            });
            html += '</div>';
        }

        // Suggested Fixes
        if (debugInsights.suggestedFixes.length > 0) {
            html += '<h4 style="color: #10b981;">✅ Suggested Fixes</h4>';
            html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
            debugInsights.suggestedFixes.forEach(fix => {
                html += `<div style="margin-bottom: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-left: 3px solid #10b981; border-radius: 0.25rem;">`;
                html += `<strong>${fix.function}</strong><br>`;
                html += `<small>${fix.description}</small><br>`;
                html += `<code style="background: var(--bg-primary); padding: 0.25rem; border-radius: 0.25rem; display: block; margin-top: 0.5rem;">${fix.code}</code>`;
                html += `</div>`;
            });
            html += '</div>';
        }

        // Usage Patterns
        html += '<h4>📊 Usage Patterns</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
        html += `<p><strong>Most Used Functions:</strong> ${debugInsights.mostUsed.join(', ')}</p>`;
        html += `<p><strong>Least Used Functions:</strong> ${debugInsights.leastUsed.join(', ')}</p>`;
        html += `<p><strong>Error-Prone Paths:</strong> ${debugInsights.errorPaths.length > 0 ? debugInsights.errorPaths.join(', ') : 'None detected'}</p>`;
        html += '</div>';

        html += '</div>';
        debugOutput.innerHTML = html;
        debugOutput.className = 'output-area success';
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        debugOutput.textContent = `Error during debug analysis: ${errorMessage}`;
        debugOutput.className = 'output-area error';
    }
}

function analyzeChainForDebugging(report, data) {
    const insights = {
        criticalIssues: [],
        warnings: [],
        performance: [],
        suggestedFixes: [],
        mostUsed: [],
        leastUsed: [],
        errorPaths: []
    };

    // Analyze error rate
    const errorRate = parseFloat(report.summary.errorRate);
    if (errorRate > 10) {
        insights.criticalIssues.push({
            title: 'High Error Rate',
            description: `Error rate is ${errorRate}%, which is above acceptable threshold (10%)`,
            suggestion: 'Review error-prone functions and add better error handling'
        });
    } else if (errorRate > 5) {
        insights.warnings.push({
            title: 'Elevated Error Rate',
            description: `Error rate is ${errorRate}%, which is above optimal (5%)`,
            suggestion: 'Monitor error patterns and improve error handling'
        });
    }

    // Analyze functions with errors
    if (report.functionsWithErrors.length > 0) {
        const highErrorFunctions = report.functionsWithErrors.filter(f => f.errorRate > 20);
        if (highErrorFunctions.length > 0) {
            insights.criticalIssues.push({
                title: 'Functions with High Error Rates',
                description: `${highErrorFunctions.length} function(s) have error rates above 20%`,
                suggestion: `Focus on: ${highErrorFunctions.map(f => f.name).join(', ')}`
            });

            // Generate suggested fixes
            highErrorFunctions.forEach(func => {
                insights.suggestedFixes.push({
                    function: func.name,
                    description: `This function has a ${func.errorRate.toFixed(2)}% error rate`,
                    code: `// Add try-catch and better error handling to ${func.name}\ntry {\n  // Function implementation\n} catch (error) {\n  console.error('Error in ${func.name}:', error);\n  // Handle error appropriately\n}`
                });
            });
        }
    }

    // Analyze unused functions
    if (report.unusedFunctions.length > 0) {
        insights.warnings.push({
            title: 'Unused Functions Detected',
            description: `${report.unusedFunctions.length} function(s) are registered but never called`,
            suggestion: `Consider removing or testing: ${report.unusedFunctions.slice(0, 5).map(f => f.name).join(', ')}`
        });
    }

    // Analyze error-prone transitions
    if (report.errorProneTransitions.length > 0) {
        report.errorProneTransitions.slice(0, 5).forEach(trans => {
            insights.errorPaths.push(trans.transition);
            insights.warnings.push({
                title: 'Error-Prone Transition',
                description: `Transition "${trans.transition}" has ${trans.errorCount} error(s)`,
                suggestion: 'Review the code path between these states'
            });
        });
    }

    // Analyze most/least used functions
    const functionUsage = Object.entries(data.functionUsage || {})
        .map(([name, usage]) => ({ name, count: (usage && usage.count) || 0 }))
        .sort((a, b) => b.count - a.count);
    
    insights.mostUsed = functionUsage.slice(0, 5).map(f => `${f.name} (${f.count})`);
    insights.leastUsed = functionUsage.slice(-5).filter(f => f.count > 0).map(f => `${f.name} (${f.count})`);

    // Performance insights
    const sessionDuration = parseInt(report.summary.sessionDuration);
    const callsPerSecond = report.summary.totalCalls / (sessionDuration || 1);
    
    if (callsPerSecond > 10) {
        insights.performance.push({
            title: 'High Function Call Rate',
            description: `${callsPerSecond.toFixed(2)} function calls per second detected`,
        });
    }

    // Check for long chains
    if (report.summary.chainLength > 1000) {
        insights.warnings.push({
            title: 'Long Chain Detected',
            description: `Chain length is ${report.summary.chainLength}, which may indicate performance issues`,
            suggestion: 'Consider optimizing frequently called functions'
        });
    }

    return insights;
}

async function extrapolateIssuesFromChain() {
    if (!window.markovTracker) {
        updateStatus('warning', 'Markov tracker not available');
        return;
    }

    const debugOutput = document.getElementById('markovDebugOutput');
    debugOutput.style.display = 'block';
    debugOutput.textContent = 'Extrapolating potential issues from Markov chain patterns...';
    debugOutput.className = 'output-area';

    try {
        const report = window.markovTracker.getAnalysisReport();
        const data = window.markovTracker.exportData();
        
        // Use the extrapolate API to generate debug suggestions
        const chainSummary = generateChainSummaryForExtrapolation(report, data);
        
        const result = await apiCall('extrapolate', 'POST', {
            text: chainSummary,
            options: { 
                expansionLevel: 'moderate',
                addExamples: true,
                addDetails: true
            }
        });

        let html = '<div style="font-family: monospace; line-height: 1.6;">';
        html += '<h4>🔮 Extrapolated Debug Insights</h4>';
        html += '<div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">';
        html += '<p><strong>Based on Markov Chain Analysis:</strong></p>';
        html += `<div style="white-space: pre-wrap; background: var(--bg-secondary); padding: 1rem; border-radius: 0.25rem; margin-top: 0.5rem;">${result.text}</div>`;
        html += '</div>';
        html += '</div>';

        debugOutput.innerHTML = html;
        debugOutput.className = 'output-area success';
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        debugOutput.textContent = `Error during extrapolation: ${errorMessage}`;
        debugOutput.className = 'output-area error';
    }
}

function generateChainSummaryForExtrapolation(report, data) {
    let summary = 'Markov Chain Analysis Summary for Voice Framework Debugging:\n\n';
    
    summary += `Total Functions: ${report.summary.totalFunctions}\n`;
    summary += `Used Functions: ${report.summary.usedFunctions}\n`;
    summary += `Unused Functions: ${report.summary.unusedFunctions}\n`;
    summary += `Total Function Calls: ${report.summary.totalCalls}\n`;
    summary += `Total Errors: ${report.summary.totalErrors}\n`;
    summary += `Error Rate: ${report.summary.errorRate}\n`;
    summary += `Chain Length: ${report.summary.chainLength}\n\n`;
    
    if (report.functionsWithErrors.length > 0) {
        summary += 'Functions with Errors:\n';
        report.functionsWithErrors.slice(0, 5).forEach(func => {
            summary += `- ${func.name}: ${func.errorCount} errors (${func.errorRate.toFixed(2)}% error rate)\n`;
        });
        summary += '\n';
    }
    
    if (report.errorProneTransitions.length > 0) {
        summary += 'Error-Prone Transitions:\n';
        report.errorProneTransitions.slice(0, 5).forEach(trans => {
            summary += `- ${trans.transition}: ${trans.errorCount} error(s)\n`;
        });
        summary += '\n';
    }
    
    if (report.unusedFunctions.length > 0) {
        summary += 'Unused Functions:\n';
        report.unusedFunctions.slice(0, 5).forEach(func => {
            summary += `- ${func.name}\n`;
        });
        summary += '\n';
    }
    
    summary += 'Based on this analysis, extrapolate potential issues, suggest debugging strategies, and recommend fixes for the voice framework website.';
    
    return summary;
}

// Resource Management Functions
async function handleResourceUpload() {
    const fileInput = document.getElementById('resourceUploadFile');
    const industrySelect = document.getElementById('resourceIndustry');
    const topicInput = document.getElementById('resourceTopic');
    const titleInput = document.getElementById('resourceTitle');
    const autoProcessCheckbox = document.getElementById('resourceAutoProcess');
    const autoPublishCheckbox = document.getElementById('resourceAutoPublish');
    const statusDiv = document.getElementById('resourceUploadStatus');
    const uploadBtn = document.getElementById('uploadResourceBtn');

    if (!isAuthenticated()) {
        if (statusDiv) {
            statusDiv.textContent = 'Sign in from the Session panel before uploading resources.';
            statusDiv.className = 'output-area error';
            statusDiv.style.display = 'block';
        }
        updateStatus('error', 'Authentication required for resource upload');
        return;
    }
    
    if (!fileInput?.files?.[0]) {
        if (statusDiv) {
            statusDiv.textContent = 'Please select a file to upload.';
            statusDiv.className = 'output-area error';
            statusDiv.style.display = 'block';
        }
        return;
    }
    
    if (!industrySelect?.value || !topicInput?.value) {
        if (statusDiv) {
            statusDiv.textContent = 'Please provide industry and topic.';
            statusDiv.className = 'output-area error';
            statusDiv.style.display = 'block';
        }
        return;
    }
    
    if (statusDiv) {
        statusDiv.textContent = 'Uploading and processing resource...';
        statusDiv.className = 'output-area';
        statusDiv.style.display = 'block';
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
    }
    
    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('industry', industrySelect.value);
        formData.append('topic', topicInput.value);
        if (titleInput?.value) formData.append('title', titleInput.value);
        formData.append('autoProcess', autoProcessCheckbox?.checked ? 'true' : 'false');
        formData.append('autoPublish', autoPublishCheckbox?.checked ? 'true' : 'false');
        if (getActiveProfileId()) formData.append('profileId', getActiveProfileId());
        
        const response = await fetch(`${API_BASE}/api/resources/upload`, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                ...getAuthHeaders(),
            },
            body: formData
        });
        
        const responseText = await response.text();
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = { error: parseServerErrorText(responseText) };
        }
        
        if (response.ok && data.success) {
            if (statusDiv) {
                const voiceScore = data.voiceValidation?.overallMatch || data.voiceValidation?.score || 0;
                const scoreText = voiceScore ? ` Voice Score: ${Math.round(voiceScore * 100)}%` : '';
                statusDiv.textContent = `Resource uploaded successfully!${scoreText}`;
                statusDiv.className = 'output-area success';
            }
            // Reset form
            fileInput.value = '';
            industrySelect.value = '';
            topicInput.value = '';
            if (titleInput) titleInput.value = '';
            if (autoProcessCheckbox) autoProcessCheckbox.checked = true;
            if (autoPublishCheckbox) autoPublishCheckbox.checked = false;
            // Reload resources list
            await loadResourcesList();
        } else {
            if (statusDiv) {
                statusDiv.textContent = data.error || 'Upload failed';
                statusDiv.className = 'output-area error';
            }
        }
    } catch (error) {
        if (statusDiv) {
            const errorMessage = getErrorMessage(error);
        statusDiv.textContent = `Error: ${errorMessage}`;
            statusDiv.className = 'output-area error';
        }
    } finally {
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload & Process Resource';
        }
    }
}

async function handleResourceProcess() {
    const contentTextarea = document.getElementById('resourceContent');
    const industrySelect = document.getElementById('resourceContentIndustry');
    const topicInput = document.getElementById('resourceContentTopic');
    const titleInput = document.getElementById('resourceContentTitle');
    const autoPublishCheckbox = document.getElementById('resourceContentAutoPublish');
    const statusDiv = document.getElementById('resourceProcessStatus');
    const processBtn = document.getElementById('processResourceContentBtn');

    if (!isAuthenticated()) {
        if (statusDiv) {
            statusDiv.textContent = 'Sign in from the Session panel before processing resources.';
            statusDiv.className = 'output-area error';
            statusDiv.style.display = 'block';
        }
        updateStatus('error', 'Authentication required for resource processing');
        return;
    }
    
    if (!contentTextarea?.value.trim()) {
        if (statusDiv) {
            statusDiv.textContent = 'Please enter content to process.';
            statusDiv.className = 'output-area error';
            statusDiv.style.display = 'block';
        }
        return;
    }
    
    if (!industrySelect?.value || !topicInput?.value) {
        if (statusDiv) {
            statusDiv.textContent = 'Please provide industry and topic.';
            statusDiv.className = 'output-area error';
            statusDiv.style.display = 'block';
        }
        return;
    }
    
    if (statusDiv) {
        statusDiv.textContent = 'Processing content...';
        statusDiv.className = 'output-area';
        statusDiv.style.display = 'block';
    }
    
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
    }
    
    try {
        const result = await apiCall('resources/process', 'POST', {
            content: contentTextarea.value,
            industry: industrySelect.value,
            topic: topicInput.value,
            title: titleInput?.value || undefined,
            autoPublish: autoPublishCheckbox?.checked || false,
            profileId: getActiveProfileId()
        });
        
        if (result.success) {
            if (statusDiv) {
                const voiceScore = result.voiceValidation?.overallMatch || result.voiceValidation?.score || 0;
                const scoreText = voiceScore ? ` Voice Score: ${Math.round(voiceScore * 100)}%` : '';
                statusDiv.textContent = `Content processed successfully!${scoreText}`;
                statusDiv.className = 'output-area success';
            }
            // Reset form
            contentTextarea.value = '';
            industrySelect.value = '';
            topicInput.value = '';
            if (titleInput) titleInput.value = '';
            if (autoPublishCheckbox) autoPublishCheckbox.checked = false;
            // Reload resources list
            await loadResourcesList();
        } else {
            if (statusDiv) {
                statusDiv.textContent = result.error || 'Processing failed';
                statusDiv.className = 'output-area error';
            }
        }
    } catch (error) {
        if (statusDiv) {
            const errorMessage = getErrorMessage(error);
        statusDiv.textContent = `Error: ${errorMessage}`;
            statusDiv.className = 'output-area error';
        }
    } finally {
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.textContent = 'Process Content';
        }
    }
}

async function loadResourcesList() {
    const listDiv = document.getElementById('resourcesList');
    if (!listDiv) return;

    if (!isAuthenticated()) {
        listDiv.innerHTML = '<p class="resource-list-empty">Sign in from the Session panel to view and manage resources.</p>';
        return;
    }

    listDiv.innerHTML = '<p class="resource-list-empty">Loading resources…</p>';

    try {
        const result = await apiCall('resources');

        if (result.success && result.resources) {
            if (result.resources.length === 0) {
                listDiv.innerHTML = '<p class="resource-list-empty">No resources yet. Add one using the form on the left.</p>';
                return;
            }

            listDiv.innerHTML = result.resources.map(resource => {
                const voiceScore = resource.metadata?.voiceScore ?? 0;
                const scoreClass = voiceScore >= 0.8 ? 'high' : voiceScore >= 0.6 ? 'mid' : 'low';
                const scoreText = voiceScore ? `${Math.round(voiceScore * 100)}%` : '—';
                const title = escapeHtml(resource.title);
                const industry = escapeHtml(resource.industry);
                const topic = escapeHtml(resource.topic);
                const desc = escapeHtml((resource.description || '').slice(0, 300));
                const searchText = `${title} ${industry} ${topic}`.toLowerCase();
                const profileInfo = escapeHtml(resource.metadata?.profileId || 'none');
                const canPublish = resource.status !== 'published';
                const canArchive = resource.status !== 'archived';

                return `
                    <article class="resource-card" data-resource-id="${escapeHtml(resource.id)}" data-resource-search="${searchText}">
                        <div class="resource-card__bar resource-card__bar--${resource.status}" aria-hidden="true"></div>
                        <div class="resource-card__head" role="button" tabindex="0" aria-expanded="false" aria-controls="resource-body-${escapeHtml(resource.id)}" id="resource-head-${escapeHtml(resource.id)}">
                            <h4 class="resource-card__title">${title}</h4>
                            <span class="badge badge-${resource.status}">${resource.status}</span>
                            <button type="button" class="resource-card__chevron" aria-label="Expand or collapse"></button>
                        </div>
                        <div class="resource-card__body" id="resource-body-${escapeHtml(resource.id)}" role="region" aria-labelledby="resource-head-${escapeHtml(resource.id)}" hidden>
                            <div class="resource-card__tags">
                                <span class="resource-card__tag">${industry}</span>
                                <span class="resource-card__tag">${topic}</span>
                                <span class="resource-card__score resource-card__score--${scoreClass}">Voice ${scoreText}</span>
                            </div>
                            <p class="resource-card__description">${desc}${(resource.description || '').length > 300 ? '…' : ''}</p>
                            <p class="resource-card__description">Profile: ${profileInfo}</p>
                            <div class="output-actions" style="display:flex;">
                                <button type="button" class="btn btn-secondary btn-sm" data-resource-action="improve" data-resource-id="${escapeHtml(resource.id)}">Improve</button>
                                <button type="button" class="btn btn-secondary btn-sm" data-resource-action="publish" data-resource-id="${escapeHtml(resource.id)}" ${canPublish ? '' : 'disabled'}>Publish</button>
                                <button type="button" class="btn btn-secondary btn-sm" data-resource-action="archive" data-resource-id="${escapeHtml(resource.id)}" ${canArchive ? '' : 'disabled'}>Archive</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } else {
            listDiv.innerHTML = '<p class="resource-list-empty">Failed to load resources.</p>';
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        listDiv.innerHTML = `<p class="resource-list-empty">Error: ${errorMessage}</p>`;
    }
}

function onResourceActionClick(e) {
    const actionBtn = e.target.closest('[data-resource-action]');
    if (!actionBtn) return;
    e.preventDefault();
    e.stopPropagation();

    const action = actionBtn.getAttribute('data-resource-action');
    const resourceId = actionBtn.getAttribute('data-resource-id');
    if (!action || !resourceId) return;
    handleResourceLifecycleAction(action, resourceId, actionBtn);
}

async function handleResourceLifecycleAction(action, resourceId, actionBtn) {
    if (!isAuthenticated()) {
        updateStatus('error', 'Sign in before running resource lifecycle actions');
        return;
    }

    const originalLabel = actionBtn.textContent;
    actionBtn.disabled = true;
    actionBtn.textContent = 'Working...';

    try {
        if (action === 'improve') {
            await apiCall(`resources/${encodeURIComponent(resourceId)}/improve`, 'POST', {
                options: { expansionLevel: 'moderate', addExamples: true },
                profileId: getActiveProfileId()
            });
            updateStatus('success', 'Resource improved');
        } else if (action === 'publish') {
            await apiCall(`resources/${encodeURIComponent(resourceId)}`, 'PUT', {
                status: 'published',
                profileId: getActiveProfileId()
            });
            updateStatus('success', 'Resource published');
        } else if (action === 'archive') {
            await apiCall(`resources/${encodeURIComponent(resourceId)}`, 'PUT', {
                status: 'archived',
                profileId: getActiveProfileId()
            });
            updateStatus('success', 'Resource archived');
        } else {
            throw new Error(`Unsupported action: ${action}`);
        }

        await loadResourcesList();
        await refreshCorpusPanel();
    } catch (error) {
        updateStatus('error', `Resource action failed: ${getErrorMessage(error)}`);
    } finally {
        actionBtn.textContent = originalLabel;
        actionBtn.disabled = false;
    }
}

function onResourceCardHeadClick(e) {
    const listDiv = document.getElementById('resourcesList');
    if (!listDiv) return;
    const head = e.target.closest('.resource-card__head');
    if (!head || !listDiv.contains(head)) return;
    const card = head.closest('.resource-card');
    if (!card) return;
    const body = card.querySelector('.resource-card__body');
    const isExpanded = card.classList.toggle('is-expanded');
    head.setAttribute('aria-expanded', isExpanded);
    if (body) {
        body.hidden = !isExpanded;
    }
}

function onResourceCardHeadKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest('.resource-card__head');
    if (!head) return;
    e.preventDefault();
    head.click();
}

function filterResourceList() {
    const listDiv = document.getElementById('resourcesList');
    const searchInput = document.getElementById('resourceSearch');
    if (!listDiv || !searchInput) return;
    const q = (searchInput.value || '').trim().toLowerCase();
    const cards = listDiv.querySelectorAll('.resource-card');
    cards.forEach(card => {
        const searchData = (card.getAttribute('data-resource-search') || '').toLowerCase();
        const show = !q || searchData.includes(q);
        card.style.display = show ? '' : 'none';
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
