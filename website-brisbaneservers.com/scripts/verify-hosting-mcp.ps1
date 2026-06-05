# Verify MCP prerequisites and live hosting endpoints (no secrets printed).
# Run: npm run verify:hosting-mcp

$ErrorActionPreference = 'Continue'

function Test-UserEnv([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ($v) { Write-Host "  [OK]   $Name is set" -ForegroundColor Green }
  else { Write-Host "  [MISS] $Name - run configure script" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "=== MCP credentials (Windows user env) ===" -ForegroundColor Cyan
Test-UserEnv 'RENDER_API_KEY'
Test-UserEnv 'RENDER_AUTH_HEADER'
Test-UserEnv 'CLOUDFLARE_API_TOKEN'
Test-UserEnv 'CLOUDFLARE_AUTH_HEADER'
Test-UserEnv 'NEON_DATABASE_URL'

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
  @{ Name = 'Pages /account/ API base'; Url = 'https://brisbaneservers.com/account/' },
  @{ Name = 'API health (custom domain)'; Url = 'https://api.brisbaneservers.com/api/health' },
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
Write-Host "=== Database provider (from live health JSON) ===" -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod -Uri 'https://api.brisbaneservers.com/api/health' -TimeoutSec 45
  $provider = $health.persistence.databaseProvider
  if ($provider -eq 'neon') {
    Write-Host "  [OK]   DATABASE_URL host is Neon ($provider)" -ForegroundColor Green
  } elseif ($provider -eq 'render') {
    Write-Host "  [WARN] Still on Render Postgres - run configure:neon-database" -ForegroundColor Yellow
  } elseif ($provider) {
    Write-Host "  [INFO] databaseProvider=$provider" -ForegroundColor DarkGray
  } else {
    Write-Host "  [INFO] persistence field not in health yet (deploy latest API)" -ForegroundColor DarkGray
  }
} catch {
  Write-Host "  [SKIP] Could not read health persistence - $($_.Exception.Message)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Setup commands:" -ForegroundColor Cyan
Write-Host '  npm run configure:render-mcp' -ForegroundColor DarkGray
Write-Host '  npm run configure:cloudflare-mcp' -ForegroundColor DarkGray
Write-Host '  npm run configure:neon-database' -ForegroundColor DarkGray
Write-Host ""
