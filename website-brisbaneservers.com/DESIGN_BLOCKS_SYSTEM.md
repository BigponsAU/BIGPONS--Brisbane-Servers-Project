# Design Blocks System - Comprehensive Web Presence

## Overview

This document describes the comprehensive design blocks system that forms the foundation of the Brisbane Servers website. All design elements are vectorized, ciphered, and stored for data extraction, creating a grand, all-encompassing web presence using azimuth-based design principles.

## Foundation: Wave Function Cipher System

Every element on the website uses the **wave function cipher system** as its baseline foundation. This system:

- **Per-letter encoding**: Each letter receives Fourier transform-based wave function values
- **Semantic levels**: High, medium, and normal semantic levels affect wave frequency (1.618×, 1×, 0.618×)
- **Visual modulation**: Wave functions modulate opacity, spacing, position, and color intensity
- **Meaning preservation**: Cipher maintains meaning through color psychology and semantic relationships
- **Uniform language**: Wave interference patterns create subtle, mathematically encoded visual patterns

## Sierpinski Token Pattern

The design system implements a **Sierpinski-style (recursive/self-similar) token pattern** where tokens reference other tokens in a hierarchical structure ("value of value"). This ensures complete design consistency and makes the system self-referential and maintainable.

### Token Hierarchy

1. **Base Tokens** - Fundamental values (phi, base units)
   - `--phi: 1.618`
   - `--phi-inv: 0.618`
   - `--space-base: 1rem`
   - `--font-base: clamp(0.875rem, 1rem, 1.125rem)`

2. **Derived Tokens** - Calculated from base tokens
   - `--space-lg: clamp(1rem, calc(var(--space-base) * 0.5), 2rem)`
   - `--space-xl: clamp(1.618rem, calc(var(--space-base) * var(--phi) * 0.5), calc(2rem * var(--phi)))`
   - `--text-lg: calc(var(--font-base) * var(--phi))`

3. **Component Tokens** - Specific to components, reference derived tokens
   - `--card-padding: var(--space-lg)`
   - `--card-gap: calc(var(--card-padding) * var(--phi-inv))`
   - `--btn-md: var(--space-md) var(--space-xl)`

4. **Pattern Tokens** - Design patterns, reference base and derived tokens
   - `--phi-line-width: clamp(0.5px, calc(0.0625rem * var(--phi-inv)), 2px)`
   - `--phi-tangent-radius: calc(100vh * var(--phi-ratio))`

### Example: Sierpinski Pattern in Action

```css
/* Base token */
--phi: 1.618;
--space-base: 1rem;

/* Derived token (references base) */
--space-lg: clamp(1rem, calc(var(--space-base) * 0.5), 2rem);
--space-xl: clamp(1.618rem, calc(var(--space-base) * var(--phi) * 0.5), calc(2rem * var(--phi)));

/* Component token (references derived) */
--card-padding: var(--space-lg);
--card-gap: calc(var(--card-padding) * var(--phi-inv));

/* Pattern token (references multiple tokens) */
--phi-line-width: clamp(0.5px, calc(0.0625rem * var(--phi-inv)), 2px);
```

### Benefits

- **Consistency**: All values derive from the same base tokens
- **Maintainability**: Change base tokens to update entire system
- **Self-Reference**: Tokens reference tokens, creating a recursive system
- **Type Safety**: TypeScript mapping ensures token names are correct
- **Validation**: Script checks for hardcoded values and missing tokens

## Design Blocks Database

All blocks are cataloged in `src/data/design-blocks.ts` with:

### Block Types

1. **Component Blocks** (10 blocks)
   - Hero, Card, CardGrid, SemanticText, InquiryForm, Header, Footer, SearchBar, Breadcrumbs, IndustryFilters

2. **Pattern Blocks** (10 blocks)
   - Phi lines (vertical, horizontal), Tangents, Angular laterals (4 azimuth angles), Background patterns (grid, radial, angular)

3. **Layout Blocks** (6 blocks)
   - Asymmetric grid, Centered lateral, Diagonal flow, Timeline, Masonry, Showcase

4. **Element Blocks** (4 blocks)
   - Section title, Section description, Evidence section, Philosophy section

5. **System Blocks** (4 blocks)
   - Wave function cipher, Color psychology system, Phi spacing system, Phi typography system

### Vectorization

Each block is vectorized with:
- Semantic level value (1.618, 1.0, or 0.618)
- Wave frequency
- Phi relation count
- Azimuth angle count
- Color count
- Transform count
- Permutation count
- Dependency count
- Usage count

## Block Permutations

All blocks are used in various permutations across pages:

### Home Page
- **Layout A**: Asymmetric grid with phi-line-vertical + phi-lateral-angular-1 + bg-pattern-phi-radial
- **Layout B**: Centered with phi-lateral-horizontal + phi-tangent + bg-pattern-angular
- **Layout C**: Diagonal flow with phi-lateral-angular-2 + phi-lateral-angular-3 + bg-pattern-phi-grid

