# Domain email (@brisbaneservers.com)

Brisbane Servers uses **Cloudflare** for DNS and Pages. You can create **receive** addresses on your domain without a separate mailbox host, and send **transactional** mail (verification, password reset) via SMTP.

## Addresses used by this project

| Address | Role |
|---------|------|
| `connect@brisbaneservers.com` | Primary public contact (forms, footer, reply-to on auth mail) |
| `contact@brisbaneservers.com` | General inquiries alias — forward to the same inbox as `connect@` |
| `bigpons@brisbaneservers.com` | Brand / operator (BIGPONS) |
| `support@brisbaneservers.com` | Outbound **From** for system mail (`AUTH_EMAIL_FROM`) |

Canonical list in code: `website-brisbaneservers.com/src/lib/site-mailboxes.ts`.

## Production status (confirmed 2026-05-25)

- **Forwards:** `connect@`, `contact@`, `bigpons@`, `support@` → `brisbaneservers@gmail.com`
- **MX:** Cloudflare Email Routing (`route1/2/3.mx.cloudflare.net`); legacy Outlook / `ppe-hosted` MX removed
- **Inbound:** Operator confirmed receiving works
- **Outbound auth mail:** Configure SMTP on API host separately (`AUTH_EMAIL_FROM` = `support@`)

## Receiving mail (Cloudflare Email Routing)

**Production destination (BIGPONS):** all custom addresses below forward to **`brisbaneservers@gmail.com`**.

### MX (production)

Email Routing requires **MX for `brisbaneservers.com` on Cloudflare**. Production uses Cloudflare MX + SPF/DKIM (configured 2026-05-25). You cannot run Microsoft/hosted MX and Cloudflare forwarding on the same apex domain.

| If you… | Then… |
|---------|--------|
| **Only need mail in Gmail** (`brisbaneservers@gmail.com`) | Enable Cloudflare Email Routing (Cloudflare sets its MX). |
| **Still use Microsoft 365 / GoDaddy mailboxes** on this domain | Configure forwards **in that provider** instead; do **not** switch MX to Cloudflare. |
| **Unsure** | Check whether anyone reads `@brisbaneservers.com` in Outlook today before changing MX. |

### Automated setup (recommended)

From repo root (sets Windows user env for MCP + runs routing):

```powershell
.\website-brisbaneservers.com\scripts\configure-cloudflare-mcp.ps1
```

Or from `website-brisbaneservers.com`:

```powershell
$env:CLOUDFLARE_API_TOKEN = "<API token>"
npm run setup:cloudflare-email
```

Creates destination `brisbaneservers@gmail.com`, enables Email Routing DNS, and adds rules for `connect`, `contact`, `bigpons`, and `support`. **Click the verification link** in Gmail when prompted, then re-run if needed.

Token permissions: **Account → Email Routing Addresses → Edit**, **Zone → Email Routing Rules → Edit**, **Zone → DNS → Edit** (same zone: `brisbaneservers.com`).

### Dashboard steps (manual alternative)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **brisbaneservers.com** → **Email** → **Email Routing**.
2. **Enable** Email Routing → confirm MX/DKIM updates (replaces legacy MX).
3. **Destination addresses** → add `brisbaneservers@gmail.com` → open Gmail and **click the verification link** Cloudflare sends.
4. **Routing rules** → **Create address** for each:

| Custom address | Forwards to |
|----------------|-------------|
| `connect@brisbaneservers.com` | `brisbaneservers@gmail.com` |
| `contact@brisbaneservers.com` | `brisbaneservers@gmail.com` |
| `bigpons@brisbaneservers.com` | `brisbaneservers@gmail.com` |
| `support@brisbaneservers.com` | `brisbaneservers@gmail.com` (optional; catches system replies) |

5. Send a test to `connect@brisbaneservers.com` from an external address; confirm it lands in Gmail.

This is **forwarding only** (not full IMAP mailboxes). For send-as from `@brisbaneservers.com` inside Gmail without SMTP, use Google Workspace; this project uses **SMTP** on the API host for outbound auth mail (`support@`).

## Sending mail (SMTP for auth flows)

Account verification and password reset use the API host env vars (`SMTP_*`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_REPLY_TO`). See `website-brisbaneservers.com/.env.example`.

Typical setup:

1. Use a transactional provider (Resend, SendGrid, Mailgun, Amazon SES) or your host’s SMTP.
2. Add **SPF** and **DKIM** DNS records they provide (in Cloudflare DNS).
3. Set on the **API host** (not Cloudflare Pages):
   - `AUTH_EMAIL_FROM=Brisbane Servers <support@brisbaneservers.com>`
   - `AUTH_EMAIL_REPLY_TO=connect@brisbaneservers.com`
4. In Email Routing, allow **Send** from `support@` if your provider requires domain verification.

In local dev, leave SMTP unset — links are logged to the API console.

## Auth: bcrypt users + Google OAuth

| Method | Where configured |
|--------|------------------|
| **bcrypt password** | `POST /api/auth/register`, `npm run seed:admin` |
| **Google OAuth** | API host: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` |
| **Passkeys** | API host: `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` |

Google redirect URI (production example):

`https://<your-api-host>/api/auth/oauth/google/callback`

Portal shows **Continue with Google** when the API reports OAuth as enabled (`GET /api/auth/oauth/status`).

OAuth-only accounts cannot use password login until they set a password via reset flow (future: “set password” in account settings).

## Cloudflare MCP (Cursor)

Connect **cloudflare-api** in Cursor ([CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md#mcp-in-cursor-manage-pages-from-the-agent)). Repo: `.cursor/mcp.json`.

**Account:** BIGPONS (`92d738484386c6b613628bbeafebe2f9`) · **Zone:** `brisbaneservers.com` (`d17d7ab59aec5a7a6fb4f08f9740f779`).

Useful prompts once connected:

- “List MX records for brisbaneservers.com”
- “List Cloudflare Pages projects and production env vars”
- “After Email Routing is enabled, list routing rules for brisbaneservers.com”

**Note:** Destination verification (`brisbaneservers@gmail.com`) must be completed in Gmail via Cloudflare’s email link. Email Routing **write** APIs need **Email Routing Edit** on MCP OAuth — see [CLOUDFLARE_PAGES.md § Redo OAuth](CLOUDFLARE_PAGES.md#redo-oauth-with-more-permissions-required-after-a-narrow-first-connect). The dashboard flow above always works without MCP.

**Pages:** If MCP shows zero Pages projects, connect the Git repo in **Workers & Pages → Create → Pages → Connect to Git** (root `website-brisbaneservers.com`, build `npm run build`, output `dist`).

## Related

- [BRISBANESERVERS_PRODUCTION.md](BRISBANESERVERS_PRODUCTION.md)
- [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md)
