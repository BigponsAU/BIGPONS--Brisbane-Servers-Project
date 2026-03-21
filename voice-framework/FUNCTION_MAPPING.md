# Function Mapping

Complete mapping of UI elements to JavaScript functions in `app.js`.

## Initialization Functions

| Function | Line | Purpose | Called By |
|---|---|---|---|
| `DOMContentLoaded` handler | 47 | Main initialization entry point | Browser |
| `initializeNavigation()` | 66 | Sets up navigation event listeners | DOMContentLoaded |
| `initializeSidebarPanels()` | 164 | Sets up collapsible sidebar panels | DOMContentLoaded |
| `initializeEventListeners()` | 180 | Sets up all button/form event listeners | DOMContentLoaded |
| `checkHealth()` | 328 | Checks API health status | DOMContentLoaded |
| `loadProfilesToSelect()` | 642 | Loads profiles into dropdowns | DOMContentLoaded |
| `initializeMarkovAnalysisUI()` | 1372 | Dynamically adds Markov analysis tab | DOMContentLoaded |

## UI Element to Function Mapping

### Header Section

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `runTestsBtn` | `handleRunTests()` | 232 | click |
| `statusIndicator` | `updateStatus()` | 337 | (updated by various functions) |

### Left Sidebar - Storage Panel

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `recentSamples` | `loadRecentSamples()` | 592 | (display container) |
| `quickAddSample` | `quickAddSample()` | 212 | click |
| `recentPrinciples` | `loadRecentPrinciples()` | 617 | (display container) |
| `quickAddPrinciple` | `quickAddPrinciple()` | 213 | click |
| `.panel-header[data-panel="storage"]` | Panel collapse toggle | 165 | click |

### Left Sidebar - Profiles Panel

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `quickProfileSelect` | Change handler (no action) | 214 | change |
| `currentProfile` | Updated by `loadProfilesToSelect()` | 647 | (display container) |
| `.panel-header[data-panel="profiles"]` | Panel collapse toggle | 165 | click |

### Main Navigation

| UI Element Class | Function(s) | Line | Event Type |
|---|---|---|---|
| `.nav-tab` | `switchSection()` | 70 | click |
| `.analysis-tab` | Sets `currentAnalysisType` | 80 | click |
| `.library-tab` | Tab switching + content loading | 90 | click |
| `.testing-tab` | Tab switching | 109 | click |

### Workspace - Analysis Card

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `unifiedAnalyzeInput` | Input field (read by `handleUnifiedAnalyze()`) | 357 | (input) |
| `.analysis-tab` | Sets `currentAnalysisType` | 80 | click |
| `runAllAnalysis` | Checkbox (read by `handleUnifiedAnalyze()`) | 360 | (checkbox) |
| `unifiedAnalyzeBtn` | `handleUnifiedAnalyze()` | 182 | click |
| `unifiedAnalysisOutput` | Display container | 358 | (display) |
| `analysisActions` | Display container | 359 | (display) |
| `saveAnalysisToStorage` | `saveAnalysisToStorage()` | 203 | click |
| `addAnalysisPrinciple` | `addAnalysisPrinciple()` | 204 | click |

### Workspace - Generation Card

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `unifiedGenerateInput` | Input field (read by `handleUnifiedGenerate()`) | 442 | (input) |
| `input[name="genMode"]` | Mode selector (read by `handleUnifiedGenerate()`) | 191 | change |
| `unifiedLengthSelect` | Length selector (read by `handleUnifiedGenerate()`) | 444 | (select) |
| `unifiedStyleSelect` | Style selector (read by `handleUnifiedGenerate()`) | 445 | (select) |
| `unifiedExpansionLevel` | Expansion level slider | 186 | input |
| `unifiedExpansionValue` | Display value (updated by slider) | 187 | (display) |
| `expansionLevelGroup` | Toggled by mode selector | 193 | (display) |
| `profileSelect` | Profile selector (read by `handleUnifiedGenerate()`) | 646 | (select) |
| `unifiedGenerateBtn` | `handleUnifiedGenerate()` | 185 | click |
| `unifiedGenerateOutput` | Display container | 447 | (display) |
| `generateActions` | Display container | 448 | (display) |
| `saveGeneratedToStorage` | `saveGeneratedToStorage()` | 207 | click |
| `extrapolateGenerated` | `extrapolateGenerated()` | 208 | click |
| `validateGenerated` | `validateGenerated()` | 209 | click |

### Library - Samples Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `sampleSearch` | `filterSamples()` | 242 | input |
| `libraryLoadSamples` | `loadLibrarySamples()` | 221 | click |
| `libraryAddSample` | `libraryAddSample()` | 222 | click |
| `librarySamplesList` | Display container | 708 | (display) |

### Library - Principles Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `principleSearch` | `filterPrinciples()` | 243 | input |
| `libraryLoadPrinciples` | `loadLibraryPrinciples()` | 223 | click |
| `libraryAddPrinciple` | `libraryAddPrinciple()` | 224 | click |
| `libraryPrinciplesList` | Display container | 737 | (display) |

