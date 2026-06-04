# Set production Cloudflare Pages env vars for brisbaneservers (auth security baseline).
# Requires CLOUDFLARE_API_TOKEN with Account: Cloudflare Pages Edit.
#
# Run from repo root:
#   $env:CLOUDFLARE_API_TOKEN = '...'
#   .\website-brisbaneservers.com\scripts\configure-cloudflare-pages-env.ps1

$ErrorActionPreference = 'Stop'

$accountId = '92d738484386c6b613628bbeafebe2f9'
$projectName = 'brisbaneservers'
$apiUrl = 'https://brisbane-servers-api.onrender.com/api'
$siteUrl = 'https://brisbaneservers.com'

$token = $env:CLOUDFLARE_API_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Error @"
CLOUDFLARE_API_TOKEN is not set.
Create a token with Cloudflare Pages Edit, then:
  `$env:CLOUDFLARE_API_TOKEN = 'your-token'
  .\website-brisbaneservers.com\scripts\configure-cloudflare-pages-env.ps1
Or run: .\website-brisbaneservers.com\scripts\configure-cloudflare-mcp.ps1
"@
}

Write-Host "Fetching Pages project $projectName ..." -ForegroundColor Cyan
$getUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName"
$project = Invoke-RestMethod -Uri $getUri -Headers @{ Authorization = "Bearer $token" } -Method Get
if (-not $project.success) {
  throw "Failed to load project: $($project.errors | ConvertTo-Json -Compress)"
}

$deploymentConfigs = $project.result.deployment_configs
if (-not $deploymentConfigs) {
  $deploymentConfigs = @{}
}

$production = $deploymentConfigs.production
if (-not $production) {
  $production = @{}
}

$envVars = @{
  PUBLIC_SITE_URL            = @{ value = $siteUrl }
  PUBLIC_SITE_BASE           = @{ value = '/' }
  PUBLIC_API_BASE_URL        = @{ value = $apiUrl }
  INTERNAL_API_BASE_URL      = @{ value = $apiUrl }
}

$production.env_vars = $envVars
$deploymentConfigs.production = $production

$body = @{
  deployment_configs = $deploymentConfigs
} | ConvertTo-Json -Depth 10

Write-Host "Updating production env (PUBLIC_API_BASE_URL=$apiUrl) ..." -ForegroundColor Cyan
$patchUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName"
$patch = Invoke-RestMethod -Uri $patchUri -Headers @{
  Authorization = "Bearer $token"
  'Content-Type' = 'application/json'
} -Method Patch -Body $body

if (-not $patch.success) {
  throw "Patch failed: $($patch.errors | ConvertTo-Json -Compress)"
}

Write-Host "Cloudflare Pages production env updated." -ForegroundColor Green
Write-Host "Trigger a new deploy (push to main or retry latest in dashboard)." -ForegroundColor Yellow
Write-Host "Verify: https://brisbaneservers.com/account/ — data-public-api-base-url should be $apiUrl" -ForegroundColor DarkGray
