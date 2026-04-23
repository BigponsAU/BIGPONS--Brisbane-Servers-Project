/**
 * Test Harness
 * Runs A/B tests comparing different text generation variants
 */

import { ToneAnalyzer, type ToneAnalysis } from '../analyzers/tone-analyzer';
import { PatternExtractor } from '../analyzers/pattern-extractor';
import { TextGenerator } from '../generators/text-generator';
import { Extrapolator } from '../generators/extrapolator';
import { VoiceMatcher } from '../generators/voice-matcher';
import type {
  TestCase,
  TestResult,
  VariantResult,
  VariantMetrics,
  ComparisonResult,
  MetricDifference,
  TestSuite,
  TestSuiteConfig
} from './models/test-case';

export class TestHarness {
  private toneAnalyzer: ToneAnalyzer;
  private patternExtractor: PatternExtractor;
  private textGenerator: TextGenerator;
  private extrapolator: Extrapolator;
  private voiceMatcher: VoiceMatcher;

  constructor() {
    this.toneAnalyzer = new ToneAnalyzer();
    this.patternExtractor = new PatternExtractor();
    this.textGenerator = new TextGenerator();
    this.extrapolator = new Extrapolator();
    this.voiceMatcher = new VoiceMatcher();
  }

  /**
   * Runs a single test case with A/B comparison
   */
  async runTestCase(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const variantResults: VariantResult[] = [];

    // Run each variant
    for (const variant of testCase.variants) {
      try {
        const result = await this.runVariant(testCase, variant);
        variantResults.push(result);
      } catch (error) {
        variantResults.push({
          variantId: variant.id,
          variantName: variant.name,
          output: '',
          metrics: this.createEmptyMetrics(),
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    // Compare variants
    const comparison = this.compareVariants(variantResults, testCase);

    // Determine if test passed
    const passed = this.evaluateTest(testCase, variantResults, comparison);

    const duration = Date.now() - startTime;

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      variantResults,
      comparison,
      passed,
      timestamp: new Date(),
      duration
    };
  }

  /**
   * Runs a single variant
   */
  private async runVariant(testCase: TestCase, variant: any): Promise<VariantResult> {
    const warnings: string[] = [];
    let output = '';

    // Generate output based on test type
    switch (testCase.type) {
      case 'generation':
        output = this.textGenerator.generateText(
          variant.config.input || variant.config.seed || 'default topic',
          variant.config.options || {}
        );
        break;

      case 'extrapolation':
        if (!variant.config.input) {
          throw new Error('Extrapolation requires input text');
        }
        output = this.extrapolator.extrapolate(
          variant.config.input,
          variant.config.options || {}
        );
        break;

      case 'voice-match':
        if (!variant.config.input) {
          throw new Error('Voice match requires input text');
        }
        const matchResult = this.voiceMatcher.scoreMatch(variant.config.input);
        output = variant.config.input; // Use input as output for voice-match tests
        warnings.push(`Voice match score: ${matchResult.overallMatch.toFixed(2)}`);
        break;

      case 'pattern-extraction':
        if (!variant.config.input) {
          throw new Error('Pattern extraction requires input text');
        }
        const patterns = this.patternExtractor.extractPatterns(variant.config.input);
        output = JSON.stringify(patterns, null, 2);
        break;

      default:
        throw new Error(`Unknown test type: ${testCase.type}`);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(output);

    return {
      variantId: variant.id,
      variantName: variant.name,
      output,
      metrics,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Calculates metrics for a variant output
   */
  private calculateMetrics(text: string): VariantMetrics {
    const analysis = this.toneAnalyzer.analyzeText(text);
    const match = this.toneAnalyzer.compareToProfile(analysis);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    return {
      voiceMatchScore: match.overallMatch,
      technicalTermDensity: analysis.technicalTermDensity,
      numericalPrecision: analysis.numericalPrecision.hasSpecificValues ? analysis.numericalPrecision.count : 0,
      sentenceComplexity: analysis.sentenceComplexity.averageLength,
      averageSentenceLength: sentences.length > 0
        ? words.length / sentences.length
        : 0,
      wordCount: words.length,
      characterCount: text.length,
      readabilityScore: this.calculateReadability(text)
    };
  }

  /**
   * Calculates a simple readability score
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.estimateSyllables(text);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimates syllable count (simplified)
   */
  private estimateSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length <= 3) {
        count += 1;
      } else {
        count += Math.max(1, cleaned.match(/[aeiouy]+/g)?.length || 1);
      }
    }
    return count;
  }

  /**
   * Compares multiple variants
   */
  private compareVariants(
    variantResults: VariantResult[],
    testCase: TestCase
  ): ComparisonResult {
    if (variantResults.length < 2) {
      return {
        differences: [],
        recommendations: ['Need at least 2 variants for comparison']
      };
    }

    const differences: MetricDifference[] = [];
    const metricKeys = this.getMetricKeys(variantResults[0].metrics);

    // Compare each pair of variants
    for (let i = 0; i < variantResults.length; i++) {
      for (let j = i + 1; j < variantResults.length; j++) {
        const variantA = variantResults[i];
        const variantB = variantResults[j];

        for (const metricKey of metricKeys) {
          const valueA = variantA.metrics[metricKey as keyof VariantMetrics] as number;
          const valueB = variantB.metrics[metricKey as keyof VariantMetrics] as number;

          if (valueA !== undefined && valueB !== undefined) {
            const difference = valueB - valueA;
            const percentageDifference = valueA !== 0
              ? (difference / valueA) * 100
              : 0;

            differences.push({
              metric: metricKey,
              variantA: {
                id: variantA.variantId,
                value: valueA
              },
              variantB: {
                id: variantB.variantId,
                value: valueB
              },
              difference,
              percentageDifference,
              significance: this.determineSignificance(metricKey, Math.abs(percentageDifference))
            });
          }
        }
      }
    }

    // Determine winner (best voice match score)
    const winner = variantResults.reduce((best, current) => {
      return current.metrics.voiceMatchScore > best.metrics.voiceMatchScore
        ? current
        : best;
    }, variantResults[0]);

    const recommendations = this.generateRecommendations(variantResults, differences);

    return {
      winner: winner.variantId,
      differences,
      recommendations
    };
  }

  /**
   * Gets all metric keys from metrics object
   */
  private getMetricKeys(metrics: VariantMetrics): string[] {
    const keys: string[] = [];
    for (const key in metrics) {
      if (typeof metrics[key as keyof VariantMetrics] === 'number') {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Determines significance of a metric difference
   */
  private determineSignificance(metric: string, percentageDiff: number): 'high' | 'medium' | 'low' | 'none' {
    const thresholds: Record<string, { high: number; medium: number; low: number }> = {
      voiceMatchScore: { high: 10, medium: 5, low: 2 },
      technicalTermDensity: { high: 20, medium: 10, low: 5 },
      sentenceComplexity: { high: 15, medium: 8, low: 3 },
      averageSentenceLength: { high: 25, medium: 15, low: 5 }
    };

    const threshold = thresholds[metric] || { high: 15, medium: 8, low: 3 };

    if (percentageDiff >= threshold.high) return 'high';
    if (percentageDiff >= threshold.medium) return 'medium';
    if (percentageDiff >= threshold.low) return 'low';
    return 'none';
  }

  /**
   * Generates recommendations based on comparison
   */
  private generateRecommendations(
    variantResults: VariantResult[],
    differences: MetricDifference[]
  ): string[] {
    const recommendations: string[] = [];

    // Find significant differences
    const significantDiffs = differences.filter(d => d.significance === 'high' || d.significance === 'medium');

    if (significantDiffs.length > 0) {
      recommendations.push(`Found ${significantDiffs.length} significant metric differences between variants`);
    }

    // Check voice match scores
    const voiceMatchDiffs = differences.filter(d => d.metric === 'voiceMatchScore');
    if (voiceMatchDiffs.length > 0) {
      const bestDiff = voiceMatchDiffs.reduce((best, current) => {
        return Math.abs(current.percentageDifference) > Math.abs(best.percentageDifference)
          ? current
          : best;
      }, voiceMatchDiffs[0]);

      if (bestDiff.variantB.value > bestDiff.variantA.value) {
        recommendations.push(
          `Variant ${bestDiff.variantB.id} has ${bestDiff.percentageDifference.toFixed(1)}% better voice match`
        );
      }
    }

    // Check technical term density
    const techDiffs = differences.filter(d => d.metric === 'technicalTermDensity');
    if (techDiffs.length > 0) {
      const avgDensity = variantResults.reduce((sum, v) => sum + v.metrics.technicalTermDensity, 0) / variantResults.length;
      if (avgDensity < 0.1) {
        recommendations.push('Consider increasing technical term density to better match voice profile');
      }
    }

    return recommendations;
  }

  /**
   * Evaluates if test passed based on expected metrics
   */
  private evaluateTest(
    testCase: TestCase,
    variantResults: VariantResult[],
    comparison: ComparisonResult
  ): boolean {
    if (!testCase.expectedMetrics) {
      // If no expected metrics, test passes if no errors
      return variantResults.every(v => !v.errors || v.errors.length === 0);
    }

    // Check each variant against expected metrics
    for (const variantResult of variantResults) {
      const metrics = variantResult.metrics;
      const expected = testCase.expectedMetrics;

      // Check voice match score
      if (expected.voiceMatchScore) {
        if (metrics.voiceMatchScore < expected.voiceMatchScore.min ||
            metrics.voiceMatchScore > expected.voiceMatchScore.max) {
          return false;
        }
      }

      // Check technical term density
      if (expected.technicalTermDensity) {
        if (metrics.technicalTermDensity < expected.technicalTermDensity.min ||
            metrics.technicalTermDensity > expected.technicalTermDensity.max) {
          return false;
        }
      }

      // Check sentence complexity
      if (expected.sentenceComplexity) {
        if (metrics.sentenceComplexity < expected.sentenceComplexity.min ||
            metrics.sentenceComplexity > expected.sentenceComplexity.max) {
          return false;
        }
      }

      // Check length
      if (expected.length) {
        if (metrics.wordCount < expected.length.min ||
            metrics.wordCount > expected.length.max) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Creates empty metrics object
   */
  private createEmptyMetrics(): VariantMetrics {
    return {
      voiceMatchScore: 0,
      technicalTermDensity: 0,
      numericalPrecision: 0,
      sentenceComplexity: 0,
      averageSentenceLength: 0,
      wordCount: 0,
      characterCount: 0
    };
  }

  /**
   * Runs a test suite
   */
  async runTestSuite(testSuite: TestSuite): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const config = testSuite.config || {};

    for (const testCase of testSuite.testCases) {
      try {
        const result = await this.runTestCase(testCase);
        results.push(result);

        if (config.stopOnFailure && !result.passed) {
          break;
        }
      } catch (error) {
        // Create error result
        results.push({
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          variantResults: [],
          comparison: { differences: [] },
          passed: false,
          timestamp: new Date(),
          duration: 0
        });
      }
    }

    const duration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    return {
      suiteId: testSuite.id,
      suiteName: testSuite.name,
      results,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        duration,
        passRate: totalCount > 0 ? (passedCount / totalCount) * 100 : 0
      },
      timestamp: new Date()
    };
  }
}

export interface TestSuiteResult {
  suiteId: string;
  suiteName: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
    passRate: number;
  };
  timestamp: Date;
}


