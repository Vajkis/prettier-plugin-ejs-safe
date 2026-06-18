// prettier-plugin-ejs-safe/index.js
// Formats .ejs files as HTML while preserving all EJS tags untouched.

import * as prettier from "prettier";
import * as htmlPlugin from "prettier/plugins/html";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as postcssPlugin from "prettier/plugins/postcss";

// ─── Built-in plugins for inner HTML formatting ────────────────────────────
// Explicitly passed to the inner prettier.format() call to avoid recursion —
// we intentionally exclude our own plugin from the list.
const BUILTIN_PLUGINS = [htmlPlugin, babelPlugin, estreePlugin, postcssPlugin];

// ─── EJS Tag Regex ────────────────────────────────────────────────────────
//
// Matches all EJS tag variants:
//   <% code %>       — scriptlet (control flow, no output)
//   <%= expr %>      — HTML-escaped output
//   <%- expr %>      — unescaped output
//   <%# comment %>   — comment (no output)
//   <%_ code %>      — whitespace-slurping scriptlet
//
// Closing variants: %>, -%>, _%>
//
const EJS_TAG_RE = /<%(?:[=\-_#])?[\s\S]*?[-_]?%>/g;

// ─── Standalone detection ─────────────────────────────────────────────────
//
// A tag is "standalone" when it is the only non-whitespace content on its line.
// Works correctly for multiline tags too — checks the first and last lines only.
//
// Examples:
//   standalone    →  "  <% if (x) { %>  "
//   not standalone →  "<p><%= name %></p>"
//
function isStandaloneLine(src, tagStart, tagLen) {
  const lineStart = src.lastIndexOf("\n", tagStart - 1) + 1;
  const lineEnd = src.indexOf("\n", tagStart + tagLen);

  const before = src.slice(lineStart, tagStart);
  const after = src.slice(tagStart + tagLen, lineEnd === -1 ? src.length : lineEnd);

  return before.trim() === "" && after.trim() === "";
}

// ─── Tag extraction ───────────────────────────────────────────────────────
//
// Replaces EJS tags with HTML-safe placeholders before passing to Prettier.
//
// Strategy:
//   Standalone (block) tags  →  HTML comment  <!-- EJSBLOCK_N -->
//     Prettier ALWAYS preserves HTML comment content verbatim — guaranteed safe.
//
//   Inline tags              →  word token    EJSINLINE_N
//     Valid in attribute values and text nodes; Prettier won't split a
//     continuous alphanumeric word token across lines.
//
function extractTags(src) {
  const tags = [];
  EJS_TAG_RE.lastIndex = 0;

  const processed = src.replace(EJS_TAG_RE, (match, offset) => {
    const idx = tags.length;
    tags.push(match);
    return isStandaloneLine(src, offset, match.length)
      ? `<!-- EJSBLOCK_${idx} -->`
      : `EJSINLINE_${idx}`;
  });

  return { processed, tags };
}

// ─── Tag restoration ──────────────────────────────────────────────────────

function restoreTags(html, tags) {
  return html
    .replace(/<!--\s*EJSBLOCK_(\d+)\s*-->/g, (_, i) => tags[+i])
    .replace(/EJSINLINE_(\d+)/g, (_, i) => tags[+i]);
}

// ─── Plugin export ────────────────────────────────────────────────────────

export const languages = [
  {
    name: "EJS",
    parsers: ["ejs"],
    extensions: [".ejs"],
    vscodeLanguageIds: ["html"],
  },
];

export const parsers = {
  ejs: {
    async parse(text, options) {
      const { processed, tags } = extractTags(text);

      // Format the placeholder-substituted content as HTML.
      // Only built-in plugins are passed — this prevents infinite recursion
      // since our own "ejs" parser is not included.
      const htmlFormatted = await prettier.format(processed, {
        parser: "html",
        plugins: BUILTIN_PLUGINS,
        printWidth: options.printWidth,
        tabWidth: options.tabWidth,
        useTabs: options.useTabs,
        htmlWhitespaceSensitivity: options.htmlWhitespaceSensitivity ?? "css",
        bracketSameLine: options.bracketSameLine,
        singleAttributePerLine: options.singleAttributePerLine,
      });

      return {
        type: "ejs-root",
        output: restoreTags(htmlFormatted, tags).trimEnd(),
        start: 0,
        end: text.length,
      };
    },
    locStart: () => 0,
    locEnd: (node) => node.end,
    astFormat: "ejs-ast",
  },
};

export const printers = {
  "ejs-ast": {
    print(path) {
      // Return the already-formatted string — Prettier appends the final newline.
      return path.getValue().output;
    },
  },
};
