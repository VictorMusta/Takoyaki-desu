import { describe, expect, it } from "vitest";
import { KANA } from "../src/data/kana";
import { SENTENCES, signsOf, WORDS } from "../src/data/words";
import { available, FAMILIES, knownWords, makeDrill, openTexts } from "../src/core/drills";
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
        if (d.full) signsOf(d.full).forEach((c) => expect(known.has(c), d.full).toBe(true));
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
