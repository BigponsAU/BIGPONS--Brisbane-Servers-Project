/**
 * Markov Chain Tracker for UI Function Analysis
 * Tracks all UI function calls, transitions, errors, and usage patterns
 * Starting from home/initialization through all pages and interactions
 */

class MarkovChainTracker {
    constructor() {
        // State tracking
        this.currentState = 'home';
        this.previousState = null;
        this.chain = [];
        this.transitions = new Map(); // Map<from, Map<to, count>>
        this.functionRegistry = new Map(); // All registered functions
        this.functionUsage = new Map(); // Function call counts
        this.errorLog = []; // Error tracking
        this.pageTransitions = new Map(); // Page/section transitions
        this.startTime = Date.now();
        
        // Initialize with home state
        this.chain.push({
            state: 'home',
            timestamp: this.startTime,
            type: 'initialization',
            page: 'home'
        });
        
        // Error tracking
        this.errorCounts = new Map();
        this.errorTransitions = new Map();
        
        // Function metadata
        this.functionMetadata = new Map();
    }

    /**
     * Register a function for tracking
     */
    registerFunction(functionName, metadata = {}) {
        this.functionRegistry.set(functionName, {
            name: functionName,
            registered: Date.now(),
            callCount: 0,
            lastCalled: null,
            errors: 0,
            metadata: metadata
        });
        
        this.functionUsage.set(functionName, {
            count: 0,
            errors: 0,
            lastCall: null,
            transitions: []
        });
    }

    /**
     * Track a function call and transition
     */
    trackCall(functionName, context = {}) {
        const timestamp = Date.now();
        const page = context.page || this.getCurrentPage();
        
        // Update function usage
        if (this.functionUsage.has(functionName)) {
            const usage = this.functionUsage.get(functionName);
            usage.count++;
            usage.lastCall = timestamp;
            usage.transitions.push({
                from: this.currentState,
                to: functionName,
                timestamp,
                page
            });
        } else {
            // Auto-register if not registered
            this.registerFunction(functionName, context);
            const usage = this.functionUsage.get(functionName);
            usage.count = 1;
            usage.lastCall = timestamp;
        }

        // Update function registry
        if (this.functionRegistry.has(functionName)) {
            const func = this.functionRegistry.get(functionName);
            func.callCount++;
            func.lastCalled = timestamp;
        }

        // Track transition
        this.trackTransition(this.currentState, functionName, page);

        // Update chain
        this.chain.push({
            state: functionName,
            from: this.currentState,
            timestamp,
            type: 'function_call',
            page,
            context
        });

        // Update current state
        this.previousState = this.currentState;
        this.currentState = functionName;

        return this;
    }

    /**
     * Track a transition between states
     */
    trackTransition(from, to, page = null) {
        if (!this.transitions.has(from)) {
            this.transitions.set(from, new Map());
        }
        
        const fromTransitions = this.transitions.get(from);
        if (!fromTransitions.has(to)) {
            fromTransitions.set(to, {
                count: 0,
                pages: new Set(),
                lastTransition: null
            });
        }
        
        const transition = fromTransitions.get(to);
        transition.count++;
        transition.lastTransition = Date.now();
        if (page) {
            transition.pages.add(page);
        }
    }

    /**
     * Track page/section navigation
     */
    trackPageTransition(fromPage, toPage) {
        const key = `${fromPage}->${toPage}`;
        if (!this.pageTransitions.has(key)) {
            this.pageTransitions.set(key, {
                count: 0,
                firstTransition: Date.now(),
                lastTransition: Date.now()
            });
        }
        
        const transition = this.pageTransitions.get(key);
        transition.count++;
        transition.lastTransition = Date.now();

        // Track as state transition
        this.trackTransition(`page:${fromPage}`, `page:${toPage}`, toPage);
        this.currentState = `page:${toPage}`;
    }

    /**
     * Track an error
     */
    trackError(functionName, error, context = {}) {
        const timestamp = Date.now();
        const page = context.page || this.getCurrentPage();
        
        const errorEntry = {
            functionName,
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            timestamp,
            page,
            state: this.currentState,
            previousState: this.previousState,
            context
        };

        this.errorLog.push(errorEntry);

        // Update error counts
        if (!this.errorCounts.has(functionName)) {
            this.errorCounts.set(functionName, 0);
        }
        this.errorCounts.set(functionName, this.errorCounts.get(functionName) + 1);

        // Track error transition
        const errorKey = `${this.currentState}->error:${functionName}`;
        if (!this.errorTransitions.has(errorKey)) {
            this.errorTransitions.set(errorKey, {
                count: 0,
                errors: []
            });
        }
        const errorTransition = this.errorTransitions.get(errorKey);
        errorTransition.count++;
        errorTransition.errors.push(errorEntry);

        // Update function registry
        if (this.functionRegistry.has(functionName)) {
            this.functionRegistry.get(functionName).errors++;
        }
        if (this.functionUsage.has(functionName)) {
            this.functionUsage.get(functionName).errors++;
        }

        // Add to chain
        this.chain.push({
            state: `error:${functionName}`,
            from: this.currentState,
            timestamp,
            type: 'error',
            page,
            error: errorEntry
        });
    }

