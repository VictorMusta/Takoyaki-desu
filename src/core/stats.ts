import { isKata, KANA } from "../data/kana";
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
}

export function snapshot(p: Profile, name: string, t: number): Snapshot {
  const script = (kata: boolean): [number, number, number] => {
    const ks = KANA.filter((k) => isKata(k.k) === kata);
    return [ks.filter((k) => p.cards[k.k]?.seen).length, ks.filter((k) => status(p, k.k) === "done").length, Math.round(alphabetMastery(p, t, kata) * 100)];
  };
  const d = history(p)
    .filter((l) => l.d > t - 28)
    .map((l) => [l.d, l.nw, l.rv, l.ex, l.min, l.ko] as [number, number, number, number, number, number]);
  return { v: 1, n: name.slice(0, 30), at: t, h: script(false), ...(kataStarted(p) ? { k: script(true) } : {}), w: knownWordCount(p), s: streak(p, t), d };
}

/* ---------- in a link ---------- */

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export const encodeSnapshot = (s: Snapshot) => b64url(new TextEncoder().encode(JSON.stringify(s)));

/** The snapshot in a link, or null if it is not one (checked field by field: links can be edited). */
export function decodeSnapshot(code: string): Snapshot | null {
  try {
    const o = JSON.parse(new TextDecoder().decode(unb64url(code))) as Snapshot;
    const trio = (x: unknown) => Array.isArray(x) && x.length === 3 && x.every((n) => Number.isFinite(n));
    if (o?.v !== 1 || typeof o.n !== "string" || !Number.isFinite(o.at) || !trio(o.h) || (o.k && !trio(o.k))) return null;
    if (!Number.isFinite(o.w) || !Number.isFinite(o.s) || !Array.isArray(o.d)) return null;
    if (!o.d.every((r) => Array.isArray(r) && r.length === 6 && r.every((n) => Number.isFinite(n)))) return null;
    return { ...o, n: o.n.slice(0, 30) };
  } catch {
    return null;
  }
}
