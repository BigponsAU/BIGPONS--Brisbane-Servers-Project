# API Endpoint Mapping

Complete mapping of API endpoints to functions and backend services.

## API Endpoint to Function Mapping

**Note**: The "Function" column shows frontend JavaScript functions (in `dashboard/public/app.js`) that call these endpoints. Backend route handlers are in `dashboard/routes/` directory.

### Health & Status

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/health` | GET | `checkHealth()` | 121 | None | Health check endpoint |

### Analysis Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/analyze` | POST | `handleUnifiedAnalyze()` | 128 | `ToneAnalyzer.analyzeText()` | Analyze text tone |
| `/api/extract-patterns` | POST | `handleUnifiedAnalyze()` | 151 | `PatternExtractor.extractPatterns()` | Extract patterns from text |
| `/api/shred` | POST | `handleUnifiedAnalyze()` | 282 | `Shredder.shred()` | Extract objective truths |

### Generation Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/generate` | POST | `handleUnifiedGenerate()` | 172 | `TextGenerator.generateText()` | Generate text |
| `/api/extrapolate` | POST | `handleUnifiedGenerate()`, `extrapolateIssuesFromChain()` | 193 | `Extrapolator.extrapolate()` | Extrapolate text |
| `/api/extrapolate-project` | POST | (Not used in UI) | 151 | `Extrapolator.extrapolateProject()` | Extrapolate entire project directory |
| `/api/match-voice` | POST | `handleUnifiedGenerate()`, `validateGenerated()` | 214 | `VoiceMatcher.scoreMatch()`, `VoiceMatcher.validateVoice()` | Match voice profile |

### Testing Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/run-tests` | POST | `handleRunTests()` | 237 | `TestRunner.run()` | Run A/B test suite |
| `/api/test-results/:testId?` | GET | (Not used in UI) | 264 | None | Get test results (placeholder) |

### Storage Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/storage/samples` | GET | `loadRecentSamples()`, `loadLibrarySamples()` | 328 | `TextStorage.getSamples()` | Get all samples |
| `/api/storage/samples` | POST | `saveAnalysisToStorage()`, `saveGeneratedToStorage()`, `quickAddSample()`, `libraryAddSample()` | 345 | `TextStorage.addSample()` | Add sample |
| `/api/storage/cleanup` | POST | (Not used in UI) | 357 | `TextStorage.cleanupBinaryData()` | Cleanup binary data |
| `/api/storage/principles` | GET | `loadRecentPrinciples()`, `loadLibraryPrinciples()` | 369 | `TextStorage.getPrinciples()` | Get all principles |
| `/api/storage/principles` | POST | `addAnalysisPrinciple()`, `quickAddPrinciple()`, `libraryAddPrinciple()` | 385 | `TextStorage.addPrinciple()` | Add principle |

### Profile Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/profiles` | GET | `loadProfilesToSelect()`, `loadLibraryProfiles()`, `loadTopologyProfiles()` | 397 | `ProfileManager.getAllProfiles()` | Get all profiles |
| `/api/profiles/:id` | GET | (Not used in UI) | 409 | `ProfileManager.getProfile()` | Get profile by ID |
| `/api/profiles` | POST | `saveBuiltProfile()` | 425 | `ProfileManager.createProfile()` | Create profile |
| `/api/profiles/default` | GET | `loadLibraryDefaultProfile()` | 441 | `ProfileManager.getDefaultProfile()` | Get default profile |

### Profile Builder Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/profile-builder/build` | POST | `handleLibraryBuildProfile()` | 456 | `ProfileBuilder.buildFromSamples()` | Build profile from samples |

### Document Processing Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/documents/upload` | POST | `handleDocumentUpload()` | 472 | `DocumentProcessor.processDocument()` | Upload and process file |
| `/api/documents/upload-folder` | POST | `handleFolderUpload()` | 506 | `DocumentProcessor.processDocuments()` | Upload and process folder |
| `/api/documents/process` | POST | `handleDocumentProcess()` | 626 | `DocumentProcessor.processContent()` | Process pasted content |

### Topology Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/topology/principles` | GET | `updateTopologyInfo()` | 659 | `TextStorage.getPrinciples()`, `TextStorage.getAllRelationships()` | Get principles for 3D visualization |
| `/api/topology/profiles` | GET | (Used by topology3D) | 730 | `ProfileManager.getAllProfiles()`, `TextStorage.getPrinciples()` | Get profiles for topology view |

### Other Endpoints

