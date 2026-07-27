# Dashboard wiring gaps & production standards

**Last updated:** 2026-07-27  
**Purpose:** Track UI wiring, standards, intentional deferrals, and **live functional QA** for `/account`.

**Related:** [DASHBOARD_UX_ELEMENT_MAP.md](DASHBOARD_UX_ELEMENT_MAP.md) · [DASHBOARD_FEATURE_MATRIX.md](DASHBOARD_FEATURE_MATRIX.md)

---

## Functional QA log (production)

Cadence: find → document → fix → push → retest on `https://brisbaneservers.com/account/`.

| Date | Panel / action | Symptom | Root cause | Fix | Retest |
|------|----------------|---------|------------|-----|--------|
| 2026-07-27 | Resources → **Improve** on healthcare draft | Button “worked” but body became design-system gibberish (cipher / Fourier / wave function / 1.618 / 61.8); truncated fragments; voice score could look better while content got worse | `POST /api/resources/:id/improve` used singleton `Extrapolator`/`VoiceMatcher` from `getVoiceFramework()` (bundled **Design System Voice**). Generate already scoped to `resolved.profile`. Voice gate ≥0.45 + template fallback rewarded jargon; no topic-fidelity guard | Scope Improve (+ process/upload ingest) to `new Extrapolator/VoiceMatcher(resolved.profile)`; topic-fidelity + jargon reject → keep original; skip design Extrapolator for consulting profiles; tighten improve prompt; industry/minScore RAG; `tests/resource-improve-fidelity.test.ts` | **Retested OK** (2026-07-27): clean healthcare draft stayed on-topic; `mode=original` when AI/template unsafe; no cipher/Fourier/1.618 leak |
| 2026-07-27 | Admin → Users soft-remove / restore | Markup/API exist; client did not render Remove/Restore or populate removed table | Client lag in `account-admin-users.ts` | Wire Remove (DELETE), Restore (POST action), `includeRemoved=1`, removed table; replace `window.alert` with styled notification | **Retested OK** after Pages `e4e6a4b`: 18 Remove buttons; summary `18 active · 0 removed` |
| 2026-07-27 | Admin → Users auth-audit pager | Prev/Next buttons unbound (single `limit=100` fetch) | Client never bound pager or used `offset` | Page size 25 + prev/next handlers calling `/admin/auth-audit?limit&offset` | **Retested OK**: shows `1–25 of 263`; Next advances |
| 2026-07-27 | Creator + Admin API smoke (admin session) | — | — | Verified live 200s: resources, starter-blocks, profiles, analytics, voice-map, voice/analyze, library-growth, contributions, users, auth-audit, usage, token-redemptions, billing accounts/status, search-corpus | **OK** (14/14) |
| 2026-07-27 | Profiles + ranking | Design System card confused library; ranking rewarded any numbers / cipher jargon | Synthetic `id=default` Design System card in GET /profiles; ToneAnalyzer `hasSpecificValues = numbers.length > 0`; Extrapolator injected random commonValues | Remove Design System from portal list; consulting fallback instead of design JSON; ranking penalizes jargon and ignores golden-ratio / arbitrary digit correlation | **Retested OK**: profiles=2 (Brisbane default + healthcare base); Design System gone; GOOD 0.231 > JUNK 0.000 |
| 2026-07-27 | All industries ranking + Improve purpose | Need assurance beyond healthcare | Contaminated PS/construction drafts from prior bad Improves | Ranking attested on 7 industries; restored purposeful PS/construction drafts; corpus scan 0/49 contaminated; sanitizer strips design junk on Improve fallback | **OK**: ranking 7/7; corpus clean; drafts restored |

---

## Production standards (apply to every panel)

| Standard | Implementation |
|----------|----------------|
| **Marketing band shell** | `AccountWorkspacePanelBand.astro` or `account-workspace-panel-section` + `SectionIntro` |
| **Root `panel-shell`** | On every `#*-panel` portal surface |
| **Styled confirms** | `showConfirmDialog()` — no `window.confirm()` / `window.prompt()` |
| **Link / prompt input** | `showPromptDialog()` (WYSIWYG link insert) |
| **Permissions** | `getResourceActionPermissions()` + API mirror for resource actions |
| **Markov tracking** | Resource creation hops + voice match % (`trackResourceCreation` / metadata hydrate) |
| **Global search** | Prefixes: `profile:`, `voice:`, `panel:`, `resource:`; panel name aliases; default → Resources search |
| **Keyboard shortcuts** | `Ctrl+K` search; `1`–`6` creator panels; `1`–`6` admin panels (when admin mode active) |

**CI guard:** `tests/dashboard-standards.test.ts` + `tests/account-workspace-nav.test.ts`

---

## Published resources stay indexed (product rule)

Once **published**, a resource remains in the **public catalog**, **`search-index.json`**, semantic chunks, and static `/resources/item/{id}/` URLs even when removed from the workspace.

| Action | Workspace | Public site + search index |
|--------|-----------|----------------------------|
| Owner **unpublish** | Draft in library | Removed on next deploy hook |
| Owner **delete** (draft/archived) | Soft-bin (`binnedAt`, status → draft) | Vectors **kept** in semantic index for collation |
| Admin **Remove from workspace** (published) | Soft delete (`portalRemovedAt`) | **Unchanged** |
| Admin **Restore to workspace** | Clears `portalRemovedAt` | **Unchanged** |
| Owner **Restore** bin draft | Clears `binnedAt` | Vectors unchanged |
| Take live page off site | **Unpublish** | Removed on deploy hook |

**Recent Activity:** double-click a draft → confirm → bin draft (same DELETE path).

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
| Soft delete API | `portalRemovedAt` on published DELETE; `binnedAt` on draft/archived DELETE (vectors retained) |
| **Markov lineage** | Resource→resource hops, voice share %, extrapolate lineage |
| **Stripe AI Boost** | Checkout, webhook, overview upgrade CTA, admin PayID grant |
| **Global search** | Full panel aliases + prefixes |
| **Keyboard nav** | Mode-aware 1–6 panel shortcuts |
| **Growth semantic dedup** | `library-growth/dedup.ts` — vector similarity before materialize |
| **Voice map semantic route** | `GET /api/voice-map/semantic` + query UI in Voice map panel |
| **Improve topic fidelity** | Resolved-profile Extrapolator/VoiceMatcher; jargon/topic guard; keep original on fail |

---

## Intentionally deferred

| Surface | Notes |
|---------|--------|
| Cloudflare Vectorize backend migration | Optional — JSON/Postgres index in use |

Stripe Customer Portal is **Live** (Overview → Manage subscription via `POST /api/billing/portal`).

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