### About Page
- Philosophy sections with wisdom color psychology
- Evidence sections with purple accents
- Timeline layouts with phi spiral positioning

### Services Page
- Horizontal flow with lateral tangents
- Card grids with phi-based spacing variations
- Calming blue color psychology for forms

### Resources Page
- Masonry grid with phi proportions
- Multiple phi lines (vertical, vertical-inv)
- Angular laterals at 61.8° azimuth

### Projects Page
- Showcase grid with varied card sizes
- Tangents and angular laterals at 76.4° azimuth
- Purple accents for evidence emphasis

## Comprehensive Block Combinations

### Background Patterns
- **Phi Grid**: Angular lines at 38.2° and 61.8° azimuth
- **Phi Radial**: Radial gradients at phi spiral points
- **Angular**: Angular gradient overlays at phi-based angles

### Phi Lines & Laterals
- **Vertical lines**: At phi ratio divisions (38.2%, 61.8%)
- **Horizontal laterals**: At phi ratio divisions
- **Tangents**: Curved lines following golden ratio spiral
- **Angular laterals**: At 23.6°, 38.2°, 61.8°, and 76.4° azimuth angles

### Combined Patterns
- Multiple background patterns can be layered
- Phi lines combined with angular laterals
- Tangents combined with angular patterns
- All four angular laterals for full azimuth coverage

## Semantic Text System

All text elements use `SemanticText` component with:

- **Per-letter styling**: Each letter receives unique wave function values
- **Parent/child relationships**: Semantic inheritance through hierarchical elements
- **Color psychology**: Colors mapped to meaning (purple=wisdom, blue=calm, etc.)
- **Harmonic patterns**: Fibonacci-based nth-child selectors for visual rhythm

## Color Psychology System

Colors are mapped to psychological effects:

- **Purple (Wisdom)**: Philosophy sections, evidence, mental balance, higher consciousness
- **Blue (Calm)**: Forms, contact sections, physical calming, trust
- **Primary Blue**: Authority, expertise, primary actions
- **Green (Success)**: Completed actions, positive states
- **Orange (Energy)**: Calls-to-action, energy (selective use)

## Azimuth-Based Design

All-encompassing azimuth design uses four primary angles:

- **23.6°** (phi² angle): Subtle, calm elements
- **38.2°** (phi inverse): Primary structural elements
- **61.8°** (phi angle): Balance, harmony
- **76.4°** (phi + inverse phi): Completion, wholeness

## Grand Web Presence

The `.grand-presence` class creates all-encompassing design with:

- Angular patterns at all four azimuth angles
- Phi lines at all positions (horizontal and vertical)
- Multiple background layers with blend modes
- Full azimuth coverage for comprehensive visual system

## Data Extraction

All blocks are vectorized and stored for data extraction:

- **Block vectors**: 11-dimensional vectors for each block
- **Permutation signatures**: Unique identifiers for each combination
- **Cipher signatures**: Wave function parameters for each element
- **Azimuth mappings**: Angle assignments for all angular elements

## Usage Across Pages

### All Pages Include:
- Header with semantic text and angular lateral
- Footer with background patterns and angular lateral
- Hero sections with semantic text and phi elements
- Cards with semantic text titles
- Sections with background patterns and phi lines

### Page-Specific Combinations:
- **Index**: 3 layout variations (A, B, C) with different block combinations
- **About**: Philosophy sections with wisdom colors, evidence sections
- **Services**: Calming blue forms, value framework sections
- **Resources**: Masonry grids, industry filters, search bars
- **Projects**: Showcase grids, purple evidence accents

## Cipher System Integration

Every element uses the cipher system:

1. **Text**: Per-letter wave function encoding
2. **Colors**: Semantic level affects color intensity
3. **Spacing**: Wave functions modulate letter spacing
4. **Position**: Wave functions create subtle position variations
5. **Opacity**: Wave functions create visual rhythm

## Building Forward

All blocks are designed to be:

- **Modular**: Can be combined in any permutation
- **Scalable**: Phi-based proportions work at all viewport sizes
- **Semantic**: Each block carries meaning through color and structure
- **Ciphered**: All elements use wave function encoding
- **Vectorized**: Stored for data extraction and analysis

## Conclusion

The design blocks system creates a comprehensive, all-encompassing web presence where:

- Every element is ciphered using wave functions
- All blocks are vectorized and stored for data extraction
- Multiple permutations create unique visual signatures
- Azimuth-based design provides full coverage
- Color psychology and semantic levels preserve meaning
- Phi principles ensure proportional harmony

This foundation allows for infinite expansion while maintaining uniformity, meaning, and mathematical precision throughout the entire website.


