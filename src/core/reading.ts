import { byK } from "../data/kana";

/**
 * How a word or a sentence reads, block by block: each sound with the signs that make it and,
 * where a reading rule applies, which one. Used by « toucher un mot pour le lire » and the
 * « Règles de lecture » page. Pure: no DOM.
 */
export interface Piece {
  /** The signs of this sound, as written (っしゃ). */
  kana: string;
  /** Its reading (ssha). */
  r: string;
  /** The reading rule at work, if any. */
  rule?: "petit-y" | "petit-tsu" | "petite-voyelle" | "long" | "particule";
  /** In plain words: « し shi + petit ゃ → sha ». */
  why?: string;
}

const SMALL_Y: Record<string, string> = { ゃ: "a", ゅ: "u", ょ: "o", ャ: "a", ュ: "u", ョ: "o" };
const SMALL_V: Record<string, string> = { ァ: "a", ィ: "i", ゥ: "u", ェ: "e", ォ: "o", ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o" };
const SOKUON = new Set(["っ", "ッ"]);

/** The reading of one sign alone (katakana read as their hiragana twin). */
function base(c: string): string {
  const n = c.codePointAt(0)!;
  const h = n >= 0x30a1 && n <= 0x30f6 ? String.fromCodePoint(n - 0x60) : c;
  return h === "ぢ" ? "ji" : h === "づ" ? "zu" : byK[h]?.r ?? byK[c]?.r ?? "";
}

/** Splits a word (no spaces) into sounds. `particle`: the word is a block of a sentence (は at its end reads wa). */
function word(w: string, particle: boolean): Piece[] {
  const cs = [...w], out: Piece[] = [];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c === "ー") {
      const last = out[out.length - 1];
      if (last) {
        const v = /[aeiou]$/.exec(last.r)?.[0] ?? "";
        last.kana += c;
        last.r += v;
        last.rule = "long";
        last.why = `${last.why ? last.why + ", puis " : ""}ー : on allonge le son`;
      }
      continue;
    }
    let kana = c, r = base(c), rule: Piece["rule"], why: string | undefined;
    const nx = cs[i + 1];
    if (nx && SMALL_Y[nx] && r.endsWith("i") && r.length > 1) {
      const v = SMALL_Y[nx];
      const nr = /^(shi|chi|ji)$/.test(r) ? r.slice(0, -1) + v : r.slice(0, -1) + "y" + v;
      why = `${c} ${r} + petit ${nx} → ${nr}`;
      kana += nx;
      r = nr;
      rule = "petit-y";
      i++;
    } else if (nx && SMALL_V[nx]) {
      const nr = (r === "fu" ? "f" : r === "chi" ? "ch" : r === "shi" ? "sh" : r === "ji" ? "j" : r.replace(/[aeiou]$/, "")) + SMALL_V[nx];
      why = `${c} ${r} + petit ${nx} → ${nr}`;
      kana += nx;
      r = nr;
      rule = "petite-voyelle";
      i++;
    }
    if (SOKUON.has(c)) {
      // っ + the next sound: its consonant doubles (っち → tchi)
      const next = word(cs.slice(i + 1).join(""), particle)[0];
      if (!next) continue; // a final っ: a short stop, no sound
      const d = (next.r.startsWith("ch") ? "t" : next.r[0]) + next.r;
      out.push({ kana: c + next.kana, r: d, rule: "petit-tsu", why: `${next.why ? next.why + ". " : ""}Petit ${c} devant : la consonne double, ${next.r} → ${d}` });
      i += [...next.kana].length;
      continue;
    }
    // a hiragana vowel after the same sound: the sound lasts two beats (おう, えい read ō, ē)
    const prev = out[out.length - 1];
    if (prev && !prev.rule && "あいう".includes(c) && i > 0 && !SOKUON.has(cs[i - 1])) {
      const pv = prev.r.slice(-1);
      const long =
        (c === "う" && (pv === "o" || pv === "u")) || (c === "い" && (pv === "e" || pv === "i")) || (c === "あ" && pv === "a");
      if (long) {
        rule = "long";
        why = c === "う" && pv === "o" ? "う après un son en o : le o s'allonge (ō)" : c === "い" && pv === "e" ? "い après un son en e : souvent un e long (ē)" : `${c} après le même son : il dure deux temps`;
      }
    }
    // particles: を always reads o; は and へ at the end of a sentence block read wa and e
    if (c === "を") {
      r = "o";
      rule = "particule";
      why = "を, particule : se lit « o »";
    } else if (particle && i === cs.length - 1 && cs.length > 1 && (c === "は" || c === "へ") && cs[i - 1] !== c) {
      r = c === "は" ? "wa" : "e";
      rule = "particule";
      why = `${c} en fin de bloc, particule : se lit « ${r} »`;
    }
    out.push({ kana, r, rule, why });
  }
  return out;
}

const GREETINGS = new Set(["こんにちは", "こんばんは"]);

/** A word or a sentence (blocks separated by spaces or « | ») read sound by sound. */
export function breakdown(text: string): Piece[][] {
  const blocks = text.split(/[\s|]+/).filter(Boolean);
  const sentence = blocks.length > 1;
  return blocks.map((b) => {
    const clean = [...b].filter((c) => base(c) || c === "ー" || SOKUON.has(c) || SMALL_Y[c] || SMALL_V[c]).join("");
    return word(clean, sentence || GREETINGS.has(clean));
  });
}

/** True if the text has something worth explaining (a rule at work). */
export const hasRule = (text: string) => breakdown(text).some((b) => b.some((p) => p.rule));
