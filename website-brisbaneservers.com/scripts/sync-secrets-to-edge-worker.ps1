# Push production secrets to Cloudflare Worker (replaces Render env for API).
param(
  [string]$WorkerDir = (Join-Path $PSScriptRoot '..\workers\api')
)

$ErrorActionPreference = 'Stop'

function Import-UserEnv([string[]]$Names) {
  foreach ($name in $Names) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if ($val) { Set-Item -Path "env:$name" -Value $val }
  }
}

$edgeRedirect = 'https://api.brisbaneservers.com/api/auth/oauth/google/callback'
[Environment]::SetEnvironmentVariable('GOOGLE_OAUTH_REDIRECT_URI', $edgeRedirect, 'User')

Import-UserEnv @(
  'RESEND_API_KEY', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'AUTH_EMAIL_FROM', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI', 'CRON_SECRET', 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL'
)

$secrets = @(
  'RESEND_API_KEY', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'AUTH_EMAIL_FROM', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI', 'CRON_SECRET', 'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL'
)

Push-Location $WorkerDir
try {
  if (-not (Test-Path 'node_modules')) { npm install | Out-Null }

  foreach ($name in $secrets) {
    $val = [Environment]::GetEnvironmentVariable($name, 'User')
    if (-not $val) {
      Write-Host "Skip $name (not in user env)" -ForegroundColor DarkYellow
      continue
    }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $val | npx wrangler secret put $name 2>$null | Out-Null
    $ErrorActionPreference = $prevEap
    if ($LASTEXITCODE -ne 0) {
      Write-Error "wrangler secret put $name failed (exit $LASTEXITCODE)"
    }
    Write-Host "Set worker secret: $name" -ForegroundColor Green
  }
} finally {
  Pop-Location
}

Write-Host 'Worker secrets synced. Deploy: npm run deploy:edge-worker' -ForegroundColor Cyan
