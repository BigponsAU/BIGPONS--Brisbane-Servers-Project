# Feature reconciliation (zoom / breakpoints only)

**Scope:** Avoid **duplicate or competing** layout-zoom systems (e.g. JS zoom tiers + CSS, or root `transform` “zoom”). This file is **not** a gate on everyday styling, components, marketing layout, or refactors—change those freely in the normal CSS/components flow.

When you work on **how the site scales under browser zoom** or **how breakpoints are defined**, **check here first** so we do not add a second system. **Unison** means native browser page zoom (Ctrl±) with **rem/em/%** tokens; responsive layout uses **CSS media queries** on the layout viewport (CSS pixels), not JavaScript zoom modeling.

**Changing policy:** If product direction shifts, update this table and the code together—this doc describes current intent, not a permanent UX straitjacket.

| Topic | Canonical location | Notes |
|--------|-------------------|--------|
| Browser zoom + layout | `design-tokens.css`, `site-framework.css`, `global.css` | **No** root `transform` for zoom. No `data-layout-tier`. Breakpoints: `@media` only. |
| Lanczos / pattern variables | `lanczos-scaling.ts`, `design-tokens.css` | `--lanczos-detected-zoom` is for patterns/diagnostics, not a layout zoom layer. |
| Historical zoom compensation | `website-brisbaneservers.com/ZOOM_COMPENSATION_TEXT_SIZING_FIX.md` | Older narrative; current approach is native zoom + tokens + media queries. |
| Element/body formatting | `website-brisbaneservers.com/ELEMENT_FORMATTING_DOCUMENTATION.md` | Cross-links here for layout/zoom expectations. |
| Build / checklist | `website-brisbaneservers.com/BUILD_CHECKLIST.md` | Should match policy above. |
| Home interconnection (margin + rim + band graphs) | `HomeInterconnectionRig.astro`, `PageMarginSatelliteColumn.astro`, `SectionSatelliteConstellation.astro`, `section-satellite-graph.ts`, `site-framework.css` (`.main-home .home-interconnection-*`) | Decorative layout and SVG only; **no** JS layout zoom. Margin accent follows scroll via `data-margin-band` (lightweight scroll listener). |

**If your idea is already covered** in one of these files or code paths, prefer **editing that path** instead of parallel comments or a duplicate implementation.

When opening a PR that touches zoom or breakpoints, **link** this file or state why policy should change.
