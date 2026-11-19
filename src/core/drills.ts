import { soundOff } from "./sound";
import { byK, isKata, isPlain, KANA } from "../data/kana";
import { SENTENCES, signsOf, WORDS } from "../data/words";
import { isHira, TEXTS, textOf } from "../data/texts";
import type { Profile } from "./types";
import { toRomaji } from "./romaji";
import { meaningFor } from "../data/gloss-ja";
import { isJa } from "../i18n";

/** A meaning as shown: French, with the Japanese writing beside it in the Japanese interface. */
const mean = (w: string, fr: string) => meaningFor(w, fr, isJa());
import { allSolid, practiceWeight, today, weightedSample } from "./scheduler";

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
  | "combo" // きゃ, しゅ…: read a combination with a small sign
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
  // katakana
  ["シ", "ツ"], ["ソ", "ン"], ["ク", "ケ", "タ"], ["ウ", "ワ", "フ"], ["コ", "ユ", "ロ"], ["ス", "ヌ", "フ"],
  ["マ", "ム", "ア"], ["チ", "テ"], ["セ", "ヤ"], ["ヒ", "ビ"], ["ナ", "メ"], ["ル", "レ"], ["ノ", "メ"], ["エ", "ユ"],
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
/** Known signs that stand alone (small ゃ ゅ ょ っ and the bar ー only make sense attached to another sign). */
const knownPlain = (p: Profile) => knownSigns(p).filter(isPlain);
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

/** Wrong options: look-alikes first, then other known signs of the same script when there are enough. */
function distractors(k: string, all: string[], n: number, rnd: Rnd): string[] {
  const same = all.filter((x) => isKata(x) === isKata(k));
  const pool = same.length > n ? same : all;
  const near = (LOOKALIKES.find((g) => g.includes(k)) ?? []).filter((x) => x !== k && pool.includes(x));
  const rest = shuffle(pool.filter((x) => x !== k && !near.includes(x)), rnd);
  return [...shuffle(near, rnd), ...rest].slice(0, n);
}

