#!/usr/bin/env node
/**
 * Pre-Build Validation Script
 * Validates TypeScript, Astro config, dependencies, viewport meta tags, and CSS variables
 * before running the build process.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { runContentSeoValidation } from './validate-content-seo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: ValidationResult[] = [];

/**
 * Check if TypeScript can compile without errors
 */
function checkTypeScript(): ValidationResult {
  try {
    // Check if tsconfig.json exists
    const tsconfigPath = join(projectRoot, 'tsconfig.json');
    if (!existsSync(tsconfigPath)) {
      return {
        name: 'TypeScript Config',
        passed: false,
        message: 'tsconfig.json not found'
      };
    }

    // Check if TypeScript is installed
    try {
      execSync('npm run typecheck', {
        cwd: projectRoot,
        stdio: 'pipe',
      });
      return {
        name: 'TypeScript Compilation',
        passed: true,
        message: 'No TypeScript errors found'
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errorLines = message.split('\n').filter((line: string) => line.includes('error TS'));
      return {
        name: 'TypeScript Compilation',
        passed: false,
        message: errorLines.length > 0
          ? `TypeScript errors found: ${errorLines.slice(0, 3).join('; ')}`
          : 'TypeScript compilation failed'
      };
    }
  } catch (error: unknown) {
    return {
      name: 'TypeScript Check',
      passed: false,
      message: `Error checking TypeScript: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate Astro config file
 */
function checkAstroConfig(): ValidationResult {
  try {
    const configPath = join(projectRoot, 'astro.config.mjs');
    if (!existsSync(configPath)) {
      return {
        name: 'Astro Config',
        passed: false,
        message: 'astro.config.mjs not found'
      };
    }

    // Try to import the config to validate syntax
    const configContent = readFileSync(configPath, 'utf-8');
    
    // Basic validation - check for required exports
    if (!configContent.includes('defineConfig') && !configContent.includes('export default')) {
      return {
        name: 'Astro Config',
        passed: false,
        message: 'Astro config missing default export'
      };
    }

    return {
      name: 'Astro Config',
      passed: true,
      message: 'Astro config is valid'
    };
  } catch (error: any) {
    return {
      name: 'Astro Config',
      passed: false,
      message: `Error validating Astro config: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check required dependencies
 */
function checkDependencies(): ValidationResult {
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return {
        name: 'Dependencies',
        passed: false,
        message: 'package.json not found'
      };
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const requiredDeps = ['astro'];
    const missingDeps: string[] = [];

    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      return {
        name: 'Dependencies',
        passed: false,
        message: `Missing required dependencies: ${missingDeps.join(', ')}`
      };
    }

    return {
      name: 'Dependencies',
      passed: true,
      message: 'All required dependencies are present'
    };
  } catch (error: any) {
    return {
      name: 'Dependencies',
      passed: false,
      message: `Error checking dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check viewport meta tag in layout files
 */
function checkViewportMeta(): ValidationResult {
  try {
    const layoutPath = join(projectRoot, 'src', 'layouts', 'BaseLayout.astro');
    if (!existsSync(layoutPath)) {
      return {
        name: 'Viewport Meta',
        passed: false,
        message: 'BaseLayout.astro not found'
      };
    }

    const layoutContent = readFileSync(layoutPath, 'utf-8');
    
    // Check for viewport meta tag
    if (!layoutContent.includes('viewport') || !layoutContent.includes('meta name="viewport"')) {
      return {
        name: 'Viewport Meta',
        passed: false,
        message: 'Viewport meta tag not found in BaseLayout.astro'
      };
    }

    // Check for essential viewport attributes
    const hasWidth = layoutContent.includes('width=device-width');
    const hasInitialScale = layoutContent.includes('initial-scale');

    if (!hasWidth || !hasInitialScale) {
      return {
        name: 'Viewport Meta',
        passed: false,
        message: 'Viewport meta tag missing required attributes (width=device-width or initial-scale)'
      };
    }

    return {
      name: 'Viewport Meta',
      passed: true,
      message: 'Viewport meta tag is present and valid'
    };
  } catch (error: any) {
    return {
      name: 'Viewport Meta',
      passed: false,
      message: `Error checking viewport meta: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check CSS variable consistency
 */
function checkCSSVariables(): ValidationResult {
  try {
    const globalCSSPath = join(projectRoot, 'src', 'styles', 'global.css');
    if (!existsSync(globalCSSPath)) {
      return {
        name: 'CSS Variables',
        passed: false,
        message: 'global.css not found'
      };
    }

    const globalCSS = readFileSync(globalCSSPath, 'utf-8');
    
    // Check for essential design system variables
    const requiredVars = [
      '--phi',
      '--primary-color',
      '--text-primary',
      '--background'
    ];

    const missingVars: string[] = [];
    for (const varName of requiredVars) {
      if (!globalCSS.includes(varName)) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      return {
        name: 'CSS Variables',
        passed: false,
        message: `Missing essential CSS variables: ${missingVars.join(', ')}`
      };
    }

    // Check for :root selector
    if (!globalCSS.includes(':root')) {
      return {
        name: 'CSS Variables',
        passed: false,
        message: 'CSS variables should be defined in :root selector'
      };
    }

    return {
      name: 'CSS Variables',
      passed: true,
      message: 'Essential CSS variables are present'
    };
  } catch (error: any) {
    return {
      name: 'CSS Variables',
      passed: false,
      message: `Error checking CSS variables: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate static content SEO fields (case studies, industries, topics).
 */
function checkContentSeo(): ValidationResult {
  const result = runContentSeoValidation();
  return {
    name: 'Content SEO',
    passed: result.passed,
    message: result.message,
  };
}

/**
 * When CI sets PUBLIC_API_BASE_URL, enforce HTTPS so static host builds never bake in http:// APIs.
 * If it is unset, skip (Repos can publish static site before the standalone API exists; set later).
 */
function checkHostedApiForStaticDeploy(): ValidationResult {
  const isCi =
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.CF_PAGES === '1' ||
    process.env.CI === 'true';
  const apiUrl = (process.env.PUBLIC_API_BASE_URL ?? '').trim();
  const skip = process.env.SKIP_HOSTED_API_CHECK === '1' || process.env.SKIP_HOSTED_API_CHECK === 'true';

  if (skip) {
    return {
      name: 'Hosted API (static deploy CI)',
      passed: true,
      message: 'Skipped (SKIP_HOSTED_API_CHECK is set)'
    };
  }

  if (!isCi) {
    return {
      name: 'Hosted API (static deploy CI)',
      passed: true,
      message: 'Skipped (local build — HTTPS API enforced in CI only when PUBLIC_API_BASE_URL is set)'
    };
  }

  if (!apiUrl) {
    return {
      name: 'Hosted API (static deploy CI)',
      passed: true,
      message:
        'Skipped — PUBLIC_API_BASE_URL not set for this CI run (set it once the HTTPS standalone API host is live; see docs/operations/CLOUDFLARE_PAGES.md).'
    };
  }

  if (!/^https:\/\//i.test(apiUrl)) {
    return {
      name: 'Hosted API (static deploy CI)',
      passed: false,
      message:
        'PUBLIC_API_BASE_URL must be an https:// URL in CI (never bake plain http into static deploy builds).'
    };
  }

  if (/\/api1(\/|$)/i.test(apiUrl) || /api1\./i.test(apiUrl)) {
    return {
      name: 'Hosted API (static deploy CI)',
      passed: false,
      message:
        'PUBLIC_API_BASE_URL looks misconfigured (api1). Use https://api.brisbaneservers.com/api.'
    };
  }

  if (apiUrl.endsWith('/api/') || apiUrl.endsWith('/api1/')) {
    return {
      name: 'Hosted API (static deploy CI)',
      passed: false,
      message: 'PUBLIC_API_BASE_URL should end with /api (no trailing slash after api).'
    };
  }

  return {
    name: 'Hosted API (static deploy CI)',
    passed: true,
    message: 'PUBLIC_API_BASE_URL is an HTTPS URL suitable for static hosting'
  };
}

/**
 * Run all validation checks
 */
function runChecks(): void {
  console.log('🔍 Running pre-build validation checks...\n');

  results.push(checkTypeScript());
  results.push(checkAstroConfig());
  results.push(checkDependencies());
  results.push(checkViewportMeta());
  results.push(checkCSSVariables());
  results.push(checkContentSeo());
  results.push(checkHostedApiForStaticDeploy());

  // Print results
  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${icon} [${status}] ${result.name}`);
    console.log(`   ${result.message}\n`);
    
    if (!result.passed) {
      allPassed = false;
    }
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log('📊 Summary:');
  console.log(`   Passed: ${passedCount}/${totalCount}`);
  console.log(`   Failed: ${totalCount - passedCount}/${totalCount}\n`);

  if (allPassed) {
    console.log('✅ All pre-build checks passed!');
    process.exit(0);
  } else {
    console.log('❌ Some pre-build checks failed. Please fix the issues above before building.');
    process.exit(1);
  }
}

// Run checks
runChecks();


