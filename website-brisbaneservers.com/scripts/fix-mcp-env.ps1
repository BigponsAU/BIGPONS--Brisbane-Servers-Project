# MCP environment check and Cloudflare OAuth reminder.
# Run: npm run fix:mcp-env

$ErrorActionPreference = 'Continue'

function Test-UserVar([string]$Name) {
  $v = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ($v) { return $true, $v.Length }
  return $false, 0
}

Write-Host ""
Write-Host "=== MCP credentials (Windows user env) ===" -ForegroundColor Cyan
foreach ($n in @('CLOUDFLARE_API_TOKEN', 'RENDER_API_KEY', 'RENDER_AUTH_HEADER')) {
  $ok, $len = Test-UserVar $n
  if ($ok) { Write-Host "  [OK]   $n (len $len)" -ForegroundColor Green }
  else { Write-Host "  [MISS] $n" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "=== Cloudflare MCP (Cursor) ===" -ForegroundColor Cyan
Write-Host "  API token is for npm scripts only (Pages env, email routing)." -ForegroundColor DarkGray
Write-Host "  Cursor cloudflare-api must use OAuth (not the API token)." -ForegroundColor DarkGray

$mcpAuth = Join-Path $env:USERPROFILE '.mcp-auth'
$oauthTokens = Join-Path $mcpAuth 'mcp-remote-0.1.37\6244cf5467a6f706b7b55d5e88d4e4c4_tokens.json'
if (Test-Path $oauthTokens) {
  Write-Host "  [OK]   OAuth tokens file exists - reload Cursor or run complete:cloudflare-oauth if MCP is red" -ForegroundColor Green
} else {
  Write-Host "  [MISS] OAuth not completed - run: npm run complete:cloudflare-oauth" -ForegroundColor Red
}

$mcpPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) '.cursor\mcp.json'
if (Test-Path $mcpPath) {
  $raw = Get-Content $mcpPath -Raw
  if ($raw -match 'mcp-cloudflare\.ps1') {
    Write-Host "  [WARN] Old mcp.json used API token wrapper - pull latest (OAuth only)" -ForegroundColor Yellow
  } elseif ($raw -match 'mcp\.cloudflare\.com/mcp') {
    Write-Host "  [OK]   .cursor/mcp.json uses OAuth mcp-remote" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Global Cursor MCP (optional) ===" -ForegroundColor Cyan
$userMcp = Join-Path $env:USERPROFILE '.cursor\mcp.json'
if (Test-Path $userMcp) {
  $u = Get-Content $userMcp -Raw
  if ($u -match 'your_hub_pat_token|YOUR_GITHUB_PAT') {
    Write-Host "  [WARN] ~/.cursor/mcp.json has placeholder tokens (dockerhub/coderabbit) - disable in Settings if they error" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "If cloudflare-api is red: npm run complete:cloudflare-oauth then quit+reopen Cursor" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $oauthTokens)) { exit 1 }
