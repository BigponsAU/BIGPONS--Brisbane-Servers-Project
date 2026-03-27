/**
 * Test Runner
 * Executes test suites and generates reports
 */

import { TestHarness, TestSuiteResult } from './test-harness';
import { TestSuite, TestCase } from './models/test-case';
import * as fs from 'fs';
import * as path from 'path';

export class TestRunner {
  private harness: TestHarness;
  private outputDir: string;

  constructor(outputDir: string = './test-results') {
    this.harness = new TestHarness();
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  /**
   * Runs a test suite and generates report
   */
  async run(testSuite: TestSuite): Promise<TestSuiteResult> {
    console.log(`\n🧪 Running test suite: ${testSuite.name}`);
    console.log(`   ${testSuite.testCases.length} test case(s)\n`);

    const result = await this.harness.runTestSuite(testSuite);

    // Generate report
    const report = this.generateReport(result, testSuite.config?.outputFormat || 'console');

    // Save report if output path specified
    if (testSuite.config?.outputPath) {
      this.saveReport(report, testSuite.config.outputPath, testSuite.config.outputFormat || 'json');
    }

    // Print summary
    this.printSummary(result);

    return result;
  }

  /**
   * Generates a report in the specified format
   */
  private generateReport(result: TestSuiteResult, format: string): string {
    switch (format) {
      case 'json':
        return this.generateJSONReport(result);
      case 'html':
        return this.generateHTMLReport(result);
      case 'markdown':
        return this.generateMarkdownReport(result);
      case 'console':
      default:
        return this.generateConsoleReport(result);
    }
  }

  /**
   * Generates JSON report
   */
  private generateJSONReport(result: TestSuiteResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Generates HTML report
   */
  private generateHTMLReport(result: TestSuiteResult): string {
    const passedColor = result.summary.passed === result.summary.total ? '#28a745' : '#dc3545';
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${result.suiteName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .summary-item { display: inline-block; margin-right: 20px; }
    .summary-value { font-size: 24px; font-weight: bold; color: ${passedColor}; }
    .test-case { border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 5px; }
    .test-case.passed { border-left: 4px solid #28a745; }
    .test-case.failed { border-left: 4px solid #dc3545; }
    .variant { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 10px 0; }
    .metric { background: white; padding: 8px; border-radius: 3px; }
    .metric-label { font-size: 12px; color: #666; }
    .metric-value { font-size: 18px; font-weight: bold; }
    .comparison { background: #e7f3ff; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .recommendation { background: #fff3cd; padding: 8px; margin: 5px 0; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Test Report: ${result.suiteName}</h1>
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Total Tests</div>
        <div class="summary-value">${result.summary.total}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Passed</div>
        <div class="summary-value">${result.summary.passed}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Failed</div>
        <div class="summary-value">${result.summary.failed}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Pass Rate</div>
        <div class="summary-value">${result.summary.passRate.toFixed(1)}%</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Duration</div>
        <div class="summary-value">${result.summary.duration}ms</div>
      </div>
    </div>
    ${result.results.map(r => this.generateTestCaseHTML(r)).join('')}
  </div>
</body>
</html>`;
  }

  /**
   * Generates HTML for a single test case
   */
  private generateTestCaseHTML(result: any): string {
    const statusClass = result.passed ? 'passed' : 'failed';
    const statusIcon = result.passed ? '✅' : '❌';
    
    return `
    <div class="test-case ${statusClass}">
      <h3>${statusIcon} ${result.testCaseName}</h3>
      ${result.variantResults.map((v: any) => `
        <div class="variant">
          <h4>Variant: ${v.variantName}</h4>
          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Voice Match</div>
              <div class="metric-value">${(v.metrics.voiceMatchScore * 100).toFixed(1)}%</div>
            </div>
            <div class="metric">
              <div class="metric-label">Tech Terms</div>
              <div class="metric-value">${(v.metrics.technicalTermDensity * 100).toFixed(1)}%</div>
            </div>
            <div class="metric">
              <div class="metric-label">Word Count</div>
              <div class="metric-value">${v.metrics.wordCount}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Complexity</div>
              <div class="metric-value">${v.metrics.sentenceComplexity.toFixed(2)}</div>
            </div>
          </div>
          <details>
            <summary>Output</summary>
            <pre style="background: #f8f9fa; padding: 10px; overflow-x: auto;">${this.escapeHtml(v.output.substring(0, 500))}${v.output.length > 500 ? '...' : ''}</pre>
          </details>
        </div>
      `).join('')}
      ${result.comparison.winner ? `
        <div class="comparison">
          <strong>Winner:</strong> Variant ${result.comparison.winner}
        </div>
      ` : ''}
      ${result.comparison.recommendations && result.comparison.recommendations.length > 0 ? `
        <div>
          <strong>Recommendations:</strong>
          ${result.comparison.recommendations.map((r: string) => `
            <div class="recommendation">${this.escapeHtml(r)}</div>
          `).join('')}
        </div>
      ` : ''}
    </div>`;
  }

  /**
   * Generates Markdown report
   */
  private generateMarkdownReport(result: TestSuiteResult): string {
    let md = `# Test Report: ${result.suiteName}\n\n`;
    md += `**Date:** ${result.timestamp.toISOString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Tests:** ${result.summary.total}\n`;
    md += `- **Passed:** ${result.summary.passed}\n`;
    md += `- **Failed:** ${result.summary.failed}\n`;
    md += `- **Pass Rate:** ${result.summary.passRate.toFixed(1)}%\n`;
    md += `- **Duration:** ${result.summary.duration}ms\n\n`;

    md += `## Test Results\n\n`;
    for (const testResult of result.results) {
      const status = testResult.passed ? '✅ PASSED' : '❌ FAILED';
      md += `### ${status}: ${testResult.testCaseName}\n\n`;
      
      for (const variant of testResult.variantResults) {
        md += `#### Variant: ${variant.variantName}\n\n`;
        md += `- Voice Match Score: ${(variant.metrics.voiceMatchScore * 100).toFixed(1)}%\n`;
        md += `- Technical Term Density: ${(variant.metrics.technicalTermDensity * 100).toFixed(1)}%\n`;
        md += `- Word Count: ${variant.metrics.wordCount}\n`;
        md += `- Sentence Complexity: ${variant.metrics.sentenceComplexity.toFixed(2)}\n\n`;
        md += `**Output:**\n\`\`\`\n${variant.output.substring(0, 200)}${variant.output.length > 200 ? '...' : ''}\n\`\`\`\n\n`;
      }

      if (testResult.comparison.winner) {
        md += `**Winner:** Variant ${testResult.comparison.winner}\n\n`;
      }

      if (testResult.comparison.recommendations && testResult.comparison.recommendations.length > 0) {
        md += `**Recommendations:**\n`;
        for (const rec of testResult.comparison.recommendations) {
          md += `- ${rec}\n`;
        }
        md += `\n`;
      }
    }

    return md;
  }

  /**
   * Generates console report
   */
  private generateConsoleReport(result: TestSuiteResult): string {
    // Console output is handled by printSummary
    return '';
  }

  /**
   * Prints summary to console
   */
  private printSummary(result: TestSuiteResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`Test Suite: ${result.suiteName}`);
    console.log('='.repeat(60));
    console.log(`Total: ${result.summary.total} | Passed: ${result.summary.passed} | Failed: ${result.summary.failed}`);
    console.log(`Pass Rate: ${result.summary.passRate.toFixed(1)}% | Duration: ${result.summary.duration}ms`);
    console.log('='.repeat(60) + '\n');

    for (const testResult of result.results) {
      const icon = testResult.passed ? '✅' : '❌';
      console.log(`${icon} ${testResult.testCaseName}`);
      
      for (const variant of testResult.variantResults) {
        console.log(`   Variant ${variant.variantName}:`);
        console.log(`     Voice Match: ${(variant.metrics.voiceMatchScore * 100).toFixed(1)}%`);
        console.log(`     Tech Terms: ${(variant.metrics.technicalTermDensity * 100).toFixed(1)}%`);
        console.log(`     Words: ${variant.metrics.wordCount}`);
      }

      if (testResult.comparison.winner) {
        console.log(`   🏆 Winner: Variant ${testResult.comparison.winner}`);
      }

      if (testResult.comparison.recommendations && testResult.comparison.recommendations.length > 0) {
        console.log(`   💡 Recommendations:`);
        for (const rec of testResult.comparison.recommendations) {
          console.log(`      - ${rec}`);
        }
      }
      console.log('');
    }
  }

  /**
   * Saves report to file
   */
  private saveReport(report: string, filePath: string, format: string): void {
    const fullPath = path.join(this.outputDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, report, 'utf-8');
    console.log(`\n📄 Report saved to: ${fullPath}`);
  }

  /**
   * Escapes HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Ensures output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}


