# Configure CLOUDFLARE_API_TOKEN (user env) and run Email Routing setup.
# Run from repo: .\website-brisbaneservers.com\scripts\configure-cloudflare-mcp.ps1
#
# Token needs (custom token at dash.cloudflare.com):
#   Account: Cloudflare Pages Edit, Email Routing Addresses Edit, Account Resources Read
#   Account: Workers Scripts Edit, Workers Routes Edit, Hyperdrive Edit (edge API deploy)
#   Zone brisbaneservers.com: Email Routing Rules Edit, DNS Edit, Zone Read

param(
  [switch]$SkipOAuthLaunch,
  [switch]$SkipEmail
)

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "Cloudflare API token setup" -ForegroundColor Cyan
Write-Host "Create token: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor DarkGray
Write-Host ""

$token = $env:CLOUDFLARE_API_TOKEN
if (-not $token) {
  $token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
}
if (-not $token) {
  $secure = Read-Host "Paste Cloudflare API token (input hidden)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Error "No token provided."
}

$token = $token.Trim().Trim('"').Trim("'")
# Common paste mistakes (curl examples, Authorization headers)
if ($token -match 'Bearer\s+(\S+)') { $token = $Matches[1] }
$token = $token -replace '^curl\s+', '' -replace '^-H\s+', '' -replace '^Authorization:\s*Bearer\s+', ''
$token = $token.Trim().Trim('"').Trim("'")

if ($token.Length -lt 20) {
  Write-Error "Token looks too short. Paste only the API token from Cloudflare (cfut_...), not a curl command."
}
if ($token -match '\s') {
  Write-Error "Token contains spaces. Paste a single line: the token only, no curl or -H headers."
}

$bearer = "Bearer $token"

[Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $token, 'User')
[Environment]::SetEnvironmentVariable('CLOUDFLARE_AUTH_HEADER', $bearer, 'User')

$env:CLOUDFLARE_API_TOKEN = $token
$env:CLOUDFLARE_AUTH_HEADER = $bearer

Write-Host "Saved CLOUDFLARE_API_TOKEN and CLOUDFLARE_AUTH_HEADER to your Windows user environment." -ForegroundColor Green
Write-Host "Reload Cursor fully after OAuth. API token is for npm scripts only, not MCP." -ForegroundColor Yellow
Write-Host ""

# Verify token works before continuing
try {
  $headers = @{
    Authorization  = "Bearer $token"
    'Content-Type' = 'application/json'
  }
  $verify = Invoke-RestMethod -Uri 'https://api.cloudflare.com/client/v4/user/tokens/verify' -Headers $headers -Method Get
  if ($verify.success) {
    Write-Host "Token verified (status: $($verify.result.status))." -ForegroundColor Green
  } else {
    Write-Warning "Token verify returned success=false. Check permissions on the token."
  }
} catch {
  Write-Host ""
  Write-Host "Token verification failed. Paste ONLY the token from Cloudflare (starts with cfut_), not a curl command." -ForegroundColor Red
  Write-Host "Example wrong paste: curl -H Authorization Bearer cfut_..." -ForegroundColor DarkGray
  Write-Host "Example right paste: cfut_xxxxxxxx..." -ForegroundColor DarkGray
  [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $null, 'User')
  [Environment]::SetEnvironmentVariable('CLOUDFLARE_AUTH_HEADER', $null, 'User')
  Write-Error "Token verification failed: $($_.Exception.Message)"
}

$pagesOk = $false
try {
  $acct = '92d738484386c6b613628bbeafebe2f9'
  $pagesHeaders = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
  $pagesTest = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$acct/pages/projects" -Headers $pagesHeaders -Method Get
  $pagesOk = [bool]$pagesTest.success
  if ($pagesOk) {
    Write-Host "Pages API access OK." -ForegroundColor Green
  }
} catch {
  Write-Warning "Token is valid but cannot manage Pages. Recreate token with Account: Cloudflare Pages - Edit."
}

$pagesScript = Join-Path $PSScriptRoot 'configure-cloudflare-pages-env.ps1'
if ((Test-Path $pagesScript) -and $pagesOk) {
  Write-Host "Applying Cloudflare Pages production env (PUBLIC_API_BASE_URL) ..." -ForegroundColor Cyan
  & $pagesScript
  Write-Host ""
}

if (-not $SkipEmail) {
  $site = Split-Path $PSScriptRoot -Parent
  Push-Location $site
  try {
    Write-Host "Running Email Routing setup for brisbaneservers.com ..." -ForegroundColor Cyan
    npm run setup:cloudflare-email
  } finally {
    Pop-Location
  }
}

$removeTokenMcp = Join-Path $PSScriptRoot 'remove-cloudflare-token-mcp.ps1'
if (Test-Path $removeTokenMcp) {
  & $removeTokenMcp
}
