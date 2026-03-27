#!/usr/bin/env node
/**
 * Obfuscate Dashboard JavaScript Files
 * 
 * This script obfuscates all JavaScript files in dashboard/public/
 * for production builds to protect client-side code.
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'dashboard', 'public');
const buildDir = join(rootDir, 'dashboard', 'public-build');

// JavaScript files to obfuscate
const jsFiles = [
  'app.js',
  'markov-chain-tracker.js',
  'topology3d.js',
  'debug-script.js'
];

/**
 * Load obfuscation configuration
 */
async function loadObfuscatorConfig() {
  try {
    const configPath = join(rootDir, 'obfuscator.config.js');
    const configModule = await import(configPath);
    return configModule.default || configModule;
  } catch (error) {
    console.error('Failed to load obfuscator config, using defaults:', error.message);
    return {
      compact: true,
      controlFlowFlattening: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      selfDefending: true,
    };
  }
}

/**
 * Obfuscate a single JavaScript file
 */
function obfuscateFile(filePath, outputPath, obfuscatorOptions) {
  try {
    console.log(`Obfuscating: ${basename(filePath)}`);
    
    // Read source file
    const sourceCode = readFileSync(filePath, 'utf8');
    
    // Obfuscate
    const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscatorOptions);
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Write obfuscated file
    writeFileSync(outputPath, obfuscatedCode, 'utf8');
    
    // Calculate size reduction
    const originalSize = Buffer.byteLength(sourceCode, 'utf8');
    const obfuscatedSize = Buffer.byteLength(obfuscatedCode, 'utf8');
    const sizeDiff = ((obfuscatedSize - originalSize) / originalSize * 100).toFixed(1);
    
    console.log(`  ✓ ${basename(filePath)}`);
    console.log(`    Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`    Obfuscated: ${(obfuscatedSize / 1024).toFixed(2)} KB`);
    console.log(`    Change: ${sizeDiff > 0 ? '+' : ''}${sizeDiff}%`);
    
    return { success: true, originalSize, obfuscatedSize };
  } catch (error) {
    console.error(`  ✗ Failed to obfuscate ${basename(filePath)}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Copy non-JS files to build directory
 */
function copyNonJsFiles() {
  try {
    const files = readdirSync(publicDir);
    let copiedCount = 0;
    
    for (const file of files) {
      const filePath = join(publicDir, file);
      const stat = statSync(filePath);
      
      // Skip JavaScript files (they'll be obfuscated)
      if (file.endsWith('.js') && jsFiles.includes(file)) {
        continue;
      }
      
      // Copy other files
      const outputPath = join(buildDir, file);
      const outputDir = dirname(outputPath);
      
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      if (stat.isFile()) {
        copyFileSync(filePath, outputPath);
        copiedCount++;
      }
    }
    
    console.log(`\nCopied ${copiedCount} non-JavaScript file(s)`);
  } catch (error) {
    console.error('Error copying non-JS files:', error.message);
  }
}

/**
 * Main obfuscation process
 */
async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('🔒 Obfuscating Dashboard JavaScript Files\n');
  console.log(`Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\n`);
  
  // Load obfuscation config
  const obfuscatorOptions = await loadObfuscatorConfig();
  
  // Check if public directory exists
  if (!existsSync(publicDir)) {
    console.error(`✗ Public directory not found: ${publicDir}`);
    process.exit(1);
  }
  
  // Create build directory
  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
  }
  
  const results = [];
  let totalOriginalSize = 0;
  let totalObfuscatedSize = 0;
  
  // Obfuscate each JavaScript file
  for (const jsFile of jsFiles) {
    const sourcePath = join(publicDir, jsFile);
    
    if (!existsSync(sourcePath)) {
      console.log(`⚠ Skipping ${jsFile} (not found)`);
      continue;
    }
    
    const outputPath = join(buildDir, jsFile);
    const result = obfuscateFile(sourcePath, outputPath, obfuscatorOptions);
    
    if (result.success) {
      results.push(result);
      totalOriginalSize += result.originalSize;
      totalObfuscatedSize += result.obfuscatedSize;
    }
  }
  
  // Copy non-JS files
  copyNonJsFiles();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Obfuscation Summary:');
  console.log('='.repeat(50));
  console.log(`Files processed: ${results.length}`);
  console.log(`Total original size: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
  console.log(`Total obfuscated size: ${(totalObfuscatedSize / 1024).toFixed(2)} KB`);
  const totalDiff = ((totalObfuscatedSize - totalOriginalSize) / totalOriginalSize * 100).toFixed(1);
  console.log(`Total change: ${totalDiff > 0 ? '+' : ''}${totalDiff}%`);
  console.log(`\nOutput directory: ${buildDir}`);
  console.log('✅ Obfuscation complete!\n');
  
  if (results.some(r => !r.success)) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { obfuscateFile, main };
