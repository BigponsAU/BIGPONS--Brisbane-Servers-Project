/**
 * Shredder Example
 * Demonstrates the Shredder's objective truth extraction
 */

import { Shredder } from '../analyzers/shredder';

async function main() {
  console.log('🔍 Shredder - Objective Truth Analyzer\n');
  console.log('The Shredder analyzes input without bias from the owner\'s voice profile.');
  console.log('It "tails to the truths of that which it receives" - extracting factual content.\n');

  const shredder = new Shredder();

  // Example 1: Technical text
  const technicalText = `
    The wave function cipher system employs phi ratios of 1.618, azimuth angles at 38.2° and 61.8°, 
    and Fourier transforms to create vectorized design blocks with semantic levels ranging from 0 to 5.
    The system uses mathematical precision to generate comprehensive design patterns.
  `;

  console.log('='.repeat(80));
  console.log('Example 1: Technical System Description');
  console.log('='.repeat(80));
  console.log('Input:', technicalText.trim());
  console.log('\n');

  const analysis1 = shredder.shred(technicalText);
  
  console.log(`📊 Summary:`);
  console.log(`   Total Truths Extracted: ${analysis1.summary.totalTruths}`);
  console.log(`   Facts/Values: ${analysis1.summary.factCount}`);
  console.log(`   Definitions: ${analysis1.summary.definitionCount}`);
  console.log(`   Relationships: ${analysis1.truths.filter(t => t.type === 'relationship').length}`);
  console.log(`   Average Confidence: ${(analysis1.summary.averageConfidence * 100).toFixed(1)}%`);
  console.log(`\n   Key Entities: ${analysis1.summary.keyEntities.join(', ')}`);
  console.log(`   Key Values: ${analysis1.summary.keyValues.join(', ')}`);
  
  console.log(`\n🎯 Objective Voice Analysis:`);
  console.log(`   Tone: ${analysis1.objectiveVoice.tone}`);
  console.log(`   Formality: ${(analysis1.objectiveVoice.formality * 100).toFixed(1)}%`);
  console.log(`   Precision: ${(analysis1.objectiveVoice.precision * 100).toFixed(1)}%`);
  console.log(`   Complexity: ${(analysis1.objectiveVoice.complexity * 100).toFixed(1)}%`);

  console.log(`\n📝 Extracted Truths:`);
  analysis1.truths.forEach((truth, index) => {
    console.log(`\n   ${index + 1}. [${truth.type.toUpperCase()}] ${truth.claim}`);
    console.log(`      Confidence: ${(truth.confidence * 100).toFixed(0)}%`);
    if (truth.metadata?.numericalValues) {
      console.log(`      Values: ${truth.metadata.numericalValues.join(', ')}`);
    }
    if (truth.metadata?.entities && truth.metadata.entities.length > 0) {
      console.log(`      Entities: ${truth.metadata.entities.join(', ')}`);
    }
  });

  // Example 2: Definition text
  const definitionText = `
    A design system is a collection of reusable components, guided by clear standards, 
    that can be assembled to build applications. The system uses modular architecture 
    to create consistent user interfaces. Design tokens are the visual design atoms 
    of the design system.
  `;

  console.log('\n\n' + '='.repeat(80));
  console.log('Example 2: Definitions and Relationships');
  console.log('='.repeat(80));
  console.log('Input:', definitionText.trim());
  console.log('\n');

  const analysis2 = shredder.shred(definitionText);
  
  console.log(`📊 Summary:`);
  console.log(`   Total Truths: ${analysis2.summary.totalTruths}`);
  console.log(`   Definitions: ${analysis2.summary.definitionCount}`);
  console.log(`   Relationships: ${analysis2.truths.filter(t => t.type === 'relationship').length}`);
  
  console.log(`\n📝 Key Extracted Truths:`);
  analysis2.truths.slice(0, 5).forEach((truth, index) => {
    console.log(`   ${index + 1}. [${truth.type}] ${truth.claim}`);
  });

  // Example 3: Compare two analyses
  console.log('\n\n' + '='.repeat(80));
  console.log('Example 3: Comparing Truths from Multiple Sources');
  console.log('='.repeat(80));

  const comparison = shredder.compareTruths(analysis1, analysis2);
  
  console.log(`\n📊 Comparison Results:`);
  console.log(`   Common Truths: ${comparison.commonTruths.length}`);
  console.log(`   Unique to First: ${comparison.uniqueToFirst.length}`);
  console.log(`   Unique to Second: ${comparison.uniqueToSecond.length}`);
  console.log(`   Conflicts: ${comparison.conflicts.length}`);

  if (comparison.commonTruths.length > 0) {
    console.log(`\n   Common Truths Found:`);
    comparison.commonTruths.slice(0, 3).forEach((truth, index) => {
      console.log(`      ${index + 1}. ${truth.claim}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Shredder analysis complete!');
  console.log('='.repeat(80));
}

main().catch(console.error);

