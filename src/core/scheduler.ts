import { isKata, KANA, LINES, lineCards, lineIndex } from "../data/kana";
import type { Card, DayRec, Grade, Profile, QueueItem } from "./types";

export const DAY_MS = 864e5;

/** The learning day changes at 4 a.m., not at midnight: a late evening still counts for the evening's day. */
export const DAY_START_H = 4;

/** Local day number (days since the epoch, in the device's time zone, starting at 4 a.m.). */
export function today(now: number = Date.now(), tzOffsetMin: number = new Date(now).getTimezoneOffset()): number {
  return Math.floor((now - tzOffsetMin * 6e4 - DAY_START_H * 36e5) / DAY_MS);
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

/**
 * Same-day second chance: a sign that has just started (interval 1 day) can be reviewed again
 * from 4 hours later, the same day. Succeeding then is real spacing (hours, not seconds): it
 * moves to 2 days (mastery about 53 %) instead of waiting for tomorrow to show any progress.
 */
export const SOON_MS = 4 * 36e5;

/** Is this sign reviewable now, through its same-day second chance? */
export const soonDue = (c: Card | undefined, t: number, now: number) => !!c?.soon && now >= c.soon && (c.due ?? Infinity) > t;

export function gradeCard(p: Profile, k: string, g: Grade, t: number, now: number = Date.now()): void {
  const c = cardOf(p, k);
  if (soonDue(c, t, now)) {
    // The second chance: « Bien » → 2 days; « Bof » keeps tomorrow; « Raté » restarts.
    if (g === "bien") {
      c.interval = 2;
      c.reps = Math.max(c.reps, 1);
      c.due = t + 2;
    } else if (g === "rate") applyGrade(c, g, t);
    delete c.soon;
    if (g === "rate") c.soon = now + SOON_MS;
  } else {
    applyGrade(c, g, t);
    if (c.interval === 1) c.soon = now + SOON_MS;
    else delete c.soon;
  }
  if (g === "rate") recordMiss(p, k, t);
  // Practice made real: a success stretches the new interval by the pending share; a miss drops it.
  if (c.boost) {
    if (g !== "rate" && c.interval >= 1) {
      c.interval = Math.max(c.interval, Math.round(c.interval * (1 + c.boost.pts)));
      c.due = t + c.interval;
    }
    delete c.boost;
  }
  p.log.push({ d: t, k, g });
  checkUnlock(p);
}

/**
 * « Voir le signe » during recall: looking proves the sign isn't known yet,
 * so it counts as Raté (ease −0.2, back to a 1-day interval).
 */
export function peekCard(p: Profile, k: string, t: number): void {
  const c = cardOf(p, k);
  c.ease = Math.max(1.3, c.ease - 0.2);
  c.reps = 0;
  c.interval = 1;
  c.due = t + 1;
  c.seen = true;
  recordMiss(p, k, t);
  p.log.push({ d: t, k, g: "rate" });
}

/* ---------- practice: visible, capped, provisional ---------- */

/**
 * Extra practice on a sign (free rounds, exercises) adds pending mastery with diminishing
 * returns: +8, +5, +3, +2 points for the 1st to 4th success of the day, then nothing (« assez vu
 * aujourd'hui »), and 20 points pending at most. It is shown lighter on top of the real mastery.
 * It becomes real only at the next scheduled review: a success then stretches the new interval
 * by that much (+18 % → 3 days become 4); a miss there, or in practice, drops it. So practice is
 * rewarded without pretending a sign is known for longer than it was proven.
 */
export const PRACTICE_GAINS = [0.08, 0.05, 0.03, 0.02];
export const PENDING_CAP = 0.2;

/** No more gain today for this sign. */
export const saturated = (c: Card | undefined, t: number) => !!c?.boost && c.boost.d === t && c.boost.n >= PRACTICE_GAINS.length;
/** Pending mastery from practice, 0–0.2. */
export const pending = (c: Card | undefined) => c?.boost?.pts ?? 0;

/** One practice success on a sign (share < 1 for lighter exercises); returns the points gained. */
export function practiceGain(p: Profile, k: string, t: number, share = 1): number {
  const c = p.cards[k];
  if (!c?.seen) return 0;
  const b = c.boost && c.boost.d === t ? c.boost : { pts: c.boost?.pts ?? 0, d: t, n: 0 };
  const step = PRACTICE_GAINS[b.n] ?? 0;
  const gain = Math.min(step * share, PENDING_CAP - b.pts);
  c.boost = { pts: Math.round((b.pts + Math.max(0, gain)) * 1000) / 1000, d: t, n: b.n + 1 };
  return Math.max(0, gain);
}

/** Free practice can only bring a sign back sooner (tomorrow at the latest), never push it away. */
export function pullForward(p: Profile, k: string, t: number): void {
  const c = p.cards[k];
  if (!c?.seen) return;
  delete c.boost;
  recordMiss(p, k, t);
  c.reps = 0;
  c.interval = Math.min(c.interval, 1);
  c.due = Math.min(c.due ?? t + 1, t + 1);
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

/**
 * Mastery of a sign, 0–1: how long it is remembered, up to the « maîtrisé » mark (7 days).
 * 1 day ≈ 33 %, 3 days ≈ 67 %, 7 days and more = 100 %. A miss (interval back to 1) lowers it,
 * and a review left waiting well past its date slowly lowers it too (memory fades).
 */
export function mastery(p: Profile, k: string, t: number): number {
  return cardMastery(p.cards[k], t);
}

/**
 * A sign is « solid » once it holds three days (mastery about 67 %): from then on its romaji
 * stops being shown next to words, so reading comes from the kana alone.
 */
export const solid = (p: Profile, k: string, t: number) => mastery(p, k, t) >= 0.66;
/** Every sign of the text is solid (spaces and punctuation ignored). */
export const allSolid = (p: Profile, s: string, t: number) => [...s].filter((c) => /[\u3040-\u30ff]/.test(c)).every((c) => solid(p, c, t));

/** The same measure for any card (signs or words). */
export function cardMastery(c: Card | undefined, t: number): number {
  if (!c?.seen) return 0;
  let m = Math.min(1, Math.log(1 + c.interval) / Math.log(8));
  const late = t - (c.due ?? t);
  if (late > 0) m *= Math.max(0.5, 1 - late / (2 * Math.max(1, c.interval)));
  return m;
}

/** Mastery of the whole alphabet (every sign, unseen ones count as 0), 0–1. */
/** Mastery of one script, 0 to 1: hiragana by default, katakana with kata = true. */
export function alphabetMastery(p: Profile, t: number, kata = false): number {
  const ks = KANA.filter((k) => isKata(k.k) === kata);
  return ks.reduce((s, k) => s + mastery(p, k.k, t), 0) / ks.length;
}
/** Katakana started: one katakana sign seen. */
export const kataStarted = (p: Profile) => KANA.some((k) => isKata(k.k) && p.cards[k.k]?.seen);

/** Keeps one value per day of the alphabet mastery, for the progress curve. */
export function recordMastery(p: Profile, t: number): void {
  (p.hist ??= {})[t] = Math.round(alphabetMastery(p, t) * 1000) / 10;
  if (kataStarted(p)) (p.histK ??= {})[t] = Math.round(alphabetMastery(p, t, true) * 1000) / 10;
}

/** Today's queue: due reviews first (up to the cap), then new signs (up to the quota). */
export function buildQueue(p: Profile, t: number, now: number = Date.now()): QueueItem[] {
  const d = dayRec(p, t);
  const open = KANA.filter((k) => lineIndex(k) < p.unlocked);
  const due = open
    .filter((k) => p.cards[k.k]?.seen && ((p.cards[k.k].due ?? Infinity) <= t || soonDue(p.cards[k.k], t, now)))
    .sort((a, b) => (p.cards[a.k].due ?? 0) - (p.cards[b.k].due ?? 0))
    .slice(0, Math.max(0, p.settings.revCap - d.rv))
    .map((k) => ({ k: k.k, isNew: false }));
  const fresh = open
    .filter((k) => !p.cards[k.k]?.seen)
    .slice(0, Math.max(0, p.settings.newPerDay + (d.bonus ?? 0) - d.nw))
    .map((k) => ({ k: k.k, isNew: true }));
  return [...due, ...fresh];
}

/** When the next same-day second chance opens (ms), and for how many signs; null if none today. */
export function nextSoon(p: Profile, t: number, now: number = Date.now()): { at: number; n: number } | null {
  const end = (t + 1) * DAY_MS + DAY_START_H * 36e5 + new Date(now).getTimezoneOffset() * 6e4; // next 4 a.m., local
  const times = Object.values(p.cards)
    .filter((c) => c.seen && c.soon && c.soon > now && c.soon < end && (c.due ?? Infinity) > t)
    .map((c) => c.soon!);
  if (!times.length) return null;
  const at = Math.min(...times);
  return { at, n: times.filter((x) => x <= at + 36e5).length };
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
 * How likely a sign is to be picked for practice: weak signs more often, but by chance, not in
 * order. A sign never studied well weighs 1.3, a mastered one 0.3 (about 4 to 1), and a sign
 * already « assez vu » today a third of that: every sign keeps a fair chance to come up.
 */
export function practiceWeight(p: Profile, k: string, t: number): number {
  const c = p.cards[k];
  let w = 0.3 + (1 - Math.min(1, cardMastery(c, t) + pending(c)));
  // Recent misses push a sign forward even if its mastery is high: +0.4 per miss today
  // (up to 3), half that for yesterday's.
  if (c?.miss && t - c.miss.d <= 1) w += (t === c.miss.d ? 0.4 : 0.2) * Math.min(3, c.miss.n);
  return saturated(c, t) ? w / 3 : w;
}

/** Remembers a miss on a sign today (used to bring it up more often in practice). */
export function recordMiss(p: Profile, k: string, t: number): void {
  const c = p.cards[k];
  if (!c) return;
  c.miss = c.miss?.d === t ? { d: t, n: c.miss.n + 1 } : { d: t, n: 1 };
  const d = dayRec(p, t);
  d.ko = (d.ko ?? 0) + 1;
}

/** n distinct items drawn at random, each with chance proportional to its weight. */
export function weightedSample<T>(items: T[], weight: (x: T) => number, n: number, rnd: () => number = Math.random): T[] {
  // Efraimidis–Spirakis: key = u^(1/w), keep the n largest.
  return items
    .map((x) => ({ x, key: Math.pow(rnd() || 1e-9, 1 / Math.max(1e-6, weight(x))) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, n)
    .map((e) => e.x);
}

/**
 * Free practice round: seen signs drawn at random, the weak ones more likely (practiceWeight).
 * These items never push a review away, so extra practice can't distort the spacing.
 */
export function practiceQueue(p: Profile, n = 10, rnd: () => number = Math.random): QueueItem[] {
  const t = today();
  const seen = KANA.filter((k) => p.cards[k.k]?.seen).map((k) => k.k);
  return weightedSample(seen, (k) => practiceWeight(p, k, t), n, rnd).map((k) => ({ k, isNew: false, practice: true }));
}

/** Consecutive days with at least one card, ending today (or yesterday if today is empty). */
export function streak(p: Profile, t: number): number {
  const active = (d: number) => {
    const r = p.days[d];
    return !!r && r.rv + r.nw + (r.ex ?? 0) > 0;
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
