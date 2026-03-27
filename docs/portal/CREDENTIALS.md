# Portal & Admin Credentials

**URL:** `http://localhost:3000/portal`

## Required configuration

There are **no hardcoded admin passwords** in the application. To use bootstrap admin login on the Astro site **and** the voice-framework dashboard, set **both**:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

in environment variables (or `website-brisbaneservers.com/.env` / hosting panel for the Node app).

If these are unset, use **registered users** via `users.json` / the registration flow where enabled.

### Website (`website-brisbaneservers.com`)

See `website-brisbaneservers.com/.env.example` — copy to `.env` and set values locally (never commit `.env`).

### Voice dashboard (`voice-framework`)

Create or edit `voice-framework/.env`:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
```

Optional (Windows PowerShell):

```powershell
$env:ADMIN_EMAIL="your-email@example.com"
$env:ADMIN_PASSWORD="your-secure-password"
```

Linux/macOS:

```bash
export ADMIN_EMAIL="your-email@example.com"
export ADMIN_PASSWORD="your-secure-password"
```

## Production (Node host / GitHub Pages hybrid)

- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the production environment only.
- Use a strong password and secure storage (panel env vars, not in code).
- Prefer registered users + proper session storage for multi-instance deployments.
