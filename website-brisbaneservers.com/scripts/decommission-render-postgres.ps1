# Delete legacy Render Postgres (brisbane-servers-db) after Neon migration is verified.
# Requires RENDER_API_KEY. Does NOT touch brisbane-servers-api.

param(
  [string]$PostgresId = 'dpg-d8ae84reo5us739jtpi0-a',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$key = $env:RENDER_API_KEY
if (-not $key) {
  $key = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
}
if (-not $key) {
  Write-Error 'RENDER_API_KEY not set. Run: npm run configure:render-mcp'
}

Write-Host ""
Write-Host "Decommission Render Postgres: $PostgresId" -ForegroundColor Cyan
Write-Host "Ensure Neon DATABASE_URL is live and verified first." -ForegroundColor Yellow
Write-Host ""

if (-not $Force) {
  $confirm = Read-Host "Type DELETE to remove brisbane-servers-db permanently"
  if ($confirm -ne 'DELETE') {
    Write-Host "Aborted." -ForegroundColor DarkGray
    exit 0
  }
}

$headers = @{
  Authorization = "Bearer $key"
  Accept        = 'application/json'
}

try {
  Invoke-RestMethod -Uri "https://api.render.com/v1/postgres/$PostgresId" -Headers $headers -Method Delete | Out-Null
  Write-Host "Deleted Render Postgres brisbane-servers-db." -ForegroundColor Green
} catch {
  Write-Error "Delete failed: $($_.Exception.Message)"
}

Write-Host "Render API (brisbane-servers-api) is unchanged — only the old database was removed." -ForegroundColor DarkGray
