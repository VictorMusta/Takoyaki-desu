import { describe, expect, it } from "vitest";
import { KANA } from "../src/data/kana";
import { SENTENCES, signsOf, WORDS } from "../src/data/words";
import { available, drillKey, FAMILIES, freshDrill, knownWords, makeDrill, openTexts, type DrillType } from "../src/core/drills";
import { freshProfile, newCard } from "../src/core/scheduler";
import type { Profile } from "../src/core/types";

const BASE = new Set(KANA.map((k) => k.k));
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function knowing(signs: string): Profile {
  const p = freshProfile();
  [...signs].forEach((k) => (p.cards[k] = { ...newCard(), seen: true, interval: 3, reps: 2, due: 99999 }));
  return p;
}
const ALL = KANA.map((k) => k.k).join("");

describe("exercise content", () => {
  it("words and sentences only use signs the app teaches", () => {
    WORDS.forEach(([w]) => expect([...w].every((c) => BASE.has(c)), w).toBe(true));
    SENTENCES.forEach((s) => expect(signsOf(s.w).every((c) => BASE.has(c)), s.w).toBe(true));
  });
});

const MODES = FAMILIES.flatMap((f) => f.types.map((type) => ({ type })));

describe("drills only use what the learner knows", () => {
  it("nothing opens before a few signs are known", () => {
    const p = knowing("あい");
    MODES.forEach((m) => expect(available(p, m.type)).toBe(false));
  });

  it("every drill type builds, with the answer among the options, from known signs", () => {
    const p = knowing("あいうえおかきくけこさしすせそ");
    const known = new Set([..."あいうえおかきくけこさしすせそ"]);
    for (const m of MODES) {
      if (!available(p, m.type)) continue;
      for (let i = 0; i < 30; i++) {
        const d = makeDrill(p, m.type, undefined, rnd)!;
        expect(d, m.type).not.toBeNull();
        if (d.options) {
          expect(d.options).toContain(d.answer);
          expect(new Set(d.options).size).toBe(d.options.length);
        }
        if (["choose", "listen", "duel"].includes(d.type)) d.options!.forEach((o) => expect(known.has(o)).toBe(true));
        if (d.full && !d.full.includes("|")) signsOf(d.full).forEach((c) => expect(known.has(c), d.full).toBe(true));
        d.ks.forEach((k) => expect(known.has(k)).toBe(true));
      }
    }
  });

  it("words follow the signs learnt; real texts open with half their hiragana", () => {
    expect(knownWords(knowing("いぬ")).map(([w]) => w)).toEqual(["いぬ"]);
    expect(openTexts(knowing("")).length).toBe(0);
    expect(openTexts(knowing(ALL)).length).toBeGreaterThan(10);
  });
});

import { MNEMO } from "../src/data/mnemonics";
describe("mnemonics", () => {
  it("every sign has one", () => {
    KANA.forEach((k) => expect(MNEMO[k.k], k.k).toBeTruthy());
  });
});

describe("a round never repeats an exercise", () => {
  it("few signs known: no twin, another game rather than the same example again", () => {
    const p = knowing("あいうえおかきくけこ");
    const types: DrillType[] = ["choose", "read", "word", "cloze", "duel"];
    const used = new Set<string>(), keys: string[] = [];
    let last: DrillType | undefined;
    for (let i = 0; i < 30; i++) {
      const d = freshDrill(p, types, used, last, undefined, rnd);
      if (!d) break;
      keys.push(drillKey(d));
      last = d.type;
    }
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(5);
  });
});

import { PHRASES, readingsOf, tilesOf } from "../src/data/phrases";
import { nextToLearn } from "../src/core/vocab";
describe("travel words and phrases", () => {
  it("phrases: kana the app teaches, one reading per block", () => {
    PHRASES.forEach((x) => {
      expect(tilesOf(x).length, x.w).toBe(readingsOf(x).length);
      expect(signsOf(x.w.replace(/\|/g, "")).every((c) => BASE.has(c)), x.w).toBe(true);
    });
  });
  it("« Apprendre 5 mots »: travel words and phrases first, phrases even with few signs", () => {
    const few = nextToLearn(knowing("あいうえお"), 5);
    expect(few.length).toBe(5);
    expect(few.filter((k) => k.includes("|")).length).toBeGreaterThan(0);
    const many = nextToLearn(knowing(ALL), 6);
    expect(many).toContain("はい");
    expect(many.some((k) => k.includes("|"))).toBe(true);
  });
  it("word games: the right word is among the options, the typo is a real look-alike, blocks fit", () => {
    const p = knowing(ALL);
    PHRASES.slice(0, 5).forEach((x) => (p.words = { ...(p.words ?? {}), [x.w]: { ...newCard(), seen: true } }));
    for (let i = 0; i < 40; i++) {
      const pw = makeDrill(p, "pickword", undefined, rnd)!;
      expect(pw.options).toContain(pw.answer);
      const ty = makeDrill(p, "typo", undefined, rnd)!;
      expect(ty.tiles!.join("")).not.toBe(ty.full);
      expect(ty.tiles!.filter((c, j) => c !== [...ty.full!][j]).length).toBe(1);
      const or = makeDrill(p, "order", undefined, rnd)!;
      expect(or.tiles!.length).toBe(or.readings!.length);
      const gp = makeDrill(p, "gap", undefined, rnd)!;
      expect(gp.options).toContain(gp.tiles![gp.gap!]);
      expect(new Set(gp.options).size).toBe(4);
    }
  });
});
