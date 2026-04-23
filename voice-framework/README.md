# Voice & Tone Framework

## Overview

This package is part of the Brisbane Servers monorepo. **Website production** is documented under [Deployment pathways](../docs/operations/DEPLOYMENT_PATHWAYS.md) (primary: GitHub Pages hybrid + standalone API). The voice framework is used by the Astro site and tooling; the separate **dashboard** server is optional (see package scripts and [dashboard README](dashboard/README.md)).

This framework captures, analyzes, and generates text in the voice and tone of the Brisbane Servers design system documentation. It provides comprehensive NLP capabilities for:

- **Voice Analysis**: Extracting tone, style, and linguistic patterns from text
- **Text Generation**: Creating new content that matches the established voice
- **Extrapolation**: Expanding on existing concepts while maintaining consistency
- **Voice Matching**: Validating and adjusting text to match the voice profile
- **Pattern Recognition**: Identifying linguistic and structural patterns

## Quick Start

```typescript
import { createVoiceFramework } from './index';

const framework = createVoiceFramework();

// Analyze text
const analysis = framework.analyzer.analyzeText(yourText);

// Generate text
const generated = framework.generator.generateText('Your Topic');

// Extrapolate
const expanded = framework.extrapolator.extrapolate(seedText);

// Validate voice
const validation = framework.matcher.validateVoice(text);
```

See `QUICK_START.md` for more examples.

## Structure

```
voice-framework/
├── README.md                 # This file
├── QUICK_START.md           # Quick usage guide
├── VOICE_ANALYSIS.md        # Detailed voice characteristics
├── FRAMEWORK_SUMMARY.md     # Complete framework overview
├── voice-profile.json       # Captured voice characteristics
├── package.json             # Package configuration
├── tsconfig.json            # TypeScript configuration
├── index.ts                 # Main entry point
├── analyzers/               # Voice analysis tools
│   ├── tone-analyzer.ts     # Tone analysis and matching
│   └── pattern-extractor.ts # Pattern extraction
├── generators/              # Text generation systems
│   ├── text-generator.ts    # Text generation
│   ├── extrapolator.ts      # Text extrapolation
│   └── voice-matcher.ts     # Voice matching and validation
├── models/                  # Data models
│   ├── voice-profile.ts     # Voice profile types
│   └── text-patterns.ts     # Text pattern definitions
├── testing/                 # A/B testing framework
│   ├── test-harness.ts      # Test execution engine
│   ├── test-runner.ts       # Test runner and reporting
│   └── test-cases.ts        # Pre-defined test cases
├── dashboard/               # Web dashboard
│   ├── server.ts            # Express server
│   └── public/              # Dashboard frontend
│       ├── index.html       # Dashboard UI
│       ├── styles.css       # Dashboard styles
│       └── app.js           # Dashboard JavaScript
└── examples/                # Usage examples
    └── usage-examples.ts    # Comprehensive examples
```

## Voice Characteristics

The captured voice exhibits:

- **Technical Precision**: Mathematical terminology (phi, azimuth, Fourier transform)
- **Systematic Structure**: Hierarchical organization with clear relationships
- **Comprehensive Detail**: Thorough descriptions with specific values and ratios
- **Domain-Specific Language**: Specialized terms (cipher, vectorized, semantic levels)
- **Professional Accessibility**: Technical but understandable
- **Relationship-Focused**: Emphasizes connections and systems
- **Numerical Precision**: Specific values (1.618, 38.2°, 61.8°)

## Key Features

### Analysis
- Extract tone characteristics from any text
- Calculate voice match scores
- Identify patterns and structures
- Provide improvement recommendations

### Generation
- Generate text matching the voice profile
- Create structured content with examples
- Maintain technical precision
- Support multiple generation styles

### Extrapolation
- Expand on existing concepts
- Add detail and examples
- Generate related content
- Maintain voice consistency

### Validation
- Validate text against voice profile
- Score voice match quality
- Automatically adjust text
- Identify strengths and issues

## Installation

```bash
cd voice-framework
npm install
```

## Web Dashboard

The framework includes an interactive web dashboard for easy access to all features:

```bash
npm run dashboard
```

Then open your browser to **http://localhost:3001**

The dashboard provides:
- **Text Generation**: Generate text matching the voice profile
- **Text Analysis**: Analyze text for tone, vocabulary, and structure
- **Extrapolation**: Expand and extrapolate on existing text
- **Voice Matching**: Check how well text matches the voice profile
- **A/B Testing**: Run test suites and compare variants
- **Test Results**: View and compare test results

See `dashboard/README.md` for more details.

## Documentation

- **QUICK_START.md**: Quick usage guide with examples
- **VOICE_ANALYSIS.md**: Detailed analysis of voice characteristics
- **FRAMEWORK_SUMMARY.md**: Complete framework overview
- **examples/usage-examples.ts**: Comprehensive code examples

## Usage Examples

See `examples/usage-examples.ts` for detailed usage patterns including:
- Text analysis and voice matching
- Text generation with various options
- Extrapolation and expansion
- Voice validation and adjustment
- Complete workflow examples

## Framework Purpose

This framework is designed to:
- Work independently from the website code
- Enable consistent voice across all generated content
- Support documentation creation and expansion
- Provide extensibility for future needs
- Maintain the distinctive voice characteristics of the design system documentation

