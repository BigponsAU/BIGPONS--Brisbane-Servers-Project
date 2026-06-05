# One-shot hosting MCP + Neon setup (interactive).
# Run: npm run configure:hosting

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "Brisbane Servers — hosting setup" -ForegroundColor Cyan
Write-Host "Render = API host only · Neon = Postgres · Cloudflare = site + DNS" -ForegroundColor DarkGray
Write-Host ""

& (Join-Path $PSScriptRoot 'configure-render-mcp.ps1')
Write-Host ""
& (Join-Path $PSScriptRoot 'configure-cloudflare-mcp.ps1')
Write-Host ""
Write-Host "Neon (optional — skip if already configured on Render):" -ForegroundColor Cyan
$doNeon = Read-Host "Configure Neon DATABASE_URL on Render now? (y/N)"
if ($doNeon -match '^[Yy]') {
  & (Join-Path $PSScriptRoot 'configure-neon-database.ps1')
}

Write-Host ""
& (Join-Path $PSScriptRoot 'verify-hosting-mcp.ps1')
