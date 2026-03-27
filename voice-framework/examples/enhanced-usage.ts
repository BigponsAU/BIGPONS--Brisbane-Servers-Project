/**
 * Enhanced Usage Examples
 * Demonstrates text storage, profile management, and automatic profile building
 */

import { createEnhancedFramework } from '../index';

async function main() {
  console.log('🚀 Enhanced Voice Framework Demo\n');

  // Create enhanced framework with storage and profile management
  const framework = await createEnhancedFramework();

  // ============================================
  // 1. Store Text Samples
  // ============================================
  console.log('1. Storing text samples...');
  
  await framework.textStorage.addSample({
    text: 'The wave function cipher system uses phi ratios of 1.618 and azimuth angles at 38.2° to create comprehensive design blocks with mathematical precision.',
    source: 'design-system.md',
    category: 'technical',
    tags: ['design', 'mathematics', 'system']
  });

  await framework.textStorage.addSample({
    text: 'Every element on the website uses the wave function cipher system as its baseline foundation. This system creates comprehensive design blocks with mathematical precision using phi ratios and azimuth angles.',
    source: 'documentation.md',
    category: 'technical',
    tags: ['design', 'foundation', 'system']
  });

  console.log('✓ Text samples stored\n');

  // ============================================
  // 2. Store Semantic Principles
  // ============================================
  console.log('2. Storing semantic principles...');
  
  await framework.textStorage.addPrinciple({
    principle: 'Mathematical Precision',
    description: 'Use specific numerical values and ratios to convey precision',
    examples: ['phi ratio of 1.618', 'azimuth angle of 38.2°'],
    category: 'style'
  });

  await framework.textStorage.addPrinciple({
    principle: 'Comprehensive Coverage',
    description: 'Provide all-encompassing descriptions that cover all aspects',
    examples: ['comprehensive design blocks', 'all-encompassing system'],
    category: 'structure'
  });

  console.log('✓ Semantic principles stored\n');

  // ============================================
  // 3. Create Relationships
  // ============================================
  console.log('3. Creating semantic relationships...');
  
  const samples = framework.textStorage.getSamples();
  const principles = framework.textStorage.getPrinciples();
  
  if (samples.length > 0 && principles.length > 0) {
    await framework.textStorage.addRelationship({
      sourceId: samples[0].id,
      targetId: principles[0].id,
      relationshipType: 'related',
      strength: 0.9,
      description: 'Sample demonstrates mathematical precision principle'
    });
  }

  console.log('✓ Relationships created\n');

  // ============================================
  // 4. Build Profile from Stored Samples
  // ============================================
  console.log('4. Building voice profile from stored samples...');
  
  const allSamples = framework.textStorage.getSamples();
  const profile = await framework.profileBuilder.buildFromSamples(
    allSamples,
    {
      name: 'Generated Design System Voice',
      description: 'Auto-generated from stored text samples',
      sourceDocument: 'stored-samples'
    }
  );

  console.log('✓ Profile built:', profile.voiceName);
  console.log('  - Technicality:', profile.characteristics.tone.technicality);
  console.log('  - Precision:', profile.characteristics.tone.precision);
  console.log('  - Technical terms:', profile.characteristics.linguisticPatterns.vocabulary.technicalTerms.length);
  console.log('');

  // ============================================
  // 5. Save Profile to Profile Manager
  // ============================================
  console.log('5. Saving profile to profile manager...');
  
  const metadata = await framework.profileManager.createProfile(profile, {
    name: 'Generated Design System Voice',
    description: 'Auto-generated from stored text samples',
    version: '1.0.0',
    tags: ['auto-generated', 'design-system'],
    isDefault: false
  });

  console.log('✓ Profile saved with ID:', metadata.id);
  console.log('');

  // ============================================
  // 6. Use Profile for Generation
  // ============================================
  console.log('6. Using profile for text generation...');
  
  // Create a new analyzer with the generated profile
  const { ToneAnalyzer } = await import('../analyzers/tone-analyzer');
  const customAnalyzer = new ToneAnalyzer(profile);
  
  const testText = 'The system uses various components.';
  const analysis = customAnalyzer.analyzeText(testText);
  const match = customAnalyzer.compareToProfile(analysis);
  
  console.log('✓ Analysis complete');
  console.log('  - Voice match score:', match.overallMatch.toFixed(2));
  console.log('  - Technical match:', match.technicalMatch.toFixed(2));
  console.log('');

  // ============================================
  // 7. List All Profiles
  // ============================================
  console.log('7. Listing all profiles...');
  
  const allProfiles = framework.profileManager.getAllProfiles();
  console.log(`✓ Found ${allProfiles.length} profile(s):`);
  allProfiles.forEach(p => {
    console.log(`  - ${p.name} (${p.id})`);
  });
  console.log('');

  // ============================================
  // 8. Get Statistics
  // ============================================
  console.log('8. Storage statistics...');
  
  const stats = framework.textStorage.getStats();
  console.log('✓ Statistics:');
  console.log('  - Total samples:', stats.totalSamples);
  console.log('  - Total principles:', stats.totalPrinciples);
  console.log('  - Total relationships:', stats.totalRelationships);
  console.log('  - Categories:', stats.categories.samples.join(', '));
  console.log('');

  console.log('✅ Enhanced framework demo complete!');
}

// Run the demo
main().catch(console.error);

