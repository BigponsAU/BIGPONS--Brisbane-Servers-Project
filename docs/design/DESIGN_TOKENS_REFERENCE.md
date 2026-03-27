# Design Tokens Reference

Complete reference guide for the Sierpinski-pattern design token system.

## Overview

All design tokens follow a Sierpinski pattern where tokens reference other tokens recursively. This creates a self-similar, hierarchical system where changes to base tokens propagate through the entire design system.

## Token Hierarchy

```
Base Tokens (phi, base units)
    ↓
Derived Tokens (spacing, typography)
    ↓
Component Tokens (card-padding, button-size)
    ↓
Pattern Tokens (phi-lines, azimuth angles)
```

## Base Tokens

### Golden Ratio Constants
- `--phi: 1.618` - Golden ratio constant
- `--phi-inv: 0.618` - Inverse golden ratio (1/φ)
- `--phi-mod: 1.618` - Phi modifier
- `--phi-sqrt: 1.272` - √φ
- `--phi-cubed: 4.236` - φ³
- `--phi-half: 0.809` - φ/2
- `--phi-quarter: 0.4045` - φ/4

### Base Units
- `--base: 1rem` - Base unit
- `--font-base: clamp(0.875rem, 1rem, 1.125rem)` - Base font size
- `--space-base: 1rem` - Base spacing unit

## Spacing Tokens

All spacing tokens derive from `--space-base` using phi ratios:

- `--space-xs: clamp(0.25rem, calc(var(--space-base) * var(--phi-quarter) * 0.5), 0.5rem)`
- `--space-sm: clamp(0.5rem, calc(var(--space-base) * var(--phi-quarter) * 0.75), 1rem)`
- `--space-md: clamp(0.75rem, calc(var(--space-base) * var(--phi-half) * 0.5), 1.5rem)`
- `--space-lg: clamp(1rem, calc(var(--space-base) * 0.5), 2rem)`
- `--space-xl: clamp(1.618rem, calc(var(--space-base) * var(--phi) * 0.5), calc(2rem * var(--phi)))`
- `--space-2xl: clamp(2.618rem, calc(var(--space-base) * var(--phi) * var(--phi) * 0.5), calc(4rem * var(--phi)))`
- `--space-3xl` through `--space-6xl` follow the same pattern

## Typography Tokens

All typography tokens derive from `--font-base`:

- `--text-xs: calc(var(--font-base) * 0.75)`
- `--text-sm: calc(var(--font-base) * 0.875)`
- `--text-base: var(--font-base)`
- `--text-lg: calc(var(--font-base) * var(--phi))`
- `--text-xl: calc(var(--font-base) * var(--phi) * var(--phi))`
- `--text-2xl`, `--text-3xl` continue the phi scale

### Heading Tokens
- `--font-h1: calc(var(--font-base) * var(--phi) * var(--phi))`
- `--font-h2: calc(var(--font-base) * var(--phi))`
- `--font-h3: calc(var(--font-base) * var(--phi-sqrt))`

## Color Tokens

### Primary Colors
- `--primary-color: #0A74DA`
- `--primary-dark: #0855A8`
- `--primary-light: #F0F7FF`
- `--primary-ultra-light: #FAFCFF`

### Semantic Colors (mapped to primary)
- `--color-success: var(--primary-color)`
- `--color-warning: var(--primary-dark)`
- `--color-error: var(--primary-dark)`

### Text Colors
- `--text-primary: #1A1A1A`
- `--text-secondary: #6b7280`
- `--text-light: #9ca3af`

### Background Colors
- `--bg-primary: var(--primary-ultra-light)`
- `--bg-secondary: #FAFBFC`
- `--bg-tertiary: #F8F9FA`
- `--bg-elevated: #FFFFFF`

## Pattern Tokens

### Phi Lines
- `--phi-line-width: clamp(0.5px, calc(0.0625rem * var(--phi-inv)), 2px)`
- `--phi-line-opacity: 0.3`

### Phi Tangents
- `--phi-tangent-radius: calc(100vh * var(--phi-ratio))`
- `--phi-tangent-opacity: 0.2`

### Phi Laterals
- `--phi-lateral-position-v: var(--phi-ratio)` (61.8%)
- `--phi-lateral-position-h: var(--phi-ratio-inv)` (38.2%)
- `--phi-lateral-opacity: var(--opacity-strong)`

### Azimuth Angles
- `--phi-azimuth-1: 38.2deg`
- `--phi-azimuth-2: 61.8deg`
- `--phi-azimuth-3: 23.6deg`
- `--phi-azimuth-4: 76.4deg`
- `--phi-azimuth-opacity: 0.15`

## Component Tokens

### Card Tokens
- `--card-padding: var(--space-lg)`
- `--card-gap: calc(var(--card-padding) * var(--phi-inv))`
- `--card-border-radius: var(--border-radius)`
- `--card-shadow: var(--shadow-sm)`

### Button Tokens
- `--btn-sm: var(--space-md) var(--space-lg)`
- `--btn-md: var(--space-md) var(--space-xl)`
- `--btn-lg: var(--space-lg) var(--space-2xl)`

### Form Tokens
- `--form-padding: var(--space-2xl)`
- `--form-gap: var(--space-lg)`
- `--form-input-padding: var(--space-md)`

## Usage Examples

### In Components

```astro
<style>
  .my-component {
    padding: var(--card-padding);
    gap: var(--card-gap);
    background: var(--surface-elevated);
    border-radius: var(--card-border-radius);
    box-shadow: var(--card-shadow);
  }
</style>
```

### Sierpinski Pattern Example

```css
/* Base */
--phi: 1.618;
--space-base: 1rem;

/* Derived (references base) */
--space-lg: clamp(1rem, calc(var(--space-base) * 0.5), 2rem);

/* Component (references derived) */
--card-padding: var(--space-lg);

/* Pattern (references component and base) */
--card-gap: calc(var(--card-padding) * var(--phi-inv));
```

## Validation

Run the validation script to check for hardcoded values:

```bash
npm run validate-tokens
```

This will:
- Check for hardcoded pixel values
- Check for hardcoded colors
- Verify token references exist
- Warn about missing token usage

## Migration Guide

When updating components to use tokens:

1. Replace hardcoded values with token references
2. Use `var(--token-name)` for all spacing, colors, typography
3. Follow Sierpinski pattern: tokens reference tokens
4. Use component tokens when available (e.g., `--card-padding` instead of `--space-lg`)
5. Run validation script to verify changes

## Token Map

For programmatic access to tokens, see `src/styles/token-map.ts` which provides:
- TypeScript types for all tokens
- Token category organization
- Design block to token mapping
- Validation utilities

