# UI Function Hierarchy

Complete visual hierarchy mapping UI elements → Functions → API Endpoints → Backend Services.

## Visual Tree Structure

```
Voice Framework Dashboard
│
├── HEADER
│   ├── #runTestsBtn
│   │   └── handleRunTests() [app.js:232]
│   │       └── POST /api/run-tests [server.ts:237]
│   │           └── TestRunner.run() [testing/test-runner.ts]
│   │
│   └── #statusIndicator
│       └── updateStatus() [app.js:337]
│           └── (Updated by various functions)
│
├── LEFT SIDEBAR
│   │
│   ├── Storage Panel
│   │   ├── #recentSamples
│   │   │   └── loadRecentSamples() [app.js:592]
│   │   │       └── GET /api/storage/samples [server.ts:328]
│   │   │           └── TextStorage.getSamples() [storage/text-storage.ts]
│   │   │
│   │   ├── #quickAddSample
│   │   │   └── quickAddSample() [app.js:672]
│   │   │       └── POST /api/storage/samples [server.ts:345]
│   │   │           └── TextStorage.addSample() [storage/text-storage.ts]
│   │   │
│   │   ├── #recentPrinciples
│   │   │   └── loadRecentPrinciples() [app.js:617]
│   │   │       └── GET /api/storage/principles [server.ts:369]
│   │   │           └── TextStorage.getPrinciples() [storage/text-storage.ts]
│   │   │
│   │   └── #quickAddPrinciple
│   │       └── quickAddPrinciple() [app.js:689]
│   │           └── POST /api/storage/principles [server.ts:385]
│   │               └── TextStorage.addPrinciple() [storage/text-storage.ts]
│   │
│   └── Profiles Panel
│       ├── #quickProfileSelect
│       │   └── loadProfilesToSelect() [app.js:642]
│       │       └── GET /api/profiles [server.ts:397]
│       │           └── ProfileManager.getAllProfiles() [storage/profile-manager.ts]
│       │
│       └── #currentProfile
│           └── (Display container, updated by loadProfilesToSelect)
│
├── MAIN NAVIGATION
│   ├── .nav-tab[data-section="workspace"]
│   │   └── switchSection('workspace') [app.js:126]
│   │
│   ├── .nav-tab[data-section="library"]
│   │   └── switchSection('library') [app.js:126]
│   │
│   ├── .nav-tab[data-section="topology"]
│   │   └── switchSection('topology') [app.js:126]
│   │       └── initializeTopology() [app.js:1316]
│   │
│   └── .nav-tab[data-section="testing"]
│       └── switchSection('testing') [app.js:126]
│
├── WORKSPACE SECTION
│   │
│   ├── Analysis Card
│   │   ├── #unifiedAnalyzeInput
│   │   │   └── (Input field, read by handleUnifiedAnalyze)
│   │   │
│   │   ├── .analysis-tab
│   │   │   └── (Sets currentAnalysisType) [app.js:80]
│   │   │
│   │   ├── #runAllAnalysis
│   │   │   └── (Checkbox, read by handleUnifiedAnalyze)
│   │   │
│   │   ├── #unifiedAnalyzeBtn
│   │   │   └── handleUnifiedAnalyze() [app.js:356]
│   │   │       ├── POST /api/analyze [server.ts:128]
│   │   │       │   └── ToneAnalyzer.analyzeText() [analyzers/tone-analyzer.ts]
│   │   │       │   └── ToneAnalyzer.compareToProfile() [analyzers/tone-analyzer.ts]
│   │   │       │
│   │   │       ├── POST /api/extract-patterns [server.ts:151]
│   │   │       │   └── PatternExtractor.extractPatterns() [analyzers/pattern-extractor.ts]
│   │   │       │
│   │   │       └── POST /api/shred [server.ts:282]
│   │   │           └── Shredder.shred() [analyzers/shredder.ts]
│   │   │
│   │   ├── #unifiedAnalysisOutput
│   │   │   └── (Display container)
│   │   │
│   │   ├── #saveAnalysisToStorage
│   │   │   └── saveAnalysisToStorage() [app.js:508]
│   │   │       └── POST /api/storage/samples [server.ts:345]
│   │   │           └── TextStorage.addSample() [storage/text-storage.ts]
│   │   │
│   │   └── #addAnalysisPrinciple
│   │       └── addAnalysisPrinciple() [app.js:527]
│   │           └── POST /api/storage/principles [server.ts:385]
│   │               └── TextStorage.addPrinciple() [storage/text-storage.ts]
│   │
│   └── Generation Card
│       ├── #unifiedGenerateInput
│       │   └── (Input field, read by handleUnifiedGenerate)
│       │
│       ├── input[name="genMode"]
│       │   └── (Radio buttons, read by handleUnifiedGenerate)
│       │
│       ├── #unifiedLengthSelect
│       │   └── (Select, read by handleUnifiedGenerate)
│       │
│       ├── #unifiedStyleSelect
│       │   └── (Select, read by handleUnifiedGenerate)
│       │
│       ├── #unifiedExpansionLevel
│       │   └── (Range input, updates #unifiedExpansionValue)
│       │
│       ├── #profileSelect
│       │   └── (Select, read by handleUnifiedGenerate)
│       │
│       ├── #unifiedGenerateBtn
│       │   └── handleUnifiedGenerate() [app.js:441]
│       │       ├── POST /api/generate [server.ts:172]
│       │       │   └── TextGenerator.generateText() [generators/text-generator.ts]
│       │       │
│       │       ├── POST /api/extrapolate [server.ts:193]
│       │       │   └── Extrapolator.extrapolate() [generators/extrapolator.ts]
│       │       │
│       │       └── POST /api/match-voice [server.ts:214]
│       │           ├── VoiceMatcher.scoreMatch() [generators/voice-matcher.ts]
│       │           └── VoiceMatcher.validateVoice() [generators/voice-matcher.ts]
│       │
│       ├── #unifiedGenerateOutput
│       │   └── (Display container)
│       │
│       ├── #saveGeneratedToStorage
│       │   └── saveGeneratedToStorage() [app.js:546]
│       │       └── POST /api/storage/samples [server.ts:345]
│       │           └── TextStorage.addSample() [storage/text-storage.ts]
│       │
│       ├── #extrapolateGenerated
│       │   └── extrapolateGenerated() [app.js:565]
│       │       └── handleUnifiedGenerate() [app.js:441]
│       │           └── (See #unifiedGenerateBtn above)
│       │
│       └── #validateGenerated
│           └── validateGenerated() [app.js:573]
│               └── POST /api/match-voice [server.ts:214]
│                   ├── VoiceMatcher.scoreMatch() [generators/voice-matcher.ts]
│                   └── VoiceMatcher.validateVoice() [generators/voice-matcher.ts]
│
├── LIBRARY SECTION
│   │
│   ├── Library Tabs
│   │   ├── .library-tab[data-library="samples"]
│   │   │   └── loadLibrarySamples() [app.js:707]
│   │   │       └── GET /api/storage/samples [server.ts:328]
│   │   │           └── TextStorage.getSamples() [storage/text-storage.ts]
│   │   │
│   │   ├── .library-tab[data-library="principles"]
│   │   │   └── loadLibraryPrinciples() [app.js:736]
│   │   │       └── GET /api/storage/principles [server.ts:369]
│   │   │           └── TextStorage.getPrinciples() [storage/text-storage.ts]
│   │   │
│   │   ├── .library-tab[data-library="profiles"]
│   │   │   └── loadLibraryProfiles() [app.js:764]
│   │   │       └── GET /api/profiles [server.ts:397]
│   │   │           └── ProfileManager.getAllProfiles() [storage/profile-manager.ts]
│   │   │
│   │   ├── .library-tab[data-library="documents"]
│   │   │   └── (Document upload UI)
│   │   │
│   │   └── .library-tab[data-library="builder"]
│   │       └── (Profile builder UI)
│   │
│   ├── Samples Tab
│   │   ├── #sampleSearch
│   │   │   └── filterSamples() [app.js:1086] (client-side)
│   │   │
│   │   ├── #libraryLoadSamples
│   │   │   └── loadLibrarySamples() [app.js:707]
│   │   │       └── GET /api/storage/samples [server.ts:328]
│   │   │           └── TextStorage.getSamples() [storage/text-storage.ts]
│   │   │
│   │   ├── #libraryAddSample
│   │   │   └── libraryAddSample() [app.js:813]
│   │   │       └── POST /api/storage/samples [server.ts:345]
│   │   │           └── TextStorage.addSample() [storage/text-storage.ts]
│   │   │
│   │   └── #librarySamplesList
│   │       └── (Display container)
│   │
│   ├── Principles Tab
│   │   ├── #principleSearch
│   │   │   └── filterPrinciples() [app.js:1095] (client-side)
│   │   │
│   │   ├── #libraryLoadPrinciples
│   │   │   └── loadLibraryPrinciples() [app.js:736]
│   │   │       └── GET /api/storage/principles [server.ts:369]
│   │   │           └── TextStorage.getPrinciples() [storage/text-storage.ts]
│   │   │
│   │   ├── #libraryAddPrinciple
│   │   │   └── libraryAddPrinciple() [app.js:830]
│   │   │       └── POST /api/storage/principles [server.ts:385]
│   │   │           └── TextStorage.addPrinciple() [storage/text-storage.ts]
│   │   │
│   │   └── #libraryPrinciplesList
│   │       └── (Display container)
│   │
│   ├── Profiles Tab
│   │   ├── #libraryLoadProfiles
│   │   │   └── loadLibraryProfiles() [app.js:764]
│   │   │       └── GET /api/profiles [server.ts:397]
│   │   │           └── ProfileManager.getAllProfiles() [storage/profile-manager.ts]
│   │   │
│   │   ├── #libraryLoadDefaultProfile
│   │   │   └── loadLibraryDefaultProfile() [app.js:794]
│   │   │       └── GET /api/profiles/default [server.ts:441]
│   │   │           └── ProfileManager.getDefaultProfile() [storage/profile-manager.ts]
│   │   │
│   │   └── #libraryProfilesList
│   │       └── (Display container)
│   │
│   ├── Documents Tab
│   │   ├── #documentUpload
│   │   │   └── handleDocumentUpload() [app.js:1104]
│   │   │       └── POST /api/documents/upload [server.ts:472]
│   │   │           └── DocumentProcessor.processDocument() [processors/document-processor.ts]
│   │   │               ├── DocumentParser.parse() [parsers/document-parser.ts]
│   │   │               ├── Shredder.shred() [analyzers/shredder.ts]
│   │   │               └── TextStorage.addSample() [storage/text-storage.ts]
│   │   │
│   │   ├── #folderUpload
│   │   │   └── handleFolderUpload() [app.js:1165]
│   │   │       └── POST /api/documents/upload-folder [server.ts:506]
│   │   │           └── DocumentProcessor.processDocuments() [processors/document-processor.ts]
│   │   │               └── (Processes multiple files)
│   │   │
│   │   ├── #processDocumentBtn
│   │   │   └── handleDocumentProcess() [app.js:1270]
│   │   │       └── POST /api/documents/process [server.ts:626]
│   │   │           └── DocumentProcessor.processContent() [processors/document-processor.ts]
│   │   │
│   │   └── (Status displays: #documentUploadStatus, #folderUploadStatus, #documentProcessStatus)
│   │
│   └── Profile Builder Tab
│       ├── #libraryBuilderSamples
│       │   └── (Textarea, read by handleLibraryBuildProfile)
│       │
│       ├── #libraryProfileName
│       │   └── (Input, read by handleLibraryBuildProfile)
│       │
│       ├── #libraryProfileDescription
│       │   └── (Textarea, read by handleLibraryBuildProfile)
│       │
│       ├── #libraryBuildProfile
│       │   └── handleLibraryBuildProfile() [app.js:848]
│       │       └── POST /api/profile-builder/build [server.ts:456]
│       │           └── ProfileBuilder.buildFromSamples() [builders/profile-builder.ts]
│       │               ├── ToneAnalyzer.analyzeText() [analyzers/tone-analyzer.ts]
│       │               ├── PatternExtractor.extractPatterns() [analyzers/pattern-extractor.ts]
│       │               └── (Builds VoiceProfile)
│       │
│       ├── #libraryBuilderOutput
│       │   └── (Display container)
│       │
│       └── #saveBuiltProfile
│           └── saveBuiltProfile() [app.js:914]
│               └── POST /api/profiles [server.ts:425]
│                   └── ProfileManager.createProfile() [storage/profile-manager.ts]
│
├── TOPOLOGY SECTION
│   ├── #topologyView
│   │   └── (Select, toggles #profileSelectGroup)
│   │
│   ├── #topologyProfile
│   │   └── (Select, loaded by loadTopologyProfiles)
│   │       └── loadTopologyProfiles() [app.js:1333]
│   │           └── GET /api/profiles [server.ts:397]
│   │               └── ProfileManager.getAllProfiles() [storage/profile-manager.ts]
│   │
│   ├── #refreshTopologyBtn
│   │   └── (Refreshes topology3D visualization)
│   │
│   ├── #topologyCanvas
│   │   └── (3D visualization, initialized by initializeTopology)
│   │       └── initializeTopology() [app.js:1316]
│   │           └── Topology3D.loadData() [topology3d.js]
│   │               └── GET /api/topology/principles [server.ts:659]
│   │                   ├── TextStorage.getPrinciples() [storage/text-storage.ts]
│   │                   └── TextStorage.getAllRelationships() [storage/text-storage.ts]
│   │
│   └── #topologyInfo
│       └── updateTopologyInfo() [app.js:1354]
│           └── GET /api/topology/principles [server.ts:659]
│               ├── TextStorage.getPrinciples() [storage/text-storage.ts]
│               └── TextStorage.getAllRelationships() [storage/text-storage.ts]
│
├── TESTING SECTION
│   │
│   ├── Run Tests Tab
│   │   ├── #testSuiteSelect
│   │   │   └── (Select, read by handleRunTests)
│   │   │
│   │   ├── #runABTestsBtn
│   │   │   └── handleRunTests() [app.js:939]
│   │   │       └── POST /api/run-tests [server.ts:237]
│   │   │           └── TestRunner.run() [testing/test-runner.ts]
│   │   │               ├── TestHarness.runTest() [testing/test-harness.ts]
│   │   │               └── (Runs test cases from test-cases.ts)
│   │   │
│   │   ├── #testProgress
│   │   │   └── (Progress bar container)
│   │   │
│   │   └── #testOutput
│   │       └── displayTestResults() [app.js:993]
│   │
│   ├── Results Tab
│   │   └── #resultsContainer
│   │       └── displayAllResults() [app.js:1047]
│   │           └── (Displays from testResults array)
│   │
│   └── Markov Chain Analysis Tab (Dynamic)
│       ├── #refreshMarkovAnalysis
│       │   └── displayMarkovAnalysis() [app.js:1490]
│       │       └── window.markovTracker.getAnalysisReport()
│       │
│       ├── #debugFromMarkov
│       │   └── debugFromMarkovChain() [app.js:1623]
│       │       └── analyzeChainForDebugging() [app.js:1721]
│       │
│       ├── #extrapolateIssues
│       │   └── extrapolateIssuesFromChain() [app.js:1821]
│       │       └── POST /api/extrapolate [server.ts:193]
│       │           └── Extrapolator.extrapolate() [generators/extrapolator.ts]
│       │
│       ├── #exportMarkovData
│       │   └── exportMarkovData() [app.js:1593]
│       │       └── window.markovTracker.exportData()
│       │
│       └── #resetMarkovData
│           └── resetMarkovData() [app.js:1609]
│               └── window.markovTracker.reset()
│
└── RIGHT SIDEBAR
    ├── #clearAllInputs
    │   └── clearAllInputs() [app.js:1073]
    │
    └── #loadFromStorage
        └── loadFromStorage() [app.js:1082]
            └── switchSection('library') [app.js:126]
```

