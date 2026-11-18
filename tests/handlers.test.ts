import { it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : f.endsWith(".ts") ? [join(d, f)] : []));

// el.onkeydown = (e) => cond && act()  returns false for every other key, which cancels it (Backspace included).
it("no DOM on-handler returns a boolean by accident", () => {
  const bad = files("src").flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => [f, i + 1, l] as const).filter(([, , l]) => /\.on[a-z]+ = \(\w*\) => [^{]*&&/.test(l)));
  expect(bad).toEqual([]);
});
