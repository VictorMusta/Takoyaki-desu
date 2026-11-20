import { byK, isKata, KANA, sound } from "../data/kana";
import { WORDS } from "../data/words";
import { meaningFor } from "../data/gloss-ja";
import { isJa } from "../i18n";
import { LOOKALIKES, shuffle, type Rnd } from "./drills";
import { fromBits, wordKnown, type Snapshot } from "./stats";
import type { Profile } from "./types";

/**
 * Face-to-face duel on one phone: what two players know in common, the questions, and the
 * history between two players (kept on this phone). Pure, except the history (localStorage).
 */

/** What one player knows: signs seen and words known. */
export interface Knowledge {
  name: string;
  signs: Set<string>;
  words: Set<string>;
}

export const knowledgeOf = (p: Profile, name: string): Knowledge => ({
  name,
  signs: new Set(KANA.filter((k) => p.cards[k.k]?.seen).map((k) => k.k)),
  words: new Set(WORDS.filter(([w]) => wordKnown(p, w)).map(([w]) => w)),
});

/** From a comparison link (null if the link is too old to say which signs). */
export function knowledgeFromSnapshot(s: Snapshot): Knowledge | null {
  if (!s.ks) return null;
  const sg = fromBits(s.ks, KANA.length), wd = s.ws ? fromBits(s.ws, WORDS.length) : [];
  return { name: s.n, signs: new Set(KANA.filter((_, i) => sg[i]).map((k) => k.k)), words: new Set(WORDS.filter((_, i) => wd[i]).map(([w]) => w)) };
}

export interface Common {
  /** Standalone signs both have seen (no small ゃ, no ー). */
  signs: string[];
  words: [string, string, string][];
}

export function common(a: Knowledge, b: Knowledge): Common {
  const signs = [...a.signs].filter((k) => b.signs.has(k) && !byK[k]?.small && k !== "ー");
  const words = WORDS.filter(([w]) => a.words.has(w) && b.words.has(w));
  return { signs, words };
}

export type Game = "rapide" | "lecture" | "mot" | "oreille" | "sosie";
export const GAME_NAMES: Record<Game, string> = {
  rapide: "Le plus rapide",
  lecture: "Lecture",
  mot: "Le bon mot",
  oreille: "À l'oreille",
  sosie: "Les sosies",
};

export interface Round {
  game: Game;
  /** What both players see (text). */
  prompt: string;
  /** How the prompt is shown: a big sign, romaji, or a French meaning. */
  promptKind: "kana" | "romaji" | "meaning" | "sound";
  options: string[];
  /** Options are kana (big font) or romaji. */
  kanaOptions: boolean;
  answer: string;
  say?: string;
}

/** The games playable with what the two have in common. */
export function playable(c: Common, sound: boolean): Game[] {
  const g: Game[] = [];
  if (c.signs.length >= 4) g.push("rapide", "lecture");
  if (c.words.length >= 4) g.push("mot");
  if (sound && c.signs.length >= 4) g.push("oreille");
  if (LOOKALIKES.some((grp) => grp.filter((k) => c.signs.includes(k)).length >= 2) && c.signs.length >= 4) g.push("sosie");
  return g;
}

const pick = <T>(xs: T[], rnd: Rnd) => xs[Math.floor(rnd() * xs.length)];

/** Three other signs, of the same script when possible, all reading differently. */
function others(c: Common, k: string, n: number, rnd: Rnd): string[] {
  const same = c.signs.filter((x) => x !== k && isKata(x) === isKata(k) && byK[x].r !== byK[k].r);
  const pool = same.length >= n ? same : c.signs.filter((x) => x !== k && byK[x].r !== byK[k].r);
  const out: string[] = [];
  for (const x of shuffle(pool, rnd)) if (out.length < n && !out.some((y) => byK[y].r === byK[x].r)) out.push(x);
  return out;
}

