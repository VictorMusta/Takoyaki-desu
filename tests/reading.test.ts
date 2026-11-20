import { describe, expect, it } from "vitest";
import { breakdown, hasRule } from "../src/core/reading";

const read = (s: string) => breakdown(s).map((b) => b.map((p) => p.r).join("")).join(" ");

describe("reading a word sound by sound", () => {
  it("small ya yu yo, small tsu, long bar, particles", () => {
    expect(read("いらっしゃいませ")).toBe("irasshaimase");
    expect(breakdown("いらっしゃいませ")[0].map((p) => p.kana)).toEqual(["い", "ら", "っしゃ", "い", "ま", "せ"]);
    expect(read("きょう")).toBe("kyou");
    expect(read("ちょっと")).toBe("chotto");
    expect(read("コーヒー")).toBe("koohii");
    expect(read("トイレは どこ ですか")).toBe("toirewa doko desuka");
    expect(read("みずを ください")).toBe("mizuo kudasai");
    expect(read("こんにちは")).toBe("konnichiwa");
    expect(read("はは")).toBe("haha");
    expect(read("パーティー")).toBe("paatii");
    expect(read("ファン")).toBe("fan");
    expect(read("まっちゃ")).toBe("maccha".replace("cc", "tc"));
    expect(hasRule("さかな")).toBe(false);
    expect(hasRule("しゃしん")).toBe(true);
  });
});
