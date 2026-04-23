#!/usr/bin/env node
/**
 * TOKEN VALIDATION SCRIPT
 * 
 * Validates that all components use design tokens instead of hardcoded values.
 * Checks for:
 * - Hardcoded pixel values
 * - Hardcoded colors
 * - Missing token references
 * - Token usage consistency
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ValidationResult {
  file: string;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  value: string;
}

// Hardcoded value patterns
const HARDCODED_PATTERNS = [
  { pattern: /(\d+)px(?!\s*\/\s*\d+)/g, type: 'pixel', message: 'Hardcoded pixel value' },
  /* \b after hex run avoids href="#additive-semantics" matching as #add */
  { pattern: /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, type: 'hex-color', message: 'Hardcoded hex color' },
  { pattern: /rgb\([^)]+\)/g, type: 'rgb-color', message: 'Hardcoded RGB color' },
  { pattern: /rgba\([^)]+\)/g, type: 'rgba-color', message: 'Hardcoded RGBA color' },
  { pattern: /(\d+\.?\d*)rem(?!\s*var\(--)/g, type: 'rem', message: 'Hardcoded rem value (should use token)' },
];

// Known token names (from design-tokens.css) - Comprehensive list
const KNOWN_TOKENS = new Set([
  // Base tokens
  '--phi', '--phi-inv', '--phi-mod', '--phi-inverse', '--phi-phase',
  '--path-1', '--path-2', '--path-3',
  '--sqrt2', '--sqrt2-inv', '--sqrt2-half', '--sqrt2-double',
  '--phi-sqrt2-product', '--phi-sqrt2-quotient', '--sqrt2-phi-quotient',
  '--diag-angle-1', '--diag-angle-2', '--diag-angle-3', '--diag-angle-4',
  '--base', '--font-base', '--space-base',
  '--lanczos-detected-zoom',
  '--viewport-width', '--viewport-height', '--viewport-aspect-ratio', '--viewport-pixel-ratio',
  '--viewport-orientation', '--vbase',
  '--safe-area-inset-top', '--safe-area-inset-right', '--safe-area-inset-bottom', '--safe-area-inset-left',
  '--is-mobile', '--is-tablet', '--is-desktop', '--is-ultra-wide',
  '--viewport-spacing-multiplier', '--viewport-font-multiplier',
  
  // Phi derivatives
  '--phi-sqrt', '--phi-cubed', '--phi-half', '--phi-quarter', '--phi-two-thirds',
  '--phi-three-quarters', '--phi-one-point-five',
  '--congruence-phi-1', '--congruence-phi-2',
  
  // Golden ratio positioning
  '--phi-ratio', '--phi-ratio-inv',
  '--phi-spiral-1', '--phi-spiral-2', '--phi-spiral-3', '--phi-spiral-4', '--phi-spiral-5',
  
  // Colors
  '--primary-color', '--primary-dark', '--primary-light', '--primary-ultra-light',
  '--original-purple', '--original-purple-light', '--original-purple-dark',
  '--original-purple-glow', '--original-purple-glow-rgb',
  '--color-success', '--color-success-light', '--color-success-dark',
  '--color-warning', '--color-warning-light', '--color-warning-dark',
  '--color-error', '--color-error-light', '--color-error-dark',
  '--color-neutral', '--color-neutral-light', '--color-neutral-dark',
  '--color-wisdom', '--color-wisdom-light', '--color-wisdom-dark', '--color-wisdom-ultra-light',
  '--color-calm', '--color-calm-light', '--color-calm-dark',
  '--text-primary', '--text-secondary', '--text-light',
  '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-elevated', '--bg-accent',
  '--background', '--surface', '--surface-elevated', '--surface-accent', '--surface-subtle',
  '--dark-surface',
  '--border', '--border-light', '--border-subtle',
  
  // Opacity
  '--opacity-subtle', '--opacity-soft', '--opacity-medium', '--opacity-strong', '--opacity-full', '--opacity-light',
  
  // Shadows
  '--shadow-xs', '--shadow-sm', '--shadow', '--shadow-md', '--shadow-lg', '--shadow-xl',
  '--shadow-primary', '--shadow-primary-lg',
  
  // Border radius & φ armature
  '--radius-sm', '--border-radius', '--border-radius-sm', '--radius-md', '--radius-lg',
  '--phi-stroke-hairline', '--phi-stroke-md',
  '--phi-radius-sm', '--phi-radius-md', '--phi-radius-lg',
  '--phi-radius-atypical-a', '--phi-radius-atypical-b', '--phi-radius-atypical-cta',
  
  // Transitions
  '--transition', '--transition-fast', '--transition-slow',
  
  // Typography
  '--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl',
  '--text-lg-practical', '--text-xl-practical', '--text-2xl-practical', '--text-3xl-practical',
  '--text-4xl-practical', '--text-5xl-practical',
  '--font-h1', '--font-h2', '--font-h3',
  '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold',
  '--font-weight-bold', '--font-weight-extrabold',
  
  // Spacing
  '--space-1', '--space-2', '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl',
  '--space-2xl', '--space-3xl', '--space-4xl', '--space-5xl', '--space-6xl',
  '--space-diag-xs', '--space-diag-sm', '--space-diag-md', '--space-diag-lg', '--space-diag-xl', '--space-diag-2xl',
  
  // Grid
  '--grid-cell-diag', '--grid-cell-diag-v', '--grid-cell-square',
  '--phi-grid-cell-v', '--phi-grid-cell-h',
  
  // Gradients
  '--gradient-stop-1', '--gradient-stop-2', '--gradient-stop-3', '--gradient-stop-4',
  '--gradient-primary', '--gradient-wisdom-subtle',
  
  // Phi design elements
  '--phi-line-width', '--phi-line-opacity',
  '--phi-tangent-radius', '--phi-tangent-opacity',
  '--phi-lateral-position-v', '--phi-lateral-position-h', '--phi-lateral-opacity',
  '--phi-azimuth-1', '--phi-azimuth-2', '--phi-azimuth-3', '--phi-azimuth-4',
  '--phi-azimuth-opacity', '--phi-azimuth-1-rad', '--phi-azimuth-2-rad',
  
  // Importance-based sizing
  '--importance-critical', '--importance-high', '--importance-medium', '--importance-normal',
  '--importance-low', '--importance-minimal',
  '--size-hero-title', '--size-section-title', '--size-card-title', '--size-body-text',
  '--size-caption', '--size-disclaimer',
  
  // Color intensity
  '--color-intensity-critical', '--color-intensity-high', '--color-intensity-medium',
  '--color-intensity-normal', '--color-intensity-low',
  
  // Accent system
  '--accent-primary', '--accent-primary-bg', '--accent-success-bg',
  '--accent-wisdom', '--accent-wisdom-bg',
  '--accent-calm', '--accent-calm-bg',
  
  // Component tokens
  '--card-padding', '--card-padding-sm', '--card-padding-lg', '--card-padding-xl',
  '--card-gap', '--card-border-radius', '--card-shadow', '--card-shadow-hover',
  '--form-padding', '--form-gap', '--form-input-padding', '--form-border-radius',
  '--form-border-color', '--form-bg', '--form-max-width',
  '--nav-padding', '--nav-gap', '--nav-height',
  '--grid-gap', '--grid-gap-sm', '--grid-gap-lg',
  '--grid-min-column-masonry', '--grid-min-column-asymmetric',
  '--primary-color-rgb',
  '--header-padding', '--header-logo-size',
  '--footer-padding', '--footer-gap', '--footer-logo-size',
  '--hero-padding', '--hero-gap', '--hero-title-size', '--hero-subtitle-size',
  '--hero-inner-min-height',
  '--btn-sm', '--btn-md', '--btn-lg',
  '--icon-sm', '--icon-md', '--icon-lg', '--icon-xl',
  '--error-fallback-padding', '--error-fallback-icon-size',
  
  // Harmonic system
  '--harmonic-phase-base', '--harmonic-tension', '--harmonic-frequency',
  
  // Semantic system
  '--semantic-phase', '--semantic-inheritance', '--semantic-color-intensity',
  '--semantic-primary', '--semantic-wisdom', '--semantic-calm',
  
  // Block permutations
  '--permutation-azimuth', '--permutation-phi-ratio', '--permutation-cipher-intensity',
  
  // Symmetry & harmony (from symmetry-harmony.css)
  '--symmetry-center-x', '--symmetry-center-y',
  '--asymmetric-weight-left', '--asymmetric-weight-right',
  '--rhythm-base',
  
  // Grid cell variations
  '--grid-cell-diag', '--grid-cell-diag-v',

  // Layout measure / containers
  '--layout-padding-inline', '--layout-padding-inline-start', '--layout-padding-inline-end',
  '--layout-padding-block-tight',
  '--site-header-clearance', '--site-main-padding-top', '--site-main-offset-top',
  '--layout-section-padding-y', '--layout-section-padding-y-alt',
  '--nav-chrome-padding-block', '--footer-chrome-padding-block',
  '--container-max-width', '--container-max-width-wide',
  '--measure-prose', '--measure-narrow', '--measure-article',

  // Banach / home rails (defined in banach-fixed-point.css :root)
  '--banach-outer', '--banach-mid', '--banach-inner', '--banach-focus',
  '--banach-glow-primary', '--banach-glow-purple',
  '--banach-on-white-purple', '--banach-on-white-blue', '--banach-on-white-primary',
  '--banach-bg-tint-start', '--banach-bg-tint-end',
]);

