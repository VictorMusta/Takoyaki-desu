import { isKata, KANA } from "../data/kana";
import { signsOf, WORDS } from "../data/words";
import { alphabetMastery, kataStarted, status, streak } from "./scheduler";
import type { Profile } from "./types";
import { knownWordCount } from "./vocab";

/**
 * Progress in numbers: the day-by-day history (export, travel blog), and a small snapshot that
 * fits in a link to compare with someone else. Nothing here leaves the phone by itself.
 */

export interface DayLine {
  /** Day number (days since 1970, local, from 4 a.m.). */
  d: number;
  nw: number;
  rv: number;
  nwW: number;
  ex: number;
  /** Active minutes. */
  min: number;
  ko: number;
  /** Script mastery that day, % (when recorded). */
  hira?: number;
  kata?: number;
}

export const dayDate = (d: number) => new Date(d * 864e5).toISOString().slice(0, 10);

export function history(p: Profile): DayLine[] {
  const days = new Set([...Object.keys(p.days), ...Object.keys(p.hist ?? {}), ...Object.keys(p.histK ?? {})].map(Number));
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => {
      const r = p.days[d] ?? { nw: 0, rv: 0 };
      return {
        d,
        nw: r.nw,
        rv: r.rv,
        nwW: r.nwW ?? 0,
        ex: r.ex ?? 0,
        min: Math.round((r.sec ?? 0) / 6) / 10,
        ko: r.ko ?? 0,
        hira: p.hist?.[d],
        kata: p.histK?.[d],
      };
    });
}

/** CSV for a spreadsheet or the travel blog (French headers, semicolons, as Excel in France expects). */
export function historyCSV(p: Profile): string {
  const head = ["date", "nouveaux signes", "révisions", "nouveaux mots", "exercices", "minutes actives", "ratés", "maîtrise hiragana %", "maîtrise katakana %"];
  const rows = history(p).map((l) => [dayDate(l.d), l.nw, l.rv, l.nwW, l.ex, String(l.min).replace(".", ","), l.ko, l.hira === undefined ? "" : String(l.hira).replace(".", ","), l.kata === undefined ? "" : String(l.kata).replace(".", ",")].join(";"));
  return [head.join(";"), ...rows].join("\n") + "\n";
}

export interface Snapshot {
  v: 1;
  /** First name. */
  n: string;
  /** Day it was taken. */
  at: number;
  /** Hiragana and katakana: [signs seen, signs mastered, mastery %]. */
  h: [number, number, number];
  k?: [number, number, number];
  /** Words known, streak. */
  w: number;
  s: number;
  /** The last 28 days with activity: [day, new signs, reviews, exercises, active minutes, misses]. */
  d: [number, number, number, number, number, number][];
  /** Signs seen and words known, as bit sets in KANA / WORDS order (for the face-to-face duel). */
  ks?: string;
  ws?: string;
}

export function snapshot(p: Profile, name: string, t: number): Snapshot {
  const script = (kata: boolean): [number, number, number] => {
    const ks = KANA.filter((k) => isKata(k.k) === kata);
    return [ks.filter((k) => p.cards[k.k]?.seen).length, ks.filter((k) => status(p, k.k) === "done").length, Math.round(alphabetMastery(p, t, kata) * 100)];
  };
  const d = history(p)
    .filter((l) => l.d > t - 28)
    .map((l) => [l.d, l.nw, l.rv, l.ex, l.min, l.ko] as [number, number, number, number, number, number]);
  return {
    v: 1, n: name.slice(0, 30), at: t, h: script(false), ...(kataStarted(p) ? { k: script(true) } : {}), w: knownWordCount(p), s: streak(p, t), d,
    ks: toBits(KANA.map((k) => !!p.cards[k.k]?.seen)),
    ws: toBits(WORDS.map(([w]) => wordKnown(p, w))),
  };
}

/** A word counts as known if it was learnt, or if all its signs were seen. */
export const wordKnown = (p: Profile, w: string) => !!p.words?.[w]?.seen || signsOf(w).every((c) => p.cards[c]?.seen);

export const toBits = (flags: boolean[]) => {
  const b = new Uint8Array(Math.ceil(flags.length / 8));
  flags.forEach((f, i) => f && (b[i >> 3] |= 1 << (i & 7)));
  return b64url(b);
};
export const fromBits = (s: string, n: number): boolean[] => {
  try {
    const b = unb64url(s);
    return Array.from({ length: n }, (_, i) => !!((b[i >> 3] ?? 0) & (1 << (i & 7))));
  } catch {
    return Array(n).fill(false);
  }
};

/* ---------- in a link ---------- */

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

export const encodeSnapshot = (s: Snapshot) => b64url(new TextEncoder().encode(JSON.stringify(s)));

/** The snapshot in a link, or null if it is not one (checked field by field: links can be edited). */
export function decodeSnapshot(code: string): Snapshot | null {
  try {
    const o = JSON.parse(new TextDecoder().decode(unb64url(code))) as Snapshot;
    const trio = (x: unknown) => Array.isArray(x) && x.length === 3 && x.every((n) => Number.isFinite(n));
    if (o?.v !== 1 || typeof o.n !== "string" || !Number.isFinite(o.at) || !trio(o.h) || (o.k && !trio(o.k))) return null;
    if (!Number.isFinite(o.w) || !Number.isFinite(o.s) || !Array.isArray(o.d)) return null;
    if (!o.d.every((r) => Array.isArray(r) && r.length === 6 && r.every((n) => Number.isFinite(n)))) return null;
    if ((o.ks && typeof o.ks !== "string") || (o.ws && typeof o.ws !== "string")) return null;
    return { ...o, n: o.n.slice(0, 30) };
  } catch {
    return null;
  }
}
