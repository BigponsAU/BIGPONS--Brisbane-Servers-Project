#!/usr/bin/env node
/**
 * Create Base Profile from All Starter Resources
 * 
 * This script creates a comprehensive base voice profile from all starter blocks.
 * The base profile captures the voice characteristics from all starter resources,
 * which SMEs can then build upon with their own documents and content.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ProfileBuilder } from '../voice-framework/builders/profile-builder';
import { ProfileManager } from '../voice-framework/storage/profile-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const RESOURCES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'resources.json');
const PROFILES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'profiles.json');

interface Resource {
  id: string;
  industry: string;
  topic: string;
  title: string;
  description: string;
  content: string;
  isStarterBlock?: boolean;
}

async function loadResources(): Promise<Resource[]> {
  try {
    const data = await fs.readFile(RESOURCES_FILE, 'utf-8');
    const resources = JSON.parse(data);
    return Array.isArray(resources) ? resources : [];
  } catch (error) {
    console.error('Error loading resources:', error);
    return [];
  }
}

async function createBaseProfile(): Promise<void> {
  console.log('🚀 Creating base profile from starter resources...\n');

  // Load all resources
  const resources = await loadResources();
  console.log(`📚 Loaded ${resources.length} total resources`);

  // Filter only starter blocks
  const starterBlocks = resources.filter(r => r.isStarterBlock === true);
  console.log(`✨ Found ${starterBlocks.length} starter blocks\n`);

  if (starterBlocks.length === 0) {
    console.error('❌ No starter blocks found. Please mark resources as starter blocks first.');
    process.exit(1);
  }

  // Extract all content from starter blocks
  const allContent = starterBlocks.map(block => block.content);
  const combinedContent = allContent.join('\n\n---\n\n');
  
  console.log(`📝 Combined content: ${combinedContent.split(/\s+/).length} words`);
  console.log(`📊 Content from ${starterBlocks.length} starter blocks\n`);

  // Initialize profile builder
  const profileBuilder = new ProfileBuilder();
  
  // Build profile from all starter block content
  console.log('🔨 Building voice profile...');
  const profile = await profileBuilder.buildFromSamples(
    allContent,
    {
      name: 'Brisbane Servers Base Profile',
      description: `Base voice profile created from ${starterBlocks.length} starter resources covering all industries and topics`,
      sourceDocument: `starter-blocks:${starterBlocks.map(b => b.id).join(',')}`
    }
  );

  console.log('✅ Profile built successfully\n');

  // Initialize profile manager
  const profileManager = new ProfileManager(PROFILES_FILE);
  await profileManager.initialize();

  // Check if base profile already exists
  const existingProfiles = profileManager.getAllProfiles();
  const existingBaseProfile = existingProfiles.find(p => 
    p.name === 'Brisbane Servers Base Profile' || 
    p.name.includes('Base Profile')
  );

  if (existingBaseProfile) {
    console.log(`⚠️  Base profile already exists: ${existingBaseProfile.name} (${existingBaseProfile.id})`);
    console.log('🔄 Updating existing base profile...\n');
    
    // Update existing profile
    await profileManager.updateProfile(existingBaseProfile.id, profile);
    await profileManager.setDefaultProfile(existingBaseProfile.id);
    console.log('✅ Base profile updated and set as default\n');
  } else {
    // Create new base profile
    console.log('💾 Creating new base profile...');
    const metadata = await profileManager.createProfile(profile, {
      name: 'Brisbane Servers Base Profile',
      description: `Base voice profile from ${starterBlocks.length} starter resources`,
      sourceDocument: `starter-blocks:${starterBlocks.length} resources`,
      isDefault: true, // Set as default
      isArchived: false,
      tags: ['base-profile', 'starter-blocks', 'default']
    });

    console.log(`✅ Base profile created: ${metadata.name} (${metadata.id})`);
    console.log('✅ Set as default profile\n');
  }

  // Display profile summary
  console.log('📋 Profile Summary:');
  console.log(`   Name: ${profile.voiceName}`);
  console.log(`   Tone: ${profile.characteristics.tone.formality} / ${profile.characteristics.tone.technicality}`);
  console.log(`   Technical Terms: ${profile.characteristics.linguisticPatterns.vocabulary.technicalTerms.length}`);
  console.log(`   Descriptive Terms: ${profile.characteristics.linguisticPatterns.vocabulary.descriptiveTerms.length}`);
  console.log(`   Voice Markers: ${profile.characteristics.voiceMarkers.openingPhrases.length} opening phrases\n`);

  console.log('🎉 Base profile ready! SMEs can now build on this foundation.');
  console.log('💡 When uploading documents, the system will combine them with this base profile.\n');
}

// Run the script
createBaseProfile().catch((error) => {
  console.error('❌ Error creating base profile:', error);
  process.exit(1);
});
