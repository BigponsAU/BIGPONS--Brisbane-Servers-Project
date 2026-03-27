# UI Element Inventory

Complete inventory of all UI elements in the Voice Framework Dashboard.

## Header Section

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `runTestsBtn` | `btn btn-primary` | button | Triggers A/B test execution | Header actions |
| `statusIndicator` | `status-indicator` | div | Displays system status (ready/loading/error) | Header actions |
| `status-dot` | `status-dot` | span | Visual status indicator dot | Inside statusIndicator |

## Left Sidebar

### Storage Panel

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `storagePanel` | `panel-content` | div | Container for storage panel content | Left sidebar |
| `recentSamples` | `panel-list` | div | Displays recent text samples | Storage panel |
| `quickAddSample` | `btn btn-secondary btn-sm` | button | Quick add sample from sidebar | Storage panel |
| `recentPrinciples` | `panel-list` | div | Displays recent principles | Storage panel |
| `quickAddPrinciple` | `btn btn-secondary btn-sm` | button | Quick add principle from sidebar | Storage panel |

### Profiles Panel

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `profilesPanel` | `panel-content` | div | Container for profiles panel content | Left sidebar |
| `quickProfileSelect` | `panel-select` | select | Quick profile selector dropdown | Profiles panel |
| `currentProfile` | `panel-info` | div | Displays current/default profile info | Profiles panel |

## Main Navigation

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| - | `nav-tab` | a | Navigation tab (workspace/library/topology/testing) | Top nav |
| - | `nav-tab active` | a | Active navigation tab | Top nav |

## Workspace Section

### Analysis Card

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `unifiedAnalyzeInput` | - | textarea | Input field for text to analyze | Workspace - Analysis |
| - | `analysis-tab` | button | Analysis type tab (all/tone/patterns/shredder) | Workspace - Analysis |
| - | `analysis-tab active` | button | Active analysis type tab | Workspace - Analysis |
| `runAllAnalysis` | - | checkbox | Toggle to run all analyses | Workspace - Analysis |
| `unifiedAnalyzeBtn` | `btn btn-primary` | button | Triggers analysis execution | Workspace - Analysis |
| `unifiedAnalysisOutput` | `output-area` | div | Displays analysis results | Workspace - Analysis |
| `analysisActions` | `output-actions` | div | Container for analysis action buttons | Workspace - Analysis |
| `saveAnalysisToStorage` | `btn btn-secondary btn-sm` | button | Saves analysis result to storage | Workspace - Analysis |
| `addAnalysisPrinciple` | `btn btn-secondary btn-sm` | button | Adds analysis as principle | Workspace - Analysis |

### Generation Card

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `unifiedGenerateInput` | - | textarea | Input field for topic/seed text | Workspace - Generation |
| `genMode` | - | radio | Generation mode (generate/extrapolate/generate-validate) | Workspace - Generation |
| `unifiedLengthSelect` | - | select | Text length selector (short/medium/long) | Workspace - Generation |
| `unifiedStyleSelect` | - | select | Style selector (descriptive/technical/comprehensive) | Workspace - Generation |
| `expansionLevelGroup` | - | div | Container for expansion level controls | Workspace - Generation |
| `unifiedExpansionLevel` | - | range | Expansion level slider (1-5) | Workspace - Generation |
| `unifiedExpansionValue` | - | span | Displays current expansion level value | Workspace - Generation |
| `profileSelect` | - | select | Profile selector for generation | Workspace - Generation |
| `unifiedGenerateBtn` | `btn btn-primary` | button | Triggers text generation | Workspace - Generation |
| `unifiedGenerateOutput` | `output-area` | div | Displays generated text | Workspace - Generation |
| `generateActions` | `output-actions` | div | Container for generation action buttons | Workspace - Generation |
| `saveGeneratedToStorage` | `btn btn-secondary btn-sm` | button | Saves generated text as sample | Workspace - Generation |
| `extrapolateGenerated` | `btn btn-secondary btn-sm` | button | Extrapolates generated text | Workspace - Generation |
| `validateGenerated` | `btn btn-secondary btn-sm` | button | Validates generated text voice match | Workspace - Generation |

