# Dashboard wiring gaps & production standards

**Last updated:** 2026-06-28  
**Purpose:** Track UI wiring, standards, and intentional deferrals for `/account`.

**Related:** [DASHBOARD_UX_ELEMENT_MAP.md](DASHBOARD_UX_ELEMENT_MAP.md) · [DASHBOARD_FEATURE_MATRIX.md](DASHBOARD_FEATURE_MATRIX.md)

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
| Inline + modal edit | `account-workspace-resources.ts`, `#edit-resource-modal` |
| **WYSIWYG** content editor | `workspace-markdown-field.ts` — Visual / Markdown / Preview + format toolbar |
| Styled confirms | `portal-confirm-dialog.ts` — all account workspace panels |
| Resource permissions | `resource-permissions.ts` — client + API |
| Preview modal | `#preview-resource-modal` — rendered markdown (not ad-hoc DOM) |
| Admin **Removed** filter | Tree filter + list `resource-type-filter` → `GET /resources?removedOnly=1` |
| **Restore to workspace** | `restoreResource()` → `PUT { restoreToWorkspace: true }` (admin) |
| Soft delete API | `DELETE` published → `portalRemovedAt` (index retained) |

---

## Intentionally deferred

| Surface | Notes |
|---------|--------|
| Payment / Stripe in Admin ops | `FEATURES_NOT_BUILT.md` |
| PayID manual grant UI | Ops panel partial |
| Resources marketing bands | Phase 2 |
| Deep Markov parity | Voice lab Phase 2 |
| Third-party WYSIWYG (TipTap/ProseMirror) | In-house Visual mode covers v1; swap later if needed |

---

## Deploy checklist

After merging dashboard + API changes:

1. **Edge worker** — `deploy-edge-worker.yml` or `npm run deploy:edge-worker` (push to `main`)
2. **Cloudflare Pages** — auto-build on `main` (UI, modals, WYSIWYG CSS)
3. **Verify** — `npm run verify:dashboard-api -- --api https://api.brisbaneservers.com`

---

## Standard checklist for new dashboard actions

1. `getResourceActionPermissions()` (or panel equivalent) for button visibility  
2. `showConfirmDialog()` for destructive or long-running actions  
3. Same rules on the **API route**  
4. Document public-index impact in this file  
5. Add vitest coverage when rules are non-obvious  
