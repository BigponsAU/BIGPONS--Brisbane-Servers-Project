# Dashboard UX element map

**Purpose:** Track where every user-facing capability lives after panel reorganization. Use when moving UI so nothing is dropped before payment/billing ships.

**Last updated:** 2026-06-28

**Related:** [DASHBOARD_FEATURE_MATRIX.md](DASHBOARD_FEATURE_MATRIX.md) (status per panel/API) · [FEATURES_NOT_BUILT.md](../operations/FEATURES_NOT_BUILT.md) (Stripe, PayID — do not “fix” without sign-off) · [DASHBOARD_WIRING_GAPS.md](DASHBOARD_WIRING_GAPS.md) (unwired UI + action standards)

---

## Navigation (creator mode)

| Section | Panel | Primary job | `minRole` |
|---------|-------|-------------|-----------|
| **Home** | Overview | Stats, tokens, contributions, security, starter blocks | `client` |
| **Create** | Resources | Tree workspace, generate, upload, paste, OCR documents | `client` |
| **Voice studio** | Voice profiles | Profile library + **inline detail** (rings, matrix, corpus) | `editor` |
| **Voice studio** | Voice lab | Tone/pattern analysis, Markov flow | `editor` |
| **Voice studio** | Voice map | 2D / depth / 3D topology | `editor` |
| **Insights** | Analytics | Corpus stats, suggestions, pipeline config | `editor` |

## Navigation (admin mode)

| Section | Panel | `minRole` |
|---------|-------|-----------|
| **Library** | Library growth, Moderation, Site review | `admin` |
| **Platform** | Users, Ops & billing | `admin` |

**Role gating:** Nav items with `minRole: editor` (voice + analytics) are hidden for contributor `client` accounts. Admin mode toggle requires `admin`. Source: `workspaceNavItems` in `src/data/account-workspace.ts`.

---

## Pre-auth & contributor surfaces

| Surface | Component / script | When shown |
|---------|-------------------|------------|
| Sign-in (email, Google, passkeys) | `AccountSignIn.astro`, `account-auth.ts` | Unsigned visitor |
| Contributor home | `AccountBasicHome.astro` (`#account-basic-home`) | Signed-in `client` without editor workspace |
| Full workspace shell | `AccountWorkspacePage.astro`, `account-workspace-app.ts` | `editor` or `admin` |

Contributor home links to `/resources/`, `/contribute/`, and **Request workspace access** — not the full Create / Voice studio nav.

---

## Cross-panel elements (by feature)

| Feature | Canonical home | Also surfaced in |
|---------|----------------|------------------|
| Voice profile picker for generation | Resources → voice bar | Profiles → “Generate with” |
| Default / active voice summary | Resources → voice bar (`#voice-context-summary`) | Profiles → default badge on card |
| Profile rings / matrix / vertex viz | Profiles → **detail pane** (not modal) | — |
| BIGPONS site voice build | Profiles → site voice card | Link from Resources voice bar |
| Generate resource | Resources → create deck | Profiles → Generate with |
| Document OCR & rewrite | Resources → Documents card | — |
| Resource view / edit modals | Resources → `#view-resource-modal`, `#edit-resource-modal` | Detail pane → **inline edit** (`editResource(id, 'inline')`) |
| Resource action permissions | `getResourceActionPermissions()` | Delete blocked while **published** (owner); admin **Remove from workspace** = soft delete |
| Published index retention | `portalRemovedAt` soft delete | Public + search index **unchanged** when admin removes from workspace |
| Confirm dialogs | `showConfirmDialog()` | All account workspace panels (resources, profiles, voice lab) |
| Markdown content editor | `workspace-markdown-field.ts` | Visual / Markdown / Preview + format toolbar on content fields |
| Preview resource modal | `#preview-resource-modal` | Rendered markdown; replaces ad-hoc DOM |
| Admin removed resources | Tree **Removed** + list filter `removedOnly=1` | Restore via `restoreResource()` |
| Starter blocks on Overview | Overview → starter blocks card | Same data as `/resources/starter-blocks` |
| Tokens & perks | Overview → tokens card | Admin ops → usage / redemptions |
| Markov navigation flow | Voice lab → collapsible | — |
| Admin growth config / queue | Library growth → split workspace | Cross-links → Insights, Resources |
| Moderation preview | Moderation → queue + detail pane | Cross-links → Resources, Library growth |
| Hosting checklist | Site review → collapsible (super-admin) | Cross-link → Ops |
| Token / AI ops cards | Admin ops → collapsible sections | Cross-links → Insights, growth, site review |

---

## Admin panels (this pass)

| Panel | Pattern applied |
|-------|-----------------|
| Library growth | `panel-shell`, collapsible guidance, config \| queue split, cross-links |
| Moderation | Queue list + inline detail preview, summary count |
| Site review | Grid cards, hosting in collapsible `<details>` |
| Users | Guidance, cross-link to Ops, queue-style summary |
| Ops & billing | Primary usage card, collapsible inference/billing/setup cards |

### `panel-shell` consistency

| Panel | Root `panel-shell` |
|-------|-------------------|
| Overview, Resources, Profiles | **No** — use inner `*-panel-shell` or legacy `portal-panel` only |
| Analytics, Voice lab, Voice map | Yes |
| All admin panels | Yes |