## Library Section

### Library Tabs

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| - | `library-tab` | button | Library tab (samples/principles/profiles/documents/builder) | Library section |
| - | `library-tab active` | button | Active library tab | Library section |

### Samples Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `librarySamples` | `library-content active` | div | Container for samples tab content | Library section |
| `sampleSearch` | `search-input` | input | Search input for filtering samples | Samples tab |
| `libraryLoadSamples` | `btn btn-secondary` | button | Refreshes samples list | Samples tab |
| `libraryAddSample` | `btn btn-primary` | button | Adds new sample | Samples tab |
| `librarySamplesList` | `library-list` | div | Displays list of samples | Samples tab |

### Principles Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `libraryPrinciples` | `library-content` | div | Container for principles tab content | Library section |
| `principleSearch` | `search-input` | input | Search input for filtering principles | Principles tab |
| `libraryLoadPrinciples` | `btn btn-secondary` | button | Refreshes principles list | Principles tab |
| `libraryAddPrinciple` | `btn btn-primary` | button | Adds new principle | Principles tab |
| `libraryPrinciplesList` | `library-list` | div | Displays list of principles | Principles tab |

### Profiles Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `libraryProfiles` | `library-content` | div | Container for profiles tab content | Library section |
| `libraryLoadProfiles` | `btn btn-secondary` | button | Refreshes profiles list | Profiles tab |
| `libraryLoadDefaultProfile` | `btn btn-secondary` | button | Loads default profile | Profiles tab |
| `libraryProfilesList` | `library-list` | div | Displays list of profiles | Profiles tab |

### Documents Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `libraryDocuments` | `library-content` | div | Container for documents tab content | Library section |
| `documentUpload` | `file-input` | input[file] | File upload input | Documents tab |
| `folderUpload` | `file-input` | input[file] | Folder upload input (webkitdirectory) | Documents tab |
| `folderFileCount` | - | div | Displays count of selected folder files | Documents tab |
| `documentCategory` | - | input | Category input for documents | Documents tab |
| `documentTags` | - | input | Tags input (comma-separated) | Documents tab |
| `documentAutoStore` | - | checkbox | Auto-store shredded content toggle | Documents tab |
| `uploadDocumentBtn` | `btn btn-primary` | button | Uploads and processes single file | Documents tab |
| `uploadFolderBtn` | `btn btn-secondary` | button | Processes folder of files | Documents tab |
| `documentUploadStatus` | `output-area` | div | Displays file upload status | Documents tab |
| `folderUploadStatus` | `output-area` | div | Displays folder upload status | Documents tab |
| `documentContent` | - | textarea | Direct paste content input | Documents tab |
| `documentFilename` | - | input | Filename input for pasted content | Documents tab |
| `documentFileType` | - | select | File type selector for pasted content | Documents tab |
| `processDocumentBtn` | `btn btn-primary` | button | Processes pasted content | Documents tab |
| `documentProcessStatus` | `output-area` | div | Displays process status | Documents tab |

### Profile Builder Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `libraryBuilder` | `library-content` | div | Container for profile builder tab content | Library section |
| `libraryBuilderSamples` | - | textarea | Input for text samples (one per line) | Profile Builder tab |
| `libraryProfileName` | - | input | Profile name input | Profile Builder tab |
| `libraryProfileDescription` | - | textarea | Profile description input | Profile Builder tab |
| `libraryBuildProfile` | `btn btn-primary` | button | Builds profile from samples | Profile Builder tab |
| `libraryBuilderOutput` | `output-area` | div | Displays built profile results | Profile Builder tab |
| `builderActions` | `output-actions` | div | Container for builder action buttons | Profile Builder tab |
| `saveBuiltProfile` | `btn btn-secondary btn-sm` | button | Saves built profile | Profile Builder tab |

