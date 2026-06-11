# Suspend Render API service. API runs on Cloudflare Worker only.
# Usage: .\website-brisbaneservers.com\scripts\decommission-render-api.ps1
param(
  [string]$ServiceId = 'srv-d8ae7qbbc2fs73fv227g',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$apiKey = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
if (-not $apiKey) {
  throw 'RENDER_API_KEY not in user env. Get from https://dashboard.render.com/u/settings#api-keys'
}

$headers = @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' }

Write-Host "Render API service: $ServiceId" -ForegroundColor Cyan
$svc = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId" -Headers $headers
Write-Host "Current: $($svc.service.name) suspended=$($svc.service.suspended)" -ForegroundColor DarkGray

if ($DryRun) {
  Write-Host 'Dry run: would POST suspend' -ForegroundColor Yellow
  exit 0
}

Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId/suspend" -Method Post -Headers $headers | Out-Null
Write-Host 'Render API suspended. Use api.brisbaneservers.com (Cloudflare Worker).' -ForegroundColor Green
