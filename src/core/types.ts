export type Grade = "rate" | "bof" | "bien";

export interface Card {
  seen: boolean;
  ease: number;
  /** Days until the next review. */
  interval: number;
  /** Consecutive successful reviews. */
  reps: number;
  /** Day number of the next review, or null if never seen. */
  due: number | null;
}

export interface Settings {
  newPerDay: number;
  revCap: number;
  showNums: boolean;
}

export interface DayRec {
  nw: number;
  rv: number;
  /** Extra new signs allowed today (« 5 signes de plus »). */
  bonus?: number;
}

export interface LogEntry {
  d: number;
  k: string;
  g: Grade;
}

export interface ExamResult {
  k: string;
  ok: boolean;
}

/** A drawing: strokes of [x, y] points in the 109 × 109 box. */
export type Drawing = [number, number][][];

/** An exam in progress, saved after every answer (and while correcting). */
export interface ExamRun {
  items: string[];
  i: number;
  res: ExamResult[];
  /** Strokes of the current sign once « Comparer » was pressed: resumes the correction. */
  pending?: Drawing;
}

export interface Exam {
  d: number;
  r: ExamResult[];
}

export interface Profile {
  cards: Record<string, Card>;
  /** Number of table lines open for new cards. */
  unlocked: number;
  settings: Settings;
  days: Record<string, DayRec>;
  log: LogEntry[];
  exams: Exam[];
  session?: SavedSession;
  examRun?: ExamRun;
  /** Tips: last day seen per tip, tips turned off, last day a tip was shown. */
  tips?: { seen: Record<string, number>; hidden: string[]; last: number };
  /** « Je parle déjà japonais »: day it was turned on, and the profile as it was before. */
  fluent?: { since: number; backup: Omit<Profile, "fluent"> };
  /** Signs written the learner's own way (fluent mode): stroke count and order are not checked. */
  variants?: Record<string, true>;
  /** Alphabet mastery in %, one value per day (for the curve in Progrès). */
  hist?: Record<number, number>;
}

export interface AppState {
  active: string;
  profiles: Record<string, Profile>;
}

export interface QueueItem {
  k: string;
  isNew: boolean;
  /** Discovery step for a new sign, 1 to 4. */
  step?: number;
  /** Whether this item already counted in today's totals. */
  counted?: boolean;
  /** Free practice: graded for feedback only, never changes the schedule. */
  practice?: boolean;
  /** The learner looked at the sign during this recall. */
  peeked?: boolean;
  /** Strokes waiting for correction: closing the app on the comparison resumes there. */
  strokes?: Drawing;
  /** Not a drawing: another kind of exercise (choose, listen, words…). */
  drill?: import("./drills").Drill;
}

/** A lesson in progress, saved after every step so it survives a closed app. */
export interface SavedSession {
  day: number;
  queue: QueueItem[];
  i: number;
  /** This lesson's own results (the end screen shows these, not the whole day). */
  stats?: SessionStats;
}

export interface SessionStats {
  bien: number;
  bof: number;
  rate: number;
  /** « Voir le signe » used. */
  vu: number;
  /** Other exercises: right / wrong. */
  ok: number;
  ko: number;
}
