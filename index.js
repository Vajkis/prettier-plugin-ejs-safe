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

// ─── ignoreTags resolution ──────────────────────────────────────────────────
//
// EJS templates are often split into a "head" partial that opens shell tags
// (<html>, <body>, ...) and a "foot" partial that closes them. Each partial is
// invalid HTML on its own, which makes Prettier's HTML parser either insert
// the missing closing tag (unclosed open tag) or throw a parse error
// (closing tag with no matching open). `ignoreTags` lets specific tag names
// bypass the HTML parser entirely so neither happens.
//
// Matches any opening/closing tag for a given tag name, e.g. for "html":
// <html>, <html lang="en">, </html>. Built fresh per resolved tag list.
function buildTagNameRegex(names) {
  const alternation = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`<\\/?(?:${alternation})\\b[^>]*>`, "gi");
}

// Matches any HTML tag at all — used for ignoreTags: ["all"].
const IGNORE_ALL_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/g;

function resolveIgnoreTagRegex(ignoreTags) {
  const list = Array.isArray(ignoreTags) ? ignoreTags : [];
  if (list.includes("all")) return IGNORE_ALL_TAG_RE;
  const names = list.filter((name) => name !== "none");
  return names.length === 0 ? null : buildTagNameRegex(names);
}

// Void elements never get a closing tag, so they must not affect virtual depth
// even when ignoreTags matches them by name (e.g. ignoreTags: ["all"]).
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

// Classifies a single ignored-tag match for virtual-depth tracking:
//   "close"   — </tag>, decreases depth
//   "open"    — <tag>, increases depth
//   "neutral" — self-closed (<tag/>) or a known void element — no depth change
function classifyIgnoredTag(matchText) {
  if (matchText.startsWith("</")) return "close";
  if (/\/\s*>$/.test(matchText)) return "neutral";
  const name = /^<\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(matchText)?.[1].toLowerCase();
  return VOID_ELEMENTS.has(name) ? "neutral" : "open";
}

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
// `ignoreTagRe`, when given, is applied as a second pass over the same text
// using the same placeholder scheme — this is how `ignoreTags` keeps specific
// HTML tags (e.g. unclosed <html>/<body> in a head/foot partial) out of the
// HTML parser's reach entirely.
//
// `onMatch`, when given, is called for every match with its placeholder index
// and whether it landed as a standalone block — used to classify ignored tags
// for virtual-depth tracking (see applyVirtualIndent).
function extractWithPattern(src, re, tags, onMatch) {
  if (!re) return src;
  re.lastIndex = 0;
  return src.replace(re, (match, offset) => {
    const idx = tags.length;
    tags.push(match);
    const standalone = isStandaloneLine(src, offset, match.length);
    onMatch?.(idx, match, standalone);
    return standalone ? `<!-- EJSBLOCK_${idx} -->` : `EJSINLINE_${idx}`;
  });
}

function extractTags(src, ignoreTagRe) {
  const tags = [];
  const tagKinds = new Map();
  const afterEjs = extractWithPattern(src, EJS_TAG_RE, tags);
  const processed = extractWithPattern(afterEjs, ignoreTagRe, tags, (idx, match, standalone) => {
    if (standalone) tagKinds.set(idx, classifyIgnoredTag(match));
  });
  return { processed, tags, tagKinds };
}

// ─── Virtual indentation for ignored tags ──────────────────────────────────
//
// Ignored tags are invisible to the HTML parser, so content that would
// normally be their children comes back as root-level siblings — flush left.
// This restores the indentation those children would have had, by replaying
// the open/close sequence of ignored tags as a depth counter over the
// formatted output (operating on placeholders, before restoreTags runs).
//
// A head/foot split starts mid-sequence (e.g. a foot file is pure closes with
// no matching opens in that file), so depth can go negative; shifting
// everything up by the lowest depth reached keeps indentation non-negative
// without needing any cross-file information.
const BLOCK_PLACEHOLDER_RE = /^<!--\s*EJSBLOCK_(\d+)\s*-->$/;

function applyVirtualIndent(html, tagKinds, indentUnit) {
  if (tagKinds.size === 0) return html;

  const lines = html.split("\n");
  const lineDepths = new Array(lines.length);
  let depth = 0;
  let minDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const kind = tagKinds.get(+BLOCK_PLACEHOLDER_RE.exec(lines[i].trim())?.[1]);
    if (kind === "close") depth -= 1;
    lineDepths[i] = depth;
    if (depth < minDepth) minDepth = depth;
    if (kind === "open") depth += 1;
  }

  const baseline = -minDepth;
  return lines
    .map((line, i) => {
      const finalDepth = lineDepths[i] + baseline;
      return finalDepth > 0 && line.trim() !== "" ? indentUnit.repeat(finalDepth) + line : line;
    })
    .join("\n");
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

export const options = {
  ignoreTags: {
    type: "string",
    array: true,
    category: "EJS",
    default: [{ value: ["none"] }],
    description:
      'Tag names left completely untouched by the HTML parser — not auto-closed, not validated. Use ["none"] (default), ["all"], or a list like ["html", "body"]. Needed for EJS head/foot partials where shell tags are opened in one file and closed in another.',
  },
};

export const parsers = {
  ejs: {
    async parse(text, options) {
      const ignoreTagRe = resolveIgnoreTagRegex(options.ignoreTags);
      const { processed, tags, tagKinds } = extractTags(text, ignoreTagRe);

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

      const indentUnit = options.useTabs ? "\t" : " ".repeat(options.tabWidth ?? 2);
      const indented = applyVirtualIndent(htmlFormatted, tagKinds, indentUnit);

      return {
        type: "ejs-root",
        output: restoreTags(indented, tags).trimEnd(),
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
