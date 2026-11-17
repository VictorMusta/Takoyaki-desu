import { describe, expect, it } from "vitest";
import { KANA, LINES } from "../src/data/kana";
import { enableFluent, revertFluent } from "../src/core/fluent";
import { freshProfile, newCard } from "../src/core/scheduler";

const T = 20000;

describe("je parle déjà japonais", () => {
  it("opens every line and marks every sign as known, keeping what was learnt", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 3, reps: 2, due: T + 1 };
    enableFluent(p, T);
    expect(p.unlocked).toBe(LINES.length);
    expect(KANA.every((k) => p.cards[k.k].seen)).toBe(true);
    expect(p.cards["あ"].interval).toBe(3);
    expect(p.cards["ん"].due).toBeGreaterThan(T + 6);
  });

  it("« J'ai menti » restores the profile exactly as before", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 3, reps: 2, due: T + 1 };
    p.settings.newPerDay = 15;
    const before = JSON.parse(JSON.stringify(p));
    enableFluent(p, T);
    p.exams.push({ d: T, r: [{ k: "か", ok: true }] });
    revertFluent(p);
    expect(p).toEqual(before);
    expect(p.fluent).toBeUndefined();
  });
});
