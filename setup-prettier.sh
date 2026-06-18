#!/usr/bin/env bash
# setup-prettier.sh (Mac / Linux)
# Run once on a new machine:
#
#   chmod +x setup-prettier.sh && ./setup-prettier.sh

set -e

PLUGIN_NAME="prettier-plugin-ejs-safe"
CONFIG_PATH="$HOME/.prettierrc"

echo ""
echo "Installing global Prettier + EJS plugin..."
echo ""

# 1. Global install
npm install -g "$PLUGIN_NAME"

# 2. Dynamically resolve full plugin entry file path for this machine
PLUGIN_PATH="$(npm root -g)/$PLUGIN_NAME/index.js"

# 3. Write config with absolute plugin path
cat > "$CONFIG_PATH" << EOF
{
  "plugins": ["$PLUGIN_PATH"],
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "none",
  "bracketSpacing": true,
  "bracketSameLine": true,
  "arrowParens": "always",
  "htmlWhitespaceSensitivity": "css",
  "singleAttributePerLine": true,
  "endOfLine": "lf",
  "embeddedLanguageFormatting": "auto",
  "overrides": [
    {
      "files": ["*.html", "*.ejs"],
      "options": {
        "printWidth": 99999
      }
    }
  ]
}
EOF

echo ""
echo "Config written to: $CONFIG_PATH"
echo "Plugin path: $PLUGIN_PATH"
echo ""
echo "VS Code - add to User Settings (Ctrl+Shift+P -> Open User Settings JSON):"
echo ""
echo "  \"prettier.configPath\": \"$CONFIG_PATH\","
echo "  \"[ejs]\": {"
echo "    \"editor.defaultFormatter\": \"esbenp.prettier-vscode\","
echo "    \"editor.formatOnSave\": true"
echo "  }"
echo ""
echo "Done!"
echo ""