# Render REST API helper (used when MCP is not yet connected).
# Requires RENDER_API_KEY in environment (see configure-render-mcp.ps1).

param(
  [ValidateSet('services', 'workspaces')]
  [string]$Action = 'services'
)

$ErrorActionPreference = 'Stop'
$key = $env:RENDER_API_KEY
if (-not $key) {
  Write-Error 'RENDER_API_KEY not set. Run: npm run configure:render-mcp'
}

$headers = @{
  Authorization = "Bearer $key"
  Accept        = 'application/json'
}

$path = if ($Action -eq 'workspaces') { 'owners' } else { 'services' }
$uri = "https://api.render.com/v1/$path"
$response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

if ($Action -eq 'services') {
  $response | ForEach-Object {
    $s = $_.service
    if ($s) {
      [PSCustomObject]@{
        name       = $s.name
        type       = $s.type
        slug       = $s.slug
        url        = if ($s.serviceDetails) { $s.serviceDetails.url } else { $null }
        suspended  = $s.suspended
        repo       = $s.repo
      }
    }
  }
} else {
  $response
}
