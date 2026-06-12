# Test which Cloudflare API token permissions are missing (wrangler + scripts).
$ErrorActionPreference = 'Continue'

$token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
if (-not $token) {
  Write-Error 'CLOUDFLARE_API_TOKEN not in user env. Run: npm run configure:cloudflare-mcp'
}

$accountId = '92d738484386c6b613628bbeafebe2f9'
$zoneId = 'd17d7ab59aec5a7a6fb4f08f9740f779'
$headers = @{ Authorization = "Bearer $token" }

function Test-Cf {
  param([string]$Name, [string]$Uri, [string]$Method = 'Get')
  try {
    $r = Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method
    if ($r.success -eq $false) {
      Write-Host ('FAIL  ' + $Name + ' — ' + $r.errors[0].message) -ForegroundColor Red
      return $false
    }
    Write-Host ('PASS  ' + $Name) -ForegroundColor Green
    return $true
  } catch {
    Write-Host ('FAIL  ' + $Name + ' — ' + $_.ErrorDetails.Message) -ForegroundColor Red
    return $false
  }
}

Write-Host "`nCloudflare API token permission check`n" -ForegroundColor Cyan
Test-Cf 'Token verify' 'https://api.cloudflare.com/client/v4/user/tokens/verify' | Out-Null
Test-Cf 'Workers script read' "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/brisbane-servers-api-edge" | Out-Null
Test-Cf 'Workers routes (zone)' "https://api.cloudflare.com/client/v4/zones/$zoneId/workers/routes" | Out-Null
Test-Cf 'Pages projects' "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects" | Out-Null
Write-Host "`nWorkers routes FAIL on token is OK — route is managed in Cloudflare dashboard (not wrangler.toml)." -ForegroundColor DarkGray
Write-Host "Deploy only needs Workers Scripts Edit. MCP OAuth: cloudflare-api for DNS/routes in chat.`n" -ForegroundColor DarkGray
