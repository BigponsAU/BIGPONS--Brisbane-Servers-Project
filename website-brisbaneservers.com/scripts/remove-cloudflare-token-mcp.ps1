# Remove redundant cloudflare-api-token MCP (use OAuth cloudflare-api only in Cursor).
$ErrorActionPreference = 'Stop'

$mcpPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) '.cursor\mcp.json'
if (-not (Test-Path $mcpPath)) { return }

$json = Get-Content $mcpPath -Raw | ConvertFrom-Json
if ($json.mcpServers.PSObject.Properties.Name -contains 'cloudflare-api-token') {
  $json.mcpServers.PSObject.Properties.Remove('cloudflare-api-token')
  $out = $json | ConvertTo-Json -Depth 10
  [System.IO.File]::WriteAllText($mcpPath, $out + "`n", [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Removed cloudflare-api-token from .cursor/mcp.json (use green cloudflare-api OAuth only).' -ForegroundColor Green
}
