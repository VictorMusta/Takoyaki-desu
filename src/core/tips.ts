import { GENERIC, TRAPS, type Tip } from "../data/tips";
import type { Profile } from "./types";

/** A tip read is not shown again for this many days; at most one tip a day. */
export const COOLDOWN = 60;
const GENERIC_CHANCE = 0.25;

function tipsOf(p: Profile) {
  return (p.tips ??= { seen: {}, hidden: [], last: -1 });
}

const ok = (p: Profile, t: Tip, day: number) => {
  const s = tipsOf(p);
  return !s.hidden.includes(t.id) && (s.seen[t.id] === undefined || day - s.seen[t.id] >= COOLDOWN);
};

/**
 * The tip to show on the comparison of sign k today, or null (most of the time).
 * The sign's own trap comes first; otherwise, rarely, a generic tip not seen for a long time.
 */
export function pickTip(p: Profile, k: string, day: number, rnd: () => number = Math.random): Tip | null {
  if (tipsOf(p).last === day) return null;
  const trap = TRAPS[k];
  if (trap && ok(p, trap, day)) return trap;
  if (rnd() >= GENERIC_CHANCE) return null;
  const pool = GENERIC.filter((t) => ok(p, t, day));
  return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
}

export function markSeen(p: Profile, id: string, day: number): void {
  const s = tipsOf(p);
  s.seen[id] = day;
  s.last = day;
}

export function setHidden(p: Profile, id: string, hide: boolean): void {
  const s = tipsOf(p);
  s.hidden = s.hidden.filter((x) => x !== id);
  if (hide) s.hidden.push(id);
}
