# Element Formatting Documentation

**Purpose**: Complete reference of all element formatting for future remodeling and reference.

**Last Updated**: 2025-01-30

---

## Table of Contents

1. [Headings](#headings)
2. [Cards](#cards)
3. [Containers & Sections](#containers--sections)
4. [Navigation](#navigation)
5. [Footer](#footer)
6. [Forms](#forms)
7. [Text Content](#text-content)
8. [Icons](#icons)
9. [Spacing Tokens](#spacing-tokens)
10. [Zoom Behavior](#zoom-behavior)

---

## Headings

### h1, .h1
- **Font Size**: `var(--font-h1)` (phi² modular scale)
- **Font Weight**: `var(--font-weight-extrabold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Letter Spacing**: Not specified (default)
- **Margin**: Not specified
- **Padding**: Not specified
- **Max Width**: Not specified
- **Text Align**: Not specified
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Phi Relationships**: Uses phi for line-height

### h2, .h2
- **Font Size**: `var(--font-h2)` (phi modular scale)
- **Font Weight**: `var(--font-weight-bold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Letter Spacing**: Not specified
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### h3, .h3
- **Font Size**: `var(--font-h3)` (phi modular scale)
- **Font Weight**: `var(--font-weight-semibold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### h4, .h4
- **Font Size**: `var(--text-lg)`
- **Font Weight**: `var(--font-weight-semibold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### h5, .h5
- **Font Size**: `var(--text-base)`
- **Font Weight**: `var(--font-weight-medium)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### h6, .h6
- **Font Size**: `var(--text-sm)`
- **Font Weight**: `var(--font-weight-medium)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### .hero h1
- **Font Size**: 
  - Base: `var(--font-h1)`
  - Responsive: `clamp(calc(var(--text-3xl-practical) * var(--size-hero-title)), calc(3rem * var(--size-hero-title)), calc(var(--text-5xl-practical) * var(--size-hero-title)))`
- **Font Weight**: `var(--font-weight-extrabold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Letter Spacing**: `-0.03em`
- **Margin**: `margin-bottom: var(--space-lg)`, `margin-left: auto`, `margin-right: auto`
- **Width**: `var(--phi-ratio)` (61.8%)
- **Max Width**: `46.25rem` (740px / 16)
- **Text Align**: `center`
- **Color**: Gradient text (white to purple light)
- **Zoom Behavior**: Scales with zoom via rem-based sizing, maintains phi proportions
- **Phi Relationships**: Uses phi for line-height, width, and sizing

### .section-title
- **Font Size**: 
  - Base: `var(--font-h2)`
  - Responsive: `clamp(calc(var(--text-2xl-practical) * var(--size-section-title)), calc(2.25rem * var(--size-section-title)), calc(var(--text-4xl-practical) * var(--size-section-title)))`
- **Font Weight**: `var(--font-weight-extrabold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Letter Spacing**: `-0.025em`
- **Margin**: `margin-bottom: var(--space-lg)`, `margin-top: 0`
- **Width**: `var(--phi-ratio)` (61.8%)
- **Max Width**: `46.25rem` (740px / 16)
- **Text Align**: `left` (centered on mobile)
- **Color**: `var(--primary-dark)`
- **Zoom Behavior**: Scales with zoom via rem-based sizing, maintains phi proportions
- **Phi Relationships**: Uses phi for line-height, width, sizing, and accent line
- **Accent Line**: `::after` pseudo-element with phi-ratio width and importance-based height

---

## Cards

### Base .card
- **Padding**: `clamp(var(--space-xl), 2.5vw, var(--space-2xl))`
- **Border Radius**: `var(--radius-md)`
- **Box Shadow**: `var(--shadow-sm)`
- **Border**: `2px solid var(--border-light)`
- **Border Left**: `calc(4px * var(--size-card-title)) solid var(--primary-color)`
- **Background**: Linear gradient (135deg, surface-elevated to primary-ultra-light)
- **Min Height**: `fit-content`
- **Height**: `100%`
- **Display**: `flex`, `flex-direction: column`
- **Zoom Behavior**: Scales with zoom via rem-based padding
- **Phi Relationships**: Uses phi-based spacing tokens

### Card #1 (.card:nth-child(1))
- **Padding**: `clamp(calc(var(--space-xl) * var(--phi-half)), 2.5vw, calc(var(--space-2xl) * var(--phi-half)))`
- **Border Radius**: `calc(var(--radius-md) * var(--phi-sqrt))`
- **Zoom Behavior**: Scales with zoom
- **Phi Relationships**: Uses phi-half (0.809) for padding, phi-sqrt (1.272) for border-radius

### Card #2 (.card:nth-child(2))
- **Padding**: `clamp(calc(var(--space-xl) * var(--phi-half)), 2.5vw, calc(var(--space-2xl) * var(--phi-half)))`
- **Border Radius**: `calc(var(--radius-md) * var(--phi-sqrt))`
- **Zoom Behavior**: Scales with zoom
- **Phi Relationships**: Same as Card #1 (congruent sizing)

### Card #3 (.card:nth-child(3))
- **Padding**: 
  - Base variation: `clamp(calc(var(--space-xl) * var(--phi-two-thirds)), 2.5vw, calc(var(--space-2xl) * var(--phi-two-thirds)))`
  - Alternative: `clamp(calc(var(--space-xl) * var(--phi-sqrt)), 2.5vw, calc(var(--space-2xl) * var(--phi-sqrt)))`
- **Border Radius**: `calc(var(--radius-md) * var(--phi-half))`
- **Transform**: `translateY(calc(var(--space-xs) * var(--phi-quarter)))`
- **Zoom Behavior**: Scales with zoom
- **Phi Relationships**: Uses phi-two-thirds (1.079) or phi-sqrt (1.272) for padding, phi-half for border-radius, phi-quarter for transform
- **Note**: Different sizing for visual rhythm (as per requirements)

### Card #4 (.card:nth-child(4))
- **Padding**: `clamp(calc(var(--space-xl) * var(--phi-half)), 2.5vw, calc(var(--space-2xl) * var(--phi-half)))`
- **Border Radius**: `calc(var(--radius-md) * var(--phi-sqrt))`
- **Zoom Behavior**: Scales with zoom
- **Phi Relationships**: Same as Cards #1 and #2 (congruent sizing)

### Card #5 (.card:nth-child(5))
- **Padding**: `clamp(var(--space-xl), 2.5vw, var(--space-2xl))` (base size)
- **Zoom Behavior**: Scales with zoom

### Card #6 (.card:nth-child(6))
- **Padding**: `clamp(calc(var(--space-xl) * (1 + var(--phi-quarter))), 2.5vw, calc(var(--space-2xl) * (1 + var(--phi-quarter))))`
- **Zoom Behavior**: Scales with zoom
- **Phi Relationships**: Uses phi-quarter (0.4045) variation

### .card-title
- **Font Size**: 
  - Base: `var(--font-h3)`
  - Responsive: `clamp(calc(var(--text-lg-practical) * var(--size-card-title)), calc(1.5rem * var(--size-card-title)), calc(var(--text-xl-practical) * var(--size-card-title)))`
- **Font Weight**: `var(--font-weight-bold)`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Letter Spacing**: `-0.015em`
- **Margin**: `margin-bottom: var(--space-lg)`, `margin-top: 0`
- **Color**: `var(--primary-dark)`
- **Text Align**: `left`
- **Max Width**: `46.25rem` (740px / 16)
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Phi Relationships**: Uses phi for line-height

#### Card Title Variations
- **Cards #1, #2, #4**: 
  - Font Size: `clamp(calc(var(--text-lg-practical) * var(--congruence-phi-1)), 1.5rem, calc(var(--text-xl-practical) * var(--congruence-phi-1)))`
  - Letter Spacing: `calc(-0.015em * var(--phi-inv))`
  - **Congruent sizing** (same values)
- **Card #3**: 
  - Font Size: `clamp(calc(var(--text-lg-practical) * var(--phi-two-thirds)), 1.5rem, calc(var(--text-xl-practical) * var(--phi-two-thirds)))`
  - Letter Spacing: `calc(-0.015em * var(--phi))`
  - Font Weight: `var(--font-weight-semibold)` (lighter)
  - **Different sizing** for visual rhythm

### .card-description
- **Font Size**: `clamp(0.875rem, 1rem, var(--text-base))`
- **Line Height**: `1.7`
- **Margin**: `margin-bottom: var(--space-lg)`
- **Text Align**: `left`
- **Max Width**: `46.25rem` (740px / 16)
- **Color**: `var(--text-secondary)`
- **Flex Grow**: `1`
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Text-Length Variations**:
  - `.text-long` (>200 chars): `clamp(calc(0.875rem * var(--phi-sqrt)), 1rem, calc(var(--text-base) * var(--phi-sqrt)))`
  - `.text-short` (<100 chars): `line-height: calc(1.7 * var(--phi-half))`, `margin-bottom: calc(var(--space-lg) * var(--phi-half))`

### .card-icon
- **Font Size**: `var(--icon-lg)`
- **Color**: `var(--primary-color)`
- **Margin**: `margin-bottom: var(--space-md)`
- **Zoom Behavior**: Scales with zoom
- **Card #3 Icon**: 
  - Width/Height: `calc(var(--space-xl) * var(--phi) * var(--phi-sqrt))`
  - Larger using phi-sqrt

---

## Containers & Sections

### .container
- **Width**: `100%` (full width)
- **Max Width**: `none` (no fixed max-width)
- **Margin**: `0 auto` (centered)
- **Padding Top**: `clamp(2vmin, 3.5vmin, var(--container-max-padding-vertical))`
- **Padding Bottom**: `clamp(2vmin, 3.5vmin, var(--container-max-padding-vertical))`
- **Padding Left**: `max(clamp(1rem, 2.5vw, var(--container-max-padding-horizontal)), 1rem)`
- **Padding Right**: `max(clamp(1rem, 2.5vw, var(--container-max-padding-horizontal)), 1rem)`
- **Box Sizing**: `border-box`
- **Position**: `relative`
- **Z-Index**: `1`
- **Zoom Behavior**: Horizontal padding scales with zoom via design tokens, vertical padding fixed
- **Phi Relationships**: Uses phi-based max padding tokens
- **Phi Lines**: `::after` and `::before` pseudo-elements for golden ratio positioning (hidden on mobile)

### .section
- **Padding**: `clamp(var(--space-xl), 4vw, var(--space-2xl)) 0`
- **Zoom Behavior**: Scales with zoom via rem-based spacing
- **Phi Relationships**: Uses phi-based spacing tokens

### .hero
- **Padding**: `var(--space-5xl) var(--space-lg)`
- **Text Align**: `center`
- **Background**: `var(--original-bg-gradient)`
- **Position**: `relative`
- **Overflow**: `hidden`
- **Min Height**: `fit-content`
- **Zoom Behavior**: Scales with zoom via rem-based padding
- **Phi Relationships**: `::before` and `::after` pseudo-elements use phi-ratio for positioning

---

## Navigation

### .nav-menu
- **Display**: `flex` (desktop), `none` (mobile < 600px)
- **Gap**: `var(--space-sm)` (intermediate breakpoint 600px-768px)
- **Font Size**: `clamp(0.875rem, 1rem, 1rem)` (intermediate breakpoint)
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### .hamburger
- **Display**: `none` (desktop), `flex` (mobile < 600px)
- **Zoom Behavior**: Scales with zoom

### .mobile-menu
- **Display**: `none` (default), `flex` (when `.active`)
- **Position**: `absolute`
- **Top**: `100%`
- **Left/Right**: `0`
- **Background**: `white`
- **Box Shadow**: `0 4px 20px rgba(0, 0, 0, 0.1)`
- **Padding**: `var(--space-lg)`
- **Flex Direction**: `column`
- **Gap**: `var(--space-lg)`
- **Zoom Behavior**: Scales with zoom via rem-based sizing

### .nav-brand
- **Display**: `flex`
- **Align Items**: `center`
- **Gap**: `var(--space-md)`
- **Zoom Behavior**: Scales with zoom

### .nav-tagline
- **Display**: `block` (desktop), `none` (mobile < 768px)
- **Zoom Behavior**: Scales with zoom

---

## Footer

### .footer
- **Background**: Linear gradient (135deg, #0f0f23 to #1a1a2e to #16213e)
- **Color**: `white`
- **Position**: `relative`
- **Width**: `100%` (full band; scales with native browser zoom like the rest of the page)
- **Margin**: `0`, `margin-top: auto`
- **Transform**: No zoom-compensation `transform` on `<html>`; responsive rules use `@media` breakpoints in CSS
- **Font Size**: `clamp(0.875rem, 0.92rem, 1rem)` — scales with browser zoom
- **Z-Index**: `10`
- **Min Height**: `fit-content`
- **Overflow**: `hidden`
- **Zoom Behavior**: Scales with **native** browser zoom (rem/clamp)

### .footer-main
- **Grid Template Columns**: `1fr` (mobile < 600px), multi-column (desktop)
- **Gap**: `clamp(var(--space-xl), 4vw, var(--space-2xl))`
- **Padding**: `clamp(var(--space-xl), 3vh, var(--space-2xl)) 0 clamp(var(--space-lg), 2vh, var(--space-xl))`
- **Text Align**: `center` (mobile)
- **Zoom Behavior**: Scales with zoom via rem-based sizing

---

## Forms

### .inquiry-form
- **Max Width**: `37.5rem` (600px / 16)
- **Width**: `var(--phi-ratio)` (61.8%)
- **Margin**: `0 auto`
- **Padding**: `var(--space-2xl)`
- **Border Radius**: `var(--border-radius)`
- **Box Shadow**: `var(--shadow)`
- **Border**: `2px solid var(--accent-primary-bg)`
- **Background**: Linear gradient (135deg, surface-elevated to primary-light)
- **Position**: `relative`
- **Overflow**: `hidden`
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Phi Relationships**: Uses phi-ratio for width, phi-based spacing

### .form-group
- **Margin Bottom**: `var(--space-lg)` (desktop), `1.5rem` (mobile < 600px)
- **Position**: `relative`
- **Z-Index**: `1`
- **Zoom Behavior**: Scales with zoom via rem-based spacing

### .form-group input, textarea, select
- **Width**: `100%`
- **Padding**: `clamp(var(--space-sm), 1.5vw, var(--space-md))`
- **Border**: `2px solid var(--border)`
- **Border Radius**: `var(--border-radius)`
- **Font Size**: `clamp(0.875rem, 1.2vw, var(--text-base))`
- **Font Family**: `inherit`
- **Min Height**: `44px` (touch-friendly), `48px` (mobile < 600px)
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Note**: Mobile uses `1rem` (16px) to prevent iOS zoom

### .form-group label
- **Display**: `block`
- **Margin Bottom**: `var(--space-sm)`
- **Font Weight**: `var(--font-weight-medium)`
- **Color**: `var(--text-primary)`
- **Zoom Behavior**: Scales with zoom

### button, .btn
- **Min Height**: `44px` (desktop), `48px` (mobile < 600px)
- **Min Width**: `44px`
- **Padding**: `0.75rem 1.25rem` (mobile < 600px), `0.875rem 1.5rem` (mobile < 600px buttons)
- **Font Size**: `1rem` (mobile < 600px)
- **Display**: `inline-flex`
- **Align Items**: `center`
- **Justify Content**: `center`
- **Zoom Behavior**: Scales with zoom via rem-based sizing

---

## Text Content

### .hero-subtitle
- **Font Size**: `clamp(var(--text-lg-practical), 1.25rem, var(--text-xl-practical))`
- **Color**: `var(--original-text-light)`
- **Margin**: `margin-bottom: var(--space-2xl)`, `margin-left: auto`, `margin-right: auto`
- **Line Height**: `1.7`
- **Font Weight**: `var(--font-weight-normal)`
- **Width**: `var(--phi-ratio)` (61.8%)
- **Max Width**: `46.25rem` (740px / 16)
- **Text Align**: `center`
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Phi Relationships**: Uses phi-ratio for width

### .section-description
- **Font Size**: `clamp(calc(var(--text-base) * var(--importance-normal)), 1.125rem, calc(var(--text-lg-practical) * var(--importance-normal)))`
- **Color**: `var(--text-secondary)`
- **Margin**: `margin-bottom: calc(var(--space-2xl) * var(--importance-normal))`
- **Line Height**: `calc(1em * var(--phi))` (1.618)
- **Width**: `var(--phi-ratio)` (61.8%)
- **Max Width**: `46.25rem` (740px / 16)
- **Text Align**: `left`
- **Position**: `relative`
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Phi Relationships**: Uses phi for line-height and width

### .text-content, p
- **Max Width**: `46.25rem` (740px / 16)
- **Zoom Behavior**: Scales with zoom via rem-based sizing
- **Note**: Excludes `.footer-description` and `.form-disclaimer`

---

## Icons

### .card-icon
- **Font Size**: `var(--icon-lg)`
- **Color**: `var(--primary-color)`
- **Margin**: `margin-bottom: var(--space-md)`
- **Zoom Behavior**: Scales with zoom
- **Card #3 Icon**: Larger using phi-sqrt

---

## Spacing Tokens

### Base Spacing
- `--space-base`: `1rem`
- `--space-xs`: Derived from base
- `--space-sm`: Derived from base
- `--space-md`: Derived from base
- `--space-lg`: Derived from base
- `--space-xl`: Derived from base
- `--space-2xl`: Derived from base
- `--space-3xl`: Derived from base
- `--space-4xl`: Derived from base
- `--space-5xl`: Derived from base
- `--space-6xl`: Derived from base

### Phi Relationships
- All spacing tokens use phi-based calculations
- Spacing uses **rem**; it scales with **native** browser zoom (no JS zoom compensation)
- Prefer **rem** and **% of parent** for rhythm; use **vw/vh** sparingly so layout does not fight zoom

---

## Zoom behavior (canonical)

See **`docs/development/FEATURE_RECONCILIATION.md`**.

- **Root zoom**: Native browser full-page zoom only; responsive layout uses **CSS media queries** (layout viewport in CSS pixels).
- **Browser zoom** (Ctrl±, pinch) scales the CSS pixel grid; **rem**, **em**, **px**, and **%** move together.
- **Viewport meta** allows roughly **25%–500%** pinch range (`minimum-scale=0.25`, `maximum-scale=5.0`).
- **`--lanczos-detected-zoom`** may be set at runtime for pattern diagnostics; **not** for layout compensation.

---

## Character Structure Considerations

### Current State
- **Letter Spacing**: Varies by element (e.g., -0.03em for hero h1, -0.025em for section-title, -0.015em for card-title)
- **Line Height**: Most elements use `calc(1em * var(--phi))` (1.618)
- **Font Weight**: Varies by element importance
- **Text Align**: Varies (left, center, right)

### Text-Length Awareness
- **Short Text** (<100 chars): Tighter line-height, smaller margin-bottom
- **Medium Text** (100-200 chars): Base phi sizing
- **Long Text** (>200 chars): Larger font-size using phi-sqrt

---

## Responsive Breakpoints

- **Ultra-wide**: `min-width: 1920px`
- **Large Desktop**: `min-width: 1400px`
- **Standard Desktop**: `max-width: 1399px` and `min-width: 1024px`
- **Tablet Landscape**: `max-width: 1023px` and `min-width: 769px`
- **Intermediate**: `max-width: 768px` and `min-width: 601px` (maintains desktop nav)
- **Mobile**: `max-width: 600px` (hamburger menu appears)
- **Small Mobile**: `max-width: 480px`

---

## Notes for Remodeling

1. **Template-Locked Sizing**: Many elements use template-based sizing (H1, H2, etc.) - need individual sizing
2. **Congruence Patterns**: Cards #1, #2, #4 should have congruent sizing, #3 different
3. **Text-Length Awareness**: Need better text-length detection and application
4. **Line-Level Typography**: Need character structure as shape considerations
5. **Zoom System**: Need to revamp to zoom entire site as one unit, exclude navbar/footer
6. **Phi Principles**: Need to add Tucker's coefficient of factor congruence with phi symmetry
7. **Individual Element Sizing**: Remove reliance on HTML tag labels, use phi derivatives individually