## Function Dependency Graph

```
Initialization Flow:
DOMContentLoaded
  ├─ initializeNavigation()
  ├─ initializeSidebarPanels()
  │   ├─ loadRecentSamples()
  │   ├─ loadRecentPrinciples()
  │   └─ loadProfilesToSelect()
  ├─ initializeEventListeners()
  ├─ checkHealth()
  └─ initializeMarkovAnalysisUI()
      └─ addMarkovAnalysisSection()

Analysis Flow:
handleUnifiedAnalyze()
  ├─ apiCall('/api/analyze')
  │   └─ ToneAnalyzer.analyzeText()
  │   └─ ToneAnalyzer.compareToProfile()
  ├─ apiCall('/api/extract-patterns')
  │   └─ PatternExtractor.extractPatterns()
  └─ apiCall('/api/shred')
      └─ Shredder.shred()

Generation Flow:
handleUnifiedGenerate()
  ├─ apiCall('/api/generate')
  │   └─ TextGenerator.generateText()
  ├─ apiCall('/api/extrapolate')
  │   └─ Extrapolator.extrapolate()
  └─ apiCall('/api/match-voice')
      ├─ VoiceMatcher.scoreMatch()
      └─ VoiceMatcher.validateVoice()

Document Processing Flow:
handleDocumentUpload()
  └─ DocumentProcessor.processDocument()
      ├─ DocumentParser.parse()
      ├─ Shredder.shred()
      └─ TextStorage.addSample()

Profile Building Flow:
handleLibraryBuildProfile()
  └─ ProfileBuilder.buildFromSamples()
      ├─ ToneAnalyzer.analyzeText()
      ├─ PatternExtractor.extractPatterns()
      └─ (Builds VoiceProfile)
```

