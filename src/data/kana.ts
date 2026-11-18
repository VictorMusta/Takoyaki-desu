import raw from "./kana.json";

/** One hiragana: the glyph, its romaji, its line of the table and its strokes in writing order. */
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
 * Lines of the hiragana table, in teaching order: the 46 base signs, then the voiced ones
 * (dakuten ゛ and handakuten ゜), then the small signs used for combinations (きゃ) and doubling (っ).
 */
export const LINES = ["a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa", "ga", "za", "da", "ba", "pa", "petits"] as const;

/** How a line is named on screen. */
export const LINE_LABEL: Record<string, string> = {
  ga: "ga (ten-ten)", za: "za (ten-ten)", da: "da (ten-ten)", ba: "ba (ten-ten)", pa: "pa (maru)", petits: "petits signes",
};
export const lineLabel = (ln: string) => LINE_LABEL[ln] ?? ln;

/** Slots per line in the classic 5-column table (gaps where the table has none). */
export const SLOTS: Record<string, (number | null)[]> = {
  ya: [0, null, 1, null, 2],
  wa: [0, null, null, 1, 2],
  petits: [0, 1, 2, 3, null],
};

export const byK: Record<string, Kana> = Object.fromEntries(KANA.map((k) => [k.k, k]));

export function lineCards(i: number): Kana[] {
  return KANA.filter((k) => k.l === LINES[i]);
}

export function lineIndex(k: Kana): number {
  return LINES.indexOf(k.l as (typeof LINES)[number]);
}

/** How a sign's sound is shown: « petit ya » for the small ones. */
export const sound = (k: string) => (byK[k]?.small ? `petit ${byK[k].r}` : byK[k]?.r ?? "");

/** Signs that can stand alone (for « choose / listen / read » exercises): not the small ones. */
export const isPlain = (k: string) => !byK[k]?.small;
