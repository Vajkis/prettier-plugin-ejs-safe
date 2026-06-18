# prettier-plugin-ejs-safe

Prettier plugin for EJS templates — formats the HTML structure while **completely preserving** all EJS tags untouched.

## The problem

The official `prettier-plugin-ejs` breaks EJS tags because it treats their content as HTML and reformats it without any special handling.

## The solution

Before formatting, this plugin **extracts** all EJS tags and replaces them with safe placeholders. After HTML formatting, it **restores** the original tags.

```
Original              Placeholder              After formatting     Restored
────────              ───────────              ────────────────     ────────
<% if (x) { %>  →  <!-- EJSBLOCK_0 -->   →  <!-- EJSBLOCK_0 -->  →  <% if (x) { %>
<%= name %>      →  EJSINLINE_1          →  EJSINLINE_1          →  <%= name %>
```

## Supported EJS tag types

| Tag | Description |
|-----|-------------|
| `<% code %>` | Scriptlet (control flow) |
| `<%= expr %>` | HTML-escaped output |
| `<%- expr %>` | Unescaped output |
| `<%# comment %>` | Comment (no output) |
| `<%_ code %>` | Whitespace-slurping scriptlet |
| `<% code -%>` | Trim newline after tag |
| `<% code _%>` | Whitespace slurp after tag |

## Team setup

Run once on a new machine. The script installs the plugin globally, resolves the correct plugin path for that machine, and writes `~/.prettierrc.json` automatically.

**Windows:**
```powershell
.\setup.ps1
```

**Mac / Linux:**
```bash
chmod +x setup.sh && ./setup.sh
```

After running, add to VS Code User Settings (`Ctrl+Shift+P` → `Open User Settings JSON`):

```json
{
  "prettier.configPath": "C:\\Users\\YourName\\.prettierrc.json",
  "[ejs]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

The exact `prettier.configPath` value is printed by the setup script after it runs.

## What the setup script does

1. Installs `prettier-plugin-ejs-safe` globally — `prettier` is included as a dependency, no separate install needed
2. Finds the plugin path on this machine using `npm root -g`
3. Writes `~/.prettierrc.json` with the absolute plugin path

## CLI / CI usage

```bash
prettier --config ~/.prettierrc.json --write "**/*.ejs"
```

## Example

**Before:**
```ejs
<% if (users.length > 0) { %><ul><% users.forEach(function(user){ %><li class="<%= user.role %>"><%= user.name %></li><% }) %></ul><% } %>
```

**After:**
```ejs
<% if (users.length > 0) { %>
<ul>
  <% users.forEach(function(user){ %>
  <li class="<%= user.role %>"><%= user.name %></li>
  <% }) %>
</ul>
<% } %>
```

EJS tags **unchanged**, HTML **formatted**.