### Library - Profiles Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `libraryLoadProfiles` | `loadLibraryProfiles()` | 225 | click |
| `libraryLoadDefaultProfile` | `loadLibraryDefaultProfile()` | 226 | click |
| `libraryProfilesList` | Display container | 765 | (display) |

### Library - Documents Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `documentUpload` | File input (read by `handleDocumentUpload()`) | 1105 | (file input) |
| `folderUpload` | Folder input | 250 | change |
| `folderFileCount` | Display count (updated by folder change) | 252 | (display) |
| `uploadFolderBtn` | Toggled by folder selection | 251 | (display) |
| `documentCategory` | Input (read by handlers) | 1118 | (input) |
| `documentTags` | Input (read by handlers) | 1119 | (input) |
| `documentAutoStore` | Checkbox (read by handlers) | 1120 | (checkbox) |
| `uploadDocumentBtn` | `handleDocumentUpload()` | 246 | click |
| `uploadFolderBtn` | `handleFolderUpload()` | 266 | click |
| `documentUploadStatus` | Display container | 1106 | (display) |
| `folderUploadStatus` | Display container | 1167 | (display) |
| `documentContent` | Textarea (read by `handleDocumentProcess()`) | 1271 | (textarea) |
| `documentFilename` | Input (read by `handleDocumentProcess()`) | 1272 | (input) |
| `documentFileType` | Select (read by `handleDocumentProcess()`) | 1273 | (select) |
| `processDocumentBtn` | `handleDocumentProcess()` | 247 | click |
| `documentProcessStatus` | Display container | 1274 | (display) |

### Library - Profile Builder Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `libraryBuilderSamples` | Textarea (read by `handleLibraryBuildProfile()`) | 849 | (textarea) |
| `libraryProfileName` | Input (read by `handleLibraryBuildProfile()`) | 850 | (input) |
| `libraryProfileDescription` | Textarea (read by `handleLibraryBuildProfile()`) | 851 | (textarea) |
| `libraryBuildProfile` | `handleLibraryBuildProfile()` | 227 | click |
| `libraryBuilderOutput` | Display container | 852 | (display) |
| `builderActions` | Display container | 853 | (display) |
| `saveBuiltProfile` | `saveBuiltProfile()` | 228 | click |

### Topology Section

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `topologyView` | View mode selector | 269 | change |
| `profileSelectGroup` | Toggled by view mode | 270 | (display) |
| `topologyProfile` | Profile selector | 281 | change |
| `refreshTopologyBtn` | Refresh handler | 286 | click |
| `topologyCanvas` | 3D visualization (initialized by `initializeTopology()`) | 1317 | (canvas) |
| `topologyInfo` | Updated by `updateTopologyInfo()` | 1357 | (display) |

### Testing Section - Run Tests Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `testSuiteSelect` | Select (read by `handleRunTests()`) | 940 | (select) |
| `runABTestsBtn` | `handleRunTests()` | 231 | click |
| `testProgress` | Display container | 942 | (display) |
| `progressFill` | Progress bar fill | 943 | (display) |
| `progressText` | Progress text | 944 | (display) |
| `testOutput` | Display container (updated by `displayTestResults()`) | 941 | (display) |

### Testing Section - Results Tab

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `resultsContainer` | Display container (updated by `displayAllResults()`) | 1048 | (display) |

### Testing Section - Markov Chain Analysis Tab (Dynamic)

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `refreshMarkovAnalysis` | `displayMarkovAnalysis()` | 1482 | click |
| `debugFromMarkov` | `debugFromMarkovChain()` | 1483 | click |
| `extrapolateIssues` | `extrapolateIssuesFromChain()` | 1484 | click |
| `exportMarkovData` | `exportMarkovData()` | 1485 | click |
| `resetMarkovData` | `resetMarkovData()` | 1486 | click |
| `markovAnalysisOutput` | Display container | 1498 | (display) |
| `markovDebugOutput` | Display container | 1629 | (display) |

### Right Sidebar

| UI Element ID | Function(s) | Line | Event Type |
|---|---|---|---|
| `clearAllInputs` | `clearAllInputs()` | 238 | click |
| `loadFromStorage` | `loadFromStorage()` | 239 | click |

## Core Function Details

### Navigation Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `switchSection()` | 126 | Switches between main sections | `section: string` | void |
| `initializeNavigation()` | 66 | Sets up navigation listeners | none | void |

### Analysis Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `handleUnifiedAnalyze()` | 356 | Orchestrates analysis | none | Promise<void> |
| `saveAnalysisToStorage()` | 508 | Saves analysis result | none | Promise<void> |
| `addAnalysisPrinciple()` | 527 | Creates principle from analysis | none | Promise<void> |

