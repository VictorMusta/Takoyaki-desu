import { JA } from "./ja";

/**
 * Interface language. The app is written in French; in Japanese, a translation layer rewrites
 * what is on screen: every text node and the attributes people see or hear (aria-label,
 * placeholder, title, alt), as soon as it appears.
 *
 * Why a layer and not t("…") calls everywhere: the French text stays the single source in the
 * code, and scripts/i18n_extract.mjs lists every piece of it (src/i18n/strings.json); a test
 * fails if one has no Japanese translation. Pieces with values inserted at run time are
 * patterns: « Séance du jour, {0} » → « {0}さんの今日のレッスン ».
 *
 * Learning content is not translated: kana, words, real texts. Word meanings stay in French,
 * with the usual Japanese writing beside them (data/gloss-ja.ts), so testers can check them.
 */

export type Lang = "fr" | "ja";
const KEY = "takoyaki-lang";

export function getLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "ja" ? "ja" : "fr";
  } catch {
    return "fr";
  }
}
export function setLang(l: Lang): void {
  try {
    if (l === "fr") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, l);
  } catch {
    /* storage unavailable: stays in French */
  }
}
export const isJa = () => getLang() === "ja";

/** ?lang=ja in the link (the testers' invitation) switches the language once and for all. */
export function langFromUrl(): void {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ja" || q === "fr") setLang(q);
}

/* ---------- matching ---------- */

interface Pattern {
  re: RegExp;
  to: string;
  weight: number;
}
let exact: Map<string, string> | null = null;
let patterns: Pattern[] = [];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(): void {
  exact = new Map();
  patterns = [];
  for (const [fr, ja] of Object.entries(JA)) {
    if (!/\{\d+\}/.test(fr)) {
      exact.set(fr, ja);
      continue;
    }
    const src = fr
      .split(/(\{\d+\})/)
      .map((part) => (/^\{\d+\}$/.test(part) ? `(?<p${part.slice(1, -1)}>[\\s\\S]*?)` : esc(part)))
      .join("");
    patterns.push({ re: new RegExp(`^${src}$`), to: ja, weight: fr.replace(/\{\d+\}/g, "").length });
  }
  // The most specific first: « {0} trait{1} au lieu de {2}. » before « {0} · {1} ».
  patterns.sort((a, b) => b.weight - a.weight);
}

/** Japanese for one piece of French text, or null when there is none. */
export function translate(text: string, depth = 0): string | null {
  if (!exact) compile();
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const hit = exact!.get(t);
  if (hit !== undefined) return hit;
  if (depth > 3) return null;
  for (const p of patterns) {
    const m = p.re.exec(t);
    if (!m?.groups) continue;
    return p.to.replace(/\{(\d+)\}/g, (_, n: string) => {
      const v = m.groups![`p${n}`] ?? "";
      return translate(v, depth + 1) ?? v;
    });
  }
  return null;
}

/* ---------- applying it to the page ---------- */

const ATTRS = ["aria-label", "placeholder", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE"]);

function translateNode(n: Node): void {
  if (n.nodeType === Node.TEXT_NODE) {
    const p = n.parentElement;
    if (!p || SKIP.has(p.tagName) || p.tagName === "TEXTAREA" || p.closest("[data-noi18n]")) return;
    const v = n.nodeValue ?? "";
    const ja = translate(v);
    if (ja !== null) {
      const lead = /^\s*/.exec(v)![0], trail = /\s*$/.exec(v)![0];
      n.nodeValue = lead + ja + trail;
    }
    return;
  }
  if (n.nodeType !== Node.ELEMENT_NODE) return;
  const e = n as Element;
  if (SKIP.has(e.tagName) || e.closest("[data-noi18n]")) return;
  // A text box: its label and placeholder are translated, never what is typed in it.
  for (const a of ATTRS) {
    const v = e.getAttribute(a);
    if (v) {
      const ja = translate(v);
      if (ja !== null) e.setAttribute(a, ja);
    }
  }
  if (e instanceof HTMLInputElement && (e.type === "button" || e.type === "submit") && e.value) {
    const ja = translate(e.value);
    if (ja !== null) e.value = ja;
  }
  if (e.tagName !== "TEXTAREA") e.childNodes.forEach(translateNode);
}

/** Starts translating the page (and everything added later) when the language is Japanese. */
export function startTranslation(): void {
  document.documentElement.lang = getLang();
  if (!isJa()) return;
  translateNode(document.body);
  const t = translate(document.title);
  if (t) document.title = t;
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "childList") r.addedNodes.forEach(translateNode);
      else if (r.type === "characterData") translateNode(r.target);
      else if (r.type === "attributes") translateNode(r.target as Element);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