Optional polish: add root `panel-shell` to Overview / Resources / Profiles for uniform spacing — not required for function.

---

## Code split (maintainability + lazy load)

| Module | Responsibility | Loaded |
|--------|----------------|--------|
| `account-workspace-app.ts` (~1.5k lines) | Boot, nav, dashboard, analytics | On sign-in |
| `account-workspace-resources.ts` (~2.5k lines) | Tree, CRUD, documents, bulk, modals | **First visit to Resources** (or `selectResource` from moderation) |
| `account-workspace-profiles.ts` (~1.6k lines) | Profiles library, viz, sculpt | **First visit to Voice profiles** |
| `account-workspace-panel-loader.ts` | `import()` stubs on `window` | With app shell |
| `account-workspace-resource-store.ts` | Shared resource list for dashboard + panels | With app shell |
| `account-workspace-resource-api.ts` | Canonical `GET /resources` client helpers | With app shell |
| `account-workspace-voice-context.ts` | Voice picker on Create panel | With app shell |
| `account-workspace-voice-features.ts` | Voice lab + voice map panel show hooks | **First visit to Voice lab or Voice map** |
| `account-library-growth.ts` | Library growth bind + load | Boot (`account-workspace-boot.ts`) |
| `account-admin-moderation.ts` | Moderation queue | Boot via `portal-account-extensions.ts` |
| `account-admin-users.ts` | Users table + audit | **First visit to Users** |
| `account-admin-ops.ts` | Ops & billing cards | Boot |

**Build impact (gzip):** app shell ~13 KB; profiles chunk ~12 KB; resources chunk ~15 KB — loaded on demand, not on first paint after sign-in.

**CI guard:** `post-build-verify.ts` requires `account-workspace-app`, `account-workspace-profiles`, and `account-workspace-resources` chunks in `dist/assets/`.

---

## API cleanup

- Removed dead `includeStarterBlocks` query param (server never read it; access control is in `filterResourcesForUser`).
- `buildResourcesListUrl()` centralises list vs starter-blocks endpoint selection.
- `fetchAuthenticatedResources()` used by dashboard, analytics, and resources panel.

---

## Moved / consolidated (UX rationale)

| Before | After | Why |
|--------|-------|-----|
| Profile “View details” modal only | Profiles split workspace: list + detail pane | Discoverability; same pattern as Resources tree |
| Voice profile select isolated | Resources voice bar + links to Profiles & Voice lab | Voice sits next to create flow |
| Analytics under “Content” | **Insights** section | Separates create vs measure |
| Verbose profile guidance always open | Collapsible `<details>` | Less scroll before library |
| Markov always visible in Voice lab | Collapsible secondary card | Focus on analyze first |

---

## Shell (all panels)

| Element | Location |
|---------|----------|
| Global search | Header |
| Mode switcher | Sidebar + header (mobile) |
| API connectivity banner | Account root |
| Info card | Overlay from header |

---

## Pre-billing shipping checklist

Repo-ready items (local / CI). **Production** also needs Pages deploy + edge worker deploy when API or corpus guards change.

- [x] Resources tree shows owned resources (`ownerId` API)
- [x] Post-create resource reveal in tree
- [x] Profiles inline detail workspace
- [x] Nav sections: Home / Create / Voice studio / Insights
- [x] Admin panels: growth, moderation, site review, users, ops (`panel-shell` + split workspaces)
- [x] `account-workspace-app.ts` split — resources + profiles lazy chunks; shared store + API helpers
- [ ] Payment UI in Admin ops (planned — `FEATURES_NOT_BUILT.md`)
- [x] Owner backfill — **not needed** on production (4 resources, all `ownerId: system`, 0 orphans). Script: `npm run backfill:resource-owners`
- [x] Corpus payload repair — use `npm run audit:corpus -- --repair --apply` if string-encoded rows return

---

## Release gates (prevent regressions on push)

**Helm is not applicable** — this stack is Cloudflare Pages (static Astro) + Cloudflare Worker API, not Kubernetes. Use automated gates in CI and post-deploy smoke instead.

| Layer | Command / workflow | Blocks |
|-------|-------------------|--------|
| **PR + main CI** | `npm run preflight:production` (typecheck, vitest, build, `post-build-verify`) | `.github/workflows/ci.yml` |
| **Nav regression** | `tests/account-workspace-nav.test.ts` | Missing panel in nav or `refreshPanelData` |
| **Dashboard API routes** | `npm run verify:dashboard-api -- --api https://api.brisbaneservers.com` | 404 on any `/account` endpoint |
| **After worker deploy** | Same `verify:dashboard-api` in `deploy-edge-worker.yml` | Broken API after edge push |
| **Full go-live** | `npm run verify:production -- --api https://api.brisbaneservers.com` | Health, persistence, OAuth status |
| **Branch protection** | Require CI green before merge to `main` | Manual ship of broken builds |

**Optional next steps (not required for v1):** Playwright smoke on `/account` panel navigation; scheduled weekly `verify:production` workflow; preview Pages URL + preview worker in PR checks.

**Not Helm:** charts help repeatable K8s deploys; they do not catch TypeScript errors, missing JS chunks, or API 404s. The table above is the right preventative stack for this repo.
