# Features intentionally not built / unnecessary

**Last updated:** 2026-07-28

Capabilities that are **out of product scope** (not dashboard health bugs). Uploads, Generate, Improve, and community contribute already require signed-in authorization — that is the production rule.

**Related:** [EDGE_API_STATUS.md](EDGE_API_STATUS.md) · [HOSTING_MCP_WORKSPACE.md](HOSTING_MCP_WORKSPACE.md) · [DASHBOARD_WIRING_GAPS.md](../portal/DASHBOARD_WIRING_GAPS.md)

---

## Unnecessary for this product line (do not schedule)

These do **not** unlock authorized upload/generation workflows (already live). Treat as non-goals unless product strategy changes.

| Item | Why unnecessary |
|------|-----------------|
| **Cloudflare Vectorize migration** | Semantic/RAG index already works on the API host corpus. Optional infra only. |
| **Binary DOCX/PDF round-trip** (fonts, logos, layout) | Auth’d Documents OCR/rewrite already extracts + rewrites as markdown. Binary layout needs external converters — not required for the library. |
| **Custom Stripe invoice list UI** | Stripe Customer Portal + admin Billing roster cover invoices. |
| **Automated credit purchase checkout UX beyond AI Boost** | Role caps + template fallback + Stripe AI Boost / PayID grants already bound cost. |
| **Stripe top-up for community tokens** | Paid top-up is for **AI daily units**; community tokens earn via contributions. |
| **Fully autonomous article → publish** | Would bypass moderation / site review; human approve is intentional. |
| **Legacy Render voice dashboard** | Retired — `/account` Voice Lab / Map / Ops replace it. |

---

## Case-study approve → flagship page (what this means)

**Today (by design):**

1. Library growth can propose a `case_study` topic gap.
2. Admin **Approve** materializes a **resource draft** (and appends JSON to `case-study-drafts.json`).
3. That does **not** automatically create the public marketing **flagship case-study page** (the curated entries in `src/data/case-studies.ts` that power live `/case-studies/...` pages).

**Why:** Flagship pages are editorial — copy, client permission, and brand placement need a human promote into the static site data. Approve = “draft material ready in Resources / drafts file,” not “live marketing page.”

**Not unfinished wiring** — documented Partial / intentional in growth UI copy.

---

## Billing and AI credits (live)

| Feature | Status | Notes |
|---------|--------|-------|
| **Stripe AI Boost** past daily AI cap | **Live** | Checkout + webhook + Customer Portal |
| **PayID manual top-up** + admin grant | **Live** | Admin Billing → PayID grant |

---

## Voice and content tooling (live)

| Feature | Status | Notes |
|---------|--------|-------|
| **3D / depth / 2D voice map** | **Live** | Voice Map panel |
| **Topic guides in API corpus** | **Live** | Synced on bootstrap |
| **PDF/DOCX OCR & markdown rewrite** | **Live (v1)** | Auth required; structure-preserving markdown, not binary round-trip |

---

## Token economy (community)

| Feature | Status | Notes |
|---------|--------|-------|
| **Earn / redeem perks** | **Live** | Accept awards; Overview redeem; Ops perk queue |

---

## Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| **Render API / Postgres** | **Retired / decommission** | Production = Cloudflare Worker + Neon |

Deploying Worker + Pages is tracked in [PRODUCTION_GO_LIVE_STATUS.md](PRODUCTION_GO_LIVE_STATUS.md).
