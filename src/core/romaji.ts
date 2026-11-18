import { byK } from "../data/kana";

const SMALL_Y: Record<string, string> = { "ゃ": "a", "ゅ": "u", "ょ": "o" };

/**
 * Kana → romaji (Hepburn, long vowels written as two letters):
 * きゃ → kya, しゃ → sha, ちゃ → cha, じゃ → ja, っ doubles the next consonant (っち → tchi),
 * a final or lone っ is dropped. ぢ / づ read as ji / zu.
 */
export function toRomaji(w: string): string {
  // Katakana read like their hiragana twins; the bar ー repeats the vowel before it.
  const cs = [...w].map((c) => {
    const n = c.codePointAt(0)!;
    return n >= 0x30a1 && n <= 0x30f6 ? String.fromCodePoint(n - 0x60) : c;
  });
  let out = "", dbl = false;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c === "ー") {
      out += /[aeiou]$/.exec(out)?.[0] ?? "";
      continue;
    }
    if (c === "っ") {
      dbl = true;
      continue;
    }
    let r = c === "ぢ" ? "ji" : c === "づ" ? "zu" : byK[c]?.r ?? c;
    const nx = cs[i + 1];
    if (nx && SMALL_Y[nx]) {
      const v = SMALL_Y[nx];
      r = /^(shi|chi|ji)$/.test(r) ? r.slice(0, -1) + v : r.slice(0, -1) + "y" + v;
      i++;
    }
    if (dbl) {
      out += r.startsWith("ch") ? "t" : r[0];
      dbl = false;
    }
    out += r;
  }
  return out;
}
