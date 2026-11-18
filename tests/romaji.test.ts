import { describe, expect, it } from "vitest";
import { toRomaji } from "../src/core/romaji";
import { KANA } from "../src/data/kana";
import { MNEMO } from "../src/data/mnemonics";
import { EXAMPLES } from "../src/data/examples";

describe("full hiragana and katakana", () => {
  it("has 151 signs, each with strokes, a memory hook and example words", () => {
    expect(KANA.length).toBe(151);
    KANA.forEach((k) => {
      expect(k.s.length, k.k).toBeGreaterThan(0);
      expect(MNEMO[k.k], k.k).toBeTruthy();
      if (k.k !== "ヅ") expect(EXAMPLES[k.k]?.length, k.k).toBeGreaterThan(0);
      (EXAMPLES[k.k] ?? []).forEach(([w]) => [...w].forEach((c) => expect(KANA.some((x) => x.k === c), `${k.k}: ${w}`).toBe(true)));
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
    expect(toRomaji("コーヒー")).toBe("koohii");
    expect(toRomaji("ベッド")).toBe("beddo");
    expect(toRomaji("シャツ")).toBe("shatsu");
    expect(toRomaji("ラーメン")).toBe("raamen");
  });
});
