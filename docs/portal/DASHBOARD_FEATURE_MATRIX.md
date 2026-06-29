# Account dashboard — feature matrix

**URL:** `/account` · **Last updated:** 2026-06-28

Single reference for every dashboard surface: what ships today, what is partial, and what is intentionally deferred. Use this when refactoring so no panel or integration is dropped.

**Related:** [ACCOUNT_WORKSPACE_CHECKLIST.md](ACCOUNT_WORKSPACE_CHECKLIST.md) · [FEATURES_NOT_BUILT.md](../operations/FEATURES_NOT_BUILT.md) · [VOICE_PORTAL_SCOPE_MAP.md](VOICE_PORTAL_SCOPE_MAP.md)

---

## Legend

| Status | Meaning |
|--------|---------|
| **Live** | Production-ready for v1 scope |
| **Partial** | UI or API exists; wiring or parity incomplete |
| **Planned** | Documented product slice, not yet built |
| **Retired** | Replaced; kept for reference only |

---

## Workspace panels (creator mode)

| Panel | Status | API / scripts | Gaps |
|-------|--------|---------------|------|
| **Overview** | Live | `/api/resources`, `/api/tokens/*`, `/api/community/my-contributions` | Optional extra stat widgets |
| **Resources** | Live (v1) | `/api/resources/**`, `/api/documents/**` | Marketing bands (Phase 2) |
| **Analytics** | Live | `/api/analytics/suggestions`, `/api/admin/pipeline-config` | — |
| **Voice profiles** | Live | `/api/profiles/**` | — |
| **Voice lab — analyze** | Live | `POST /api/voice/analyze` | — |
| **Voice lab — Markov flow** | Partial → **Live** | `portal-markov-tracker.ts` (client) | Deep legacy parity (debug/export/errors) = Phase 2 |
| **Voice map — 2D** | Live | `/api/voice-map/corpus`, `/principles` | — |
| **Voice map — depth / 3D** | Live | `voice-map-webgl.ts` | — |
| **Voice map — semantic route** | Partial | `GET /api/voice-map/semantic` registered | UI uses corpus chunks layer instead |

---

## Admin console panels

| Panel | Status | API / scripts | Gaps |
|-------|--------|---------------|------|
| **Library growth** | Live (v1) | `/api/admin/library-growth`, cron | Prod schedule arm; semantic dedup Phase 2 |
| **Moderation** | Live | `/api/community/contributions` | — |
| **Site review** | Live | `/api/admin/site-sections`, hosting, email checklists | — |
| **Users** | Live | `/api/admin/users`, auth audit | — |
| **Ops & billing** | Partial | `/api/usage/me`, token redemptions, search corpus | PayID grant UI, Stripe — **Planned** |

---

## Shell & cross-cutting

| Feature | Status | Location | Gaps |
|---------|--------|----------|------|
| Sign-in (password, passkeys, OAuth) | Live | `account-auth.ts` | — |
| Contributor home (no editor tools) | Live | `AccountBasicHome.astro` | — |
| Workspace / Admin mode switch | Live | `account-workspace-mode.ts` | — |
| Global search (Ctrl+K) | Partial | `AccountWorkspaceHeader.astro` | Prefix routing: `profile:`, `voice:`, panel names |
| API connectivity banner | Live | `account-api-connectivity.ts` | — |
| Info card | Live | `AccountWorkspaceInfoCard.astro` | — |
| Token earn / redeem | Live | Overview, `/api/tokens/**` | Stripe top-up **Planned** |
| Keyboard shortcuts 1–4 | Partial | `account-workspace-app.ts` | Only first four creator panels |

---

## Markov chain analysis — completion map

| Capability | Legacy Docker dashboard | `/account` portal |
|------------|-------------------------|-------------------|
| Panel transition tracking | `markov-chain-tracker.js` | `trackPortalPanel()` in `portal-markov-tracker.ts` |
| Summary in Voice lab | Testing tab | Voice lab card |
| Export JSON | Yes | Yes (client download) |
| Reset tracker | Yes | Yes |
| Function-call wrapping | Yes | **Not ported** (Phase 2) |
| Debug from chain | Yes | **Not ported** (Phase 2) |
| Error pattern analytics | Yes | **Not ported** (Phase 2) |

**Storage:** `localStorage` key `bs-portal-markov-v1` (browser-only, no server API by design).

---

## Intentionally not built (do not “fix” without product sign-off)

From [FEATURES_NOT_BUILT.md](../operations/FEATURES_NOT_BUILT.md):

- Stripe subscription past daily AI cap
- PayID manual top-up admin grant UI
- Binary DOCX/PDF round-trip with fonts/logos
- Fully autonomous publish-without-review pipeline
- Legacy Render Docker dashboard (retired)

---

## Phase 2 backlog (refactor-safe to defer)

1. ~~Split `account-workspace-app.ts` into panel modules~~ — **Done** (profiles + resources lazy chunks; see element map)
2. Library growth semantic vector dedup
3. Author propose-only growth queue
4. Deep Markov parity (function errors, debug chain)
5. Resources panel marketing bands
6. Cloudflare Vectorize backend (optional)
7. Build-time case-study draft fetch

---

## Verification

```bash
cd website-brisbaneservers.com
npm run verify:production -- --api https://api.brisbaneservers.com
npx tsx scripts/verify-dashboard-api.ts
```

---

## Refactor checklist (do not drop)

When changing layout or navigation, confirm each item still loads data on panel open (`refreshPanelData` in `account-workspace-app.ts`):

- [ ] `dashboard` → `loadDashboardData`
- [ ] `resources` → `loadResources`
- [ ] `profiles` → `loadProfiles`
- [ ] `analytics` → `loadAnalytics` / suggestions
- [ ] `voice-lab` / `voice-map` → `onVoicePanelShown`
- [ ] `library-growth` → `loadLibraryGrowthPanel`
- [ ] `moderation` → `loadModerationQueue`
- [ ] `site-review` → site sections + hosting
- [ ] `admin-users` → `loadAdminUsersPanel`
- [ ] `admin-ops` → `loadAdminOpsPanel`
- [ ] Markov → `trackPortalPanel` on every successful `navigateToPanel`
- [ ] Role gates → `applyRoleAccess` + `syncNavSectionVisibility`
