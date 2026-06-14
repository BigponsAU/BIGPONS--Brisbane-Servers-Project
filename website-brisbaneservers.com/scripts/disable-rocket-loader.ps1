# Disable Cloudflare Rocket Loader for brisbaneservers.com
# Rocket Loader defers/blocks click handlers and breaks Astro ES module bundles on /account/.
#
# Requires CLOUDFLARE_API_TOKEN with Zone Settings Write.
# Run from repo root:
#   .\website-brisbaneservers.com\scripts\disable-rocket-loader.ps1

$ErrorActionPreference = 'Stop'

$zoneName = 'brisbaneservers.com'
$token = $env:CLOUDFLARE_API_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Error @"
CLOUDFLARE_API_TOKEN is not set.
Create a token with Zone Settings Write, then re-run this script.
Or disable manually: Cloudflare Dashboard -> brisbaneservers.com -> Speed -> Optimization -> Rocket Loader -> Off
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
    return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method -Body ($Body | ConvertTo-Json -Depth 8)
  }
  return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method
}

Write-Host "Looking up zone $zoneName ..." -ForegroundColor Cyan
$zones = Invoke-CfApi -Method Get -Uri "https://api.cloudflare.com/client/v4/zones?name=$zoneName"
if (-not $zones.success -or -not $zones.result) {
  throw "Zone lookup failed: $($zones.errors | ConvertTo-Json -Compress)"
}
$zoneId = $zones.result[0].id

Write-Host "Disabling Rocket Loader on zone $zoneId ..." -ForegroundColor Cyan
$patch = Invoke-CfApi -Method Patch -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/settings/rocket_loader" -Body @{ value = 'off' }
if (-not $patch.success) {
  throw "Patch failed: $($patch.errors | ConvertTo-Json -Compress)"
}

Write-Host "Rocket Loader is now: $($patch.result.value)" -ForegroundColor Green
Write-Host "Hard-refresh https://brisbaneservers.com/account/ and retest sign-in." -ForegroundColor Yellow
