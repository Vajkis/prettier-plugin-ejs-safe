# setup.ps1 (Windows)
# Run once on a new machine:
#
#   .\setup.ps1

$ErrorActionPreference = "Stop"
$PLUGIN_NAME = "prettier-plugin-ejs-safe"
$CONFIG_PATH = "$HOME\.prettierrc.json"

Write-Host ""
Write-Host "Installing $PLUGIN_NAME..." -ForegroundColor Cyan
Write-Host ""

# 1. Global install — prettier is installed automatically as a dependency
npm install -g $PLUGIN_NAME

# 2. Dynamically resolve full plugin entry file path for this machine
$PLUGIN_PATH = "$(npm root -g)\$PLUGIN_NAME\index.js" -replace "\\", "/"

# 3. Write config without BOM — Prettier rejects UTF-8 BOM in JSON files
$config = "{
  `"semi`": true,
  `"singleQuote`": true,
  `"tabWidth`": 2,
  `"trailingComma`": `"es5`",
  `"printWidth`": 100,
  `"plugins`": [`"$PLUGIN_PATH`"]
}"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($CONFIG_PATH, $config, $utf8NoBom)

Write-Host ""
Write-Host "Config written to: $CONFIG_PATH" -ForegroundColor Green
Write-Host "Plugin path: $PLUGIN_PATH" -ForegroundColor Green
Write-Host ""
Write-Host "VS Code - add to User Settings (Ctrl+Shift+P -> Open User Settings JSON):"
Write-Host ""
Write-Host "  `"prettier.configPath`": `"$($CONFIG_PATH -replace '\\', '\\')`","
Write-Host "  `"[ejs]`": {"
Write-Host "    `"editor.defaultFormatter`": `"esbenp.prettier-vscode`","
Write-Host "    `"editor.formatOnSave`": true"
Write-Host "  }"
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""