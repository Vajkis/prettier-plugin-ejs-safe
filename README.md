# prettier-plugin-ejs-safe

Prettier plugin for EJS templates — formats the HTML structure while **completely preserving** all EJS tags untouched.

## The problem

The official `prettier-plugin-ejs` breaks EJS tags because it treats their content as HTML and reformats it without any special handling.

## The solution

Before formatting, this plugin **extracts** all EJS tags and replaces them with safe placeholders. After HTML formatting, it **restores** the original tags.

```
Original              Placeholder              After formatting    Restored
────────              ───────────              ────────────────    ────────
<% if (x) { %>  →  <!-- EJSBLOCK_0 -->   →  <!-- EJSBLOCK_0 --> →  <% if (x) { %>
<%= name %>      →  EJSINLINE_1          →  EJSINLINE_1         →  <%= name %>
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

## Installation

```bash
npm install -g prettier prettier-plugin-ejs-safe
```

## Configuration

`~/.config/prettier/.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-ejs-safe"]
}
```

## Global team setup

```bash
chmod +x setup-prettier.sh && ./setup-prettier.sh
```

## VS Code

`settings.json`:
```json
{
  "prettier.configPath": "~/.config/prettier/.prettierrc.json",
  "prettier.resolveGlobalModules": true,
  "[ejs]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

## CLI / CI usage

Format all EJS files without any per-repo config:

```bash
prettier --config ~/.config/prettier/.prettierrc.json --write "**/*.ejs"
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
