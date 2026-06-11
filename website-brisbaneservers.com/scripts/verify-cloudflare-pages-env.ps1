# Verify Cloudflare Pages auth env on live site + optional API check.
# Usage: .\website-brisbaneservers.com\scripts\verify-cloudflare-pages-env.ps1

$ErrorActionPreference = 'Stop'

$expectedApis = @(
  'https://api.brisbaneservers.com/api',
  'https://api.brisbaneservers.com/api'
)

$accountUrl = 'https://brisbaneservers.com/account/'

Write-Host "Checking live account page ..." -ForegroundColor Cyan
$html = (Invoke-WebRequest -Uri $accountUrl -UseBasicParsing -TimeoutSec 45).Content

if ($html -match 'data-public-api-base-url="([^"]*)"') {
  $liveApi = ($Matches[1] -replace '/+$', '')
  Write-Host "  data-public-api-base-url = $liveApi"
  if ($liveApi -match 'api1') {
    Write-Host "FAIL: api1 misconfiguration detected." -ForegroundColor Red
    exit 1
  }
  if ($liveApi -eq '/api') {
    Write-Host "FAIL: Relative /api base (Pages env not set). Run configure-cloudflare-pages-env.ps1" -ForegroundColor Red
    exit 1
  }
  if ($expectedApis -contains $liveApi) {
    Write-Host "PASS: API base is a valid production HTTPS URL." -ForegroundColor Green
  } else {
    Write-Host "WARN: API base is absolute but not the documented default: $liveApi" -ForegroundColor Yellow
  }
} else {
  Write-Host "FAIL: data-public-api-base-url not found in HTML." -ForegroundColor Red
  exit 1
}

if ($html -match 'data-password-toggle-target="password"') {
  Write-Host "PASS: Account auth UI bundle present." -ForegroundColor Green
} else {
  Write-Host "WARN: Password toggle markup missing (deploy may still be in progress)." -ForegroundColor Yellow
}

$token = $env:CLOUDFLARE_API_TOKEN
if ($token) {
  $accountId = '92d738484386c6b613628bbeafebe2f9'
  $projectName = 'brisbaneservers'
  $uri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName"
  $project = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $token" } -Method Get
  if ($project.success) {
    $envVars = $project.result.deployment_configs.production.env_vars
    $configured = $envVars.PUBLIC_API_BASE_URL
    $configuredVal = if ($configured.value) { $configured.value } else { $configured }
    Write-Host "  Cloudflare PUBLIC_API_BASE_URL = $configuredVal"
  }
}

Write-Host "Done." -ForegroundColor Green
