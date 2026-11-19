import { toRomaji } from "./romaji";
import { signsOf, WORDS, type Word } from "../data/words";
import { PHRASES, phraseOf } from "../data/phrases";
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

/** Travel words, learnt first in « Apprendre 5 mots ». */
const TRAVEL = new Set(["はい", "いいえ", "すみません", "ありがとう", "だいじょうぶ", "こんにちは", "おはよう", "こんばんは", "おやすみ", "さようなら", "はじめまして", "わかりません",
  "いただきます", "ひとり", "ふたり", "よやく", "おかいけい", "じこくひょう", "ごはん", "みず", "トイレ", "えき", "でんしゃ", "きっぷ", "いくら", "どこ", "でぐち",
  "いりぐち", "ホテル", "レストラン", "コンビニ", "メニュー", "おいしい", "かんぱい", "じかん", "ちず", "にほんご", "えいご", "ふくろ", "おすすめ", "いりません"]);

/** Every word or phrase the learner has met (« Réviser mes mots »). */
export const learnedItems = (p: Profile): string[] => Object.keys(p.words ?? {}).filter((k) => p.words![k].seen && (wordOf(k) || phraseOf(k)));

/**
 * The next `n` things to learn on demand: travel words whose signs are known and travel
 * phrases (open at once, reading shown), taken in turn, then the other open words.
 */
export function nextToLearn(p: Profile, n: number): string[] {
  const fresh = (k: string) => !p.words?.[k]?.seen;
  const words = openWords(p).map(([w]) => w).filter(fresh);
  const travel = [...TRAVEL].filter((w) => words.includes(w)), phrases = PHRASES.map((x) => x.w).filter(fresh);
  const out: string[] = [];
  for (let i = 0; out.length < n && (i < travel.length || i < phrases.length); i++) {
    if (i < travel.length) out.push(travel[i]);
    if (out.length < n && i < phrases.length) out.push(phrases[i]);
  }
  for (const w of words) if (out.length < n && !out.includes(w)) out.push(w);
  return out;
}

/** Learnt words and phrases due today, the oldest due first. */
export function dueItems(p: Profile, t: number, cap = WORD_REV_CAP): string[] {
  return learnedItems(p)
    .filter((k) => (p.words![k].due ?? Infinity) <= t)
    .sort((a, b) => (p.words![a].due ?? 0) - (p.words![b].due ?? 0))
    .slice(0, cap);
}

/** Today's words: due reviews first, then new words up to the daily quota. */
export function buildWordQueue(p: Profile, t: number): QueueItem[] {
  const d = dayRec(p, t), open = openWords(p);
  // Reviews: words and phrases learnt (phrases come from « Apprendre 5 mots »).
  const due = dueItems(p, t).map((k): QueueItem => ({ k, isNew: false, word: true }));
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
