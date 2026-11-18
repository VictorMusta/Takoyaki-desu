import { toRomaji } from "./romaji";
import { signsOf, WORDS, type Word } from "../data/words";
import { applyGrade, cardMastery, dayRec, newCard } from "./scheduler";
import type { Card, Grade, Profile, QueueItem } from "./types";

/**
 * Vocabulary track: a word opens once all its signs have been seen, then has its own
 * review dates, like a sign. Knowing a word means knowing its meaning, not only reading it.
 */
export const WORDS_PER_DAY = 3;
const WORD_REV_CAP = 30;

export const wordOf = (w: string): Word | undefined => WORDS.find((x) => x[0] === w);
export const wordCard = (p: Profile, w: string): Card => ((p.words ??= {})[w] ??= newCard());

/** Words whose signs have all been seen, in the bank's order (simple words first). */
export function openWords(p: Profile): Word[] {
  return WORDS.filter(([w]) => signsOf(w).every((c) => p.cards[c]?.seen));
}

/** Today's words: due reviews first, then new words up to the daily quota. */
export function buildWordQueue(p: Profile, t: number): QueueItem[] {
  const d = dayRec(p, t), open = openWords(p);
  const due = open
    .filter(([w]) => p.words?.[w]?.seen && (p.words[w].due ?? Infinity) <= t)
    .sort(([a], [b]) => (p.words![a].due ?? 0) - (p.words![b].due ?? 0))
    .slice(0, WORD_REV_CAP)
    .map(([w]): QueueItem => ({ k: w, isNew: false, word: true }));
  const quota = Math.max(0, (p.settings.wordsPerDay ?? WORDS_PER_DAY) - (d.nwW ?? 0));
  const fresh = open
    .filter(([w]) => !p.words?.[w]?.seen)
    .slice(0, quota)
    .map(([w]): QueueItem => ({ k: w, isNew: true, word: true }));
  return [...due, ...fresh];
}

export function gradeWord(p: Profile, w: string, g: Grade, t: number, isNew: boolean): void {
  const c = wordCard(p, w);
  if (isNew && !c.seen) {
    const d = dayRec(p, t);
    d.nwW = (d.nwW ?? 0) + 1;
  }
  applyGrade(c, g, t);
}

export const wordMastery = (p: Profile, w: string, t: number) => cardMastery(p.words?.[w], t);

/** Words whose meaning is known: seen and holding at least a day. */
export const knownWordCount = (p: Profile) => Object.values(p.words ?? {}).filter((c) => c.seen && c.interval >= 1).length;

/* ---------- romaji answers ---------- */

/** The reading built sign by sign (ひこうき → hikouki, きって → kitte), accepted next to the bank's Hepburn. */
export const kanaRomaji = (w: string) => toRomaji(w);

/** Lower case, no spaces, accents or marks (ō → o), common spellings unified (si→shi, tu→tsu…). */
export function normRomaji(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "")
    .replace(/si/g, "shi").replace(/ti/g, "chi").replace(/tu/g, "tsu").replace(/hu/g, "fu")
    .replace(/shhi/g, "shi").replace(/cchi/g, "chi").replace(/tssu/g, "tsu");
}

/** Accepts the bank's Hepburn (macrons or not) and the sign-by-sign reading. */
export function romajiOk(answer: string, w: string, hepburn: string): boolean {
  const a = normRomaji(answer);
  if (!a) return false;
  const plain = hepburn.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return [hepburn, plain, kanaRomaji(w)].some((x) => normRomaji(x) === a);
}
