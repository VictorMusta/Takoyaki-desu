import { it, expect } from "vitest";
import kept from "../src/data/font-chars.txt?raw";

const sources = import.meta.glob(["../src/**/*.ts", "../src/**/*.json"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

// The app ships fonts cut down to its characters: new Japanese text needs scripts/subset_fonts.py again.
it("every Japanese character in the code is in the app's fonts", () => {
  const have = new Set(kept);
  const missing = new Set<string>();
  for (const txt of Object.values(sources)) for (const c of txt) if (c.codePointAt(0)! >= 0x3000 && !have.has(c)) missing.add(c);
  expect([...missing].join("")).toBe("");
});
