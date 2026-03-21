/**
 * DESIGN TOKEN UTILITIES
 * 
 * Functions to get tokens by design block ID,
 * generate CSS classes from design blocks,
 * and validate token usage.
 */

import { getTokensForBlock, hasToken, getToken } from '../styles/token-map';
import type { DesignBlock } from '../data/design-blocks';

/**
 * Get CSS token value for a design block property
 */
export function getTokenForBlockProperty(
  blockId: string,
  property: 'colors' | 'spacing' | 'typography' | 'transforms'
): string[] {
  const tokens = getTokensForBlock(blockId);
  
  // Map design block properties to token categories
  const propertyMap: Record<string, string[]> = {
    colors: tokens.filter(t => t.includes('color') || t.includes('primary') || t.includes('bg')),
    spacing: tokens.filter(t => t.includes('space') || t.includes('padding') || t.includes('gap')),
    typography: tokens.filter(t => t.includes('text') || t.includes('font')),
    transforms: tokens.filter(t => t.includes('phi') || t.includes('azimuth') || t.includes('transform')),
  };
  
  return propertyMap[property] || [];
}

/**
 * Generate CSS class string from design block
 */
export function generateCSSFromBlock(block: DesignBlock): string {
  const tokens = getTokensForBlock(block.id);
  const classes: string[] = [];
  
  // Add base class
  classes.push(`.${block.id}`);
  
  // Add token-based styles
  if (tokens.length > 0) {
    const styles = tokens.map(token => {
      const tokenName = token.replace('--', '');
      return `  ${tokenName}: var(${token});`;
    }).join('\n');
    classes.push(`{\n${styles}\n}`);
  }
  
  return classes.join('\n');
}

/**
 * Validate that a component uses correct tokens for its design block
 */
export function validateBlockTokenUsage(
  blockId: string,
  usedTokens: string[]
): { valid: boolean; missing: string[]; invalid: string[] } {
  const expectedTokens = getTokensForBlock(blockId);
  const missing = expectedTokens.filter(t => !usedTokens.includes(t));
  const invalid = usedTokens.filter(t => !hasToken(t) && !expectedTokens.includes(t));
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

/**
 * Get all tokens used in a CSS string
 */
export function extractTokensFromCSS(css: string): string[] {
  const tokenPattern = /var\((--[a-z-]+)\)/gi;
  const tokens: string[] = [];
  let match;
  
  while ((match = tokenPattern.exec(css)) !== null) {
    if (!tokens.includes(match[1])) {
      tokens.push(match[1]);
    }
  }
  
  return tokens;
}

/**
 * Check if a value is a hardcoded value (not using tokens)
 */
export function isHardcodedValue(value: string): boolean {
  // Check for common hardcoded patterns
  const hardcodedPatterns = [
    /^\d+px$/,           // e.g., "16px"
    /^\d+rem$/,          // e.g., "1rem" (without var())
    /^#[0-9a-fA-F]{3,6}$/, // Hex colors
    /^rgb\(/,            // rgb() colors
    /^rgba\(/,           // rgba() colors
  ];
  
  // If it's a var() call, it's not hardcoded
  if (value.includes('var(')) {
    return false;
  }
  
  // Check against patterns
  return hardcodedPatterns.some(pattern => pattern.test(value.trim()));
}

/**
 * Get token reference for a design block's visual property
 */
export function getTokenForVisualProperty(
  block: DesignBlock,
  property: keyof DesignBlock['visualProperties']
): string[] {
  const visualValue = block.visualProperties[property];
  if (!Array.isArray(visualValue)) {
    return [];
  }
  
  // Map visual property values to actual CSS tokens
  return visualValue.map(value => {
    // Convert design block property names to token names
    if (property === 'colors') {
      if (value === 'primary') return '--primary-color';
      if (value === 'primary-dark') return '--primary-dark';
      if (value === 'primary-light') return '--primary-light';
      if (value === 'surface-elevated') return '--surface-elevated';
      if (value === 'primary-ultra-light') return '--primary-ultra-light';
    }
    
    if (property === 'spacing') {
      if (value.startsWith('space-')) return `--${value}`;
      if (value === 'space-xl') return '--space-xl';
      if (value === 'space-2xl') return '--space-2xl';
    }
    
    if (property === 'typography') {
      if (value.startsWith('font-') || value.startsWith('text-')) {
        return `--${value}`;
      }
    }
    
    return '';
  }).filter(Boolean);
}

/**
 * Generate token mapping for a design block
 */
export function generateTokenMapping(block: DesignBlock): Record<string, string[]> {
  return {
    colors: getTokenForVisualProperty(block, 'colors'),
    spacing: getTokenForVisualProperty(block, 'spacing'),
    typography: getTokenForVisualProperty(block, 'typography'),
    transforms: getTokenForVisualProperty(block, 'transforms'),
  };
}