## Data Flow Diagrams

### Analysis Data Flow
```
User Input (#unifiedAnalyzeInput)
  ↓
handleUnifiedAnalyze()
  ↓
apiCall() → API Request
  ↓
Server Endpoint (/api/analyze, /api/extract-patterns, /api/shred)
  ↓
Backend Service (ToneAnalyzer, PatternExtractor, Shredder)
  ↓
Response → apiCall() → Result
  ↓
Display (#unifiedAnalysisOutput)
  ↓
User Actions (#saveAnalysisToStorage, #addAnalysisPrinciple)
```

### Generation Data Flow
```
User Input (#unifiedGenerateInput)
  ↓
handleUnifiedGenerate()
  ↓
apiCall() → API Request
  ↓
Server Endpoint (/api/generate, /api/extrapolate, /api/match-voice)
  ↓
Backend Service (TextGenerator, Extrapolator, VoiceMatcher)
  ↓
Response → apiCall() → Result
  ↓
Display (#unifiedGenerateOutput)
  ↓
User Actions (#saveGeneratedToStorage, #extrapolateGenerated, #validateGenerated)
```

### Storage Data Flow
```
User Action (Add Sample/Principle)
  ↓
Function (quickAddSample, libraryAddSample, etc.)
  ↓
apiCall() → POST /api/storage/samples or /api/storage/principles
  ↓
Server Endpoint
  ↓
TextStorage.addSample() or TextStorage.addPrinciple()
  ↓
JSON File (text-storage.json)
  ↓
Response → Success
  ↓
Refresh Display (loadRecentSamples, loadLibrarySamples, etc.)
```

