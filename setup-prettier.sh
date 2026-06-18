#!/usr/bin/env bash
# setup-prettier.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-time onboarding script for team members.
# Run once on a new machine:
#
#   chmod +x setup-prettier.sh && ./setup-prettier.sh
#
# ─────────────────────────────────────────────────────────────────────────────
set -e

PLUGIN_NAME="prettier-plugin-ejs-safe"
CONFIG_DIR="$HOME/.config/prettier"
CONFIG_FILE="$CONFIG_DIR/.prettierrc.json"

echo ""
echo "🎨  Installing global Prettier + EJS plugin..."
echo ""

# ── 1. Global install ─────────────────────────────────────────────────────
npm install -g prettier "$PLUGIN_NAME"

echo "✅  Prettier and $PLUGIN_NAME installed globally"

# ── 2. Global config file ─────────────────────────────────────────────────
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_FILE" << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-ejs-safe"]
}
EOF

echo "✅  Global config created at: $CONFIG_FILE"

# ── 3. Editor setup instructions ─────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────────"
echo "📝  VS Code — add to User Settings (Ctrl+Shift+P → 'Open User Settings JSON'):"
echo ""
echo '    "prettier.configPath": "'"$CONFIG_FILE"'",'
echo '    "prettier.resolveGlobalModules": true,'
echo '    "[ejs]": {'
echo '      "editor.defaultFormatter": "esbenp.prettier-vscode",'
echo '      "editor.formatOnSave": true'
echo '    }'
echo ""
echo "─────────────────────────────────────────────────────────"
echo "📝  WebStorm / IntelliJ:"
echo "    Settings → Languages & Frameworks → JavaScript → Prettier"
echo "    → Configuration file: $CONFIG_FILE"
echo "    → Run for files: {**/*,*}.{js,ts,jsx,tsx,css,html,ejs}"
echo ""
echo "─────────────────────────────────────────────────────────"
echo "📝  CLI usage (no per-repo config needed):"
echo "    prettier --config $CONFIG_FILE --write \"**/*.ejs\""
echo ""
echo "✨  Done! Formatting will work across all repos without any extra setup."
echo ""
