// Lists every piece of French text the interface can show, as patterns where {0}, {1}… stand
// for the values inserted at run time. Output: src/i18n/strings.json, checked by tests/i18n.test.ts
// (every string needs a translation in src/i18n/ja.ts).
// Usage: node scripts/i18n_extract.mjs
import ts from "typescript";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
// Learning content stays as it is (kana, words, mnemonics, real texts); the interface is translated.
const SKIP = /\/(data\/(words|examples|mnemonics|texts|font-chars|changelog|gloss-ja)|i18n\/)|\.d\.ts$/;
// Code that happens to look like words: selectors, CSS, API names, locales.
const IGNORE = new Set(["AbortError", "NFD", "UTC", "fr-FR", "ja-JP", "Escape", "Enter", "kyōkasho", "KanjiVG", "OK", "btn sm quit", "verdict ok", "no share", "primary big", "bold 20px system-ui", "var(--beni)", "github.com/VictorMusta/Takoyaki-desu", "Missing element {0}", "class=\"cal-t\"", "Takoyaki desu", "Mincho", "KA", "2-digit", "nav a"]);
// Mail subjects and bodies sent to the author: they stay in French, he reads them.
const AUTHOR_ONLY = /^Takoyaki desu [:·] |^Bonjour, \(Ce qui vous plaît/;
const files = [...walk(join(ROOT, "src"))].filter((f) => f.endsWith(".ts") && !SKIP.test(f));

const FRENCH = /[A-Za-zÀ-ÿ]{2,}/;
const looksCode = (s) =>
  /^[#.\[]|^--|^[a-z]+(-[a-z]+)+$|^[a-z]+[A-Z]|^\w+\/\w+|https?:|^[a-z]+:\S|[{};]|^\s*$|^[a-z]+$|^\(?[a-z]+\)?$/.test(s.trim()) ||
  /^(text|application|image)\//.test(s);

// Single lowercase French words shown on their own.
const WORDS_FR = new Set(["allongement", "imprimé", "révision", "révisions", "activité", "août"]);
const out = new Map();
function addSegment(seg, file) {
  const t = seg.replace(/\s+/g, " ").trim();
  if (AUTHOR_ONLY.test(t)) return;
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(t.replace(/[ー]/g, "")) && !/[a-zà-ÿ]{3,}/.test(t)) return; // already Japanese
  if (IGNORE.has(t) || /^takoyaki-|^_|^[:.#(\[]|^[a-z-]+\[|^[a-z0-9]+(, [a-z0-9]+)+$|px "|^rgba\(|^class=|^abcé|^たこ焼きです蛸|cubic-bezier|stroke-line|prefers-reduced|theme-color|^input\[|^\.tiles|^:scope/.test(t)) return;
  if (!FRENCH.test(t.replace(/\{\d+\}/g, ""))) return;
  // One lowercase word: keep it only if it is French (accents, or listed), not an identifier.
  if (!/\s/.test(t) && /^[a-z]+$/.test(t) && !WORDS_FR.has(t)) return;
  if (looksCode(t) && !/\s/.test(t.replace(/\{\d+\}/g, "").trim()) && !/[À-ÿ]/.test(t) && !WORDS_FR.has(t)) return;
  // renumber placeholders from 0 in reading order
  let k = 0;
  const m = new Map();
  const norm = t.replace(/\{(\d+)\}/g, (_, n) => `{${m.has(n) ? m.get(n) : (m.set(n, k), k++)}}`);
  if (!out.has(norm)) out.set(norm, new Set());
  out.get(norm).add(file.replace(ROOT, ""));
}

/** Splits a template (with \u0001n\u0001 holes) into visible text segments and attribute values. */
function harvest(text, file) {
  const withPh = text.replace(/\u0001(\d+)\u0001/g, "{$1}");
  // attribute values people see or hear
  for (const a of withPh.matchAll(/(?:aria-label|placeholder|title|alt)="([^"]*)"/g)) addSegment(a[1], file);
  // visible text between tags
  const noTags = withPh.replace(/<[^>]*>/g, "\u0002");
  for (const seg of noTags.split("\u0002")) addSegment(seg, file);
}

for (const f of files) {
  const src = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      // skip property keys, element access keys, comparisons with codes
      if (!(ts.isPropertyAssignment(p) && p.name === n) && !ts.isElementAccessExpression(p)) harvest(n.text, f);
    } else if (ts.isTemplateExpression(n)) {
      let text = n.head.text;
      n.templateSpans.forEach((s, i) => (text += `\u0001${i}\u0001` + s.literal.text));
      harvest(text, f);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}
// The page shell: tab names, title.
harvest(readFileSync(join(ROOT, "index.html"), "utf8").replace(/<(script|style)[\s\S]*?<\/\1>/g, ""), join(ROOT, "index.html"));
const list = [...out.entries()].map(([s, fs]) => ({ s, files: [...fs].sort() })).sort((a, b) => a.files[0].localeCompare(b.files[0]) || a.s.localeCompare(b.s));
const file = join(ROOT, "src/i18n/strings.json");
const text = JSON.stringify(list, null, 1) + "\n";
if (process.argv.includes("--check")) {
  // In tests: the list must match the code, so a new French text can't slip through untranslated.
  if (readFileSync(file, "utf8") !== text) {
    console.error("src/i18n/strings.json is out of date: run « node scripts/i18n_extract.mjs », then translate the new strings in src/i18n/ja.ts.");
    process.exit(1);
  }
} else {
  writeFileSync(file, text);
  console.log(list.length, "strings");
}
