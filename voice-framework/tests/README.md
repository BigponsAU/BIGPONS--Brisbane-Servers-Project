# Testing Infrastructure

This directory contains the test infrastructure for the Voice Framework.

## Current Setup

A basic test runner utility is provided in `setup.ts` for simple testing needs.

## Recommended: Full Testing Framework

For comprehensive testing, we recommend installing a full testing framework:

### Option 1: Jest

```bash
npm install --save-dev jest @types/jest ts-jest
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
};
```

### Option 2: Vitest (Recommended for TypeScript)

```bash
npm install --save-dev vitest @vitest/ui
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

## Writing Tests

### Using Simple Test Runner

```typescript
import { SimpleTestRunner, assertEqual } from './setup';

const runner = new SimpleTestRunner();

runner.test('Example test', () => {
  assertEqual(1 + 1, 2);
});

runner.run();
```

### Using Jest/Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { ToneAnalyzer } from '../analyzers/tone-analyzer';

describe('ToneAnalyzer', () => {
  it('should analyze text', () => {
    const analyzer = new ToneAnalyzer();
    const result = analyzer.analyzeText('Test text');
    expect(result).toBeDefined();
  });
});
```

## Test Coverage

To generate test coverage reports:

**Jest:**
```bash
npm test -- --coverage
```

**Vitest:**
```bash
npm test -- --coverage
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI (Vitest)
npm run test:ui
```
