import { byK, KANA } from "../data/kana";
import { SENTENCES, signsOf, WORDS } from "../data/words";
import { isHira, TEXTS, textOf } from "../data/texts";
import type { Profile } from "./types";

/**
 * Exercises other than drawing. A drill is plain data (saved with the lesson so it resumes),
 * built only from signs the learner has already seen.
 */
export type DrillType =
  | "choose" // romaji → pick the sign
  | "listen" // sound → pick the sign
  | "read" // sign → pick the romaji
  | "match" // 5 signs ↔ 5 romaji
  | "duel" // two look-alikes
  | "word" // word in kana → pick « romaji · meaning »
  | "cloze" // word or sentence with a gap → type the missing sign
  | "dictation" // meaning + sound → type the word
  | "drawword" // meaning + sound → draw the word sign by sign
  | "sentence" // sentence or proverb → pick the meaning
  | "text"; // real text in 3 scripts → guess, then read the correction

export interface Drill {
  type: DrillType;
  /** Signs being tested: a miss brings them back sooner. */
  ks: string[];
  prompt: string;
  /** Pick drills: the options and the right one. */
  options?: string[];
  answer?: string;
  /** cloze / dictation / drawword: the full expected text and, for cloze, the gap index. */
  full?: string;
  gap?: number;
  meaning?: string;
  /** Japanese reading in romaji, shown first: the French meaning is only a help. */
  reading?: string;
  /** Speech for listen / dictation (the text to say). */
  say?: string;
  /** match: pairs [sign, romaji]. */
  pairs?: [string, string][];
  /** text: id in TEXTS. */
  text?: string;
}

/** Look-alike groups, used as wrong options and for duels. */
export const LOOKALIKES: string[][] = [
  ["さ", "ち", "き"], ["ぬ", "め"], ["ね", "れ", "わ"], ["は", "ほ", "け"], ["る", "ろ"], ["あ", "お", "め"],
  ["い", "り", "こ"], ["し", "つ", "ん", "そ"], ["う", "ら", "つ"], ["ま", "も", "よ"], ["た", "な", "に"],
  ["く", "へ", "し"], ["す", "む", "お"], ["ふ", "う"], ["ゆ", "わ"],
];

type Rnd = () => number;
const pick = <T>(a: T[], rnd: Rnd): T => a[Math.floor(rnd() * a.length)];
export function shuffle<T>(a: T[], rnd: Rnd): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const knownSigns = (p: Profile): string[] => KANA.filter((k) => p.cards[k.k]?.seen).map((k) => k.k);
const knownSet = (p: Profile) => new Set(knownSigns(p));
const allKnown = (s: string, known: Set<string>) => signsOf(s).every((c) => known.has(c));

export const knownWords = (p: Profile) => {
  const known = knownSet(p);
  return WORDS.filter(([w]) => allKnown(w, known));
};
export const knownSentences = (p: Profile) => {
  const known = knownSet(p);
  return SENTENCES.filter((s) => allKnown(s.w, known));
};
/** Texts in 3 scripts open after 10 signs, once half of their hiragana are known (the rest is guessing). */
export const openTexts = (p: Profile) => {
  const known = knownSet(p);
  if (known.size < 10) return [];
  return TEXTS.filter((t) => {
    const h = [...textOf(t)].filter(isHira);
    return h.length > 0 && h.filter((c) => known.has(c)).length * 2 >= h.length;
  });
};

/** Wrong options: look-alikes first, then other known signs. */
function distractors(k: string, pool: string[], n: number, rnd: Rnd): string[] {
  const near = (LOOKALIKES.find((g) => g.includes(k)) ?? []).filter((x) => x !== k && pool.includes(x));
  const rest = shuffle(pool.filter((x) => x !== k && !near.includes(x)), rnd);
  return [...shuffle(near, rnd), ...rest].slice(0, n);
}

/** What each drill needs before it can run. */
export function available(p: Profile, type: DrillType): boolean {
  const n = knownSigns(p).length;
  switch (type) {
    case "choose": case "listen": case "read": return n >= 4;
    case "match": return n >= 5;
    case "duel": return LOOKALIKES.some((g) => g.filter((x) => p.cards[x]?.seen).length >= 2);
    case "word": return knownWords(p).length >= 4;
    case "cloze": case "dictation": case "drawword": return knownWords(p).length >= 1;
    case "sentence": return knownSentences(p).length >= 1;
    case "text": return openTexts(p).length >= 1;
  }
}

