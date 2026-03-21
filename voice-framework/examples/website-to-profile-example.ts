/**
 * Example: Converting a website to a voice profile
 * 
 * This example demonstrates how to:
 * 1. Extract text from a website
 * 2. Build a voice profile
 * 3. Analyze for errors and UX issues
 * 4. Generate a report
 */

import { WebsiteToProfileConverter } from '../website-to-profile';

async function example() {
  console.log('Website to Profile Converter Example\n');
  
  // Initialize converter
  const converter = new WebsiteToProfileConverter();
  await converter.initialize();
  
  // Example: Convert a website to profile
  const url = 'https://example.com'; // Replace with your website URL
  const profileName = 'Example Website Profile';
  
  try {
    console.log(`Analyzing website: ${url}...\n`);
    
    // Convert website to profile
    const result = await converter.convertWebsiteToProfile(url, profileName);
    
    // Display results
    console.log('✓ Profile created successfully!');
    console.log(`  Profile ID: ${result.profileId}`);
    console.log(`  Quality Score: ${result.analysis.qualityScore}/100\n`);
    
    // Show profile characteristics
    const tone = result.profile.characteristics.tone;
    console.log('Profile Characteristics:');
    console.log(`  Formality: ${tone.formality}`);
    console.log(`  Technicality: ${tone.technicality}`);
    console.log(`  Accessibility: ${tone.accessibility}`);
    console.log(`  Precision: ${tone.precision}`);
    console.log(`  Comprehensiveness: ${tone.comprehensiveness}\n`);
    
    // Show errors and warnings
    if (result.analysis.errors.length > 0) {
      console.log(`Errors (${result.analysis.errors.length}):`);
      result.analysis.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. [${error.severity}] ${error.message}`);
      });
      console.log('');
    }
    
    if (result.analysis.warnings.length > 0) {
      console.log(`Warnings (${result.analysis.warnings.length}):`);
      result.analysis.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning.message}`);
      });
      console.log('');
    }
    
    // Show UX suggestions
    if (result.analysis.uxSuggestions.length > 0) {
      console.log(`UX Suggestions (${result.analysis.uxSuggestions.length}):`);
      result.analysis.uxSuggestions
        .filter(s => s.priority === 'high')
        .forEach((suggestion, i) => {
          console.log(`  ${i + 1}. [HIGH] ${suggestion.issue}`);
          console.log(`     → ${suggestion.suggestedImprovement}`);
        });
      console.log('');
    }
    
    // Generate full report
    const report = converter.generateReport(result);
    console.log('Full Report:');
    console.log('='.repeat(80));
    console.log(report);
    
    // Save report
    const fs = await import('fs/promises');
    const reportPath = `./website-profile-example-report-${Date.now()}.txt`;
    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(`\n✓ Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run example
example();

