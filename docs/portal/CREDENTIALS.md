# Portal & Admin Credentials

**URL:** `http://localhost:3000/portal`

## Default (development only)

- **Email:** `admin@brisbaneservers.com`
- **Password:** `admin123`

⚠️ **Never use these in production.**

## Custom credentials

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

## Production

- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your production environment.
- Use a strong password and secure storage (env vars, not in code).
- Consider password hashing and proper session storage (e.g. Redis/DB).

See [Production checklist](../project/PRODUCTION_CHECKLIST.md) for full deployment security.
