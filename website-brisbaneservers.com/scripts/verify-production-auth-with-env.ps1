foreach ($name in @('DATABASE_URL', 'NEON_DATABASE_URL', 'API_ORIGIN', 'PUBLIC_SITE_URL')) {
  $val = [Environment]::GetEnvironmentVariable($name, 'User')
  if ($val) { Set-Item -Path "env:$name" -Value $val }
}
if (-not $env:NEON_DATABASE_URL -and $env:DATABASE_URL) {
  $env:NEON_DATABASE_URL = $env:DATABASE_URL
}
Push-Location (Join-Path $PSScriptRoot '..')
npm run verify:production-auth @args
exit $LASTEXITCODE
