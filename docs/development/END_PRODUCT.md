# End product — Brisbane Servers unified platform

**Vision:** One cohesive site + account portal where Brisbane businesses get fast auth, voice-guided content, and AI-assisted resources — all on Cloudflare edge with Neon Postgres.

**Development line:** [DEVELOPMENT_LINE.md](DEVELOPMENT_LINE.md) · **Ops:** [PRODUCTION_GO_LIVE_STATUS.md](../operations/PRODUCTION_GO_LIVE_STATUS.md)

---

## Unified architecture (production)

```text
brisbaneservers.com (Cloudflare Pages)
    │
    ├─ Marketing: resources, case studies, Brisbane 2032, contact
    │
    └─ /account (portal)
           Workspace: resources, profiles, voice lab, voice map
           Admin: library growth, moderation, site review, ops

api.brisbaneservers.com (Cloudflare Worker — full API)
    ├─ Auth, contact, health (native edge)
    ├─ All portal routes (voice, generate, admin, OAuth, cron)
    ├─ Hyperdrive → Neon
    ├─ Workers AI binding (inference)
    └─ Cron: library growth every 6h (when schedule armed)

Neon Postgres — users, sessions, corpus
Resend — auth + contact (mail.brisbaneservers.com)
```

**Render:** retired (API suspended).

---

## Product pillars

| Pillar | User outcome | Status |
|--------|--------------|--------|
| **Fast auth** | Sign in / register in seconds | **Live** edge |
| **Google OAuth** | Sign in with Google | **Live** (callback on `api.brisbaneservers.com`) |
| **Account portal** | Workspace + admin switcher | **Live** |
| **Brisbane voice** | Profile + corpus map | **Live** |
| **Free AI generate** | Daily-capped Workers AI | **Live** edge binding |
| **Library growth** | Site adds its own resources | **Live** — arm schedule + optional auto-generate |
| **Instant contact** | No cold-start wait | **Live** edge |
| **Billing** | PayID → Stripe | **Backlog** v1.1 |

---

## Library growth (website grows itself)

1. **Admin** → Library growth → enable schedule → **Activate schedule**
2. Optional: **Auto-generate resources after each cycle** (no manual approve)
3. **Edge cron** (`0 */6 * * *`) runs due cycles on the worker
4. Plans topic gaps → generates voice-aligned guides → publishes when voice score passes threshold
5. Optional: `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` on worker rebuilds static HTML after publish

Manual: **Run cycle now** anytime. Secured HTTP: `POST /api/cron/library-growth` + `CRON_SECRET`.

---

## Definition of done (v1)

- [x] Full API on Cloudflare Worker (Render retired)
- [x] Auth + OAuth + secrets synced on worker
- [x] Portal voice map / lab / admin on Pages
- [x] Workers AI on edge
- [x] Library growth cron on edge + auto-materialize option
- [x] Legacy parity: voice-map semantic route, Markov flow in Voice lab
- [ ] Billing (PayID / Stripe) — v1.1
- [ ] 3D topology canvas (optional; 2D map ships today)

**Feature-complete v1** = all checked except billing and optional 3D.
