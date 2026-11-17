import { describe, expect, it } from "vitest";
import { freshProfile } from "../src/core/scheduler";
import { COOLDOWN, markSeen, pickTip, setHidden } from "../src/core/tips";
import { GENERIC, TRAPS } from "../src/data/tips";

const T = 20000;
const never = () => 0.99; // never draws a generic tip
const always = () => 0; // always draws one, the first of the pool

describe("astuces", () => {
  it("shows a sign's own trap first, then nothing more that day", () => {
    const p = freshProfile();
    const tip = pickTip(p, "さ", T, never)!;
    expect(tip.id).toBe(TRAPS["さ"].id);
    markSeen(p, tip.id, T);
    expect(pickTip(p, "ち", T, always)).toBeNull();
  });

  it("generic tips are rare and wait long after being read", () => {
    const p = freshProfile();
    expect(pickTip(p, "か", T, never)).toBeNull();
    const g = pickTip(p, "か", T, always)!;
    expect(g.id).toBe(GENERIC[0].id);
    markSeen(p, g.id, T);
    expect(pickTip(p, "か", T + 1, always)!.id).not.toBe(g.id);
    expect(pickTip(p, "か", T + COOLDOWN, always)!.id).toBe(g.id);
  });

  it("« Ne plus afficher » hides a tip for good", () => {
    const p = freshProfile();
    setHidden(p, TRAPS["さ"].id, true);
    expect(pickTip(p, "さ", T + 999, never)).toBeNull();
    setHidden(p, TRAPS["さ"].id, false);
    expect(pickTip(p, "さ", T + 999, never)!.id).toBe(TRAPS["さ"].id);
  });
});
