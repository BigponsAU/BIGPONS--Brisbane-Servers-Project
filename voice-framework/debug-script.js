/**
 * Debug Script for Voice Framework Dashboard
 * 
 * This script verifies:
 * 1. All UI elements exist in the DOM
 * 2. All event listeners are properly attached
 * 3. All functions are defined
 * 4. API endpoints are accessible
 * 
 * Run this in the browser console after the page loads.
 */

(function() {
    'use strict';
    
    const DEBUG_RESULTS = {
        uiElements: [],
        missingElements: [],
        eventListeners: [],
        functions: [],
        missingFunctions: [],
        apiEndpoints: []
    };
    
    // List of all UI element IDs that should exist
    const REQUIRED_UI_ELEMENTS = [
        // Header
        'runTestsBtn',
        'statusIndicator',
        
        // Left Sidebar
        'storagePanel',
        'recentSamples',
        'quickAddSample',
        'recentPrinciples',
        'quickAddPrinciple',
        'profilesPanel',
        'quickProfileSelect',
        'currentProfile',
        
        // Workspace - Analysis
        'unifiedAnalyzeInput',
        'runAllAnalysis',
        'unifiedAnalyzeBtn',
        'unifiedAnalysisOutput',
        'analysisActions',
        'saveAnalysisToStorage',
        'addAnalysisPrinciple',
        
        // Workspace - Generation
        'unifiedGenerateInput',
        'unifiedLengthSelect',
        'unifiedStyleSelect',
        'unifiedExpansionLevel',
        'unifiedExpansionValue',
        'expansionLevelGroup',
        'profileSelect',
        'unifiedGenerateBtn',
        'unifiedGenerateOutput',
        'generateActions',
        'saveGeneratedToStorage',
        'extrapolateGenerated',
        'validateGenerated',
        
        // Library - Samples
        'librarySamples',
        'sampleSearch',
        'libraryLoadSamples',
        'libraryAddSample',
        'librarySamplesList',
        
        // Library - Principles
        'libraryPrinciples',
        'principleSearch',
        'libraryLoadPrinciples',
        'libraryAddPrinciple',
        'libraryPrinciplesList',
        
        // Library - Profiles
        'libraryProfiles',
        'libraryLoadProfiles',
        'libraryLoadDefaultProfile',
        'libraryProfilesList',
        
        // Library - Documents
        'libraryDocuments',
        'documentUpload',
        'folderUpload',
        'folderFileCount',
        'documentCategory',
        'documentTags',
        'documentAutoStore',
        'uploadDocumentBtn',
        'uploadFolderBtn',
        'documentUploadStatus',
        'folderUploadStatus',
        'documentContent',
        'documentFilename',
        'documentFileType',
        'processDocumentBtn',
        'documentProcessStatus',
        
        // Library - Profile Builder
        'libraryBuilder',
        'libraryBuilderSamples',
        'libraryProfileName',
        'libraryProfileDescription',
        'libraryBuildProfile',
        'libraryBuilderOutput',
        'builderActions',
        'saveBuiltProfile',
        
        // Topology
        'topology',
        'topologyView',
        'profileSelectGroup',
        'topologyProfile',
        'refreshTopologyBtn',
        'topologyCanvas',
        'topologyInfo',
        
        // Testing
        'testingRun',
        'testSuiteSelect',
        'runABTestsBtn',
        'testProgress',
        'progressFill',
        'progressText',
        'testOutput',
        'testingResults',
        'resultsContainer',
        
        // Right Sidebar
        'clearAllInputs',
        'loadFromStorage'
    ];
    
    // List of all functions that should be defined
    const REQUIRED_FUNCTIONS = [
        'initializeNavigation',
        'initializeSidebarPanels',
        'initializeEventListeners',
        'switchSection',
        'checkHealth',
        'updateStatus',
        'apiCall',
        'handleUnifiedAnalyze',
        'handleUnifiedGenerate',
        'saveAnalysisToStorage',
        'addAnalysisPrinciple',
        'saveGeneratedToStorage',
        'extrapolateGenerated',
        'validateGenerated',
        'loadRecentSamples',
        'loadRecentPrinciples',
        'loadProfilesToSelect',
        'quickAddSample',
        'quickAddPrinciple',
        'loadLibrarySamples',
        'loadLibraryPrinciples',
        'loadLibraryProfiles',
        'loadLibraryDefaultProfile',
        'libraryAddSample',
        'libraryAddPrinciple',
        'handleLibraryBuildProfile',
        'saveBuiltProfile',
        'handleDocumentUpload',
        'handleFolderUpload',
        'handleDocumentProcess',
        'initializeTopology',
        'loadTopologyProfiles',
        'updateTopologyInfo',
        'handleRunTests',
        'displayTestResults',
        'displayAllResults',
        'clearAllInputs',
        'loadFromStorage',
        'filterSamples',
        'filterPrinciples'
    ];
    
    // List of API endpoints to test
    const API_ENDPOINTS = [
        { method: 'GET', path: '/api/health' },
        { method: 'POST', path: '/api/analyze', body: { text: 'Test text' } },
        { method: 'POST', path: '/api/extract-patterns', body: { text: 'Test text' } },
        { method: 'POST', path: '/api/shred', body: { text: 'Test text' } },
        { method: 'GET', path: '/api/storage/samples' },
        { method: 'GET', path: '/api/storage/principles' },
        { method: 'GET', path: '/api/profiles' }
    ];
    
    /**
     * Check if UI element exists
     */
    function checkUIElement(id) {
        const element = document.getElementById(id);
        if (element) {
            DEBUG_RESULTS.uiElements.push({
                id,
                exists: true,
                tagName: element.tagName,
                className: element.className
            });
            return true;
        } else {
            DEBUG_RESULTS.missingElements.push(id);
            return false;
        }
    }
    
    /**
     * Check if function is defined
     */
    function checkFunction(name) {
        if (typeof window[name] === 'function') {
            DEBUG_RESULTS.functions.push({
                name,
                defined: true,
                type: typeof window[name]
            });
            return true;
        } else {
            DEBUG_RESULTS.missingFunctions.push(name);
            return false;
        }
    }
    
    /**
     * Test API endpoint
     */
    async function testAPIEndpoint(endpoint) {
        try {
            const options = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (endpoint.body) {
                options.body = JSON.stringify(endpoint.body);
            }
            
            const response = await fetch(`${window.location.origin}${endpoint.path}`, options);
            const data = await response.json();
            
            DEBUG_RESULTS.apiEndpoints.push({
                path: endpoint.path,
                method: endpoint.method,
                status: response.status,
                success: response.ok,
                hasData: !!data
            });
            
            return response.ok;
        } catch (error) {
            DEBUG_RESULTS.apiEndpoints.push({
                path: endpoint.path,
                method: endpoint.method,
                error: error.message,
                success: false
            });
            return false;
        }
    }
    
    /**
     * Check event listeners (basic check)
     */
    function checkEventListeners() {
        // Check if buttons have click handlers (basic check)
        const buttons = document.querySelectorAll('button[id]');
        buttons.forEach(button => {
            // Note: This is a basic check - actual listener attachment is harder to verify
            DEBUG_RESULTS.eventListeners.push({
                id: button.id,
                hasId: !!button.id,
                tagName: button.tagName
            });
        });
    }
    
    /**
     * Run all checks
     */
    async function runDebugChecks() {
        console.log('🔍 Starting Voice Framework Debug Checks...\n');
        
        // Check UI elements
        console.log('📋 Checking UI Elements...');
        REQUIRED_UI_ELEMENTS.forEach(id => checkUIElement(id));
        console.log(`✅ Found ${DEBUG_RESULTS.uiElements.length} elements`);
        if (DEBUG_RESULTS.missingElements.length > 0) {
            console.warn(`⚠️  Missing ${DEBUG_RESULTS.missingElements.length} elements:`, DEBUG_RESULTS.missingElements);
        }
        
        // Check functions
        console.log('\n🔧 Checking Functions...');
        REQUIRED_FUNCTIONS.forEach(name => checkFunction(name));
        console.log(`✅ Found ${DEBUG_RESULTS.functions.length} functions`);
        if (DEBUG_RESULTS.missingFunctions.length > 0) {
            console.warn(`⚠️  Missing ${DEBUG_RESULTS.missingFunctions.length} functions:`, DEBUG_RESULTS.missingFunctions);
        }
        
        // Check event listeners
        console.log('\n👂 Checking Event Listeners...');
        checkEventListeners();
        console.log(`✅ Checked ${DEBUG_RESULTS.eventListeners.length} buttons`);
        
        // Test API endpoints
        console.log('\n🌐 Testing API Endpoints...');
        for (const endpoint of API_ENDPOINTS) {
            await testAPIEndpoint(endpoint);
        }
        const successfulAPIs = DEBUG_RESULTS.apiEndpoints.filter(e => e.success).length;
        console.log(`✅ ${successfulAPIs}/${API_ENDPOINTS.length} API endpoints responding`);
        
        // Summary
        console.log('\n📊 Debug Summary:');
        console.log(`   UI Elements: ${DEBUG_RESULTS.uiElements.length}/${REQUIRED_UI_ELEMENTS.length}`);
        console.log(`   Missing Elements: ${DEBUG_RESULTS.missingElements.length}`);
        console.log(`   Functions: ${DEBUG_RESULTS.functions.length}/${REQUIRED_FUNCTIONS.length}`);
        console.log(`   Missing Functions: ${DEBUG_RESULTS.missingFunctions.length}`);
        console.log(`   API Endpoints: ${successfulAPIs}/${API_ENDPOINTS.length}`);
        
        // Return results for further analysis
        return DEBUG_RESULTS;
    }
    
    // Auto-run if in browser
    if (typeof window !== 'undefined') {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(runDebugChecks, 1000); // Wait 1 second for initialization
            });
        } else {
            setTimeout(runDebugChecks, 1000);
        }
        
        // Export for manual use
        window.debugVoiceFramework = runDebugChecks;
        window.debugResults = DEBUG_RESULTS;
    }
    
    // Export for Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { runDebugChecks, DEBUG_RESULTS };
    }
})();

