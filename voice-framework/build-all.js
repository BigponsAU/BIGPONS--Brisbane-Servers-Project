#!/usr/bin/env node
/**
 * Build script to ensure all TypeScript files are compiled
 * Optionally builds and obfuscates dashboard static files
 */
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');

// Check for --obfuscate flag
const shouldObfuscate = process.argv.includes('--obfuscate');
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔨 Building Voice Framework...\n');
if (shouldObfuscate || isProduction) {
  console.log('📦 Dashboard obfuscation: ENABLED\n');
}

// Clean dist
if (existsSync(distPath)) {
  console.log('Cleaning dist directory...');
  rmSync(distPath, { recursive: true, force: true });
}

// Build using tsconfig
console.log('Compiling TypeScript files...');
try {
  execSync('npx tsc', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Main build complete\n');
} catch (error) {
  console.error('✗ Build failed:', error.message);
  process.exit(1);
}

// Compile new files that might not be picked up
const newFiles = [
  'analyzers/shredder.ts',
  'storage/text-storage.ts',
  'storage/profile-manager.ts',
  'builders/profile-builder.ts',
  'examples/enhanced-usage.ts',
  'examples/shredder-example.ts'
];

console.log('Compiling new components...');
for (const file of newFiles) {
  try {
    execSync(
      `npx tsc "${file}" --outDir dist --module ESNext --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck --declaration --declarationMap --sourceMap --rootDir . --resolveJsonModule`,
      { stdio: 'pipe', cwd: process.cwd() }
    );
    console.log(`✓ ${file}`);
  } catch (error) {
    // Silently continue - file might already be compiled or have dependencies
  }
}

// Rebuild index to include new exports
console.log('\nRebuilding index...');
try {
  execSync(
    'npx tsc index.ts --outDir dist --module ESNext --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck --declaration --declarationMap --sourceMap --rootDir . --resolveJsonModule',
    { stdio: 'inherit', cwd: process.cwd() }
  );
  console.log('✓ Index rebuilt\n');
} catch (error) {
  console.error('✗ Index rebuild failed:', error.message);
}

// Build dashboard static files if requested
if (shouldObfuscate || isProduction) {
  console.log('\n' + '='.repeat(50));
  console.log('Building Dashboard Static Files...');
  console.log('='.repeat(50) + '\n');
  
  try {
    const buildDashboardScript = join(process.cwd(), 'scripts', 'build-dashboard.js');
    if (existsSync(buildDashboardScript)) {
      const env = isProduction ? { ...process.env, NODE_ENV: 'production' } : process.env;
      execSync(`node scripts/build-dashboard.js${shouldObfuscate ? ' --obfuscate' : ''}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env
      });
      console.log('\n✅ Dashboard build complete!\n');
    } else {
      console.warn('⚠ Dashboard build script not found, skipping...\n');
    }
  } catch (error) {
    console.error('✗ Dashboard build failed:', error.message);
    // Don't exit - main build succeeded
    console.warn('⚠ Continuing despite dashboard build failure...\n');
  }
}

console.log('✅ Build complete!');

