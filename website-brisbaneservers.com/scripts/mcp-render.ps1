# MCP stdio wrapper: reads RENDER_API_KEY from Windows user env.

$ErrorActionPreference = 'Stop'

$key = [Environment]::GetEnvironmentVariable('RENDER_API_KEY', 'User')
if ([string]::IsNullOrWhiteSpace($key)) {
  [Console]::Error.WriteLine('RENDER_API_KEY not set. Run: npm run configure:render-mcp')
  exit 1
}

$header = "Authorization:Bearer $($key.Trim())"
& npx -y mcp-remote@latest https://mcp.render.com/mcp --header $header @args
