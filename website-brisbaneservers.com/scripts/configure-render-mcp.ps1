# Configure RENDER_API_KEY (user env) for Cursor Render MCP.
# Run from repo: .\website-brisbaneservers.com\scripts\configure-render-mcp.ps1
#
# Create key: https://dashboard.render.com/u/settings#api-keys
# Scopes: full account access (Render MCP uses broad API keys).

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Render MCP setup" -ForegroundColor Cyan
Write-Host "Create API key: https://dashboard.render.com/u/settings#api-keys" -ForegroundColor DarkGray
Write-Host ""

$key = $env:RENDER_API_KEY
if (-not $key) {
  $secure = Read-Host "Paste Render API key (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Error "No API key provided."
}

$key = $key.Trim()
$bearer = "Bearer $key"

[Environment]::SetEnvironmentVariable('RENDER_API_KEY', $key, 'User')
[Environment]::SetEnvironmentVariable('RENDER_AUTH_HEADER', $bearer, 'User')

$env:RENDER_API_KEY = $key
$env:RENDER_AUTH_HEADER = $bearer

Write-Host "Saved RENDER_API_KEY to your Windows user environment." -ForegroundColor Green
Write-Host "Reload Cursor (Developer: Reload Window) so the render MCP server connects." -ForegroundColor Yellow
Write-Host ""
Write-Host "In chat, ask: Set my Render workspace to [your workspace name]" -ForegroundColor DarkGray
Write-Host "Then: List my Render services" -ForegroundColor DarkGray
Write-Host ""
