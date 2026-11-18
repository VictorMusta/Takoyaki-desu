import { it, expect } from "vitest";
import { FAMILIES, makeDrill, available } from "../src/core/drills";
import { KANA } from "../src/data/kana";
import { freshProfile } from "../src/core/scheduler";
it("every exercise, at every stage, has distinct options with the answer among them", () => {
  for (const cut of [10, 46, 75, 90, 151]) {
    const p = freshProfile();
    KANA.slice(0, cut).forEach((k) => (p.cards[k.k] = { seen: true, ease: 2.5, interval: 3, reps: 2, due: 99999 }));
    p.unlocked = 32;
    const bad = new Map<string, string>();
    for (const f of FAMILIES) for (const t of f.types) {
      if (!available(p, t)) continue;
      for (let i = 0; i < 300; i++) {
        let d;
        try { d = makeDrill(p, t); } catch (e) { bad.set(t + " throw", String(e)); continue; }
        if (!d) { bad.set(t + " null", ""); continue; }
        if (d.options) {
          if (new Set(d.options).size !== d.options.length) bad.set(t + " dup", d.options.join("|"));
          if (!d.options.includes(d.answer!)) bad.set(t + " noanswer", d.options.join("|") + " / " + d.answer);
        }
        if (d.pairs && new Set(d.pairs.map((x) => x[1])).size !== d.pairs.length) bad.set(t + " pairdup", JSON.stringify(d.pairs));
      }
    }
    expect([...bad.entries()], `after ${cut} signs`).toEqual([]);
  }
});