/** What each drill needs before it can run. */
export function available(p: Profile, type: DrillType): boolean {
  const n = knownPlain(p).length;
  switch (type) {
    case "listen": return n >= 4 && !soundOff();
    case "choose": case "read": return n >= 4;
    case "match": return n >= 5;
    case "combo": return combos(p).length >= 4;
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
  const known = knownPlain(p), t = today();
  // The sign an exercise is built around: weak signs more likely, still by chance.
  const wt = (x: string) => practiceWeight(p, x, t);
  const sign = k && p.cards[k]?.seen && isPlain(k) ? k : weightedSample(known, wt, 1, rnd)[0];
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
      // Five signs with five different sounds (か and カ both read « ka »).
      const five: string[] = [];
      for (const x of weightedSample(known, wt, known.length, rnd)) if (five.length < 5 && !five.some((y) => byK[y].r === byK[x].r)) five.push(x);
      return { type, ks: five, prompt: "", pairs: five.map((x) => [x, byK[x].r]) };
    }
    case "combo": {
      const all = combos(p), c = weightedSample(all, (x) => ([...x].reduce((s, y) => s + wt(y), 0) / 2), 1, rnd)[0];
      // Wrong readings: other sounds only (きゃ and キャ both read « kya »).
      const wrong: string[] = [];
      for (const x of shuffle(all, rnd)) if (wrong.length < 3 && ![c, ...wrong].some((y) => toRomaji(y) === toRomaji(x))) wrong.push(x);
      return { type, ks: [...c], prompt: c, options: shuffle([c, ...wrong].map(toRomaji), rnd), answer: toRomaji(c), say: c };
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
      // Romaji next to the meanings only while the word's signs are still fresh.
      const bare = allSolid(p, w, today());
      const opt = (w2: string, r2: string, f2: string) => (bare ? mean(w2, f2) : `${r2} · ${mean(w2, f2)}`);
      const wrong = shuffle(ws.filter((x) => x[0] !== w && x[2] !== fr), rnd).slice(0, 3).map(([w2, r2, f2]) => opt(w2, r2, f2));
      return { type, ks: signsOf(w), prompt: w, options: shuffle([opt(w, r, fr), ...wrong], rnd), answer: opt(w, r, fr), say: w };
    }
    case "cloze": {
      const pool = [...knownWords(p).map(([w, r, fr]) => ({ w, r, fr })), ...knownSentences(p).map((s) => ({ w: s.w, r: s.r, fr: s.fr }))];
      const withK = pool.filter((x) => x.w.includes(sign));
      const it = pick(withK.length ? withK : pool, rnd);
      const idxs = [...it.w].map((c, i) => (c === " " ? -1 : i)).filter((i) => i >= 0);
      const at = [...it.w].indexOf(sign);
      const gap = at >= 0 ? at : pick(idxs, rnd);
      return { type, ks: [[...it.w][gap]], prompt: it.w, full: it.w, gap, meaning: mean(it.w, it.fr), reading: it.r, say: it.w.replace(/\s/g, "") };
    }
    case "dictation":
    case "drawword": {
      const ws = knownWords(p).filter(([w]) => type === "dictation" || w.length <= 4);
      if (!ws.length) return null;
      const withK = ws.filter(([w]) => w.includes(sign));
      const [w, r, fr] = pick(withK.length ? withK : ws, rnd);
      return { type, ks: signsOf(w), prompt: r, full: w, meaning: mean(w, fr), reading: r, say: w };
    }
    case "sentence": {
      const ss = knownSentences(p);
      const s = pick(ss, rnd);
      const wrong = shuffle(SENTENCES.filter((x) => x !== s), rnd).slice(0, 3).map((x) => mean(x.w, x.fr));
      return { type, ks: signsOf(s.w), prompt: s.w, options: shuffle([mean(s.w, s.fr), ...wrong], rnd), answer: mean(s.w, s.fr), meaning: s.r, say: s.w.replace(/\s/g, "") };
    }
    case "text": {
      const t = pick(openTexts(p), rnd);
      return { type, ks: [], prompt: textOf(t), text: t.id };
    }
  }
}

/** Combinations of a known « i » sign and a known small ゃ ゅ ょ (きゃ, しゅ, ちょ…). */
function combos(p: Profile): string[] {
  const seen = (k: string) => !!p.cards[k]?.seen;
  const of = (base: string, small: string) => [...base].filter(seen).flatMap((b) => [...small].filter(seen).map((s) => b + s));
  return [...of("きしちにひみりぎじびぴ", "ゃゅょ"), ...of("キシチニヒミリギジビピ", "ャュョ")];
}

/** Short exercises slipped into the daily lesson, between the drawings. */
export const LESSON_MIX: DrillType[] = ["choose", "listen", "read", "word", "cloze", "duel", "combo"];

/** Labels for the « S'entraîner » menu. */
/**
 * The « S'entraîner » menu: four families instead of twelve buttons. Each round of ten
 * mixes the exercise types of its family that are already possible.
 */
export const FAMILIES: { id: string; title: string; sub: string; types: DrillType[] }[] = [
  { id: "signs", title: "Reconnaître les signes", sub: "Choisir, écouter, relier, sosies, combinaisons", types: ["choose", "listen", "read", "match", "duel", "combo"] },
  { id: "words", title: "Lire des mots", sub: "Le sens d'un mot, le signe qui manque", types: ["word", "cloze"] },
  { id: "spell", title: "Écrire des mots", sub: "Dictée au clavier ou à la main", types: ["dictation", "drawword"] },
  { id: "texts", title: "Phrases et textes", sub: "Proverbes, panneaux, menus, stèles", types: ["sentence", "text"] },
];
export const familyTypes = (p: Profile, id: string): DrillType[] => (FAMILIES.find((f) => f.id === id)?.types ?? []).filter((t) => available(p, t));
