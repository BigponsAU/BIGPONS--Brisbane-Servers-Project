# Deploy Cloudflare edge API worker (full API — Render retired).
# Run from repo: .\website-brisbaneservers.com\scripts\configure-edge-worker.ps1

param(
  [string]$ZoneName = 'brisbaneservers.com',
  [string]$ApiHostname = 'api.brisbaneservers.com',
  [switch]$SkipDeploy,
  [switch]$SkipRoute,
  [switch]$SkipSecrets
)

$ErrorActionPreference = 'Stop'
$workerDir = Join-Path $PSScriptRoot '..\workers\api'
$workerName = 'brisbane-servers-api-edge'

Write-Host ""
Write-Host "Cloudflare edge API worker ($workerName)" -ForegroundColor Cyan
Write-Host "Full API on Worker + Hyperdrive + Workers AI (no Render)" -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx not found. Install Node.js first."
}

if (-not $SkipSecrets) {
  Write-Host "Syncing worker secrets..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'sync-secrets-to-edge-worker.ps1')
}

Push-Location $workerDir
try {
  if (-not (Test-Path 'node_modules')) {
    Write-Host "Installing worker dependencies..." -ForegroundColor Cyan
    npm install
  }

  $hyperdriveId = (Select-String -Path (Join-Path $workerDir 'wrangler.toml') -Pattern 'id = "([a-f0-9]{32})"' | ForEach-Object { $_.Matches[0].Groups[1].Value })
  if ($hyperdriveId -eq '00000000000000000000000000000000' -or -not $hyperdriveId) {
    Write-Warning "HYPERDRIVE id not set. Run: npm run configure:hyperdrive"
  }

  if (-not $SkipDeploy) {
    Write-Host "Deploying worker..." -ForegroundColor Cyan
    $env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
    npx wrangler deploy
    Write-Host "Worker deployed." -ForegroundColor Green
  }
} finally {
  Pop-Location
}

if ($SkipRoute) {
  Write-Host ""
  Write-Host "Skipped route binding." -ForegroundColor Yellow
  exit 0
}

$cfToken = $env:CLOUDFLARE_API_TOKEN
if (-not $cfToken) {
  $cfToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
}
$accountId = $env:CLOUDFLARE_ACCOUNT_ID
if (-not $accountId) {
  $accountId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', 'User')
}

if (-not $cfToken -or -not $accountId) {
  Write-Host ""
  Write-Host "CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set — route should already exist in wrangler.toml" -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "Verify:" -ForegroundColor Cyan
Write-Host "  curl https://$ApiHostname/api/health"
Write-Host "  npm run verify:production-auth:edge"
