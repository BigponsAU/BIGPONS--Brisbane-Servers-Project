# Workspace modes & voice-framework integration

**Purpose:** Where legacy voice-framework dashboard features live in `/account`, how admin toggles between creator and admin console, and what ships next (Workers, Grok, Stripe).

---

## Where the old features were

| Legacy location | Feature | Now in `/account` |
|-----------------|---------|-------------------|
| `voice-framework/dashboard/` (Docker / Render port 3001) | Tone analysis, pattern extract | **Voice lab** panel → `POST /api/voice/analyze` |
| `voice-framework/dashboard/routes/topology-routes.ts` | 3D principle topology | **Voice map** panel → `GET /api/voice-map/principles` |
| `voice-framework/storage/semantic-index` + embeddings | Vector corpus | **Voice map** (semantic view) → `GET /api/voice-map/semantic` |
| `voice-framework/dashboard/public/topology3d.js` | Three.js 3D canvas | **2D SVG map** in portal (no separate host; 3D optional later) |
| `voice-framework/dashboard/public/markov-chain-tracker.js` | Markov / debug analytics | **Not ported yet** — backlog under Voice lab |
| Same dashboard | Library, documents upload, A/B tests | Partially covered by Resources, Profiles, Library growth |

**No Docker/Render required** for integrated features — they run on the same standalone API as `/api/resources/*` (today: Render; target: Cloudflare Workers + Neon Hyperdrive).

---

## Two interchangeable sidebar modes (admin+)

For `admin` and `super-admin` (e.g. `bigpons@brisbaneservers.com`):

1. **Workspace** — Overview, Resources, Profiles, Analytics, Voice lab, Voice map  
2. **Admin console** — Library growth, Moderation, Site review, Ops & billing  

Toggle at top of sidebar slides nav tracks (`workspace-mode-switcher`). Choice persists in `localStorage` (`bs-workspace-nav-mode`).

Editors and clients only see the **Workspace** track (no toggle).

Nav definitions: `website-brisbaneservers.com/src/data/account-workspace.ts`

---

## SuperGrok Lite and API inference

SuperGrok Lite app subscription credits are **separate** from programmatic API usage in most cases.

For portal LLM generation (Phase 2):

1. Create an **xAI API key** at [console.x.ai](https://console.x.ai) (check whether SuperGrok includes API credits in your plan).  
2. Route through **Cloudflare AI Gateway → Grok** with `XAI_API_KEY` on the edge worker.  
3. Enforce **daily caps** in KV + `usage_ledger` (Neon) before any inference call.

CLI (`curl -fsSL "https://x.ai/cli/install.sh" | bash`) is for local Grok tooling — production portal uses Gateway + env secrets, not the CLI on the server.

---

## Billing roadmap (hybrid)

| Phase | Behaviour |
|-------|-----------|
| **Now** | Contribution **token ledger** (`GET /api/tokens/me`) for community rewards |
| **Phase 2** | Daily AI usage cap per user; block before Grok call |
| **Phase 3** | PayID top-up reference → admin manual grant |
| **After portal stable** | Stripe subscription for over-cap usage (automatic) |

Ops copy lives in **Admin console → Ops & billing** panel.

---

## API routes added for integration

| Method | Path | Role |
|--------|------|------|
| POST | `/api/voice/analyze` | editor+ |
| GET | `/api/voice-map/principles` | editor+ |
| GET | `/api/voice-map/semantic` | editor+ |

Registered in `standalone-api/route-manifest.ts`.

---

## Related

- [VOICE_PORTAL_SCOPE_MAP.md](VOICE_PORTAL_SCOPE_MAP.md)  
- [PORTAL.md](PORTAL.md)  
- [STORAGE_AND_VECTORS.md](../operations/STORAGE_AND_VECTORS.md)
