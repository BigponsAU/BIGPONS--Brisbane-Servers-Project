param([Parameter(Mandatory)][string]$Command)

foreach ($name in @(
  'DATABASE_URL', 'NEON_DATABASE_URL', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN',
  'RESEND_API_KEY', 'PUBLIC_SITE_URL', 'API_ORIGIN'
)) {
  $val = [Environment]::GetEnvironmentVariable($name, 'User')
  if ($val) { Set-Item -Path "env:$name" -Value $val }
}
if (-not $env:NEON_DATABASE_URL -and $env:DATABASE_URL) {
  $env:NEON_DATABASE_URL = $env:DATABASE_URL
}

Push-Location (Join-Path $PSScriptRoot '..')
Invoke-Expression $Command
$code = $LASTEXITCODE
Pop-Location
exit $code
