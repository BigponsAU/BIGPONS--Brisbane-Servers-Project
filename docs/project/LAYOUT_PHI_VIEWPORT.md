# Layout: φ rhythm, viewport, sections vs containers

This site separates **full-width bands** from **readable content width** so backgrounds use the viewport while typography stays comfortable.

## Structure

| Layer | Role | Typical classes / scope |
|--------|------|-------------------------|
| **Section band** | Background, tartan accents, vertical rhythm | `.section`, modifiers like `.section--bg-surface` |
| **Content column** | Max width + horizontal gutters aligned to tokens | `.container`, optional `.container--wide` |
| **Prose / measure** | Line length for titles, paragraphs, card copy | `--measure-prose`, `--measure-narrow`, `--measure-article` |

**Rule:** Do not cap the main marketing column with raw `120rem` or ad-hoc `max-width` in page CSS. Use `var(--container-max-width)` (defined in design tokens and applied in `global.css`).

## Key CSS variables

Defined in [`website-brisbaneservers.com/src/styles/design-tokens.css`](../../website-brisbaneservers.com/src/styles/design-tokens.css):

| Token | Purpose |
|--------|---------|
| `--phi-rhythm-root` | Shared fluid root for typography and spacing |
| `--font-base` / `--space-base` | Derived from rhythm + viewport multipliers |
| `--layout-padding-inline` | Horizontal gutters inside `.container` |
| `--container-max-width` | `min(100%, min(120rem, 100vw − gutters & safe-area))` — uses viewport width |
| `--container-max-width-wide` | Wider upper bound for `.container--wide` |
| `--measure-prose` | ~46.25rem cap for comfortable reading |
| `--measure-narrow` | Narrow centered blocks (e.g. ~37.5rem) |
| `--measure-article` | Long-form / case-study column (~56.25rem) |
| `--section-inline-size` | Section band width (100%) |

**Portal-only** tokens: `--portal-login-max`, `--portal-header-search-max`, `--portal-modal-max`, `--portal-modal-wide-max`, etc. (used in `portal.astro`).

## Utilities (global.css)

- **Sections:** `.section--bg-surface`, `.section--bg-primary-light`
- **CTAs:** `.cta-row`, `.cta-row--compact`
- **Titles:** `.section-title--center`, `.section-title--stack-4xl`
- **Home intros:** `.section-intro-phi` (see “Home page: wide column + φ-split intros” below)
- **Site chassis:** `.main-phi-chassis` on `<main>` — 3-column section grid; see [`PHI_ARMATURE.md`](./PHI_ARMATURE.md)
- **Focus / measure:** `.phi-measure-prose`, `.phi-measure-article`, `.phi-focus-offset-start`
- **Section curves (opt-in):** `.section-edge-curve-bottom`, `.section-edge-curve-top` in `geometric-detailing.css`
- **Stacks:** `.stack-lg`, `.stack-2xl`
- **Resources topic:** `.section-description--prewrap`, `.voice-score-callout`

## Vertical viewport

- Hero min-heights use **`dvh`** in tokens (`--hero-min-height`, `--hero-inner-min-height`).
- `#main-content` uses **`min-height: calc(100dvh - var(--site-header-clearance))`** so short pages still fill the visible viewport under the header (footer remains in normal flow).

For the **armature token table**, asymmetric radii, chassis grid, and typography/focus utilities, see [`PHI_ARMATURE.md`](./PHI_ARMATURE.md).

## Home page: wide column + φ-split intros

- **Wider content column:** On pages whose `<main>` has class `main-home`, `global.css` sets  
  `body:has(main.main-home) { --container-max-width: var(--container-max-width-wide); }`  
  so the header `nav`, every `.container` on that page (sections, footer, inquiry form), and φ guide lines share the same wider cap (`--container-max-width-wide` in design tokens) without duplicating `container--wide` on each block.
- **Lateral section intros:** Use `<div class="section-intro-phi">` wrapping a left-aligned `h2.section-title` and the following `p.section-description`. It’s a two-column grid at **φ proportions** (38.2% / 61.8%) from `--phi-ratio-inv` / `--phi-ratio`, with lead copy capped by `--measure-article`. It stacks to one column at **1024px** to stay in step with `CardGrid`’s two-column breakpoint.

## Home page Banach / tartan

Joined backing targets **classes** (not inline `style`):

- `.section.section-tartan-accent.section--bg-surface`
- `.section.section-tartan-accent.section--bg-primary-light`

See [`website-brisbaneservers.com/src/styles/banach-fixed-point.css`](../../website-brisbaneservers.com/src/styles/banach-fixed-point.css).

## Checklist for new pages

1. Wrap page blocks in `<section class="section">` (plus modifiers as needed).
2. Put primary content in `<div class="container">` (or `container container--wide`).
3. Prefer measure tokens for paragraph-width constraints over raw `px`/`rem` max-widths.
4. Avoid `100vw` on full-bleed unless you account for scrollbars; sections use `width: 100%` of `main`.