| Endpoint | Method | Function | Line | Backend Service | Purpose |
|---|---|---|---|---|---|
| `/api/compare-truths` | POST | (Not used in UI) | 303 | `Shredder.compareTruths()` | Compare truths from multiple sources |
| `*` | GET | (Catch-all) | 794 | None | Serve static files and SPA |

## Request/Response Formats

### POST /api/analyze
**Request:**
```json
{
  "text": "string"
}
```
**Response:**
```json
{
  "analysis": { ... },
  "match": { ... },
  "success": true
}
```

### POST /api/extract-patterns
**Request:**
```json
{
  "text": "string"
}
```
**Response:**
```json
{
  "patterns": { ... },
  "success": true
}
```

### POST /api/shred
**Request:**
```json
{
  "text": "string"
}
```
**Response:**
```json
{
  "analysis": { ... },
  "success": true
}
```

### POST /api/generate
**Request:**
```json
{
  "topic": "string",
  "options": {
    "length": "short|medium|long",
    "style": "descriptive|technical|comprehensive",
    "includeExamples": boolean
  }
}
```
**Response:**
```json
{
  "text": "string",
  "success": true
}
```

### POST /api/extrapolate
**Request:**
```json
{
  "text": "string",
  "options": {
    "expansionLevel": "minimal|moderate|extensive",
    "addExamples": boolean,
    "addDetails": boolean
  }
}
```
**Response:**
```json
{
  "text": "string",
  "success": true
}
```

### POST /api/extrapolate-project
**Request:**
```json
{
  "projectPath": "string",
  "options": {
    "expansionLevel": "minimal|moderate|extensive",
    "addExamples": boolean,
    "addDetails": boolean,
    "fileExtensions": ["string"],
    "excludePatterns": ["string"],
    "maxFileSize": number,
    "preserveStructure": boolean
  }
}
```
**Response:**
```json
{
  "totalFiles": number,
  "successfulFiles": number,
  "failedFiles": number,
  "results": [ ... ],
  "success": true,
  "duration": number
}
```

### POST /api/match-voice
**Request:**
```json
{
  "text": "string"
}
```
**Response:**
```json
{
  "match": { ... },
  "validation": { ... },
  "success": true
}
```

### POST /api/run-tests
**Request:**
```json
{
  "suiteType": "default|quick",
  "customSuite": { ... } // optional
}
```
**Response:**
```json
{
  "result": { ... },
  "success": true
}
```

### GET /api/storage/samples
**Query Parameters:**
- `category` (optional): Filter by category
- `tags` (optional): Comma-separated tags

**Response:**
```json
{
  "samples": [ ... ],
  "success": true
}
```

### POST /api/storage/samples
**Request:**
```json
{
  "text": "string",
  "category": "string", // optional
  "tags": ["string"], // optional
  "source": "string" // optional
}
```
**Response:**
```json
{
  "sample": { ... },
  "success": true
}
```

