# prettier-plugin-ejs-safe

Prettier plugin for EJS templates — formats the HTML structure while **completely preserving** all EJS tags untouched.

## The problem

The [prettier-plugin-ejs](https://www.npmjs.com/package/prettier-plugin-ejs) breaks EJS tags because it treats their content as HTML and reformats it without any special handling.

## The solution

Before formatting, this plugin **extracts** all EJS tags and replaces them with safe placeholders. After HTML formatting, it **restores** the original tags.

```
Original           Placeholder             After formatting        Restored
─────────          ─────────               ─────────               ─────────
<% if (x) { %>  →  <!-- EJSBLOCK_0 -->  →  <!-- EJSBLOCK_0 -->  →  <% if (x) { %>
<%= name %>     →  EJSINLINE_1          →  EJSINLINE_1          →  <%= name %>
```

## Supported EJS tag types

| Tag              | Description                   |
| ---------------- | ----------------------------- |
| `<% code %>`     | Scriptlet (control flow)      |
| `<%= expr %>`    | HTML-escaped output           |
| `<%- expr %>`    | Unescaped output              |
| `<%# comment %>` | Comment (no output)           |
| `<%_ code %>`    | Whitespace-slurping scriptlet |
| `<% code -%>`    | Trim newline after tag        |
| `<% code _%>`    | Whitespace slurp after tag    |

## Head/foot partials — `ignoreTags`

EJS projects are often split into a "head" partial that opens shell tags (`<html>`, `<body>`, ...) and a "foot" partial that closes them. Each partial is invalid HTML on its own: Prettier's HTML parser either silently inserts the missing closing tag (unclosed open tag) or throws a parse error (closing tag with no matching open).

`ignoreTags` removes specific tag names from HTML parsing entirely — their open/close tags pass through untouched, exactly as written, with no auto-closing and no validation.

| Value                  | Effect                                                         |
| ---------------------- | -------------------------------------------------------------- |
| `["none"]` _(default)_ | No tags ignored — normal HTML parsing.                         |
| `["all"]`              | Every tag is left untouched (no structural formatting at all). |
| `["html", "body"]`     | Only the listed tag names are left untouched.                  |

```json
// head.prettierrc — for files that open shell tags
{
  "plugins": ["..."],
  "ignoreTags": ["html", "body"]
}
```

Ignored tags still count toward indentation — their children are indented as if the tag were really there, even though it's never parsed as one. This is computed per file from that file's own ignored tags only: `head.ejs` only knows it opens `<html>`/`<body>`, and `foot.ejs` only knows it closes them, but both land on the same indentation because each is shifted so its content never goes above column 0.

```ejs
<!-- head.ejs -->
<html lang="en">
  <head>
    <title><%= title %></title>
  </head>
  <body>

    <!-- foot.ejs -->
  </body>
</html>
```

Any tag not listed (like `<div>` above) still needs to be balanced _within that same file_ — list every tag that spans across your head/foot split, not just `html`/`body`.

## Team setup

Run once on a new machine. The script installs the plugin globally, resolves the correct plugin path for that machine, and writes `~/.prettierrc` automatically.

The scripts aren't published with the npm package — download them from the [latest release](https://github.com/Vajkis/prettier-plugin-ejs-safe/releases/latest):

**Windows:**

1. Download [`setup.bat`](https://github.com/Vajkis/prettier-plugin-ejs-safe/releases/latest/download/setup.bat)
2. Double-click it to run — no terminal needed.

**Mac / Linux:**

1. Download [`setup.sh`](https://github.com/Vajkis/prettier-plugin-ejs-safe/releases/latest/download/setup.sh)
2. Run:
   ```bash
   chmod +x setup.sh && ./setup.sh
   ```

After running, add to VS Code User Settings (`Ctrl+Shift+P` → `Open User Settings JSON`):

```json
{
  "prettier.configPath": "C:\\Users\\YourName\\.prettierrc",
  "prettier.resolveGlobalModules": true,
  "[ejs]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

The exact `prettier.configPath` value is printed by the setup script after it runs.

## What the setup script does

1. Installs `prettier-plugin-ejs-safe` globally — `prettier` is included as a dependency, no separate install needed
2. Finds the plugin path on this machine using `npm root -g`
3. Writes `~/.prettierrc` with the absolute plugin path

## CLI / CI usage

```bash
prettier --config ~/.prettierrc --write "**/*.ejs"
```

## Example

**Before:**

```ejs
<% if (users.length > 0) { %>
<ul>
  <% users.forEach(function(user){ %>
  <li class="<%= user.role %>"><%= user.name %></li>
  <% }) %>
</ul>
<% } %>
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
