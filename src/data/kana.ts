import { isJa } from "../i18n";
import raw from "./kana.json";

/** One kana (hiragana or katakana): the glyph, its romaji, its line of the table and its strokes in writing order. */
export interface Kana {
  k: string;
  r: string;
  l: string;
  /** SVG path data per stroke, in a 109 × 109 box (KanjiVG). */
  s: string[];
  /** Small sign (ゃ ゅ ょ っ): only lives attached to the sign before it. */
  small?: boolean;
}

export const KANA = raw as Kana[];

/**
 * Lines of the tables, in teaching order. Hiragana first: the 46 base signs, then the voiced ones
 * (dakuten ゛ and handakuten ゜), then the small signs used for combinations (きゃ) and doubling (っ).
 * Then katakana, same order (ids in capitals), ending with the small signs and the long-vowel bar ー.
 */
const H_LINES = ["a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa", "ga", "za", "da", "ba", "pa", "petits"] as const;
export const LINES = [...H_LINES, ...H_LINES.map((x) => x.toUpperCase())] as readonly string[];
/** Index of the first katakana line. */
export const KATA_START = H_LINES.length;

const VOICE: Record<string, string> = { ga: " (ten-ten)", za: " (ten-ten)", da: " (ten-ten)", ba: " (ten-ten)", pa: " (maru)" };
const KANA_LINE: Record<string, string> = { a: "あ", ka: "か", sa: "さ", ta: "た", na: "な", ha: "は", ma: "ま", ya: "や", ra: "ら", wa: "わ", ga: "が", za: "ざ", da: "だ", ba: "ば", pa: "ぱ" };

/** How a line is named on screen: « ga (ten-ten) », « petits signes », « ka · katakana »; in Japanese « か行 », « ガ行（濁音） ». */
export function lineLabel(ln: string): string {
  if (isJa()) {
    const low = ln.toLowerCase(), kata = ln !== low;
    if (low === "petits") return kata ? "小さいカタカナと「ー」" : "小さいひらがな";
    const k = KANA_LINE[low] ?? low, head = kata ? String.fromCodePoint(k.codePointAt(0)! + 0x60) : k;
    return `${head}行${["ga", "za", "da", "ba"].includes(low) ? "（濁音）" : low === "pa" ? "（半濁音）" : ""}`;
  }
  const low = ln.toLowerCase(), kata = ln !== low;
  const base = low === "petits" ? (kata ? "petits signes et ー" : "petits signes") : low + (VOICE[low] ?? "");
  return kata ? `${base} · katakana` : base;
}

/** Slots per line in the classic 5-column table (gaps where the table has none). */
export const SLOTS: Record<string, (number | null)[]> = {
  ya: [0, null, 1, null, 2],
  wa: [0, null, null, 1, 2],
  petits: [0, 1, 2, 3, null],
  YA: [0, null, 1, null, 2],
  WA: [0, null, null, 1, 2],
  PETITS: [0, 1, 2, 3, 4],
};

export const byK: Record<string, Kana> = Object.fromEntries(KANA.map((k) => [k.k, k]));

export function lineCards(i: number): Kana[] {
  return KANA.filter((k) => k.l === LINES[i]);
}

export function lineIndex(k: Kana): number {
  return LINES.indexOf(k.l);
}

/** Katakana block of Unicode (ァ to ー). */
export const isKata = (k: string) => {
  const c = k.codePointAt(0) ?? 0;
  return c >= 0x30a0 && c <= 0x30ff;
};
/** The other script's twin: か ↔ カ (ー has none). */
export const twin = (k: string) => {
  const c = k.codePointAt(0) ?? 0;
  if (k === "ー") return "";
  return String.fromCodePoint(isKata(k) ? c - 0x60 : c + 0x60);
};

/** How a sign's sound is shown: « petit ya » for the small ones. */
export const sound = (k: string) => (k === "ー" ? "allongement" : byK[k]?.small ? `petit ${byK[k].r}` : byK[k]?.r ?? "");

/** Signs that can stand alone (for « choose / listen / read » exercises): not the small ones. */
export const isPlain = (k: string) => !byK[k]?.small && k !== "ー";
