#!/usr/bin/env node
/**
 * TOKEN SCALING CHECK SCRIPT
 * 
 * Validates that the Sierpinski pattern is working correctly:
 * - All tokens reference other tokens (no orphaned tokens)
 * - Token hierarchy is correct (base -> derived -> component)
 * - No circular dependencies
 * - All referenced tokens exist
 * - Scaling relationships are maintained
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface TokenDefinition {
  name: string;
  value: string;
  file: string;
  line: number;
  references: string[];
  isBase: boolean;
}

interface ScalingIssue {
  token: string;
  issue: string;
  severity: 'error' | 'warning';
  file: string;
  line: number;
}

const tokenDefinitions = new Map<string, TokenDefinition>();
const issues: ScalingIssue[] = [];

// Base tokens that should not reference other tokens
const BASE_TOKENS = new Set([
  '--phi', '--phi-inv', '--phi-mod', '--sqrt2', '--sqrt2-inv', '--sqrt2-half', '--sqrt2-double',
  '--primary-color-rgb',
  '--phi-sqrt2-product', '--phi-sqrt2-quotient', '--sqrt2-phi-quotient',
  '--diag-angle-1', '--diag-angle-2', '--diag-angle-3', '--diag-angle-4',
  '--base', '--font-base', '--space-base',
  '--lanczos-detected-zoom',
  '--viewport-width', '--viewport-height', '--viewport-aspect-ratio', '--viewport-pixel-ratio',
  '--viewport-orientation', '--vbase',
  '--safe-area-inset-top', '--safe-area-inset-right', '--safe-area-inset-bottom', '--safe-area-inset-left',
  '--is-mobile', '--is-tablet', '--is-desktop', '--is-ultra-wide',
  '--viewport-spacing-multiplier', '--viewport-font-multiplier',
  '--phi-sqrt', '--phi-cubed', '--phi-half', '--phi-quarter', '--phi-two-thirds',
  '--phi-three-quarters', '--phi-one-point-five',
  '--phi-ratio', '--phi-ratio-inv',
  '--primary-color', '--primary-dark', '--primary-light', '--primary-ultra-light',
  '--color-neutral', '--color-neutral-light', '--color-neutral-dark',
  '--text-primary', '--text-secondary', '--text-light',
  '--bg-secondary', '--bg-tertiary', '--bg-elevated',
  '--border', '--border-light',
  '--opacity-subtle', '--opacity-soft', '--opacity-medium', '--opacity-strong', '--opacity-full',
  '--phi-line-opacity', '--phi-tangent-opacity', '--phi-lateral-opacity', '--phi-azimuth-opacity',
  '--phi-azimuth-1', '--phi-azimuth-2', '--phi-azimuth-3', '--phi-azimuth-4',
  '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold', '--font-weight-extrabold',
]);

function extractTokenReferences(value: string): string[] {
  const references: string[] = [];
  const varPattern = /var\((--[a-z0-9-]+)\)/g;
  let match;
  while ((match = varPattern.exec(value)) !== null) {
    references.push(match[1]);
  }
  return references;
}

function parseTokenFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Match all CSS custom properties, including multi-line ones
  // Pattern: --token-name: value; (where value can span multiple lines)
  const tokenPattern = /--([a-z0-9-]+):\s*([^;]+?);/gs;
  let match;
  let lineNumber = 1;
  
  while ((match = tokenPattern.exec(content)) !== null) {
    const tokenName = `--${match[1]}`;
    let tokenValue = match[2].trim();
    
    // Calculate line number by counting newlines before the match
    const beforeMatch = content.substring(0, match.index);
    lineNumber = beforeMatch.split('\n').length;
    
    // Clean up multi-line values (remove extra whitespace/newlines)
    tokenValue = tokenValue.replace(/\s+/g, ' ').trim();
    
    const references = extractTokenReferences(tokenValue);
    const isBase = BASE_TOKENS.has(tokenName);
    
    // Only set if not already defined (design-tokens.css takes precedence)
    if (!tokenDefinitions.has(tokenName) || filePath.includes('design-tokens.css')) {
      tokenDefinitions.set(tokenName, {
        name: tokenName,
        value: tokenValue,
        file: filePath,
        line: lineNumber,
        references,
        isBase,
      });
    }
  }
}

function checkTokenScaling(): void {
  // Check 1: All referenced tokens exist (across all files)
  tokenDefinitions.forEach((token, tokenName) => {
    token.references.forEach(ref => {
      if (!tokenDefinitions.has(ref)) {
        issues.push({
          token: tokenName,
          issue: `References non-existent token: ${ref}`,
          severity: 'error',
          file: token.file,
          line: token.line,
        });
      }
    });
  });
  
  // Check 2: Base tokens should not reference other tokens (except for calculated base tokens)
  tokenDefinitions.forEach((token, tokenName) => {
    if (token.isBase && token.references.length > 0) {
      // Allow base tokens to reference other base tokens (like --phi-inv referencing --phi)
      const allRefsAreBase = token.references.every(ref => BASE_TOKENS.has(ref));
      if (!allRefsAreBase) {
        issues.push({
          token: tokenName,
          issue: `Base token references non-base token: ${token.references.filter(r => !BASE_TOKENS.has(r)).join(', ')}`,
          severity: 'warning',
          file: token.file,
          line: token.line,
        });
      }
    }
  });
  
  // Check 3: Check for circular dependencies
  function hasCircularDependency(tokenName: string, visited: Set<string>, path: string[]): boolean {
    if (visited.has(tokenName)) {
      return true;
    }
    if (path.includes(tokenName)) {
      return true; // Circular reference detected
    }
    
    const token = tokenDefinitions.get(tokenName);
    if (!token) return false;
    
    visited.add(tokenName);
    path.push(tokenName);
    
    for (const ref of token.references) {
      if (hasCircularDependency(ref, visited, [...path])) {
        return true;
      }
    }
    
    visited.delete(tokenName);
    return false;
  }
  
  tokenDefinitions.forEach((token, tokenName) => {
    if (hasCircularDependency(tokenName, new Set(), [])) {
      issues.push({
        token: tokenName,
        issue: 'Circular dependency detected',
        severity: 'error',
        file: token.file,
        line: token.line,
      });
    }
  });
  
  // Check 4: Verify Sierpinski pattern - derived tokens should reference base tokens
  // But allow certain token types to have hardcoded values (shadows, transitions, etc.)
  const ALLOWED_HARDCODED_PATTERNS = [
    /^rgba?\(/, // rgba/rgb colors
    /^#[0-9a-fA-F]{3,6}$/, // hex colors
    /^linear-gradient/, // gradients
    /^[\d.]+(px|rem|%|deg|vh|vw|s|ms)$/, // simple values
  ];
  
  tokenDefinitions.forEach((token, tokenName) => {
    if (!token.isBase && token.references.length === 0) {
      // Check if it's an allowed hardcoded pattern (shadows, transitions, etc.)
      const isAllowedHardcoded = ALLOWED_HARDCODED_PATTERNS.some(pattern => pattern.test(token.value));
      if (!isAllowedHardcoded && !token.value.includes('calc(') && !token.value.includes('clamp(')) {
        issues.push({
          token: tokenName,
          issue: 'Derived token has no references (not following Sierpinski pattern)',
          severity: 'warning',
          file: token.file,
          line: token.line,
        });
      }
    }
  });
}

async function main() {
  console.log('Checking token scaling and Sierpinski pattern integrity...\n');
  
  // Parse design-tokens.css
  const tokenFiles = await glob('src/styles/design-tokens.css');
  tokenFiles.forEach(parseTokenFile);
  
  // Also check global.css for any remaining token definitions
  const globalFiles = await glob('src/styles/global.css');
  globalFiles.forEach(parseTokenFile);
  
  console.log(`Found ${tokenDefinitions.size} token definitions\n`);
  
  // Run checks
  checkTokenScaling();
  
  // Print results
  if (issues.length === 0) {
    console.log('✅ All token scaling checks passed!');
    console.log('✅ Sierpinski pattern is intact');
    console.log('✅ No circular dependencies');
    console.log('✅ All token references are valid\n');
    process.exit(0);
  }
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  console.log(`\nFound ${issues.length} issue(s):`);
  console.log(`  ${errors.length} error(s)`);
  console.log(`  ${warnings.length} warning(s)\n`);
  
  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(issue => {
      console.log(`  ${issue.token} (${path.relative(process.cwd(), issue.file)}:${issue.line})`);
      console.log(`    ${issue.issue}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(issue => {
      console.log(`  ${issue.token} (${path.relative(process.cwd(), issue.file)}:${issue.line})`);
      console.log(`    ${issue.issue}`);
    });
    console.log('');
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Scaling check error:', error);
  process.exit(1);
});