export function makeRound(c: Common, game: Game, rnd: Rnd = Math.random): Round {
  switch (game) {
    case "rapide": {
      const k = pick(c.signs, rnd);
      return { game, prompt: sound(k), promptKind: "romaji", options: shuffle([k, ...others(c, k, 3, rnd)], rnd), kanaOptions: true, answer: k };
    }
    case "lecture": {
      const k = pick(c.signs, rnd);
      return { game, prompt: k, promptKind: "kana", options: shuffle([k, ...others(c, k, 3, rnd)], rnd).map((x) => byK[x].r), kanaOptions: false, answer: byK[k].r };
    }
    case "oreille": {
      const k = pick(c.signs, rnd);
      return { game, prompt: "", promptKind: "sound", options: shuffle([k, ...others(c, k, 3, rnd)], rnd), kanaOptions: true, answer: k, say: k };
    }
    case "mot": {
      const [w, , fr] = pick(c.words, rnd);
      const wrong = shuffle(c.words.filter((x) => x[0] !== w && x[2] !== fr), rnd).slice(0, 3).map((x) => x[0]);
      return { game, prompt: meaningFor(w, fr, isJa()), promptKind: "meaning", options: shuffle([w, ...wrong], rnd), kanaOptions: true, answer: w, say: w };
    }
    case "sosie": {
      const groups = LOOKALIKES.map((g) => g.filter((k) => c.signs.includes(k))).filter((g) => g.length >= 2);
      const g = pick(groups, rnd), k = pick(g, rnd);
      const fill = others(c, k, 3, rnd).filter((x) => !g.includes(x));
      const opts = [...g, ...fill].slice(0, 4);
      return { game, prompt: sound(k), promptKind: "romaji", options: shuffle(opts, rnd), kanaOptions: true, answer: k };
    }
  }
}

/** Ten rounds, games mixed, never the same question twice in a row. */
export function makeMatch(c: Common, games: Game[], n = 10, rnd: Rnd = Math.random): Round[] {
  const out: Round[] = [];
  for (let i = 0; i < n; i++) {
    let r: Round;
    let tries = 0;
    do r = makeRound(c, pick(games, rnd), rnd);
    while (tries++ < 6 && out.some((x) => x.game === r.game && x.answer === r.answer));
    out.push(r);
  }
  return out;
}

/* ---------- history, on this phone ---------- */

export interface Match {
  at: number;
  /** The two names, and their points, in the same order. */
  names: [string, string];
  score: [number, number];
  /** Rounds won per game: [first, second]. */
  games: Partial<Record<Game, [number, number]>>;
}

const KEY = "takoyaki-f2f";
export const MAX_MATCHES = 300;

export function matches(): Match[] {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Match[];
    return Array.isArray(m) ? m : [];
  } catch {
    return [];
  }
}

export function saveMatch(m: Match): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...matches(), m].slice(-MAX_MATCHES)));
  } catch {
    /* full or private: the match is just not kept */
  }
}

const pairKey = (a: string, b: string) => [a, b].sort().join("\u0000");

export interface PairStats {
  names: [string, string];
  played: number;
  /** Matches won (draws counted apart). */
  won: [number, number];
  draws: number;
  /** Per game: rounds won by each. */
  games: Partial<Record<Game, [number, number]>>;
  last: Match[];
}

/** Everything played between two people, oldest first. */
export function pairs(all: Match[] = matches()): PairStats[] {
  const by = new Map<string, PairStats>();
  for (const m of all) {
    const key = pairKey(...m.names);
    const names = [...m.names].sort() as [string, string];
    const st = by.get(key) ?? { names, played: 0, won: [0, 0] as [number, number], draws: 0, games: {}, last: [] };
    const flip = m.names[0] !== names[0];
    const sc: [number, number] = flip ? [m.score[1], m.score[0]] : m.score;
    st.played++;
    if (sc[0] > sc[1]) st.won[0]++;
    else if (sc[1] > sc[0]) st.won[1]++;
    else st.draws++;
    for (const [g, v] of Object.entries(m.games) as [Game, [number, number]][]) {
      const t = (st.games[g] ??= [0, 0]);
      t[0] += flip ? v[1] : v[0];
      t[1] += flip ? v[0] : v[1];
    }
    st.last.push(m);
    by.set(key, st);
  }
  return [...by.values()];
}
