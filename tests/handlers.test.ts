import { it, expect } from "vitest";

// Every source file as text (Vite glob import, no Node API needed).
const sources = import.meta.glob("../src/**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

// el.onkeydown = (e) => cond && act()  returns false for every other key, which cancels it (Backspace included).
it("no DOM on-handler returns a boolean by accident", () => {
  const bad = Object.entries(sources).flatMap(([f, txt]) =>
    txt.split("\n").flatMap((l, i) => (/\.on[a-z]+ = \(\w*\) => [^{]*&&/.test(l) ? [`${f}:${i + 1}`] : [])),
  );
  expect(Object.keys(sources).length).toBeGreaterThan(10);
  expect(bad).toEqual([]);
});
