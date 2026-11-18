import { it, expect } from "vitest";
import { CHANGELOG } from "../src/data/changelog";
import pkg from "../package.json";

it("the newest « Quoi de neuf ? » entry matches the app version", () => {
  expect(CHANGELOG[0].v).toBe(pkg.version);
  CHANGELOG.forEach((r) => expect(r.items.length).toBeGreaterThan(0));
});
