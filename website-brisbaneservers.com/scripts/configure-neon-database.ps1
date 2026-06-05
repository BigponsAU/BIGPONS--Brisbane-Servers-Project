# Set Neon DATABASE_URL on Render API + save NEON_DATABASE_URL locally (user env).
# Run from repo: .\website-brisbaneservers.com\scripts\configure-neon-database.ps1
#
# Get pooled connection string: https://console.neon.tech -> project -> Connection details -> Pooled
# Hostname must contain "-pooler" for Render/serverless.

param(
  [string]$ServiceId = 'srv-d8ae7qbbc2fs73fv227g',
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Neon database -> Render API (brisbane-servers-api)" -ForegroundColor Cyan
Write-Host "Use the Neon POOLED connection string (-pooler in hostname)." -ForegroundColor DarkGray
Write-Host ""

$neonUrl = $env:NEON_DATABASE_URL
if (-not $neonUrl) {
  $neonUrl = [Environment]::GetEnvironmentVariable('NEON_DATABASE_URL', 'User')
}
if (-not $neonUrl) {
  $secure = Read-Host "Paste Neon pooled DATABASE_URL (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $neonUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($neonUrl)) {
  Write-Error "No Neon connection string provided."
}

$neonUrl = $neonUrl.Trim().Trim('"').Trim("'")
if ($neonUrl -notmatch 'neon\.tech') {
  Write-Warning "URL does not contain neon.tech - confirm this is a Neon connection string."
}
if ($neonUrl -notmatch 'pooler') {
  Write-Warning "URL is not the pooled host (-pooler). Prefer pooled URL on Render."
}
if ($neonUrl -notmatch 'sslmode=') {
  if ($neonUrl -match '\?') {
    $neonUrl = $neonUrl + '&sslmode=require'
  } else {
    $neonUrl = $neonUrl + '?sslmode=require'
  }
  Write-Host "Appended sslmode=require for Neon TLS." -ForegroundColor DarkGray
}

[Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $neonUrl, 'User')
$env:NEON_DATABASE_URL = $neonUrl
Write-Host "Saved NEON_DATABASE_URL to Windows user environment (not committed to git)." -ForegroundColor Green

$key = $env:RENDER_API_KEY
if (-not $key) {
  $key = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
}
if (-not $key) {
  Write-Error "RENDER_API_KEY not set. Run: npm run configure:render-mcp"
}

$headers = @{
  Authorization  = "Bearer $key"
  Accept         = 'application/json'
  'Content-Type' = 'application/json'
}

$body = @{ value = $neonUrl } | ConvertTo-Json
$uri = "https://api.render.com/v1/services/$ServiceId/env-vars/DATABASE_URL"
try {
  Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -Body $body | Out-Null
  Write-Host "Updated Render DATABASE_URL on brisbane-servers-api." -ForegroundColor Green
} catch {
  $uriPost = "https://api.render.com/v1/services/$ServiceId/env-vars"
  $createBody = @{ envVar = @{ key = 'DATABASE_URL'; value = $neonUrl } } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Uri $uriPost -Headers $headers -Method Post -Body $createBody | Out-Null
  Write-Host "Created Render DATABASE_URL on brisbane-servers-api." -ForegroundColor Green
}

if (-not $SkipDeploy) {
  Write-Host "Triggering API redeploy..." -ForegroundColor Cyan
  Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId/deploys" -Headers $headers -Method Post -Body '{}' | Out-Null
  Write-Host "Deploy started. After live, run: npm run verify:production -- --api https://api.brisbaneservers.com" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next: migrate data from legacy Render Postgres (if any users exist):" -ForegroundColor DarkGray
Write-Host '  npm run migrate:render-postgres-to-neon' -ForegroundColor DarkGray
Write-Host "Then decommission old DB:" -ForegroundColor DarkGray
Write-Host '  npm run decommission:render-postgres' -ForegroundColor DarkGray
Write-Host ""
