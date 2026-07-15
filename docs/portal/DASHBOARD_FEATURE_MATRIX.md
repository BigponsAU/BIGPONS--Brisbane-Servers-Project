# Account dashboard — feature matrix

**URL:** `/account` · **Last updated:** 2026-06-29

Single reference for every dashboard surface: what ships today, what is partial, and what is intentionally deferred.

**Related:** [DASHBOARD_WIRING_GAPS.md](DASHBOARD_WIRING_GAPS.md) · [DASHBOARD_UX_ELEMENT_MAP.md](DASHBOARD_UX_ELEMENT_MAP.md) · [FEATURES_NOT_BUILT.md](../operations/FEATURES_NOT_BUILT.md)

---

## Legend

| Status | Meaning |
|--------|---------|
| **Live** | Production-ready for v1 scope |
| **Partial** | UI or API exists; wiring or parity incomplete |
| **Planned** | Documented product slice, not yet built |

---

## Workspace panels (creator mode)

| Panel | Status | API / scripts | Notes |
|-------|--------|---------------|-------|
| **Overview** | Live | `/api/resources`, `/api/tokens/*`, `/api/community/my-contributions` | Marketing band + `panel-shell` |
| **Resources** | Live | `/api/resources/**`, `/api/documents/**` | TipTap WYSIWYG + dual marketing bands |
| **Analytics** | Live | `/api/analytics/corpus`, `/api/analytics/suggestions`, `/api/admin/pipeline-config` | `AccountWorkspacePanelBand` |
| **Voice profiles** | Live | `/api/profiles/**` | Split workspace + band shell |
| **Voice lab — analyze** | Live | `POST /api/voice/analyze` | Band shell |
| **Voice lab — Markov** | Live | `portal-markov-tracker.ts` v1 resource lineage | Voice share % across creation hops |
| **Voice map — 2D / depth / 3D** | Live | `/api/voice-map/corpus`, WebGL | Reindex confirm |
| **Voice map — semantic route** | Live | `GET /api/voice-map/semantic` | k-NN topology + query route plot |

---

## Admin console panels

| Panel | Status | API / scripts | Notes |
|-------|--------|---------------|-------|
| **Library growth** | Live | `/api/admin/library-growth` | Semantic dedup + approve/reject/arm/run confirms |
| **Moderation** | Live | `/api/community/contributions` | Approve awards tokens; reject archives draft + clawback; error banners |
| **Site review** | Live | `/api/admin/site-sections`, hosting | Band shell |
| **Users** | Live | `/api/admin/users`, auth audit | Workspace toggle (role-locked for editors+), soft-remove + restore with backup, paged auth audit |
| **Ops** | Live | `/api/admin/usage/summary`, corpus, token queue | Site usage snapshot + inference runbooks |
| **Billing** | Live | `/api/admin/billing/accounts`, usage summary, PayID grant | Subscriber roster + usage-by-user + Stripe Customer Portal on Overview |

---

## Shell & cross-cutting

| Feature | Status | Location |
|---------|--------|----------|
| Sign-in (password, passkeys, OAuth) | Live | `account-auth.ts` + `account-passkey-login.ts` (register: extensions) |
| Contributor home | Live | `AccountBasicHome.astro` |
| Workspace / Admin mode switch | Live | `account-workspace-mode.ts` |
| Global search | Live | `AccountWorkspaceHeader.astro` — prefixes + panel aliases |
| API connectivity banner | Live | `account-api-connectivity.ts` |
| Keyboard shortcuts | Live | `1`–`6` creator / `1`–`6` admin + `Ctrl+K` |
| Token earn / redeem | Live | Overview, `/api/tokens/**` |
| Dashboard standards CI | Live | `tests/dashboard-standards.test.ts` |

---

## Markov chain analysis

| Capability | Portal |
|------------|--------|
| Resource → resource lineage | `trackResourceCreation()` / hydrate from metadata |
| Voice used + match score per hop | Stored on each edge |
| Voice share (% of hops matching each voice) | Voice lab summary + debug |
| Extrapolate lineage / voice drift | Voice lab → Extrapolate lineage |
| Export / reset | Client JSON download |
| Storage | `localStorage` `bs-resource-markov-v1` |

Portal navigation is **not** Markov — panel/action click tracking was removed from this model.

---

## Intentionally not built

From [FEATURES_NOT_BUILT.md](../operations/FEATURES_NOT_BUILT.md): binary DOCX round-trip, autonomous publish pipeline, legacy Render dashboard.

---

## Verification

```bash
cd website-brisbaneservers.com
npm run preflight:production
npm run verify:dashboard-api -- --api https://api.brisbaneservers.com
```

---

## Refactor checklist

- [x] `refreshPanelData` handles every navigable panel
- [x] Resource lineage Markov hydrates from resource metadata (not panel nav)
- [x] `applyRoleAccess` + admin-only filters
- [x] All panels: `panel-shell` + marketing band
- [x] Admin destructive actions: styled confirms
