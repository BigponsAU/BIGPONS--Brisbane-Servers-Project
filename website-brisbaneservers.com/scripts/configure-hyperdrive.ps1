# Create Cloudflare Hyperdrive for Neon + patch workers/api/wrangler.toml
# Run: .\website-brisbaneservers.com\scripts\configure-hyperdrive.ps1

param(
  [string]$WorkerDir = (Join-Path $PSScriptRoot '..\workers\api'),
  [string]$HyperdriveName = 'brisbane-servers-neon',
  [switch]$SkipCreate
)

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Neon Hyperdrive -> edge worker auth (Phase 1b)" -ForegroundColor Cyan
Write-Host ""

$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
  $databaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'User')
}
if (-not $databaseUrl) {
  $databaseUrl = Read-Host "Paste Neon pooled DATABASE_URL"
}
$databaseUrl = $databaseUrl.Trim()
if (-not $databaseUrl) {
  Write-Error "DATABASE_URL is required."
}

$wranglerPath = Join-Path $WorkerDir 'wrangler.toml'
if (-not (Test-Path $wranglerPath)) {
  Write-Error "wrangler.toml not found at $wranglerPath"
}

Push-Location $WorkerDir
try {
  if (-not (Test-Path 'node_modules')) {
    npm install | Out-Null
  }

  $hyperdriveId = $null

  if (-not $SkipCreate) {
    Write-Host "Creating Hyperdrive config '$HyperdriveName' via wrangler..." -ForegroundColor Cyan
    $createOut = npx wrangler hyperdrive create $HyperdriveName --connection-string="$databaseUrl" --caching-disabled 2>&1 | Out-String
    Write-Host $createOut
    if ($createOut -match 'id[:\s"]+([a-f0-9]{32})') {
      $hyperdriveId = $Matches[1]
    }
  }

  if (-not $hyperdriveId) {
    Write-Host ""
    $hyperdriveId = Read-Host "Paste Hyperdrive config id (from wrangler output or Cloudflare dashboard)"
  }

  if (-not $hyperdriveId) {
    Write-Error "Hyperdrive id required."
  }

  $content = Get-Content $wranglerPath -Raw
  $content = $content -replace 'id = "00000000000000000000000000000000"', "id = `"$hyperdriveId`""
  Set-Content -Path $wranglerPath -Value $content -NoNewline
  Write-Host "Updated wrangler.toml HYPERDRIVE id -> $hyperdriveId" -ForegroundColor Green
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run configure:edge-worker"
Write-Host "  npm run verify:production-auth"
