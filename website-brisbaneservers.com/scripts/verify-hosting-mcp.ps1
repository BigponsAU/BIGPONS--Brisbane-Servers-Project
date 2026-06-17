# Verify MCP prerequisites and live hosting endpoints (no secrets printed).
# Run: npm run verify:hosting-mcp

$ErrorActionPreference = 'Continue'

function Test-UserEnv([string]$Name, [switch]$Optional) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ($v) { Write-Host "  [OK]   $Name is set" -ForegroundColor Green }
  elseif ($Optional) { Write-Host "  [SKIP] $Name (optional)" -ForegroundColor DarkGray }
  else { Write-Host "  [MISS] $Name - run configure script" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "=== MCP credentials (Windows user env) ===" -ForegroundColor Cyan
Test-UserEnv 'CLOUDFLARE_API_TOKEN'
Test-UserEnv 'CLOUDFLARE_AUTH_HEADER' -Optional
Test-UserEnv 'NEON_DATABASE_URL' -Optional
Test-UserEnv 'RENDER_API_KEY' -Optional

Write-Host ""
Write-Host "=== Cursor MCP servers (.cursor/mcp.json) ===" -ForegroundColor Cyan
$mcpPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) '.cursor\mcp.json'
if (Test-Path $mcpPath) {
  Write-Host "  [OK]   $mcpPath" -ForegroundColor Green
  $json = Get-Content $mcpPath -Raw | ConvertFrom-Json
  $json.mcpServers.PSObject.Properties.Name | ForEach-Object {
    Write-Host "         - $_" -ForegroundColor DarkGray
  }
} else {
  Write-Host "  [MISS] .cursor/mcp.json" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Live endpoints ===" -ForegroundColor Cyan

$checks = @(
  @{ Name = 'Pages /account/'; Url = 'https://brisbaneservers.com/account/' },
  @{ Name = 'API health (Worker)'; Url = 'https://api.brisbaneservers.com/api/health' },
  @{ Name = 'API OAuth status'; Url = 'https://api.brisbaneservers.com/api/auth/oauth/status' }
)

foreach ($c in $checks) {
  try {
    $r = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 45 -MaximumRedirection 5
    Write-Host "  [OK]   $($c.Name) - HTTP $($r.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "  [FAIL] $($c.Name) - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "=== Edge API ===" -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod -Uri 'https://api.brisbaneservers.com/api/health' -TimeoutSec 45
  if ($health.edge -eq 'cloudflare-worker' -and $health.render -eq $false) {
    Write-Host "  [OK]   Production API on Cloudflare Worker (Render not in path)" -ForegroundColor Green
  } else {
    Write-Host "  [INFO] health=$($health | ConvertTo-Json -Compress)" -ForegroundColor DarkGray
  }
} catch {
  Write-Host "  [SKIP] Could not read API health - $($_.Exception.Message)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Setup commands:" -ForegroundColor Cyan
Write-Host '  npm run configure:cloudflare-mcp' -ForegroundColor DarkGray
Write-Host '  npm run connect:cloudflare-mcp-oauth' -ForegroundColor DarkGray
Write-Host '  npm run deploy:edge-worker' -ForegroundColor DarkGray
Write-Host ""
