#!/usr/bin/env node
/**
 * Dashboard Build Pipeline
 * 
 * Builds and optimizes dashboard static files for production:
 * 1. Copies static files to build directory
 * 2. Obfuscates JavaScript files (production only)
 * 3. Minifies CSS (if needed)
 * 4. Verifies build output
 */

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'dashboard', 'public');
const buildDir = join(rootDir, 'dashboard', 'public-build');

// JavaScript files to obfuscate (production only)
const jsFiles = [
  'app.js',
  'markov-chain-tracker.js',
  'topology3d.js',
];

// Debug script - excluded from production builds
const debugScript = 'debug-script.js';

/**
 * Verify build output
 */
function verifyBuild(isProduction = false) {
  console.log('\n🔍 Verifying build output...\n');
  
  const errors = [];
  const warnings = [];
  
  // Check if build directory exists
  if (!existsSync(buildDir)) {
    errors.push(`Build directory does not exist: ${buildDir}`);
    return { success: false, errors, warnings };
  }
  
  // Check for required JavaScript files
  for (const jsFile of jsFiles) {
    const sourcePath = join(publicDir, jsFile);
    const buildPath = join(buildDir, jsFile);
    
    if (existsSync(sourcePath)) {
      if (!existsSync(buildPath)) {
        errors.push(`Missing obfuscated file: ${jsFile}`);
      } else {
        // Verify file is not empty
        const buildContent = readFileSync(buildPath, 'utf8');
        if (buildContent.trim().length === 0) {
          errors.push(`Empty obfuscated file: ${jsFile}`);
        } else {
          // Check if it's valid JavaScript (basic check)
          try {
            // Try to parse as JSON to check syntax (basic validation)
            if (!buildContent.includes('function') && !buildContent.includes('=>')) {
              warnings.push(`File ${jsFile} may not be valid JavaScript`);
            }
          } catch (e) {
            // Not JSON, which is fine
          }
          
          // In production, verify console statements are removed
          if (isProduction) {
            const consolePatterns = [
              { pattern: /console\.log\(/g, name: 'console.log' },
              { pattern: /console\.debug\(/g, name: 'console.debug' },
              { pattern: /console\.info\(/g, name: 'console.info' },
              { pattern: /console\.warn\(/g, name: 'console.warn' },
              { pattern: /console\.error\(/g, name: 'console.error' },
            ];
            
            for (const { pattern, name } of consolePatterns) {
              const matches = buildContent.match(pattern);
              if (matches && matches.length > 0) {
                warnings.push(`Production build contains ${name} statements in ${jsFile} (${matches.length} found)`);
              }
            }
            
            // Check for debug script references in code
            if (buildContent.includes('debug-script.js')) {
              warnings.push(`Production build contains reference to debug-script.js in ${jsFile}`);
            }
            
            // Check for source map references (should not be in production)
            if (buildContent.includes('sourceMappingURL')) {
              warnings.push(`Production build contains source map reference in ${jsFile}`);
            }
          }
        }
      }
    }
  }
  
  // Verify debug script is excluded from production builds
  if (isProduction) {
    const debugScriptPath = join(buildDir, debugScript);
    if (existsSync(debugScriptPath)) {
      warnings.push(`Debug script (${debugScript}) should not be in production build`);
    }
  }
  
  // Check for other required files (HTML, CSS)
  const requiredFiles = ['index.html'];
  for (const file of requiredFiles) {
    const buildPath = join(buildDir, file);
    if (!existsSync(buildPath)) {
      warnings.push(`Missing file: ${file} (may be optional)`);
    }
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('✗ Build verification failed:');
    errors.forEach(err => console.error(`  - ${err}`));
  }
  
  if (warnings.length > 0) {
    console.warn('⚠ Warnings:');
    warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
  
  if (errors.length === 0) {
    console.log('✅ Build verification passed!\n');
  }
  
  return { success: errors.length === 0, errors, warnings };
}

/**
 * Copy static files to build directory
 */
function copyStaticFiles(isProduction = false) {
  console.log('📁 Copying static files...\n');
  
  if (!existsSync(publicDir)) {
    throw new Error(`Public directory not found: ${publicDir}`);
  }
  
  // Create build directory
  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
  }
  
  const files = readdirSync(publicDir);
  let copiedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    const filePath = join(publicDir, file);
    const stat = statSync(filePath);
    
    // Skip JavaScript files that will be obfuscated
    if (file.endsWith('.js') && jsFiles.includes(file)) {
      skippedCount++;
      continue;
    }
    
    // Skip debug script in production builds
    if (isProduction && file === debugScript) {
      skippedCount++;
      console.log(`  ⊘ Skipped ${file} (production build)`);
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
      console.log(`  ✓ Copied ${file}`);
    }
  }
  
  console.log(`\nCopied ${copiedCount} file(s), skipped ${skippedCount} JS file(s)\n`);
}

/**
 * Main build process
 */
async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldObfuscate = isProduction || process.argv.includes('--obfuscate');
  
  console.log('🔨 Building Dashboard Static Files\n');
  console.log(`Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`Obfuscation: ${shouldObfuscate ? 'ENABLED' : 'DISABLED'}\n`);
  
  try {
    // Step 1: Copy static files
    copyStaticFiles(shouldObfuscate && isProduction);
    
    // Step 2: Obfuscate JavaScript files
    if (shouldObfuscate) {
      console.log('🔒 Obfuscating JavaScript files...\n');
      
      const JavaScriptObfuscatorModule = await import('javascript-obfuscator');
      const JavaScriptObfuscator = JavaScriptObfuscatorModule.default || JavaScriptObfuscatorModule;
      const { readFileSync, writeFileSync } = await import('fs');
      const { basename } = await import('path');
      
      // Load obfuscation config
      let obfuscatorOptions;
      try {
        const configPath = join(rootDir, 'obfuscator.config.js');
        const configModule = await import(configPath);
        const baseConfig = configModule.default || configModule;
        
        // Use production config if available, otherwise merge with production settings
        if (isProduction && configModule.getProductionConfig) {
          obfuscatorOptions = configModule.getProductionConfig();
        } else {
          // Ensure console output is disabled in production
          obfuscatorOptions = {
            ...baseConfig,
            disableConsoleOutput: isProduction,
            sourceMap: !isProduction,
          };
        }
      } catch (error) {
        console.warn('Using default obfuscation settings');
        obfuscatorOptions = {
          compact: true,
          controlFlowFlattening: true,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          selfDefending: true,
          disableConsoleOutput: isProduction,
          sourceMap: !isProduction,
        };
      }
      
      // Obfuscate each JavaScript file (exclude debug script in production)
      const filesToObfuscate = isProduction 
        ? jsFiles.filter(f => f !== debugScript)
        : jsFiles;
      
      for (const jsFile of filesToObfuscate) {
        const sourcePath = join(publicDir, jsFile);
        
        if (!existsSync(sourcePath)) {
          console.log(`⚠ Skipping ${jsFile} (not found)`);
          continue;
        }
        
        console.log(`Obfuscating: ${jsFile}`);
        const sourceCode = readFileSync(sourcePath, 'utf8');
        const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscatorOptions);
        const obfuscatedCode = obfuscationResult.getObfuscatedCode();
        
        const outputPath = join(buildDir, jsFile);
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        
        writeFileSync(outputPath, obfuscatedCode, 'utf8');
        
        const originalSize = Buffer.byteLength(sourceCode, 'utf8');
        const obfuscatedSize = Buffer.byteLength(obfuscatedCode, 'utf8');
        const sizeDiff = ((obfuscatedSize - originalSize) / originalSize * 100).toFixed(1);
        
        console.log(`  ✓ ${jsFile}`);
        console.log(`    Original: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`    Obfuscated: ${(obfuscatedSize / 1024).toFixed(2)} KB`);
        console.log(`    Change: ${sizeDiff > 0 ? '+' : ''}${sizeDiff}%\n`);
      }
    } else {
      console.log('📋 Copying JavaScript files (no obfuscation)...\n');
      
      // Just copy JS files without obfuscation
      for (const jsFile of jsFiles) {
        const sourcePath = join(publicDir, jsFile);
        const outputPath = join(buildDir, jsFile);
        
        if (existsSync(sourcePath)) {
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          copyFileSync(sourcePath, outputPath);
          console.log(`  ✓ Copied ${jsFile}`);
        }
      }
    }
    
    // Step 3: Verify build
    const verification = verifyBuild(shouldObfuscate && isProduction);
    
    if (!verification.success) {
      console.error('\n✗ Build failed verification');
      process.exit(1);
    }
    
    console.log('='.repeat(50));
    console.log('✅ Dashboard build complete!');
    console.log(`📦 Output: ${buildDir}`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n✗ Build failed:', error.message);
    console.error(error.stack);
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

export { verifyBuild, copyStaticFiles, main };
