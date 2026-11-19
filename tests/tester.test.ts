import { it, expect } from "vitest";
import { setupTester } from "../src/core/tester";
import { freshProfile, buildQueue } from "../src/core/scheduler";
import { buildWordQueue } from "../src/core/vocab";
import { FAMILIES, familyTypes } from "../src/core/drills";

it("a tester sees every kind of screen within one short lesson", () => {
  const p = freshProfile(), t = 20776;
  setupTester(p, t);
  const q = buildQueue(p, t);
  expect(q.filter((x) => !x.isNew).length).toBeGreaterThanOrEqual(8); // writing from memory + check
  expect(q.filter((x) => x.isNew).length).toBe(3); // how a new sign is taught
  expect(q.length).toBeLessThanOrEqual(20); // still short
  expect(buildWordQueue(p, t).length).toBeGreaterThan(0);
  for (const f of FAMILIES) expect(familyTypes(p, f.id).length, f.id).toBeGreaterThan(0);
});