### Generation Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `handleUnifiedGenerate()` | 441 | Handles text generation | none | Promise<void> |
| `saveGeneratedToStorage()` | 546 | Saves generated text | none | Promise<void> |
| `extrapolateGenerated()` | 565 | Re-runs in extrapolate mode | none | Promise<void> |
| `validateGenerated()` | 573 | Validates generated text | none | Promise<void> |

### Storage Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `loadRecentSamples()` | 592 | Loads sidebar samples | none | Promise<void> |
| `loadRecentPrinciples()` | 617 | Loads sidebar principles | none | Promise<void> |
| `loadProfilesToSelect()` | 642 | Loads profile dropdowns | none | Promise<void> |
| `quickAddSample()` | 672 | Quick add sample | none | Promise<void> |
| `quickAddPrinciple()` | 689 | Quick add principle | none | Promise<void> |

### Library Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `loadLibrarySamples()` | 707 | Loads full sample list | none | Promise<void> |
| `loadLibraryPrinciples()` | 736 | Loads full principle list | none | Promise<void> |
| `loadLibraryProfiles()` | 764 | Loads profile list | none | Promise<void> |
| `loadLibraryDefaultProfile()` | 794 | Loads default profile | none | Promise<void> |
| `libraryAddSample()` | 813 | Add sample from library | none | Promise<void> |
| `libraryAddPrinciple()` | 830 | Add principle from library | none | Promise<void> |
| `handleLibraryBuildProfile()` | 848 | Builds profile from samples | none | Promise<void> |
| `saveBuiltProfile()` | 914 | Saves built profile | none | Promise<void> |

### Document Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `handleDocumentUpload()` | 1104 | Handles file upload | none | Promise<void> |
| `handleFolderUpload()` | 1165 | Handles folder upload | none | Promise<void> |
| `handleDocumentProcess()` | 1270 | Processes pasted content | none | Promise<void> |

### Topology Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `initializeTopology()` | 1316 | Initializes 3D visualization | none | void |
| `loadTopologyProfiles()` | 1333 | Loads profiles for topology | none | Promise<void> |
| `updateTopologyInfo()` | 1354 | Updates topology info | none | Promise<void> |

### Testing Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `handleRunTests()` | 939 | Runs test suite | none | Promise<void> |
| `displayTestResults()` | 993 | Displays test results | `result: object, container: HTMLElement` | void |
| `displayAllResults()` | 1047 | Displays all test results | none | void |

### Markov Chain Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `displayMarkovAnalysis()` | 1490 | Displays Markov analysis | none | void |
| `debugFromMarkovChain()` | 1623 | Generates debug insights | none | Promise<void> |
| `extrapolateIssuesFromChain()` | 1821 | Extrapolates issues | none | Promise<void> |
| `exportMarkovData()` | 1593 | Exports Markov data | none | void |
| `resetMarkovData()` | 1609 | Resets tracker | none | void |
| `analyzeChainForDebugging()` | 1721 | Analyzes chain for debugging | `report: object, data: object` | object |
| `generateChainSummaryForExtrapolation()` | 1864 | Generates summary | `report: object, data: object` | string |

### Utility Functions

| Function | Line | Purpose | Parameters | Returns |
|---|---|---|---|---|
| `apiCall()` | 300 | Unified API call handler | `endpoint: string, method: string, data: object` | Promise<object> |
| `updateStatus()` | 337 | Updates status indicator | `status: string, message: string` | void |
| `clearAllInputs()` | 1073 | Clears all inputs | none | void |
| `loadFromStorage()` | 1082 | Navigates to library | none | void |
| `filterSamples()` | 1086 | Client-side filtering | `query: string` | void |
| `filterPrinciples()` | 1095 | Client-side filtering | `query: string` | void |
| `wrapFunction()` | 15 | Wraps function for Markov tracking | `functionName: string, fn: Function, context: object` | Function |

## Function Dependencies

### Initialization Flow
```
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
```

### Analysis Flow
```
handleUnifiedAnalyze()
  ├─ apiCall('/api/analyze') → ToneAnalyzer
  ├─ apiCall('/api/extract-patterns') → PatternExtractor
  └─ apiCall('/api/shred') → Shredder
```

### Generation Flow
```
handleUnifiedGenerate()
  ├─ apiCall('/api/generate') → TextGenerator
  ├─ apiCall('/api/extrapolate') → Extrapolator
  └─ apiCall('/api/match-voice') → VoiceMatcher
```

### Storage Flow
```
loadRecentSamples() → apiCall('/api/storage/samples') → TextStorage.getSamples()
loadLibrarySamples() → apiCall('/api/storage/samples') → TextStorage.getSamples()
quickAddSample() → apiCall('/api/storage/samples', 'POST') → TextStorage.addSample()
```

## Notes

- All async functions use `apiCall()` for API communication
- Error handling is done via try-catch blocks in each function
- State is managed via global variables (e.g., `currentSection`, `currentAnalysisType`)
- Some functions update UI directly, others return data for display
- Markov chain tracking wraps functions automatically via `wrapFunction()`

