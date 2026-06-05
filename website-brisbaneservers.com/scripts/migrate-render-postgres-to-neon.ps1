# Copy auth + corpus from legacy Render Postgres to Neon (requires pg_dump + psql on PATH).
# Run from repo: .\website-brisbaneservers.com\scripts\migrate-render-postgres-to-neon.ps1
#
# Set RENDER_DATABASE_URL (external URL from Render dashboard → brisbane-servers-db → Connect)
# Set NEON_DATABASE_URL (pooled Neon URL) — or run configure-neon-database.ps1 first.

param(
  [string]$DumpFile = (Join-Path $PSScriptRoot '.render-postgres-dump.sql')
)

$ErrorActionPreference = 'Stop'

function Require-Cmd([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Error "$Name not found on PATH. Install PostgreSQL client tools (pg_dump, psql)."
  }
}

Require-Cmd 'pg_dump'
Require-Cmd 'psql'

$renderUrl = $env:RENDER_DATABASE_URL
if (-not $renderUrl) {
  $secure = Read-Host "Paste Render Postgres EXTERNAL connection URL (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $renderUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$neonUrl = $env:NEON_DATABASE_URL
if (-not $neonUrl) {
  $neonUrl = [Environment]::GetEnvironmentVariable('NEON_DATABASE_URL', 'User')
}
if (-not $neonUrl) {
  Write-Error "NEON_DATABASE_URL not set. Run: npm run configure:neon-database"
}

$renderUrl = $renderUrl.Trim().Trim('"').Trim("'")
$neonUrl = $neonUrl.Trim().Trim('"').Trim("'")

Write-Host "Exporting from Render Postgres..." -ForegroundColor Cyan
& pg_dump $renderUrl --no-owner --no-acl --file $DumpFile
if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump failed (exit $LASTEXITCODE)" }

Write-Host "Importing into Neon..." -ForegroundColor Cyan
& psql $neonUrl -v ON_ERROR_STOP=1 -f $DumpFile
if ($LASTEXITCODE -ne 0) { Write-Error "psql import failed (exit $LASTEXITCODE)" }

Write-Host "Migration complete. Dump saved at: $DumpFile" -ForegroundColor Green
Write-Host "Delete the dump file when verified — it may contain user data." -ForegroundColor Yellow
Write-Host "Verify: npm run verify:production -- --api https://api.brisbaneservers.com" -ForegroundColor DarkGray
