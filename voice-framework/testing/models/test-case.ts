/**
 * Test Case Models
 * Defines structures for A/B testing text generation and voice matching
 */

import { GenerationOptions } from '../../generators/text-generator';
import { ExtrapolationOptions } from '../../generators/extrapolator';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'generation' | 'extrapolation' | 'voice-match' | 'pattern-extraction';
  variants: TestVariant[];
  expectedMetrics?: ExpectedMetrics;
  metadata?: Record<string, any>;
}

export interface TestVariant {
  id: string;
  name: string;
  description?: string;
  config: VariantConfig;
  expectedOutput?: string;
}

export interface VariantConfig {
  generator?: 'text-generator' | 'extrapolator' | 'voice-matcher';
  options?: GenerationOptions | ExtrapolationOptions | Record<string, any>;
  input?: string;
  seed?: string;
  parameters?: Record<string, any>;
}

export interface ExpectedMetrics {
  voiceMatchScore?: {
    min: number;
    max: number;
    target?: number;
  };
  technicalTermDensity?: {
    min: number;
    max: number;
    target?: number;
  };
  sentenceComplexity?: {
    min: number;
    max: number;
    target?: number;
  };
  length?: {
    min: number;
    max: number;
    target?: number;
  };
  [key: string]: any;
}

export interface TestResult {
  testCaseId: string;
  testCaseName: string;
  variantResults: VariantResult[];
  comparison: ComparisonResult;
  passed: boolean;
  timestamp: Date;
  duration: number;
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  output: string;
  metrics: VariantMetrics;
  errors?: string[];
  warnings?: string[];
}

export interface VariantMetrics {
  voiceMatchScore: number;
  technicalTermDensity: number;
  numericalPrecision: number;
  sentenceComplexity: number;
  averageSentenceLength: number;
  wordCount: number;
  characterCount: number;
  readabilityScore?: number;
  customMetrics?: Record<string, number>;
}

export interface ComparisonResult {
  winner?: string; // variantId of the best performing variant
  differences: MetricDifference[];
  statisticalSignificance?: number;
  recommendations?: string[];
}

export interface MetricDifference {
  metric: string;
  variantA: {
    id: string;
    value: number;
  };
  variantB: {
    id: string;
    value: number;
  };
  difference: number;
  percentageDifference: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  config: TestSuiteConfig;
}

export interface TestSuiteConfig {
  runInParallel?: boolean;
  timeout?: number;
  retries?: number;
  stopOnFailure?: boolean;
  outputFormat?: 'json' | 'html' | 'markdown' | 'console';
  outputPath?: string;
}


