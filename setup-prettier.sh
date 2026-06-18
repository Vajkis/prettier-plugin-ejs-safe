#!/usr/bin/env bash
# setup-prettier.sh (Mac / Linux)
# Run once on a new machine:
#
#   chmod +x setup-prettier.sh && ./setup-prettier.sh

set -e

PLUGIN_NAME="prettier-plugin-ejs-safe"
CONFIG_PATH="$HOME/.prettierrc.json"

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
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["$PLUGIN_PATH"]
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