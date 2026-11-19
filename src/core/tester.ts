import { KANA, LINES } from "../data/kana";
import { WORDS } from "../data/words";
import type { Profile } from "./types";

/**
 * The testers' profile: set up so that in ten minutes a tester sees every kind of screen,
 * not just the first three hiragana.
 * - All lines open; hiragana and most katakana count as known, a handful due today, so the
 *   lesson has some writing from memory with the automatic check.
 * - The カ line stays new: the lesson also shows how a new sign is taught (4 steps).
 * - A few words are due today; every exercise family is available.
 */
export const TESTER = "テスター";
const NEW_LINE = "KA";
const DUE_TODAY = ["あ", "き", "ぬ", "ふ", "ぱ", "ゃ", "シ", "ソ"];

export function setupTester(p: Profile, t: number): void {
  p.tester = true;
  p.unlocked = LINES.length;
  p.settings = { ...p.settings, newPerDay: 3, revCap: DUE_TODAY.length, wordsPerDay: 1 };
  KANA.forEach((k, i) => {
    if (k.l === NEW_LINE) return;
    const due = DUE_TODAY.includes(k.k) ? t : t + 3 + (i % 20);
    p.cards[k.k] = { seen: true, ease: 2.5, interval: 3, reps: 2, due };
  });
  // A few everyday words to review today, in each script.
  const pick = ["でんしゃ", "ありがとう", "コーヒー"].filter((w) => WORDS.some((x) => x[0] === w));
  p.words = Object.fromEntries(pick.map((w) => [w, { seen: true, ease: 2.5, interval: 1, reps: 1, due: t }]));
}
