import { describe, expect, it } from "vitest";
import { buildWordQueue, gradeWord, knownWordCount, openWords, romajiOk } from "../src/core/vocab";
import { freshProfile, newCard } from "../src/core/scheduler";

const T = 20000;
const knowing = (signs: string) => {
  const p = freshProfile();
  [...signs].forEach((k) => (p.cards[k] = { ...newCard(), seen: true, interval: 3, due: 99999 }));
  return p;
};

describe("vocabulary", () => {
  it("a word opens once all its signs are seen", () => {
    expect(openWords(knowing("いぬ")).map(([w]) => w)).toEqual(["いぬ"]);
    expect(openWords(knowing("い")).length).toBe(0);
  });

  it("new words follow the daily quota, then come back for review", () => {
    const p = knowing("あいうえおかきくけこさしすせそ");
    const q = buildWordQueue(p, T);
    expect(q.length).toBe(3);
    expect(q.every((x) => x.word && x.isNew)).toBe(true);
    q.forEach((x) => gradeWord(p, x.k, "bien", T, true));
    expect(buildWordQueue(p, T).length).toBe(0);
    expect(buildWordQueue(p, T + 1).filter((x) => !x.isNew).length).toBe(3);
    expect(knownWordCount(p)).toBe(3);
  });

  it("accepts the usual ways of spelling a reading", () => {
    expect(romajiOk("hikōki", "ひこうき", "hikōki")).toBe(true);
    expect(romajiOk("hikouki", "ひこうき", "hikōki")).toBe(true);
    expect(romajiOk("Hikoki ", "ひこうき", "hikōki")).toBe(true);
    expect(romajiOk("sushi", "すし", "sushi")).toBe(true);
    expect(romajiOk("susi", "すし", "sushi")).toBe(true);
    expect(romajiOk("tukue", "つくえ", "tsukue")).toBe(true);
    expect(romajiOk("sashi", "すし", "sushi")).toBe(false);
    expect(romajiOk("", "すし", "sushi")).toBe(false);
  });
});