## Topology Section

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `topology` | `content-section` | section | Topology section container | Topology section |
| `topologyView` | - | select | View mode selector (all/profiles) | Topology section |
| `profileSelectGroup` | - | div | Container for profile selector (hidden by default) | Topology section |
| `topologyProfile` | - | select | Profile selector for topology view | Topology section |
| `refreshTopologyBtn` | `btn btn-secondary` | button | Refreshes topology visualization | Topology section |
| `topologyCanvas` | - | div | 3D visualization canvas | Topology section |
| `topologyInfo` | `topology-info` | div | Displays topology information | Topology section |

## Testing Section

### Testing Tabs

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| - | `testing-tab` | button | Testing tab (run/results/markov) | Testing section |
| - | `testing-tab active` | button | Active testing tab | Testing section |

### Run Tests Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `testingRun` | `testing-content active` | div | Container for run tests tab | Testing section |
| `testSuiteSelect` | - | select | Test suite selector (default/quick) | Run Tests tab |
| `runABTestsBtn` | `btn btn-primary` | button | Runs test suite | Run Tests tab |
| `testProgress` | `progress-container` | div | Progress bar container | Run Tests tab |
| `progressFill` | `progress-fill` | div | Progress bar fill element | Run Tests tab |
| `progressText` | - | p | Progress text display | Run Tests tab |
| `testOutput` | `output-area` | div | Displays test results | Run Tests tab |

### Results Tab

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `testingResults` | `testing-content` | div | Container for results tab | Testing section |
| `resultsContainer` | `results-container` | div | Displays all test results | Results tab |

### Markov Chain Analysis Tab (Dynamic)

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `testingMarkov` | `testing-content` | div | Container for Markov analysis tab (dynamically created) | Testing section |
| `refreshMarkovAnalysis` | `btn btn-primary` | button | Refreshes Markov analysis | Markov tab |
| `debugFromMarkov` | `btn btn-primary` | button | Generates debug insights from chain | Markov tab |
| `extrapolateIssues` | `btn btn-secondary` | button | Extrapolates issues from chain | Markov tab |
| `exportMarkovData` | `btn btn-secondary` | button | Exports Markov data | Markov tab |
| `resetMarkovData` | `btn btn-secondary` | button | Resets Markov tracker | Markov tab |
| `markovAnalysisOutput` | `output-area` | div | Displays Markov analysis | Markov tab |
| `markovDebugOutput` | `output-area` | div | Displays debug insights | Markov tab |

## Right Sidebar

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `clearAllInputs` | `btn btn-secondary btn-sm` | button | Clears all input fields | Right sidebar |
| `loadFromStorage` | `btn btn-secondary btn-sm` | button | Navigates to library section | Right sidebar |

## Content Sections

| ID | Class | Type | Purpose | Location |
|---|---|---|---|---|
| `workspace` | `content-section active` | section | Workspace section container | Main content |
| `library` | `content-section` | section | Library section container | Main content |
| `topology` | `content-section` | section | Topology section container | Main content |
| `testing` | `content-section` | section | Testing section container | Main content |

## Summary Statistics

- **Total UI Elements with IDs**: 75+
- **Buttons**: 30+
- **Input Fields**: 15+
- **Select Dropdowns**: 8+
- **Textareas**: 5+
- **Display Containers**: 20+
- **Tabs**: 15+ (various types)
- **Dynamic Elements**: 1 (Markov Chain Analysis tab)

## Notes

- Some elements are dynamically created (e.g., Markov Chain Analysis tab)
- Some elements are conditionally displayed (e.g., `expansionLevelGroup`, `profileSelectGroup`)
- Event listeners are attached in `app.js` via `initializeEventListeners()` and `initializeNavigation()`
- All IDs should match between HTML and JavaScript for proper functionality

