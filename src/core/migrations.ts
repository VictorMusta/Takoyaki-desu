import type { AppState } from "./types";
import { LINES, OLD_H_LINES } from "../data/kana";

/**
 * Saved data carries a format number `v`. Each change of format adds one step here, applied
 * in order to anything older: data stored on the phone at launch, and imported backups.
 * Steps never lose information, are covered by tests, and data from a newer app is left alone.
 */
export const DATA_VERSION = 3;

/** One step per version: step[n] turns version n into n + 1. */
const STEPS: Record<number, (s: AppState, today: number) => void> = {
  // 1 → 2: the learning day now starts at 4 a.m. instead of midnight. Activity logged after
  // midnight on the last evening sits on a day that has not started: fold it into today.
  // Also fills fields added over time, so later code can rely on them.
  1: (s, t) => {
    for (const p of Object.values(s.profiles)) {
      p.days ??= {};
      p.log ??= [];
      p.exams ??= [];
      for (const [k, r] of Object.entries(p.days)) {
        if (+k <= t) continue;
        const d = (p.days[t] ??= { nw: 0, rv: 0 });
        d.nw += r.nw ?? 0;
        d.rv += r.rv ?? 0;
        if (r.nwW) d.nwW = (d.nwW ?? 0) + r.nwW;
        if (r.ex) d.ex = (d.ex ?? 0) + r.ex;
        if (r.bonus) d.bonus = Math.max(d.bonus ?? 0, r.bonus);
        delete p.days[+k];
      }
    }
  },
};

/** 2 → 3: the small signs line moved from last to right after ya. Every line open stays open. */
function reorderLines(s: AppState): void {
  const old = [...OLD_H_LINES, ...OLD_H_LINES.map((x) => x.toUpperCase())];
  for (const p of Object.values(s.profiles)) {
    if (!p.unlocked) continue;
    const open = old.slice(0, p.unlocked).map((ln) => LINES.indexOf(ln));
    p.unlocked = Math.max(...open) + 1;
  }
}
STEPS[2] = reorderLines;

export interface Migrated {
  state: AppState;
  /** Version the data had before. */
  from: number;
  /** The data comes from a newer version of the app: it was not touched. */
  newer: boolean;
}

/** Brings saved data up to DATA_VERSION (mutates and returns it). */
export function migrate(s: AppState, today: number): Migrated {
  const from = typeof s.v === "number" ? s.v : 1;
  if (from > DATA_VERSION) return { state: s, from, newer: true };
  for (let v = from; v < DATA_VERSION; v++) STEPS[v]?.(s, today);
  s.v = DATA_VERSION;
  return { state: s, from, newer: false };
}