## State Management Map

### Global State Variables (app.js)
```javascript
let currentSection = 'workspace';        // Current main section
let currentAnalysisType = 'all';         // Current analysis type
let currentLibraryTab = 'samples';       // Current library tab
let currentTestingTab = 'run';           // Current testing tab
let testResults = [];                    // Array of test results
let lastAnalysisResult = null;           // Last analysis result
let lastGeneratedText = null;            // Last generated text
let topology3D = null;                   // Topology3D instance
```

### State Updates
- `currentSection`: Updated by `switchSection()`
- `currentAnalysisType`: Updated by analysis tab clicks
- `currentLibraryTab`: Updated by library tab clicks
- `currentTestingTab`: Updated by testing tab clicks
- `testResults`: Updated by `handleRunTests()`
- `lastAnalysisResult`: Updated by `handleUnifiedAnalyze()`
- `lastGeneratedText`: Updated by `handleUnifiedGenerate()`
- `topology3D`: Initialized by `initializeTopology()`

## Event Flow Diagram

### Button Click Flow
```
User clicks button
  ↓
Event listener (attached in initializeEventListeners)
  ↓
Handler function
  ↓
Validation (if needed)
  ↓
API call (if needed)
  ↓
Update UI
  ↓
Update state (if needed)
```

### Tab Navigation Flow
```
User clicks tab
  ↓
Tab click handler (initializeNavigation)
  ↓
Update active tab class
  ↓
Update content visibility
  ↓
Load data (if needed)
  ↓
Update state
```

