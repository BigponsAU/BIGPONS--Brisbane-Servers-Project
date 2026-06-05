# Block until Cloudflare OAuth tokens are saved (single listener, no Cursor conflict).
# Run BEFORE reloading Cursor, or disable cloudflare-api in Settings while this runs.
# Usage: npm run complete:cloudflare-oauth

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Cloudflare OAuth - complete sign-in (keep this window open)" -ForegroundColor Cyan
Write-Host ""

$mcpAuth = Join-Path $env:USERPROFILE '.mcp-auth'
$hash = '6244cf5467a6f706b7b55d5e88d4e4c4'
$tokensFile = Join-Path $mcpAuth "mcp-remote-0.1.37\${hash}_tokens.json"

# Remove incomplete OAuth state for this server hash (keep other hashes)
foreach ($suffix in @('client_info.json', 'code_verifier.txt', 'lock.json')) {
  $f = Join-Path $mcpAuth "mcp-remote-0.1.37\${hash}_$suffix"
  if (Test-Path $f) { Remove-Item $f -Force }
}

Write-Host "Tip: In Cursor Settings, toggle cloudflare-api OFF while this runs to avoid port conflicts." -ForegroundColor Yellow
Write-Host ""

$proc = Start-Process -FilePath 'npx' -ArgumentList @(
  '-y', 'mcp-remote@latest',
  'https://mcp.cloudflare.com/mcp',
  '3334',
  '--auth-timeout', '300',
  '--debug'
) -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $env:TEMP 'cf-mcp-oauth-out.log') -RedirectStandardError (Join-Path $env:TEMP 'cf-mcp-oauth-err.log')

Write-Host "Waiting for OAuth (up to 5 minutes)..." -ForegroundColor DarkGray
Write-Host "Complete sign-in in the browser when it opens." -ForegroundColor DarkGray

$deadline = (Get-Date).AddMinutes(5)
while ((Get-Date) -lt $deadline) {
  if (Test-Path $tokensFile) {
    Write-Host ""
    Write-Host "OAuth tokens saved." -ForegroundColor Green
    break
  }
  if ($proc.HasExited -and -not (Test-Path $tokensFile)) {
    Write-Host ""
    Write-Host "mcp-remote exited before tokens were saved. Check logs:" -ForegroundColor Red
    Write-Host "  $env:TEMP\cf-mcp-oauth-err.log" -ForegroundColor DarkGray
    exit 1
  }
  Start-Sleep -Seconds 2
}

if (-not (Test-Path $tokensFile)) {
  Write-Host "Timed out waiting for OAuth. Try again or use: npm run configure:cloudflare-mcp" -ForegroundColor Red
  exit 1
}

if (-not $proc.HasExited) {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  1. Cursor -> Developer: Reload Window" -ForegroundColor DarkGray
Write-Host "  2. Enable cloudflare-api in Settings -> Tools and MCP" -ForegroundColor DarkGray
Write-Host "  3. npm run configure:cloudflare-mcp (API token for scripts)" -ForegroundColor DarkGray
Write-Host ""
