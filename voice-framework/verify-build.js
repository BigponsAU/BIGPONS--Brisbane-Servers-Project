#!/usr/bin/env node
/**
 * Build Verification Script
 * Verifies that all components are compiled correctly
 */

import { existsSync } from 'fs';
import { join } from 'path';

const distPath = './dist';

const requiredFiles = [
  // Core analyzers
  'analyzers/tone-analyzer.js',
  'analyzers/pattern-extractor.js',
  'analyzers/shredder.js',
  
  // Generators
  'generators/text-generator.js',
  'generators/extrapolator.js',
  'generators/voice-matcher.js',
  
  // Storage
  'storage/text-storage.js',
  'storage/profile-manager.js',
  
  // Builders
  'builders/profile-builder.js',
  
  // Parsers
  'parsers/document-parser.js',
  
  // Processors
  'processors/document-processor.js',
  
  // Main entry
  'index.js',
  
  // Models
  'models/voice-profile.js',
  'models/text-patterns.js'
];

console.log('🔍 Verifying build...\n');

let allPresent = true;
const missing = [];
const present = [];

for (const file of requiredFiles) {
  const fullPath = join(distPath, file);
  if (existsSync(fullPath)) {
    present.push(file);
    console.log(`✅ ${file}`);
  } else {
    missing.push(file);
    console.log(`❌ ${file} - MISSING`);
    allPresent = false;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Present: ${present.length}/${requiredFiles.length}`);
console.log(`   Missing: ${missing.length}/${requiredFiles.length}`);

if (allPresent) {
  console.log(`\n✅ All files compiled successfully!`);
  process.exit(0);
} else {
  console.log(`\n❌ Some files are missing. Run: npm run build`);
  process.exit(1);
}

