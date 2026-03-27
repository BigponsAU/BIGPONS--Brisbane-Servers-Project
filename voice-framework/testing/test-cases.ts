/**
 * Test Cases
 * Pre-defined test cases for A/B testing the voice framework
 */

import { TestCase, TestSuite } from './models/test-case';

/**
 * Test case: Text generation with different styles
 */
export const textGenerationTest: TestCase = {
  id: 'text-gen-001',
  name: 'Text Generation - Style Variations',
  description: 'Tests text generation with different style options',
  type: 'generation',
  variants: [
    {
      id: 'variant-a',
      name: 'Default Style',
      description: 'Standard generation with default options',
      config: {
        generator: 'text-generator',
        input: 'wave function cipher system',
        options: {
          length: 'medium',
          includeExamples: true,
          style: 'descriptive'
        }
      }
    },
    {
      id: 'variant-b',
      name: 'Technical Style',
      description: 'Generation with technical emphasis',
      config: {
        generator: 'text-generator',
        input: 'wave function cipher system',
        options: {
          length: 'medium',
          includeExamples: true,
          style: 'technical'
        }
      }
    },
    {
      id: 'variant-c',
      name: 'Comprehensive Style',
      description: 'Generation with comprehensive detail',
      config: {
        generator: 'text-generator',
        input: 'wave function cipher system',
        options: {
          length: 'long',
          includeExamples: true,
          style: 'comprehensive'
        }
      }
    }
  ],
  expectedMetrics: {
    voiceMatchScore: { min: 0.7, max: 1.0 },
    technicalTermDensity: { min: 0.1, max: 0.3 },
    length: { min: 100, max: 1000 }
  }
};

/**
 * Test case: Extrapolation with different expansion levels
 */
export const extrapolationTest: TestCase = {
  id: 'extrapolation-001',
  name: 'Extrapolation - Expansion Levels',
  description: 'Tests extrapolation with different expansion factors',
  type: 'extrapolation',
  variants: [
    {
      id: 'variant-a',
      name: 'Conservative Expansion',
      config: {
        generator: 'extrapolator',
        input: 'The wave function cipher system uses mathematical principles.',
        options: {
          expansionFactor: 1.5,
          maintainStructure: true
        }
      }
    },
    {
      id: 'variant-b',
      name: 'Moderate Expansion',
      config: {
        generator: 'extrapolator',
        input: 'The wave function cipher system uses mathematical principles.',
        options: {
          expansionFactor: 2.0,
          maintainStructure: true
        }
      }
    },
    {
      id: 'variant-c',
      name: 'Aggressive Expansion',
      config: {
        generator: 'extrapolator',
        input: 'The wave function cipher system uses mathematical principles.',
        options: {
          expansionFactor: 3.0,
          maintainStructure: true
        }
      }
    }
  ],
  expectedMetrics: {
    voiceMatchScore: { min: 0.75, max: 1.0 },
    technicalTermDensity: { min: 0.1, max: 0.3 }
  }
};

/**
 * Test case: Voice matching accuracy
 */
export const voiceMatchTest: TestCase = {
  id: 'voice-match-001',
  name: 'Voice Match - Sample Texts',
  description: 'Tests voice matching accuracy on various sample texts',
  type: 'voice-match',
  variants: [
    {
      id: 'variant-a',
      name: 'Design System Text',
      config: {
        generator: 'voice-matcher',
        input: 'Every element on the website uses the wave function cipher system as its baseline foundation. This system creates comprehensive design blocks with mathematical precision using phi ratios and azimuth angles.'
      }
    },
    {
      id: 'variant-b',
      name: 'Generic Technical Text',
      config: {
        generator: 'voice-matcher',
        input: 'The system uses various components to create a user interface. These components are organized in a structured way to provide functionality.'
      }
    },
    {
      id: 'variant-c',
      name: 'Casual Text',
      config: {
        generator: 'voice-matcher',
        input: 'Hey, this website is pretty cool. It has some nice features and looks good. Check it out!'
      }
    }
  ],
  expectedMetrics: {
    voiceMatchScore: { min: 0.0, max: 1.0 }
  }
};

/**
 * Test case: Pattern extraction accuracy
 */
export const patternExtractionTest: TestCase = {
  id: 'pattern-extract-001',
  name: 'Pattern Extraction - Complex Text',
  description: 'Tests pattern extraction from complex technical text',
  type: 'pattern-extraction',
  variants: [
    {
      id: 'variant-a',
      name: 'Full Extraction',
      config: {
        input: 'The wave function cipher system employs phi ratios of 1.618, azimuth angles at 38.2° and 61.8°, and Fourier transforms to create vectorized design blocks with semantic levels ranging from 0 to 5.'
      }
    }
  ]
};

/**
 * Complete test suite
 */
export const defaultTestSuite: TestSuite = {
  id: 'default-suite-001',
  name: 'Default Voice Framework Test Suite',
  description: 'Comprehensive test suite for voice framework A/B testing',
  testCases: [
    textGenerationTest,
    extrapolationTest,
    voiceMatchTest,
    patternExtractionTest
  ],
  config: {
    runInParallel: false,
    timeout: 30000,
    retries: 0,
    stopOnFailure: false,
    outputFormat: 'console',
    outputPath: 'test-report.json'
  }
};

/**
 * Quick test suite (faster, fewer tests)
 */
export const quickTestSuite: TestSuite = {
  id: 'quick-suite-001',
  name: 'Quick Test Suite',
  description: 'Fast test suite for quick validation',
  testCases: [
    textGenerationTest,
    voiceMatchTest
  ],
  config: {
    runInParallel: false,
    timeout: 15000,
    outputFormat: 'console'
  }
};


