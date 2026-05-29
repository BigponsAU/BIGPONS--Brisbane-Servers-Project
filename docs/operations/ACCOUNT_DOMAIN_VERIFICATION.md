# Account workspace — production domain verification (Phase 3)

Run after [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md) Phases 1–2.

## Browser checklist (`https://brisbaneservers.com/account/`)

Open DevTools → **Network** → filter `api`.

| Step | Expected |
|------|----------|
| Load `/account/` | Sign-in or workspace shell |
| API host | All `fetch` targets match `PUBLIC_API_BASE_URL` (e.g. `https://api.brisbaneservers.com/api/...`) |
| Login | `POST .../auth/login` → 200; `GET .../auth/me` → 200 |
| Overview | Dashboard panel loads without API error banner |
| Resources | List loads; open one resource |
| Voice profiles | List loads; optional create-base / set default |
| Analytics | Suggestions or metrics load |
| Moderation | Contributions list (admin) |
| Site review | Sections load (admin) |
| Library growth | Settings load; **Activate schedule** / **Pause schedule** respond |

## Library growth E2E (admin)

1. **Voice profiles** → set **default** profile (BIGPONS).
2. **Library growth** → enable scheduled cycles → **Save settings**.
3. **Run cycle now (manual)** → pending proposals appear.
4. **Approve & generate** one proposal → resource created (draft or published).
5. Optional: **Activate schedule** → confirm meta shows next cycle; cron only runs when armed.

## Failures

| Symptom | Fix |
|---------|-----|
| Connection error banner | `PUBLIC_API_BASE_URL` on Pages; redeploy |
| CORS blocked | `ALLOWED_ORIGINS` on API includes `https://brisbaneservers.com` |
| 401 on all routes | `JWT_SECRET` set; clock skew rare |
| Growth cron no proposals | API storage disk; `enabled` + manual run |

---

**Related:** [LIBRARY_GROWTH.md](../portal/LIBRARY_GROWTH.md)
