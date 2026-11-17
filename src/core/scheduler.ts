import { KANA, LINES, lineCards, lineIndex } from "../data/kana";
import type { Card, DayRec, Grade, Profile, QueueItem } from "./types";

export const DAY_MS = 864e5;

/** Local day number (days since the epoch, in the device's time zone). */
export function today(now: number = Date.now(), tzOffsetMin: number = new Date(now).getTimezoneOffset()): number {
  return Math.floor((now - tzOffsetMin * 6e4) / DAY_MS);
}

export function newCard(): Card {
  return { seen: false, ease: 2.5, interval: 0, reps: 0, due: null };
}

export function freshProfile(): Profile {
  return { cards: {}, unlocked: 1, settings: { newPerDay: 10, revCap: 60, showNums: true }, days: {}, log: [], exams: [] };
}

export function cardOf(p: Profile, k: string): Card {
  if (!p.cards[k]) p.cards[k] = newCard();
  return p.cards[k];
}

export function dayRec(p: Profile, t: number): DayRec {
  if (!p.days[t]) p.days[t] = { nw: 0, rv: 0 };
  return p.days[t];
}

/**
 * Simplified SM-2.
 * Raté: ease −0.2 (min 1.3), back to 1 day. Bof: ease −0.15, interval × 1.2.
 * Bien: 1 day, then 3 days, then interval × ease.
 */
export function applyGrade(c: Card, g: Grade, t: number): Card {
  if (g === "rate") {
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.reps = 0;
    c.interval = 1;
  } else if (g === "bof") {
    c.ease = Math.max(1.3, c.ease - 0.15);
    c.interval = Math.max(1, Math.round((c.interval || 1) * 1.2));
  } else {
    c.interval = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.max(1, Math.round(c.interval * c.ease));
    c.reps++;
  }
  c.due = t + c.interval;
  c.seen = true;
  return c;
}

export function gradeCard(p: Profile, k: string, g: Grade, t: number): void {
  applyGrade(cardOf(p, k), g, t);
  p.log.push({ d: t, k, g });
  checkUnlock(p);
}

/** Opens the next line when 80 % of the last open line holds for 3 days or more. */
export function checkUnlock(p: Profile): void {
  while (p.unlocked < LINES.length) {
    const cs = lineCards(p.unlocked - 1);
    const ok = cs.filter((k) => (p.cards[k.k]?.interval ?? 0) >= 3).length;
    if (ok / cs.length >= 0.8) p.unlocked++;
    else break;
  }
}

export type Status = "new" | "learn" | "done";

export function status(p: Profile, k: string): Status {
  const c = p.cards[k];
  if (!c || !c.seen) return "new";
  return c.interval >= 7 ? "done" : "learn";
}

/** Today's queue: due reviews first (up to the cap), then new signs (up to the quota). */
export function buildQueue(p: Profile, t: number): QueueItem[] {
  const d = dayRec(p, t);
  const open = KANA.filter((k) => lineIndex(k) < p.unlocked);
  const due = open
    .filter((k) => p.cards[k.k]?.seen && (p.cards[k.k].due ?? Infinity) <= t)
    .sort((a, b) => (p.cards[a.k].due ?? 0) - (p.cards[b.k].due ?? 0))
    .slice(0, Math.max(0, p.settings.revCap - d.rv))
    .map((k) => ({ k: k.k, isNew: false }));
  const fresh = open
    .filter((k) => !p.cards[k.k]?.seen)
    .slice(0, Math.max(0, p.settings.newPerDay + (d.bonus ?? 0) - d.nw))
    .map((k) => ({ k: k.k, isNew: true }));
  return [...due, ...fresh];
}

/** Seen signs due on or before day t (open lines only). */
export function dueCount(p: Profile, t: number): number {
  return KANA.filter((k) => lineIndex(k) < p.unlocked && p.cards[k.k]?.seen && (p.cards[k.k].due ?? Infinity) <= t).length;
}

/** Signs of the open lines never studied yet. */
export function unseenOpen(p: Profile): number {
  return KANA.filter((k) => lineIndex(k) < p.unlocked && !p.cards[k.k]?.seen).length;
}

/**
 * Free practice round: the weakest seen signs first (short interval, low ease), shuffled.
 * These items never touch the schedule, so extra practice can't distort the spacing.
 */
export function practiceQueue(p: Profile, n = 10, rnd: () => number = Math.random): QueueItem[] {
  const seen = KANA.filter((k) => p.cards[k.k]?.seen)
    .map((k) => ({ k: k.k, w: p.cards[k.k].interval + p.cards[k.k].ease + rnd() }))
    .sort((a, b) => a.w - b.w)
    .slice(0, n);
  for (let i = seen.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [seen[i], seen[j]] = [seen[j], seen[i]];
  }
  return seen.map((x) => ({ k: x.k, isNew: false, practice: true }));
}

/** Consecutive days with at least one card, ending today (or yesterday if today is empty). */
export function streak(p: Profile, t: number): number {
  const active = (d: number) => {
    const r = p.days[d];
    return !!r && r.rv + r.nw > 0;
  };
  let s = 0;
  let d = active(t) ? t : t - 1;
  while (active(d)) {
    s++;
    d--;
  }
  return s;
}

export interface CalibrationRow {
  line: string;
  /** Share of « Bien » in sessions, in %. */
  bien: number;
  /** Exam success rate, in %, or null without an exam. */
  exam: number | null;
  /** bien − exam, in points. */
  gap: number | null;
}

/** Per line, over the last 14 days: how generous self-grading is compared with strict exams. */
export function calibration(p: Profile, t: number): CalibrationRow[] {
  const rows: CalibrationRow[] = [];
  LINES.forEach((line, i) => {
    const ks = new Set(lineCards(i).map((k) => k.k));
    const lg = p.log.filter((x) => x.d > t - 14 && ks.has(x.k));
    if (!lg.length) return;
    const ex = p.exams.filter((e) => e.d > t - 14).flatMap((e) => e.r).filter((r) => ks.has(r.k));
    const bien = Math.round((100 * lg.filter((x) => x.g === "bien").length) / lg.length);
    const exam = ex.length ? Math.round((100 * ex.filter((r) => r.ok).length) / ex.length) : null;
    rows.push({ line, bien, exam, gap: exam === null ? null : bien - exam });
  });
  return rows;
}
