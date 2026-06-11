# Deploy Cloudflare edge API worker + optional route on api.brisbaneservers.com
# Run from repo: .\website-brisbaneservers.com\scripts\configure-edge-worker.ps1

param(
  [string]$ZoneName = 'brisbaneservers.com',
  [string]$ApiHostname = 'api.brisbaneservers.com',
  [string]$RenderOrigin = 'https://brisbane-servers-api.onrender.com',
  [switch]$SkipDeploy,
  [switch]$SkipRoute
)

$ErrorActionPreference = 'Stop'
$workerDir = Join-Path $PSScriptRoot '..\workers\api'
$workerName = 'brisbane-servers-api-edge'

Write-Host ""
Write-Host "Cloudflare edge API worker ($workerName)" -ForegroundColor Cyan
Write-Host "Routes: health, health/render, auth/wake, contact/inquiry; proxy * -> Render" -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx not found. Install Node.js first."
}

Push-Location $workerDir
try {
  if (-not (Test-Path 'node_modules')) {
    Write-Host "Installing worker dependencies..." -ForegroundColor Cyan
    npm install
  }

  $resendKey = $env:RESEND_API_KEY
  if (-not $resendKey) {
    $resendKey = [Environment]::GetEnvironmentVariable('RESEND_API_KEY', 'User')
  }
  if (-not $resendKey) {
    Write-Warning "RESEND_API_KEY not in env — set wrangler secret manually: npx wrangler secret put RESEND_API_KEY"
  } else {
    $resendKey | npx wrangler secret put RESEND_API_KEY 2>&1 | Out-Null
    Write-Host "Set RESEND_API_KEY secret on worker." -ForegroundColor Green
  }

  $renderOrigin | npx wrangler secret put RENDER_API_ORIGIN 2>&1 | Out-Null
  Write-Host "Set RENDER_API_ORIGIN -> $RenderOrigin" -ForegroundColor Green

  foreach ($secretName in @('ADMIN_EMAIL', 'ADMIN_PASSWORD')) {
    $val = [Environment]::GetEnvironmentVariable($secretName, 'Process')
    if (-not $val) {
      $val = [Environment]::GetEnvironmentVariable($secretName, 'User')
    }
    if ($val) {
      $val | npx wrangler secret put $secretName 2>&1 | Out-Null
      Write-Host "Set worker secret $secretName" -ForegroundColor Green
    }
  }

  $hyperdriveId = (Select-String -Path (Join-Path $workerDir 'wrangler.toml') -Pattern 'id = "([a-f0-9]{32})"' | ForEach-Object { $_.Matches[0].Groups[1].Value })
  if ($hyperdriveId -eq '00000000000000000000000000000000' -or -not $hyperdriveId) {
    Write-Warning "HYPERDRIVE id not set. Run: npm run configure:hyperdrive"
  }

  if (-not $SkipDeploy) {
    Write-Host "Deploying worker..." -ForegroundColor Cyan
    npx wrangler deploy
    Write-Host "Worker deployed." -ForegroundColor Green
  }
} finally {
  Pop-Location
}

if ($SkipRoute) {
  Write-Host ""
  Write-Host "Skipped route binding. Add in Cloudflare dashboard:" -ForegroundColor Yellow
  Write-Host "  Workers & Pages -> $workerName -> Settings -> Triggers -> Custom domain: $ApiHostname"
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
  Write-Host "CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set — bind route manually:" -ForegroundColor Yellow
  Write-Host "  $ApiHostname/* -> $workerName"
  exit 0
}

Write-Host ""
Write-Host "Binding route $ApiHostname/* (requires Workers Routes permission)..." -ForegroundColor Cyan

$routePattern = "$ApiHostname/*"
$headers = @{
  Authorization = "Bearer $cfToken"
  'Content-Type'  = 'application/json'
}

$zones = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=$ZoneName" -Headers $headers
$zoneId = $zones.result[0].id
if (-not $zoneId) {
  Write-Warning "Zone $ZoneName not found — bind route manually in dashboard."
  exit 0
}

$body = @{ pattern = $routePattern; script = $workerName } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/workers/routes" -Headers $headers -Body $body | Out-Null
  Write-Host "Route $routePattern -> $workerName" -ForegroundColor Green
} catch {
  Write-Warning "Route may already exist or needs dashboard binding: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Verify:" -ForegroundColor Cyan
Write-Host "  curl https://$ApiHostname/api/health"
Write-Host "  curl https://$ApiHostname/api/auth/wake"
Write-Host "See docs/development/DEVELOPMENT_LINE.md (line 4.4)"
