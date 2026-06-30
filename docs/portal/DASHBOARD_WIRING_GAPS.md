# Dashboard wiring gaps & production standards

**Last updated:** 2026-06-29  
**Purpose:** Track UI wiring, standards, and intentional deferrals for `/account`.

**Related:** [DASHBOARD_UX_ELEMENT_MAP.md](DASHBOARD_UX_ELEMENT_MAP.md) · [DASHBOARD_FEATURE_MATRIX.md](DASHBOARD_FEATURE_MATRIX.md)

---

## Production standards (apply to every panel)

| Standard | Implementation |
|----------|----------------|
| **Marketing band shell** | `AccountWorkspacePanelBand.astro` or `account-workspace-panel-section` + `SectionIntro` |
| **Root `panel-shell`** | On every `#*-panel` portal surface |
| **Styled confirms** | `showConfirmDialog()` — no `window.confirm()` / `window.prompt()` |
| **Link / prompt input** | `showPromptDialog()` (WYSIWYG link insert) |
| **Permissions** | `getResourceActionPermissions()` + API mirror for resource actions |
| **Markov tracking** | `trackPortalPanel()` on nav; `trackPortalAction()` on panel load + destructive/long actions |
| **Global search** | Prefixes: `profile:`, `voice:`, `panel:`, `resource:`; panel name aliases; default → Resources search |
| **Keyboard shortcuts** | `Ctrl+K` search; `1`–`6` creator panels; `1`–`5` admin panels (when admin mode active) |

**CI guard:** `tests/dashboard-standards.test.ts` + `tests/account-workspace-nav.test.ts`

---

## Published resources stay indexed (product rule)

Once **published**, a resource remains in the **public catalog**, **`search-index.json`**, semantic chunks, and static `/resources/item/{id}/` URLs even when removed from the workspace.

| Action | Workspace | Public site + search index |
|--------|-----------|----------------------------|
| Owner **unpublish** | Draft in library | Removed on next deploy hook |
| Owner **delete** (draft/archived) | Hard delete | N/A |
| Admin **Remove from workspace** (published) | Soft delete (`portalRemovedAt`) | **Unchanged** |
| Admin **Restore to workspace** | Clears `portalRemovedAt` | **Unchanged** |
| Take live page off site | **Unpublish** | Removed on deploy hook |

---

## Wired (production-ready)

| Capability | Module / surface |
|------------|------------------|
| **Panel band consistency** | All 11 panels — `AccountWorkspacePanelBand` or Overview/Resources bands |
| Inline + modal edit | `account-workspace-resources.ts`, modals |
| **WYSIWYG** | `workspace-markdown-field.ts` — TipTap Visual / Markdown / Preview |
| Styled confirms | All workspace + admin scripts (growth, moderation, ops, users, voice reindex) |
| Resource permissions | `resource-permissions.ts` — client + API |
| Preview modal | `#preview-resource-modal` |
| Admin **Removed** filter + restore | Tree + `removedOnly=1` + `restoreResource()` |
| Soft delete API | `portalRemovedAt` on published DELETE |
| **Markov v2 (deep parity)** | Panel/action/error chain, error-prone transitions, extrapolate issues |
| **Stripe AI Boost** | Checkout, webhook, overview upgrade CTA, admin PayID grant |
| **Global search** | Full panel aliases + prefixes |
| **Keyboard nav** | Mode-aware 1–9 panel shortcuts |
| **Growth semantic dedup** | `library-growth/dedup.ts` — vector similarity before materialize |
| **Voice map semantic route** | `GET /api/voice-map/semantic` + query UI in Voice map panel |

---

## Intentionally deferred

| Surface | Notes |
|---------|--------|
| Cloudflare Vectorize backend migration | Optional — JSON/Postgres index in use |
| Stripe Customer Portal (self-serve cancel) | Checkout + webhook live; portal link optional follow-up |

---

## Deploy checklist

1. **Edge worker** — `deploy-edge-worker.yml` on push to `main`
2. **Cloudflare Pages** — auto-build on `main`
3. **Verify** — `npm run verify:dashboard-api -- --api https://api.brisbaneservers.com`
4. **Local** — `npm run preflight:production` (85+ tests)

---

## Checklist for new dashboard actions

1. Permission helper for button visibility  
2. `showConfirmDialog()` for destructive or long-running actions  
3. Same rules on the **API route**  
4. `trackPortalAction()` / `trackPortalError()` when non-trivial  
5. Marketing band / `panel-shell` if adding a new panel section  
6. Vitest when rules are non-obvious  
