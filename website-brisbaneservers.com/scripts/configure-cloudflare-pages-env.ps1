# Set production Cloudflare Pages env vars for brisbaneservers (auth security baseline).
# Requires CLOUDFLARE_API_TOKEN with Account: Cloudflare Pages Edit.
#
# Run from repo root:
#   .\website-brisbaneservers.com\scripts\configure-cloudflare-pages-env.ps1 -SkipDeploy

param(
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'

$accountId = '92d738484386c6b613628bbeafebe2f9'
$projectName = 'brisbaneservers'
$apiUrl = 'https://api.brisbaneservers.com/api'
$siteUrl = 'https://brisbaneservers.com'

$requiredEnv = [ordered]@{
  PUBLIC_SITE_URL            = $siteUrl
  PUBLIC_SITE_BASE           = '/'
  PUBLIC_API_BASE_URL        = $apiUrl
  INTERNAL_API_BASE_URL      = $apiUrl
  PAGES_BUILD_USE_GIT_CORPUS = '1'
  PUBLIC_RESOURCES_LIVE        = '1'
}

$token = $env:CLOUDFLARE_API_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Error @"
CLOUDFLARE_API_TOKEN is not set.
Create a token with Cloudflare Pages Edit, then:
  .\website-brisbaneservers.com\scripts\configure-cloudflare-mcp.ps1
"@
}

function Invoke-CfApi {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null
  )
  $headers = @{ Authorization = "Bearer $token" }
  if ($Body) {
    $headers['Content-Type'] = 'application/json'
    return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method -Body ($Body | ConvertTo-Json -Depth 12)
  }
  return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method
}

Write-Host "Fetching Pages project $projectName ..." -ForegroundColor Cyan
$getUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName"
$project = Invoke-CfApi -Method Get -Uri $getUri
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

$existingEnv = @{}
if ($production.env_vars) {
  foreach ($entry in $production.env_vars.PSObject.Properties) {
    $val = $entry.Value
    if ($val -is [string]) {
      $existingEnv[$entry.Name] = @{ value = $val }
    } elseif ($val.value) {
      $existingEnv[$entry.Name] = @{ value = $val.value }
    }
  }
}

foreach ($key in $requiredEnv.Keys) {
  $existingEnv[$key] = @{ value = $requiredEnv[$key] }
}

$production.env_vars = $existingEnv
$deploymentConfigs.production = $production

Write-Host "Updating production env:" -ForegroundColor Cyan
foreach ($key in $requiredEnv.Keys) {
  Write-Host "  $key=$($requiredEnv[$key])" -ForegroundColor DarkGray
}

$patchUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName"
$patch = Invoke-CfApi -Method Patch -Uri $patchUri -Body @{ deployment_configs = $deploymentConfigs }
if (-not $patch.success) {
  throw "Patch failed: $($patch.errors | ConvertTo-Json -Compress)"
}

Write-Host "Cloudflare Pages production env updated." -ForegroundColor Green

if (-not $SkipDeploy) {
  Write-Host "Creating production deployment (rebuild with new env) ..." -ForegroundColor Cyan
  $deployUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName/deployments"
  $deploy = Invoke-CfApi -Method Post -Uri $deployUri -Body @{ branch = 'main' }
  if ($deploy.success) {
    $deploymentId = $deploy.result.id
    Write-Host "Deployment queued: $deploymentId" -ForegroundColor Green
    Write-Host "Dashboard: https://dash.cloudflare.com/?to=/:account/pages/view/$projectName/$deploymentId" -ForegroundColor DarkGray
  } else {
    Write-Host "Env saved; deployment trigger failed (push to main or retry in dashboard)." -ForegroundColor Yellow
    Write-Host ($deploy.errors | ConvertTo-Json -Compress) -ForegroundColor DarkGray
  }
} else {
  Write-Host "SkipDeploy: env saved without triggering Pages build (saves Neon egress)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verify after deploy completes:" -ForegroundColor Yellow
Write-Host ('  https://brisbaneservers.com/account/ - view source: data-public-api-base-url=' + $apiUrl) -ForegroundColor DarkGray