/** Builds one drill of this type around sign k (or a random known sign), or null if impossible. */
export function makeDrill(p: Profile, type: DrillType, k?: string, rnd: Rnd = Math.random): Drill | null {
  if (!available(p, type)) return null;
  const known = knownSigns(p);
  const sign = k && p.cards[k]?.seen ? k : pick(known, rnd);
  switch (type) {
    case "choose":
    case "listen": {
      const options = shuffle([sign, ...distractors(sign, known, 3, rnd)], rnd);
      return { type, ks: [sign], prompt: byK[sign].r, options, answer: sign, say: sign };
    }
    case "read": {
      const ws = distractors(sign, known, 3, rnd).map((x) => byK[x].r);
      return { type, ks: [sign], prompt: sign, options: shuffle([byK[sign].r, ...ws], rnd), answer: byK[sign].r, say: sign };
    }
    case "match": {
      const five = shuffle(known, rnd).slice(0, 5);
      return { type, ks: five, prompt: "", pairs: five.map((x) => [x, byK[x].r]) };
    }
    case "duel": {
      const groups = LOOKALIKES.map((g) => g.filter((x) => p.cards[x]?.seen)).filter((g) => g.length >= 2);
      const g = groups.find((x) => x.includes(sign)) ?? pick(groups, rnd);
      const two = shuffle(g, rnd).slice(0, 2);
      const a = pick(two, rnd);
      return { type, ks: two, prompt: byK[a].r, options: two, answer: a, say: a };
    }
    case "word": {
      const ws = knownWords(p);
      const withK = ws.filter(([w]) => w.includes(sign));
      const [w, r, fr] = pick(withK.length ? withK : ws, rnd);
      const wrong = shuffle(ws.filter((x) => x[0] !== w), rnd).slice(0, 3).map(([, r2, f2]) => `${r2} · ${f2}`);
      return { type, ks: signsOf(w), prompt: w, options: shuffle([`${r} · ${fr}`, ...wrong], rnd), answer: `${r} · ${fr}`, say: w };
    }
    case "cloze": {
      const pool = [...knownWords(p).map(([w, r, fr]) => ({ w, r, fr })), ...knownSentences(p).map((s) => ({ w: s.w, r: s.r, fr: s.fr }))];
      const withK = pool.filter((x) => x.w.includes(sign));
      const it = pick(withK.length ? withK : pool, rnd);
      const idxs = [...it.w].map((c, i) => (c === " " ? -1 : i)).filter((i) => i >= 0);
      const at = [...it.w].indexOf(sign);
      const gap = at >= 0 ? at : pick(idxs, rnd);
      return { type, ks: [[...it.w][gap]], prompt: it.w, full: it.w, gap, meaning: it.fr, reading: it.r, say: it.w.replace(/\s/g, "") };
    }
    case "dictation":
    case "drawword": {
      const ws = knownWords(p).filter(([w]) => type === "dictation" || w.length <= 4);
      if (!ws.length) return null;
      const withK = ws.filter(([w]) => w.includes(sign));
      const [w, r, fr] = pick(withK.length ? withK : ws, rnd);
      return { type, ks: signsOf(w), prompt: r, full: w, meaning: fr, reading: r, say: w };
    }
    case "sentence": {
      const ss = knownSentences(p);
      const s = pick(ss, rnd);
      const wrong = shuffle(SENTENCES.filter((x) => x !== s), rnd).slice(0, 3).map((x) => x.fr);
      return { type, ks: signsOf(s.w), prompt: s.w, options: shuffle([s.fr, ...wrong], rnd), answer: s.fr, meaning: s.r, say: s.w.replace(/\s/g, "") };
    }
    case "text": {
      const t = pick(openTexts(p), rnd);
      return { type, ks: [], prompt: textOf(t), text: t.id };
    }
  }
}

/** Short exercises slipped into the daily lesson, between the drawings. */
export const LESSON_MIX: DrillType[] = ["choose", "listen", "read", "word", "cloze", "duel"];

/** Labels for the « S'entraîner » menu. */
export const MODES: { type: DrillType; title: string; sub: string }[] = [
  { type: "choose", title: "Choisir", sub: "Une syllabe, quatre signes" },
  { type: "listen", title: "Écouter", sub: "Un son, quatre signes" },
  { type: "read", title: "Lire", sub: "Un signe, quatre syllabes" },
  { type: "match", title: "Relier", sub: "Cinq signes, cinq syllabes" },
  { type: "duel", title: "Sosies", sub: "さ ou ち ? ね, れ ou わ ?" },
  { type: "word", title: "Lire des mots", sub: "Un mot, quatre sens" },
  { type: "cloze", title: "Textes à trous", sub: "Le signe qui manque" },
  { type: "dictation", title: "Dictée au clavier", sub: "Écrire un mot entier" },
  { type: "drawword", title: "Dictée dessinée", sub: "Écrire un mot à la main" },
  { type: "sentence", title: "Phrases et proverbes", sub: "Comprendre une phrase" },
  { type: "text", title: "Textes à comprendre", sub: "Panneaux, menus, stèles, en 3 écritures" },
];
