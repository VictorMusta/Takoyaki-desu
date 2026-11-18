import { describe, expect, it } from "vitest";
import { toRomaji } from "../src/core/romaji";
import { KANA } from "../src/data/kana";
import { MNEMO } from "../src/data/mnemonics";
import { EXAMPLES } from "../src/data/examples";

describe("full hiragana", () => {
  it("has 75 signs, each with strokes, a memory hook and example words", () => {
    expect(KANA.length).toBe(75);
    KANA.forEach((k) => {
      expect(k.s.length, k.k).toBeGreaterThan(0);
      expect(MNEMO[k.k], k.k).toBeTruthy();
      expect(EXAMPLES[k.k]?.length, k.k).toBeGreaterThan(0);
    });
  });

  it("reads combinations, doubled consonants and voiced signs", () => {
    expect(toRomaji("きょう")).toBe("kyou");
    expect(toRomaji("しゅくだい")).toBe("shukudai");
    expect(toRomaji("おちゃ")).toBe("ocha");
    expect(toRomaji("きって")).toBe("kitte");
    expect(toRomaji("がっこう")).toBe("gakkou");
    expect(toRomaji("まっちゃ")).toBe("matcha");
    expect(toRomaji("はなぢ")).toBe("hanaji");
    expect(toRomaji("てんぷら")).toBe("tenpura");
  });
});
