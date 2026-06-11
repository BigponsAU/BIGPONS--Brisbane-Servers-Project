# Pull Render API secrets into Windows user env for local wrangler/hyperdrive scripts.
# Does not print secret values.

param(
  [string]$ServiceId = 'srv-d8ae7qbbc2fs73fv227g'
)

$ErrorActionPreference = 'Stop'

$renderKey = $env:RENDER_API_KEY
if (-not $renderKey) {
  $renderKey = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
}
if (-not $renderKey) {
  Write-Error 'RENDER_API_KEY not set. Run: npm run configure:render-mcp'
}

$headers = @{
  Authorization = "Bearer $renderKey"
  Accept        = 'application/json'
}

$keys = @(
  'DATABASE_URL',
  'RESEND_API_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'AUTH_EMAIL_FROM',
  'JWT_SECRET',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI',
  'CRON_SECRET'
)

Write-Host 'Syncing Render secrets to Windows user environment...' -ForegroundColor Cyan

$uri = "https://api.render.com/v1/services/$ServiceId/env-vars?limit=100"
$items = Invoke-RestMethod -Uri $uri -Headers $headers

$map = @{}
foreach ($item in $items) {
  if ($item.envVar.key) {
    $map[$item.envVar.key] = $item.envVar.value
  }
}

foreach ($key in $keys) {
  if (-not $map.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($map[$key])) {
    Write-Warning "Render missing $key - set manually before edge deploy."
    continue
  }
  [Environment]::SetEnvironmentVariable($key, $map[$key], 'User')
  Set-Item -Path "env:$key" -Value $map[$key]
  Write-Host "  $key synced" -ForegroundColor Green
}

if ($map['DATABASE_URL']) {
  [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $map['DATABASE_URL'], 'User')
  Set-Item -Path 'env:NEON_DATABASE_URL' -Value $map['DATABASE_URL']
  Write-Host '  NEON_DATABASE_URL synced (copy of DATABASE_URL)' -ForegroundColor Green
}

$accountId = '92d738484386c6b613628bbeafebe2f9'
[Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', $accountId, 'User')
Set-Item -Path 'env:CLOUDFLARE_ACCOUNT_ID' -Value $accountId
Write-Host '  CLOUDFLARE_ACCOUNT_ID set' -ForegroundColor Green

$userCfToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
if ($userCfToken) {
  Write-Host '  CLOUDFLARE_API_TOKEN already in user env (unchanged)' -ForegroundColor Green
} else {
  Write-Warning 'CLOUDFLARE_API_TOKEN not in user env - run npm run configure:cloudflare-mcp or setup:edge-production'
}

Write-Host 'Done. Restart terminal or Cursor if scripts cannot see new vars.' -ForegroundColor Cyan
