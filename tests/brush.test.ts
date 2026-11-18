import { it, expect } from "vitest";
import { brushPath, brushWidths } from "../src/ui/brush";

const line = (n: number, step: number) => Array.from({ length: n }, (_, i) => [10 + i * step, 50] as [number, number]);
it("brush stays readable: never thinner than 2.8, thinner at the start and when fast", () => {
  const calm = brushWidths(line(40, 1.5)), fast = brushWidths(line(40, 7));
  [...calm, ...fast].forEach((w) => expect(w).toBeGreaterThanOrEqual(2.8));
  expect(calm[0]).toBeLessThan(calm[20]);
  expect(fast[20]).toBeLessThan(calm[20]);
});
it("ink already laid down never changes as the stroke goes on", () => {
  // Slow, then fast, then slow again: every prefix keeps the widths it had.
  const st: [number, number][] = [];
  let x = 10;
  for (let i = 0; i < 60; i++) st.push([(x += i < 20 ? 1 : i < 40 ? 6 : 1.2), 50 + Math.sin(i / 5) * 8]);
  const full = brushWidths(st);
  for (const n of [5, 21, 33, 47]) expect(brushWidths(st.slice(0, n))).toEqual(full.slice(0, n));
});
it("brush outline is one closed shape, even for a dot", () => {
  for (const st of [line(1, 0), line(2, 3), line(30, 2)]) {
    const d = brushPath(st);
    expect(d.startsWith("M") && d.endsWith("Z")).toBe(true);
    expect(d.match(/M/g)!.length).toBe(1);
  }
});