### GET /api/storage/principles
**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "principles": [ ... ],
  "success": true
}
```

### POST /api/storage/principles
**Request:**
```json
{
  "principle": "string",
  "description": "string", // optional
  "category": "string", // optional
  "examples": ["string"] // optional
}
```
**Response:**
```json
{
  "principle": { ... },
  "success": true
}
```

### GET /api/profiles
**Response:**
```json
{
  "profiles": [ ... ],
  "success": true
}
```

### POST /api/profiles
**Request:**
```json
{
  "profile": { ... },
  "metadata": {
    "name": "string",
    "description": "string", // optional
    "version": "string",
    "tags": ["string"], // optional
    "isDefault": boolean
  }
}
```
**Response:**
```json
{
  "metadata": { ... },
  "success": true
}
```

### GET /api/profiles/default
**Response:**
```json
{
  "profile": { ... },
  "success": true
}
```

### POST /api/profile-builder/build
**Request:**
```json
{
  "samples": ["string"],
  "options": {
    "name": "string", // optional
    "description": "string" // optional
  }
}
```
**Response:**
```json
{
  "profile": { ... },
  "success": true
}
```

### POST /api/documents/upload
**Request:** `multipart/form-data`
- `document`: File
- `category`: string (optional)
- `tags`: string (comma-separated, optional)
- `autoStore`: boolean

**Response:**
```json
{
  "processed": {
    "document": { ... },
    "shredderAnalysis": { ... },
    "storageResults": { ... }
  },
  "success": true
}
```

### POST /api/documents/upload-folder
**Request:** `multipart/form-data`
- `documents`: File[] (multiple files)
- `category`: string (optional)
- `tags`: string (comma-separated, optional)
- `autoStore`: boolean

**Response:**
```json
{
  "summary": [ ... ],
  "totals": {
    "filesProcessed": number,
    "totalTruths": number,
    "totalSamples": number,
    "totalPrinciples": number,
    "totalRelationships": number
  },
  "success": true
}
```

### POST /api/documents/process
**Request:**
```json
{
  "content": "string",
  "filename": "string",
  "fileType": "text|html|markdown|json|xml|csv|code",
  "category": "string", // optional
  "tags": ["string"], // optional
  "autoStore": boolean
}
```
**Response:**
```json
{
  "processed": { ... },
  "success": true
}
```

### GET /api/topology/principles
**Query Parameters:**
- `profileId` (optional): Filter by profile ID

**Response:**
```json
{
  "principles": [ ... ],
  "connections": [ ... ],
  "total": number,
  "success": true
}
```

### GET /api/topology/profiles
**Response:**
```json
{
  "profiles": [ ... ],
  "allPrinciples": [ ... ],
  "success": true
}
```

## Error Response Format

All endpoints return errors in this format:
```json
{
  "error": "string",
  "success": false
}
```

HTTP status codes:
- `400`: Bad Request (missing/invalid parameters)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Backend Service Mapping

### ToneAnalyzer
- **File:** `analyzers/tone-analyzer.ts`
- **Methods:**
  - `analyzeText(text: string): AnalysisResult`
  - `compareToProfile(analysis: AnalysisResult): MatchResult`

### PatternExtractor
- **File:** `analyzers/pattern-extractor.ts`
- **Methods:**
  - `extractPatterns(text: string): PatternResult`

### Shredder
- **File:** `analyzers/shredder.ts`
- **Methods:**
  - `shred(text: string): ShredderAnalysis`
  - `compareTruths(analysis1: ShredderAnalysis, analysis2: ShredderAnalysis): ComparisonResult`

### TextGenerator
- **File:** `generators/text-generator.ts`
- **Methods:**
  - `generateText(topic: string, options: GenerationOptions): string`

### Extrapolator
- **File:** `generators/extrapolator.ts`
- **Methods:**
  - `extrapolate(text: string, options: ExtrapolationOptions): string`

### VoiceMatcher
- **File:** `generators/voice-matcher.ts`
- **Methods:**
  - `scoreMatch(text: string): MatchResult`
  - `validateVoice(text: string): ValidationResult`

### TestRunner
- **File:** `testing/test-runner.ts`
- **Methods:**
  - `run(suite: TestSuite): Promise<TestResult>`

### TextStorage
- **File:** `storage/text-storage.ts`
- **Methods:**
  - `getSamples(filters?: FilterOptions): Sample[]`
  - `addSample(sample: SampleInput): Promise<Sample>`
  - `getPrinciples(filters?: FilterOptions): Principle[]`
  - `addPrinciple(principle: PrincipleInput): Promise<Principle>`
  - `getAllRelationships(): Relationship[]`
  - `cleanupBinaryData(): Promise<CleanupResult>`

### ProfileManager
- **File:** `storage/profile-manager.ts`
- **Methods:**
  - `getAllProfiles(): ProfileWithMetadata[]`
  - `getProfile(id: string): ProfileWithMetadata | null`
  - `createProfile(profile: VoiceProfile, metadata: ProfileMetadata): Promise<ProfileMetadata>`
  - `getDefaultProfile(): ProfileWithMetadata | null`

### ProfileBuilder
- **File:** `builders/profile-builder.ts`
- **Methods:**
  - `buildFromSamples(samples: string[], options?: BuildOptions): Promise<VoiceProfile>`

### DocumentProcessor
- **File:** `processors/document-processor.ts`
- **Methods:**
  - `processDocument(filePath: string, options: ProcessOptions): Promise<ProcessedDocument>`
  - `processDocuments(filePaths: string[], options: ProcessOptions): Promise<ProcessedDocument[]>`
  - `processContent(content: string, filename: string, fileType: string, options: ProcessOptions): Promise<ProcessedDocument>`

## Notes

- All endpoints use JSON except file uploads (multipart/form-data)
- Error handling is consistent across all endpoints
- CORS is enabled for all origins
- Request body size limit: 50MB
- File upload limit: 10MB per file
- Folder upload limit: 10,000 files
- Binary files are filtered out automatically

