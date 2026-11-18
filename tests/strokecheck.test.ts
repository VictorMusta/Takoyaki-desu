import { describe, it, expect } from "vitest";
import { checkDrawing, pathPoints, explain } from "../src/core/strokecheck";
import kana from "../src/data/kana.json";

const K = (k: string) => (kana as { k: string; s: string[] }[]).find((x) => x.k === k)!;
const strokes = (k: string) => K(k).s.map(pathPoints);
// Same drawing, bigger and moved: must not matter.
const moved = (ss: [number, number][][]) => ss.map((s) => s.map(([x, y]) => [x * 2.5 + 40, y * 2.5 - 10] as [number, number]));
// A slightly shaky hand.
const shaky = (ss: [number, number][][]) => ss.map((s) => s.map(([x, y], i) => [x + Math.sin(i * 1.7) * 1.5, y + Math.cos(i * 1.3) * 1.5] as [number, number]));

describe("stroke check", () => {
  it("accepts every model sign, moved, scaled and shaky", () => {
    for (const x of kana as { k: string; s: string[] }[]) {
      const r = checkDrawing(shaky(moved(strokes(x.k))), x.s, x.k);
      expect([x.k, r.count, r.order, r.shape]).toEqual([x.k, true, true, true]);
    }
  });
  it("flags a reversed stroke", () => {
    const s = strokes("た"); s[0] = s[0].slice().reverse();
    const r = checkDrawing(s, K("た").s, "た");
    expect(r.order).toBe(false);
    expect(r.issues.some((i) => i.kind === "reverse" && i.n === 1)).toBe(true);
  });
  it("flags swapped strokes", () => {
    const s = strokes("け"); [s[0], s[1]] = [s[1], s[0]];
    const r = checkDrawing(s, K("け").s, "け");
    expect(r.order).toBe(false);
    expect(explain(r).join(" ")).toMatch(/désordre/);
  });
  it("flags a missing stroke", () => {
    const r = checkDrawing(strokes("ぬ").slice(0, 1), K("ぬ").s, "ぬ");
    expect(r.count).toBe(false);
  });
  it("accepts き written in 3 strokes", () => {
    const s = strokes("き"); const j = [...s[0], ...s[1]]; // not the variant
    const v = [s[0], s[1], [...s[2], ...s[3]]];
    const ok = (r: ReturnType<typeof checkDrawing>) => r.count && r.order && r.shape;
    expect(ok(checkDrawing(v, K("き").s, "き"))).toBe(true);
    expect(ok(checkDrawing([j, s[2], s[3]], K("き").s, "き"))).toBe(false);
  });
  it("refuses another sign", () => {
    const r = checkDrawing(strokes("ぬ"), K("め").s, "め");
    expect(r.count && r.order && r.shape).toBe(false);
  });
});
