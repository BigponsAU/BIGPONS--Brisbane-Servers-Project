# Add cloudflare-api-token MCP entry after CLOUDFLARE_API_TOKEN is saved.
# Run after: npm run configure:cloudflare-mcp

$ErrorActionPreference = 'Stop'

$token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
if (-not $token) {
  Write-Error 'CLOUDFLARE_API_TOKEN not set. Run: npm run configure:cloudflare-mcp'
}

$mcpPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) '.cursor\mcp.json'
$json = Get-Content $mcpPath -Raw | ConvertFrom-Json

$tokenServer = [PSCustomObject]@{
  command = 'npx'
  args    = @(
    '-y', 'mcp-remote@latest',
    'https://mcp.cloudflare.com/mcp',
    '--header', 'Authorization:${CLOUDFLARE_AUTH_HEADER}'
  )
}

if (-not $json.mcpServers.'cloudflare-api-token') {
  $json.mcpServers | Add-Member -NotePropertyName 'cloudflare-api-token' -NotePropertyValue $tokenServer
}

$out = $json | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($mcpPath, $out + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "Updated cloudflare-api-token in .cursor/mcp.json (env: syntax for Cursor)." -ForegroundColor Green

Write-Host "Reload Cursor (Developer: Reload Window)." -ForegroundColor Yellow
