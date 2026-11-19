import { it, expect, describe } from "vitest";
import { decodeSnapshot, encodeSnapshot, historyCSV, snapshot } from "../src/core/stats";
import { freshProfile } from "../src/core/scheduler";

describe("progress stats", () => {
  const t = 20776;
  const p = freshProfile();
  p.cards["あ"] = { seen: true, ease: 2.5, interval: 8, reps: 3, due: t + 8 };
  p.cards["い"] = { seen: true, ease: 2.5, interval: 1, reps: 1, due: t + 1 };
  p.days = { [t - 1]: { nw: 2, rv: 5, ex: 4, sec: 600, ko: 1 }, [t]: { nw: 0, rv: 3, sec: 95 } };
  p.hist = { [t]: 1.9 };
  it("snapshot fits in a link and comes back intact, names with accents included", () => {
    const s = snapshot(p, "Amandine 🍡 é", t);
    expect(s.h).toEqual([2, 1, expect.any(Number)]);
    expect(s.d).toEqual([[t - 1, 2, 5, 4, 10, 1], [t, 0, 3, 0, 1.6, 0]]);
    const code = encodeSnapshot(s);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(600);
    expect(decodeSnapshot(code)).toEqual(s);
  });
  it("refuses edited or broken links", () => {
    expect(decodeSnapshot("abc")).toBeNull();
    const bad = encodeSnapshot({ ...snapshot(p, "X", t), h: [1, 2] as never });
    expect(decodeSnapshot(bad)).toBeNull();
  });
  it("exports one CSV line per day, French style", () => {
    const csv = historyCSV(p).trim().split("\n");
    expect(csv[0]).toContain("minutes actives");
    expect(csv).toHaveLength(3);
    expect(csv[1]).toBe("2026-11-18;2;5;0;4;10;1;;");
    expect(csv[2]).toBe("2026-11-19;0;3;0;0;1,6;0;1,9;");
  });
});