function validateFile(filePath: string): ValidationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: ValidationIssue[] = [];
  
  // Skip validation for design-tokens.css itself (it contains base definitions)
  if (filePath.includes('design-tokens.css')) {
    return { file: filePath, issues: [] };
  }
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Skip comments and import statements
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().startsWith('@import')) {
      return;
    }
    
    // Skip media queries (pixel values in media queries are acceptable)
    if (line.trim().startsWith('@media')) {
      return;
    }
    
    // Check for hardcoded values
    HARDCODED_PATTERNS.forEach(({ pattern, message }) => {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        // Skip if it's inside a var() call
        const beforeMatch = line.substring(0, match.index);
        const afterMatch = line.substring(match.index);
        
        // Check if it's part of a var() or calc() expression
        const isInVar = beforeMatch.includes('var(') && !beforeMatch.includes(')', beforeMatch.lastIndexOf('var('));
        const isInCalc = beforeMatch.includes('calc(') && !beforeMatch.includes(')', beforeMatch.lastIndexOf('calc('));
        const isInClamp = beforeMatch.includes('clamp(') && !beforeMatch.includes(')', beforeMatch.lastIndexOf('clamp('));
        
        // Allow rem values in clamp() functions
        if (message.includes('rem') && (isInClamp || isInCalc)) {
          return;
        }
        
        // Allow pixel values in clamp() min/max
        if (message.includes('pixel') && isInClamp) {
          return;
        }

        /* rgba(var(--token), a) / rgb(var(--token)) are token-based, not hardcoded */
        if (
          (message.includes('RGBA') || message.includes('RGB')) &&
          match[0].includes('var(')
        ) {
          continue;
        }

        /* e.g. max(3px, calc(var(--phi-stroke-md) * 2)) — px is a floor, not layout */
        if (message.includes('pixel') && /max\s*\(\s*\d+px\s*,/i.test(line)) {
          continue;
        }
        
        if (!isInVar && !isInCalc && !isInClamp) {
          issues.push({
            line: lineNum,
            column: match.index + 1,
            message: `${message}: ${match[0]}`,
            severity: 'warning',
            value: match[0],
          });
        }
      }
    });
    
    // Check for var() calls with unknown tokens
    const varPattern = /var\(\s*(--[a-z0-9-]+)\s*[,)]/g;
    let varMatch;
    while ((varMatch = varPattern.exec(line)) !== null) {
      const tokenName = varMatch[1];
      if (!KNOWN_TOKENS.has(tokenName)) {
        issues.push({
          line: lineNum,
          column: varMatch.index + 1,
          message: `Unknown token: ${tokenName}`,
          severity: 'warning',
          value: tokenName,
        });
      }
    }
  });
  
  return {
    file: filePath,
    issues,
  };
}

async function main() {
  const componentFiles = await glob('src/components/**/*.astro');
  const styleFiles = await glob('src/styles/**/*.css');
  
  const allFiles = [...componentFiles, ...styleFiles];
  const results: ValidationResult[] = [];
  
  console.log('Validating design token usage...\n');
  
  allFiles.forEach(file => {
    const result = validateFile(file);
    if (result.issues.length > 0) {
      results.push(result);
    }
  });
  
  // Print results
  if (results.length === 0) {
    console.log('✅ All files use design tokens correctly!');
    process.exit(0);
  }
  
  let totalIssues = 0;
  results.forEach(result => {
    console.log(`\n📄 ${result.file}`);
    result.issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} Line ${issue.line}:${issue.column} - ${issue.message}`);
      totalIssues++;
    });
  });
  
  console.log(`\n\nFound ${totalIssues} issue(s) across ${results.length} file(s)`);
  console.log('\nRecommendations:');
  console.log('- Replace hardcoded values with design tokens');
  console.log('- Use var(--token-name) for all spacing, colors, and typography');
  console.log('- Follow Sierpinski pattern: tokens reference tokens');
  
  process.exit(results.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});