## API Endpoint Reference

See [API_MAPPING.md](./API_MAPPING.md) for complete API endpoint documentation.

## Backend Service Reference

### Analyzers
- **ToneAnalyzer** (`analyzers/tone-analyzer.ts`)
  - `analyzeText(text: string): AnalysisResult`
  - `compareToProfile(analysis: AnalysisResult): MatchResult`

- **PatternExtractor** (`analyzers/pattern-extractor.ts`)
  - `extractPatterns(text: string): PatternResult`

- **Shredder** (`analyzers/shredder.ts`)
  - `shred(text: string): ShredderAnalysis`
  - `compareTruths(analysis1, analysis2): ComparisonResult`

### Generators
- **TextGenerator** (`generators/text-generator.ts`)
  - `generateText(topic: string, options: GenerationOptions): string`

- **Extrapolator** (`generators/extrapolator.ts`)
  - `extrapolate(text: string, options: ExtrapolationOptions): string`

- **VoiceMatcher** (`generators/voice-matcher.ts`)
  - `scoreMatch(text: string): MatchResult`
  - `validateVoice(text: string): ValidationResult`

### Storage
- **TextStorage** (`storage/text-storage.ts`)
  - `getSamples(filters?: FilterOptions): Sample[]`
  - `addSample(sample: SampleInput): Promise<Sample>`
  - `getPrinciples(filters?: FilterOptions): Principle[]`
  - `addPrinciple(principle: PrincipleInput): Promise<Principle>`
  - `getAllRelationships(): Relationship[]`

