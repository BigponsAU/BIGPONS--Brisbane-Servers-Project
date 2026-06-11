# End product — Brisbane Servers unified platform

**Vision:** One cohesive site + account portal where Brisbane businesses get fast auth, voice-guided content, and AI-assisted resources — with edge latency for user-facing paths and Render for heavy voice-framework workloads until fully migrated.

**Development line:** [DEVELOPMENT_LINE.md](DEVELOPMENT_LINE.md) · **Ops:** [PRODUCTION_GO_LIVE_STATUS.md](../operations/PRODUCTION_GO_LIVE_STATUS.md)

---

## Unified architecture (target state)

```text
brisbaneservers.com (Cloudflare Pages)
    │
    ├─ Marketing: resources, case studies, Brisbane 2032, contact
    │
    └─ /account (portal)
           Workspace: resources, profiles, voice lab, voice map
           Admin (bigpons@): ops, corpus reindex, library growth

api.brisbaneservers.com (Cloudflare Worker — LIVE)
    ├─ INSTANT: health, auth/*, contact/inquiry
    ├─ Hyperdrive → Neon (users, sessions, auth tokens)
    └─ PROXY → Render API (voice, generate, OAuth, passkey, cron)

Render API (warm path / background)
    ├─ Voice-framework disk, library growth, semantic index
    ├─ Workers AI inference (when CF token on Render)
    └─ OAuth / passkey callbacks

Neon Postgres — single source of truth for auth + corpus metadata
Resend — auth + contact email (mail.brisbaneservers.com)
```

---

## Product pillars (completion status)

| Pillar | User outcome | Status |
|--------|--------------|--------|
| **Fast auth** | Sign in / register in seconds | **Live** on edge |
| **Email verify** | Register → verify → login | **Live** on edge (verify + resend) |
| **Account portal** | Workspace + admin switcher | **Repo** — needs Pages deploy |
| **Brisbane voice** | Default profile + corpus map | **Data live** on Neon — **UI** needs Pages deploy |
| **Free AI generate** | Daily-capped Workers AI | **Repo** — CF token on Render |
| **Instant contact** | No 3-min enquiry wait | **Live** on edge (direct Resend) |
| **Billing** | PayID → Stripe | **Backlog** (admin ops panel stub) |

---

## Remaining engineering to “finished product”

### Ship (git → Pages + Render)

All portal, voice-map, inference, and worker code is in the repo workspace. **Push to `main`** triggers:

- Cloudflare Pages → `/account` voice map, admin UI, wake UX
- Render → new API routes (`/api/voice-map/*`, `/api/usage/me`, inference)

### Automate after push

```powershell
cd website-brisbaneservers.com
npm run sync:render-secrets-for-edge      # once per machine
npm run sync:inference-to-render          # Workers AI on Render
npm run bootstrap:voice-corpus            # prod corpus + Brisbane profile
npm run deploy:edge-worker                # after worker code changes
npm run verify:production-auth:edge
npm run verify:production
```

### Phase 2 migrations (post-ship)

1. OAuth + passkey on edge (or keep Render proxy — works today)
2. `POST /api/resources/generate` on edge with Workers AI binding
3. PayID manual grant + Stripe subscription
4. Retire Render cold path for non-cron traffic

---

## Definition of done

- [x] `api.brisbaneservers.com` on Worker with Hyperdrive auth
- [x] Full auth loop on edge (register, verify, resend, login, me, logout)
- [x] Contact on edge
- [ ] Portal voice map + Brisbane profile on production Pages
- [x] Corpus indexed on production Neon (16 resources, 48 chunks)
- [ ] Workers AI generate live on `/account` Resources
- [ ] Single `verify:production` green after Pages deploy
- [ ] Billing path documented and implemented

When the unchecked items are green, the product is **feature-complete v1**; billing and legacy voice-framework parity are v1.1+.
