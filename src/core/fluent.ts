import { KANA, LINES } from "../data/kana";
import type { Profile } from "./types";

type Snapshot = Omit<Profile, "fluent">;

/**
 * « Je parle déjà japonais »: every line opens, unseen signs count as known
 * (30-day interval, due dates spread so a few come back each day), and the exam
 * offers all 46 signs. The profile as it was is kept aside, for « J'ai menti ».
 */
export function enableFluent(p: Profile, t: number): void {
  if (p.fluent) return;
  const { fluent: _drop, ...rest } = p;
  void _drop;
  const backup = JSON.parse(JSON.stringify(rest)) as Snapshot;
  delete backup.session;
  delete backup.examRun;
  p.fluent = { since: t, backup };
  p.unlocked = LINES.length;
  KANA.forEach((k, i) => {
    if (p.cards[k.k]?.seen) return;
    p.cards[k.k] = { seen: true, ease: 2.5, interval: 30, reps: 3, due: t + 7 + (i % 30) };
  });
  delete p.session;
}

/** « J'ai menti »: back to the profile exactly as it was before; what was done since is dropped. */
export function revertFluent(p: Profile): void {
  if (!p.fluent) return;
  const backup = p.fluent.backup;
  (Object.keys(p) as (keyof Profile)[]).forEach((key) => delete p[key]);
  Object.assign(p, backup);
}
