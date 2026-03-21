# Quick Start Guide

## Overview

The Voice Framework is an NLP system for capturing, analyzing, and generating text in the voice of the Brisbane Servers design system documentation. It's designed to be used externally from the website but within the same repository.

## Installation

```bash
cd voice-framework
npm install
```

## Basic Usage

### 1. Analyze Text

```typescript
import { ToneAnalyzer } from './analyzers/tone-analyzer';

const analyzer = new ToneAnalyzer();
const analysis = analyzer.analyzeText(yourText);
const match = analyzer.compareToProfile(analysis);

console.log('Voice Match:', match.overallMatch);
```

### 2. Generate Text

```typescript
import { TextGenerator } from './generators/text-generator';

const generator = new TextGenerator();
const text = generator.generateText('Your Topic', {
  length: 'medium',
  includeExamples: true,
  style: 'technical'
});
```

### 3. Extrapolate Text

```typescript
import { Extrapolator } from './generators/extrapolator';

const extrapolator = new Extrapolator();
const expanded = extrapolator.extrapolate(seedText, {
  expansionLevel: 'moderate',
  addExamples: true
});
```

### 4. Match Voice

```typescript
import { VoiceMatcher } from './generators/voice-matcher';

const matcher = new VoiceMatcher();
const validation = matcher.validateVoice(yourText);
const adjusted = matcher.adjustToVoice(yourText, 0.8);
```

## Complete Example

```typescript
import { createVoiceFramework } from './index';

// Create all framework components
const framework = createVoiceFramework();

// Analyze existing text
const analysis = framework.analyzer.analyzeText(sourceText);
console.log('Analysis:', analysis);

// Generate new content
const generated = framework.generator.generateText('New System', {
  length: 'medium',
  style: 'technical'
});

// Validate and adjust
const validation = framework.matcher.validateVoice(generated);
if (!validation.isValid) {
  const adjusted = framework.matcher.adjustToVoice(generated);
  console.log('Adjusted:', adjusted);
}
```

## Key Features

- **Voice Analysis**: Extract tone and style characteristics
- **Text Generation**: Create content matching the voice profile
- **Extrapolation**: Expand on existing concepts consistently
- **Voice Matching**: Validate and adjust text to match voice
- **Pattern Extraction**: Identify linguistic and structural patterns

## Framework Structure

```
voice-framework/
├── analyzers/          # Analysis tools
├── generators/         # Text generation
├── models/            # Data models
├── examples/          # Usage examples
└── index.ts           # Main entry point
```

## See Also

- `VOICE_ANALYSIS.md` - Detailed voice characteristics
- `examples/usage-examples.ts` - Comprehensive examples
- `README.md` - Full documentation

