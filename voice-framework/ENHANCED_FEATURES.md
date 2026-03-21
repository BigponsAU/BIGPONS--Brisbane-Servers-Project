# Enhanced Voice Framework Features

## Overview

The voice framework has been significantly enhanced with text storage, semantic principles management, automatic profile building capabilities, and the **Shredder** - an objective truth analyzer that extracts facts without owner bias.

## New Features

### 0. Shredder - Objective Truth Analyzer (`analyzers/shredder.ts`)

**Purpose**: Extract objective truths from text without bias from the owner's voice profile.

**Key Concept**: "Tails to the truths of that which it receives" - follows the actual content rather than applying external voice characteristics.

**Features:**
- ✅ Extract numerical facts, definitions, relationships, processes, properties, and assertions
- ✅ Analyze objective voice characteristics (tone, formality, precision, complexity)
- ✅ Compare truths from multiple sources
- ✅ Identify conflicts and commonalities
- ✅ No voice profile bias - operates independently

**Usage:**
```typescript
import { Shredder } from './index';

const shredder = new Shredder();
const analysis = shredder.shred(text);

console.log(`Extracted ${analysis.summary.totalTruths} truths`);
analysis.truths.forEach(truth => {
  console.log(`[${truth.type}] ${truth.claim}`);
});
```

See [SHREDDER.md](./SHREDDER.md) for complete documentation.

### 1. Text Storage System (`storage/text-storage.ts`)

Store and manage text samples, semantic principles, and relationships.

**Key Features:**
- Store text samples with metadata, categories, and tags
- Store semantic principles with descriptions and examples
- Create relationships between samples and principles
- Search and filter stored data
- Export/import data

**Usage:**
```typescript
import { TextStorage } from './index';

const storage = new TextStorage('./storage/text-storage.json');
await storage.initialize();

// Add a text sample
await storage.addSample({
  text: 'Your text here...',
  source: 'document.md',
  category: 'technical',
  tags: ['design', 'system']
});

// Add a semantic principle
await storage.addPrinciple({
  principle: 'Mathematical Precision',
  description: 'Use specific numerical values',
  examples: ['phi ratio of 1.618'],
  category: 'style'
});

// Get all samples
const samples = storage.getSamples({ category: 'technical' });
```

### 2. Profile Manager (`storage/profile-manager.ts`)

Manage multiple voice profiles - create, save, load, update, and delete.

**Key Features:**
- Create and save multiple voice profiles
- Set default profile
- Search profiles by name or tags
- Export/import profiles
- Profile metadata management

**Usage:**
```typescript
import { ProfileManager } from './index';

const manager = new ProfileManager('./storage/profiles.json');
await manager.initialize();

// Create a profile
const metadata = await manager.createProfile(voiceProfile, {
  name: 'My Voice Profile',
  description: 'Custom voice profile',
  version: '1.0.0',
  tags: ['custom', 'technical'],
  isDefault: true
});

// Get all profiles
const profiles = manager.getAllProfiles();

// Get a specific profile
const profile = manager.getProfile(metadata.id);

// Set default profile
await manager.setDefaultProfile(metadata.id);
```

### 3. Profile Builder (`builders/profile-builder.ts`)

Automatically generate voice profiles from text samples.

**Key Features:**
- Analyze multiple text samples
- Extract vocabulary, tone, structure patterns
- Identify domain knowledge and voice markers
- Generate complete voice profile automatically

**Usage:**
```typescript
import { ProfileBuilder } from './index';

const builder = new ProfileBuilder();

// Build profile from text samples
const profile = await builder.buildFromSamples(
  [
    'Sample text 1...',
    'Sample text 2...',
    'Sample text 3...'
  ],
  {
    name: 'Generated Voice Profile',
    description: 'Auto-generated from samples',
    sourceDocument: 'samples.md'
  }
);
```

### 4. Enhanced Framework (`createEnhancedFramework`)

Complete framework with all enhanced features integrated.

**Usage:**
```typescript
import { createEnhancedFramework } from './index';

const framework = await createEnhancedFramework();

// Access all components
framework.analyzer          // Tone analyzer
framework.patternExtractor  // Pattern extractor
framework.generator         // Text generator
framework.extrapolator      // Text extrapolator
framework.matcher           // Voice matcher
framework.textStorage       // Text storage system
framework.profileManager    // Profile manager
framework.profileBuilder    // Profile builder
```

## Complete Workflow Example

```typescript
import { createEnhancedFramework } from './index';

async function workflow() {
  // 1. Initialize enhanced framework
  const framework = await createEnhancedFramework();

  // 2. Store text samples
  await framework.textStorage.addSample({
    text: 'Your text sample...',
    category: 'technical',
    tags: ['design']
  });

  // 3. Store semantic principles
  await framework.textStorage.addPrinciple({
    principle: 'Precision',
    description: 'Use specific values',
    category: 'style'
  });

  // 4. Build profile from stored samples
  const samples = framework.textStorage.getSamples();
  const profile = await framework.profileBuilder.buildFromSamples(
    samples,
    { name: 'My Profile', description: 'Generated profile' }
  );

  // 5. Save profile
  await framework.profileManager.createProfile(profile, {
    name: 'My Profile',
    version: '1.0.0',
    isDefault: true
  });

  // 6. Use profile for analysis
  const defaultProfile = framework.profileManager.getDefaultProfile();
  const analyzer = new ToneAnalyzer(defaultProfile);
  const analysis = analyzer.analyzeText('Test text...');
}
```

## Storage Structure

### Text Storage (`./storage/text-storage.json`)
- Stores text samples with metadata
- Stores semantic principles
- Stores relationships between entities

### Profile Storage (`./storage/profiles.json`)
- Stores multiple voice profiles
- Manages profile metadata
- Tracks default profile

## Benefits

1. **Persistent Storage**: All data is saved to disk and persists between sessions
2. **Multiple Profiles**: Manage and switch between different voice profiles
3. **Automatic Profile Building**: Generate profiles automatically from text samples
4. **Semantic Relationships**: Track relationships between principles and samples
5. **Search & Filter**: Easily find stored data by category, tags, or content
6. **Export/Import**: Share profiles and data between projects

## Advanced Features

### Building Profiles from Existing Text

```typescript
// Load existing text samples
const samples = framework.textStorage.getSamples({ category: 'technical' });

// Build profile
const profile = await framework.profileBuilder.buildFromSamples(
  samples,
  { name: 'Technical Voice Profile' }
);

// Save it
await framework.profileManager.createProfile(profile, {
  name: 'Technical Voice Profile',
  version: '1.0.0'
});
```

### Creating Relationships

```typescript
// Create relationship between sample and principle
await framework.textStorage.addRelationship({
  sourceId: sampleId,
  targetId: principleId,
  relationshipType: 'related',
  strength: 0.9,
  description: 'Sample demonstrates this principle'
});
```

### Profile Management

```typescript
// Search profiles
const results = framework.profileManager.searchProfiles('technical');

// Export profile
await framework.profileManager.exportProfile(profileId, './exported-profile.json');

// Import profile
await framework.profileManager.importProfile(
  './exported-profile.json',
  { name: 'Imported Profile', version: '1.0.0' }
);
```

## See Also

- `examples/enhanced-usage.ts` - Complete working example
- `QUICK_START.md` - Basic framework usage
- `README.md` - Framework overview