- **ProfileManager** (`storage/profile-manager.ts`)
  - `getAllProfiles(): ProfileWithMetadata[]`
  - `getProfile(id: string): ProfileWithMetadata | null`
  - `createProfile(profile: VoiceProfile, metadata: ProfileMetadata): Promise<ProfileMetadata>`
  - `getDefaultProfile(): ProfileWithMetadata | null`

### Builders
- **ProfileBuilder** (`builders/profile-builder.ts`)
  - `buildFromSamples(samples: string[], options?: BuildOptions): Promise<VoiceProfile>`

### Processors
- **DocumentProcessor** (`processors/document-processor.ts`)
  - `processDocument(filePath: string, options: ProcessOptions): Promise<ProcessedDocument>`
  - `processDocuments(filePaths: string[], options: ProcessOptions): Promise<ProcessedDocument[]>`
  - `processContent(content: string, filename: string, fileType: string, options: ProcessOptions): Promise<ProcessedDocument>`

### Testing
- **TestRunner** (`testing/test-runner.ts`)
  - `run(suite: TestSuite): Promise<TestResult>`

## Notes

- All API calls go through `apiCall()` function for consistent error handling
- Error handling is done via try-catch blocks in each function
- State is managed via global variables
- Some functions update UI directly, others return data for display
- Markov chain tracking wraps functions automatically via `wrapFunction()`
- Dynamic elements (Markov Chain Analysis tab) are created at runtime

## File References

- **UI**: `dashboard/public/index.html`
- **Frontend Logic**: `dashboard/public/app.js`
- **API Server**: `dashboard/server.ts`
- **Backend Services**: `analyzers/`, `generators/`, `storage/`, `builders/`, `processors/`, `testing/`

