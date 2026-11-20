import { describe, expect, it } from "vitest";
import { common, knowledgeFromSnapshot, knowledgeOf, makeMatch, pairs, playable, type Match } from "../src/core/f2f";
import { freshProfile, newCard } from "../src/core/scheduler";
import { encodeSnapshot, decodeSnapshot, snapshot } from "../src/core/stats";

const knowing = (s: string) => {
  const p = freshProfile();
  for (const c of s) p.cards[c] = { ...newCard(), seen: true };
  return p;
};

describe("face-to-face duel", () => {
  it("only what both know, every question has its answer among the options", () => {
    const a = knowledgeOf(knowing("あいうえおかきくけこさしすせそ"), "A"), b = knowledgeOf(knowing("あいうえおかきくけこたちつてと"), "B");
    const c = common(a, b);
    expect(c.signs.sort()).toEqual([..."あいうえおかきくけこ"].sort());
    const games = playable(c, true);
    expect(games).toContain("rapide");
    const m = makeMatch(c, games, 30);
    for (const r of m) {
      expect(r.options).toContain(r.answer);
      expect(new Set(r.options).size).toBe(r.options.length);
    }
  });
  it("a comparison link carries the signs (round trip)", () => {
    const p = knowing("あいうえおかき");
    const s = decodeSnapshot(encodeSnapshot(snapshot(p, "Amandine", 100)))!;
    expect([...knowledgeFromSnapshot(s)!.signs].sort()).toEqual([..."あいうえおかき"].sort());
  });
  it("history: per pair, whatever the order of the names", () => {
    const ms: Match[] = [
      { at: 1, names: ["Victor", "Amandine"], score: [7, 3], games: { rapide: [4, 1] } },
      { at: 2, names: ["Amandine", "Victor"], score: [6, 4], games: { rapide: [2, 3], mot: [4, 1] } },
    ];
    const [s] = pairs(ms);
    expect(s.names).toEqual(["Amandine", "Victor"]);
    expect(s.won).toEqual([1, 1]);
    expect(s.games.rapide).toEqual([3, 7]);
    expect(s.games.mot).toEqual([4, 1]);
  });
});
