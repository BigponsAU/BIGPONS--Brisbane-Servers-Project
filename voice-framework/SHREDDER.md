# Shredder - Objective Truth Analyzer

## Overview

The **Shredder** is a unique analyzer component that extracts objective truths from text **without bias from the owner's voice profile**. It "tails to the truths of that which it receives" - meaning it follows and extracts the actual factual content of the input, rather than applying external voice characteristics or biases.

## Key Concept

Unlike the `ToneAnalyzer` which compares text against a voice profile, the Shredder:
- **Does NOT take input from its owner** - operates independently
- **Tails to the truths** - extracts what the text actually says
- **Objective analysis** - no voice profile bias applied
- **Fact extraction** - identifies claims, definitions, relationships, and values

## Features

### Truth Extraction Types

The Shredder extracts several types of truths:

1. **Values** - Numerical facts (numbers, percentages, angles, ratios)
2. **Definitions** - "X is Y", "X means Y", "X refers to Y"
3. **Relationships** - "X uses Y", "X creates Y", "X employs Y"
4. **Processes** - Actions, methods, techniques
5. **Properties** - Attributes and characteristics
6. **Assertions** - General factual claims

### Objective Voice Analysis

The Shredder also analyzes the objective voice characteristics of the input:
- **Tone**: neutral, technical, descriptive, analytical, or mixed
- **Formality**: 0-1 scale
- **Precision**: 0-1 scale (based on numerical values and specific terms)
- **Complexity**: 0-1 scale (based on sentence length and technical terms)

### Truth Comparison

Compare truths extracted from multiple sources to find:
- Common truths
- Unique truths in each source
- Conflicting claims

## Usage

### Basic Usage

```typescript
import { Shredder } from './analyzers/shredder';

const shredder = new Shredder();

const text = `
  The wave function cipher system employs phi ratios of 1.618, 
  azimuth angles at 38.2° and 61.8°, and Fourier transforms 
  to create vectorized design blocks.
`;

const analysis = shredder.shred(text);

console.log(`Extracted ${analysis.summary.totalTruths} truths`);
console.log(`Key entities: ${analysis.summary.keyEntities.join(', ')}`);
console.log(`Key values: ${analysis.summary.keyValues.join(', ')}`);
```

### Using with Framework

```typescript
import { createVoiceFramework } from './index';

const framework = createVoiceFramework();

// Shredder is available as framework.shredder
const analysis = framework.shredder.shred(someText);

analysis.truths.forEach(truth => {
  console.log(`[${truth.type}] ${truth.claim}`);
  console.log(`  Confidence: ${(truth.confidence * 100).toFixed(0)}%`);
});
```

### Comparing Multiple Sources

```typescript
const analysis1 = shredder.shred(text1);
const analysis2 = shredder.shred(text2);

const comparison = shredder.compareTruths(analysis1, analysis2);

console.log(`Common truths: ${comparison.commonTruths.length}`);
console.log(`Conflicts: ${comparison.conflicts.length}`);
```

## API Reference

### `Shredder.shred(input: string): ShredderAnalysis`

Main method that shreds input text and extracts objective truths.

**Returns:**
```typescript
{
  input: string;
  truths: ShreddedTruth[];
  summary: {
    totalTruths: number;
    factCount: number;
    assertionCount: number;
    definitionCount: number;
    averageConfidence: number;
    keyEntities: string[];
    keyValues: number[];
  };
  objectiveVoice: {
    tone: 'neutral' | 'technical' | 'descriptive' | 'analytical' | 'mixed';
    formality: number;
    precision: number;
    complexity: number;
  };
}
```

### `Shredder.compareTruths(analysis1, analysis2): ComparisonResult`

Compares two shredder analyses to find common, unique, and conflicting truths.

**Returns:**
```typescript
{
  commonTruths: ShreddedTruth[];
  uniqueToFirst: ShreddedTruth[];
  uniqueToSecond: ShreddedTruth[];
  conflicts: Array<{
    truth1: ShreddedTruth;
    truth2: ShreddedTruth;
    reason: string;
  }>;
}
```

### `ShreddedTruth` Interface

```typescript
{
  id: string;
  claim: string;
  type: 'fact' | 'assertion' | 'definition' | 'relationship' | 'process' | 'property' | 'value';
  confidence: number; // 0-1
  context?: string;
  supportingEvidence?: string[];
  extractedFrom: string;
  metadata?: {
    numericalValues?: number[];
    entities?: string[];
    relationships?: string[];
    temporal?: string;
    conditional?: boolean;
  };
}
```

## Examples

See `examples/shredder-example.ts` for comprehensive examples.

### Example Output

```
📊 Summary:
   Total Truths Extracted: 8
   Facts/Values: 3
   Definitions: 0
   Relationships: 2
   Average Confidence: 87.5%

   Key Entities: wave function cipher system, phi ratios, azimuth angles, Fourier transforms
   Key Values: 1.618, 38.2, 61.8

🎯 Objective Voice Analysis:
   Tone: technical
   Formality: 85.0%
   Precision: 90.0%
   Complexity: 75.0%

📝 Extracted Truths:
   1. [VALUE] 1.618
      Confidence: 100%
      Values: 1.618
      Entities: phi ratios

   2. [RELATIONSHIP] wave function cipher system employs phi ratios
      Confidence: 85%
      Entities: wave function cipher system, phi ratios
```

## Use Cases

1. **Fact Extraction** - Extract factual claims from documents
2. **Content Analysis** - Understand what text actually says (not how it matches a profile)
3. **Source Comparison** - Compare truths across multiple documents
4. **Bias Detection** - Analyze text without applying external voice characteristics
5. **Knowledge Extraction** - Build knowledge bases from unstructured text

## Philosophy

The Shredder embodies the principle: **"Tails to the truths of that which it receives"**

- It doesn't impose the owner's voice profile
- It extracts what the text actually contains
- It follows the content, not external expectations
- It provides objective analysis independent of voice matching

This makes it ideal for:
- Analyzing external documents
- Extracting facts from third-party sources
- Understanding content on its own terms
- Building objective knowledge bases

