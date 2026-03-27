# A/B Testing Framework

## Overview

The A/B testing framework allows you to compare different text generation variants, evaluate voice matching accuracy, and test extrapolation capabilities. It provides comprehensive metrics, comparisons, and reporting.

## Quick Start

```typescript
import { TestRunner, defaultTestSuite } from './testing';

const runner = new TestRunner();
const results = await runner.run(defaultTestSuite);
```

## Components

### Test Harness
The core testing engine that runs test cases and compares variants.

### Test Runner
Executes test suites and generates reports in multiple formats (JSON, HTML, Markdown, Console).

### Test Cases
Pre-defined test cases for common scenarios:
- Text generation with different styles
- Extrapolation with various expansion levels
- Voice matching accuracy
- Pattern extraction

## Creating Test Cases

```typescript
import { TestCase } from './testing/models/test-case';

const myTest: TestCase = {
  id: 'my-test-001',
  name: 'My Custom Test',
  description: 'Tests my specific scenario',
  type: 'generation', // or 'extrapolation', 'voice-match', 'pattern-extraction'
  variants: [
    {
      id: 'variant-a',
      name: 'Variant A',
      config: {
        generator: 'text-generator',
        input: 'my topic',
        options: {
          length: 'medium',
          style: 'descriptive'
        }
      }
    },
    {
      id: 'variant-b',
      name: 'Variant B',
      config: {
        generator: 'text-generator',
        input: 'my topic',
        options: {
          length: 'medium',
          style: 'technical'
        }
      }
    }
  ],
  expectedMetrics: {
    voiceMatchScore: { min: 0.7, max: 1.0 },
    technicalTermDensity: { min: 0.1, max: 0.3 }
  }
};
```

## Running Tests

### Using Test Runner

```typescript
import { TestRunner } from './testing/test-runner';
import { TestSuite } from './testing/models/test-case';

const runner = new TestRunner('./test-results');

const testSuite: TestSuite = {
  id: 'my-suite',
  name: 'My Test Suite',
  description: 'Custom test suite',
  testCases: [myTest],
  config: {
    outputFormat: 'html',
    outputPath: 'my-report.html',
    stopOnFailure: false
  }
};

const results = await runner.run(testSuite);
```

### Using Quick Start

```typescript
import { runTests, quickTestSuite } from './testing';

// Run default suite
const results = await runTests();

// Run quick suite
const quickResults = await runTests(quickTestSuite);
```

## Test Types

### Generation Tests
Compare different text generation configurations:
- Different styles (descriptive, technical, comprehensive)
- Different lengths (short, medium, long)
- Different options (with/without examples, structure)

### Extrapolation Tests
Compare extrapolation with different expansion factors:
- Conservative (1.5x)
- Moderate (2.0x)
- Aggressive (3.0x)

### Voice Match Tests
Test voice matching accuracy on various text samples:
- Design system text (should match well)
- Generic technical text (moderate match)
- Casual text (poor match)

### Pattern Extraction Tests
Test pattern extraction from complex technical text.

## Metrics

Each variant is evaluated on:

- **Voice Match Score**: How well the text matches the voice profile (0-1)
- **Technical Term Density**: Percentage of technical terms (0-1)
- **Numerical Precision**: Presence of specific numerical values
- **Sentence Complexity**: Average sentence complexity score
- **Average Sentence Length**: Words per sentence
- **Word Count**: Total words
- **Character Count**: Total characters
- **Readability Score**: Flesch Reading Ease approximation

## Comparison Results

The framework automatically compares variants and provides:

- **Winner**: Best performing variant (based on voice match score)
- **Metric Differences**: Detailed comparison of all metrics
- **Significance Levels**: High, medium, low, or none
- **Recommendations**: Suggestions for improvement

## Report Formats

### Console (Default)
Real-time output to console with color-coded results.

### JSON
Structured JSON output for programmatic processing.

### HTML
Visual HTML report with charts and detailed metrics.

### Markdown
Markdown report suitable for documentation.

## Example Output

```
🧪 Running test suite: Default Voice Framework Test Suite
   4 test case(s)

============================================================
Test Suite: Default Voice Framework Test Suite
============================================================
Total: 4 | Passed: 4 | Failed: 0
Pass Rate: 100.0% | Duration: 1234ms
============================================================

✅ Text Generation - Style Variations
   Variant Default Style:
     Voice Match: 87.3%
     Tech Terms: 15.2%
     Words: 245
   Variant Technical Style:
     Voice Match: 91.5%
     Tech Terms: 22.8%
     Words: 267
   🏆 Winner: Variant variant-b
   💡 Recommendations:
      - Variant variant-b has 4.8% better voice match
```

## Advanced Usage

### Custom Metrics

You can add custom metrics by extending the `VariantMetrics` interface:

```typescript
interface CustomMetrics extends VariantMetrics {
  myCustomMetric: number;
}
```

### Parallel Execution

Enable parallel test execution:

```typescript
const testSuite: TestSuite = {
  // ...
  config: {
    runInParallel: true,
    timeout: 30000
  }
};
```

### Retry Logic

Add retry logic for flaky tests:

```typescript
const testSuite: TestSuite = {
  // ...
  config: {
    retries: 3,
    stopOnFailure: false
  }
};
```

## Best Practices

1. **Define Clear Variants**: Each variant should test a specific hypothesis
2. **Set Expected Metrics**: Define expected ranges for better validation
3. **Use Descriptive Names**: Make test and variant names clear and meaningful
4. **Review Recommendations**: Pay attention to framework recommendations
5. **Save Reports**: Use HTML or Markdown reports for documentation
6. **Iterate**: Use test results to refine your text generation strategies

## Integration

The testing framework can be integrated into CI/CD pipelines:

```bash
# Run tests and save JSON report
npm run test -- --format json --output test-results.json

# Run tests and generate HTML report
npm run test -- --format html --output test-report.html
```


