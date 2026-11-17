import raw from "./kana.json";

/** One hiragana: the glyph, its romaji, its line of the table and its strokes in writing order. */
export interface Kana {
  k: string;
  r: string;
  l: string;
  /** SVG path data per stroke, in a 109 × 109 box (KanjiVG). */
  s: string[];
}

export const KANA = raw as Kana[];

/** Lines of the hiragana table, in teaching order. */
export const LINES = ["a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa"] as const;

export const byK: Record<string, Kana> = Object.fromEntries(KANA.map((k) => [k.k, k]));

export function lineCards(i: number): Kana[] {
  return KANA.filter((k) => k.l === LINES[i]);
}

export function lineIndex(k: Kana): number {
  return LINES.indexOf(k.l as (typeof LINES)[number]);
}