    /**
     * Get current page/section
     */
    getCurrentPage() {
        // Try to detect from DOM
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            return activeSection.id || 'unknown';
        }
        return 'home';
    }

    /**
     * Get unused functions (registered but never called)
     */
    getUnusedFunctions() {
        const unused = [];
        for (const [name, func] of this.functionRegistry.entries()) {
            if (func.callCount === 0) {
                unused.push({
                    name,
                    registered: func.registered,
                    metadata: func.metadata
                });
            }
        }
        return unused;
    }

    /**
     * Get functions with errors
     */
    getFunctionsWithErrors() {
        const withErrors = [];
        for (const [name, func] of this.functionRegistry.entries()) {
            if (func.errors > 0) {
                withErrors.push({
                    name,
                    callCount: func.callCount,
                    errorCount: func.errors,
                    errorRate: func.callCount > 0 ? (func.errors / func.callCount) * 100 : 100
                });
            }
        }
        return withErrors.sort((a, b) => b.errorCount - a.errorCount);
    }

    /**
     * Get transition matrix
     */
    getTransitionMatrix() {
        const matrix = {};
        const allStates = new Set();
        
        // Collect all states
        for (const from of this.transitions.keys()) {
            allStates.add(from);
            for (const to of this.transitions.get(from).keys()) {
                allStates.add(to);
            }
        }

        // Build matrix
        for (const from of allStates) {
            matrix[from] = {};
            for (const to of allStates) {
                if (this.transitions.has(from) && this.transitions.get(from).has(to)) {
                    const transition = this.transitions.get(from).get(to);
                    matrix[from][to] = {
                        count: transition.count,
                        probability: 0, // Will calculate below
                        pages: Array.from(transition.pages),
                        lastTransition: transition.lastTransition
                    };
                } else {
                    matrix[from][to] = {
                        count: 0,
                        probability: 0,
                        pages: [],
                        lastTransition: null
                    };
                }
            }
        }

        // Calculate probabilities
        for (const from in matrix) {
            const total = Object.values(matrix[from]).reduce((sum, t) => sum + t.count, 0);
            if (total > 0) {
                for (const to in matrix[from]) {
                    matrix[from][to].probability = matrix[from][to].count / total;
                }
            }
        }

        return matrix;
    }

    /**
     * Get analysis report
     */
    getAnalysisReport() {
        const unused = this.getUnusedFunctions();
        const withErrors = this.getFunctionsWithErrors();
        const totalFunctions = this.functionRegistry.size;
        const usedFunctions = totalFunctions - unused.length;
        const sessionDuration = Date.now() - this.startTime;
        
        // Calculate error rate
        const totalErrors = this.errorLog.length;
        const totalCalls = Array.from(this.functionUsage.values())
            .reduce((sum, u) => sum + u.count, 0);
        const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;

        // Get most common transitions
        const commonTransitions = [];
        for (const [from, toMap] of this.transitions.entries()) {
            for (const [to, transition] of toMap.entries()) {
                commonTransitions.push({
                    from,
                    to,
                    count: transition.count,
                    pages: Array.from(transition.pages)
                });
            }
        }
        commonTransitions.sort((a, b) => b.count - a.count);

        // Get error-prone transitions
        const errorProneTransitions = [];
        for (const [key, transition] of this.errorTransitions.entries()) {
            errorProneTransitions.push({
                transition: key,
                errorCount: transition.count,
                errors: transition.errors
            });
        }
        errorProneTransitions.sort((a, b) => b.errorCount - a.errorCount);

        return {
            summary: {
                totalFunctions,
                usedFunctions,
                unusedFunctions: unused.length,
                totalCalls,
                totalErrors,
                errorRate: errorRate.toFixed(2) + '%',
                sessionDuration: Math.round(sessionDuration / 1000) + 's',
                chainLength: this.chain.length,
                pageTransitions: this.pageTransitions.size
            },
            unusedFunctions: unused,
            functionsWithErrors: withErrors,
            commonTransitions: commonTransitions.slice(0, 20),
            errorProneTransitions: errorProneTransitions.slice(0, 10),
            recentErrors: this.errorLog.slice(-10),
            transitionMatrix: this.getTransitionMatrix()
        };
    }

    /**
     * Export chain data
     */
    exportData() {
        return {
            chain: this.chain,
            transitions: Object.fromEntries(
                Array.from(this.transitions.entries()).map(([from, toMap]) => [
                    from,
                    Object.fromEntries(
                        Array.from(toMap.entries()).map(([to, data]) => [
                            to,
                            {
                                count: data.count,
                                pages: Array.from(data.pages),
                                lastTransition: data.lastTransition
                            }
                        ])
                    )
                ])
            ),
            functionUsage: Object.fromEntries(this.functionUsage),
            errorLog: this.errorLog,
            pageTransitions: Object.fromEntries(this.pageTransitions),
            analysis: this.getAnalysisReport()
        };
    }

    /**
     * Clear all data
     */
    reset() {
        this.currentState = 'home';
        this.previousState = null;
        this.chain = [{
            state: 'home',
            timestamp: Date.now(),
            type: 'initialization',
            page: 'home'
        }];
        this.transitions.clear();
        this.errorLog = [];
        this.pageTransitions.clear();
        this.errorCounts.clear();
        this.errorTransitions.clear();
        this.startTime = Date.now();
        
        // Reset usage but keep registry
        for (const [name, usage] of this.functionUsage.entries()) {
            usage.count = 0;
            usage.errors = 0;
            usage.lastCall = null;
            usage.transitions = [];
        }
    }
}

// Create global instance
window.markovTracker = new MarkovChainTracker();

/**
 * Wrapper function to track function calls
 */
function trackFunctionCall(functionName, fn, context = {}) {
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

/**
 * Auto-track all functions in an object
 */
function trackObjectFunctions(obj, prefix = '') {
    const tracked = {};
    for (const key in obj) {
        if (typeof obj[key] === 'function') {
            const functionName = prefix ? `${prefix}.${key}` : key;
            window.markovTracker.registerFunction(functionName, {
                object: prefix || 'global',
                method: key
            });
            tracked[key] = trackFunctionCall(functionName, obj[key]);
        } else {
            tracked[key] = obj[key];
        }
    }
    return tracked;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MarkovChainTracker, trackFunctionCall, trackObjectFunctions };
}




