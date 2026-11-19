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
  /** A sign due tomorrow may already be reviewed from this time today (ms), see SOON_MS. */
  soon?: number;
  /** Practice not yet confirmed (see practiceGain): pending mastery, last day practised, reps that day. */
  boost?: { pts: number; d: number; n: number };
  /** Recent misses (any kind: lesson, practice, games, peeks): day and count that day. */
  miss?: { d: number; n: number };
}

export interface Settings {
  newPerDay: number;
  revCap: number;
  showNums: boolean;
  /** New words a day in the vocabulary track (default 3). */
  wordsPerDay?: number;
  /** « Sans limite »: new signs in batches of 5, as many batches a day as wanted (see continueBlock). */
  intensive?: boolean;
}

export interface DayRec {
  nw: number;
  rv: number;
  /** Extra new signs allowed today (« 5 signes de plus »). */
  bonus?: number;
  /** New words started today. */
  nwW?: number;
  /** Exercises answered and words practised today (any kind, lesson or free). */
  ex?: number;
  /** Active time today, in seconds (see ui/activity.ts). */
  sec?: number;
  /** Misses today: lesson, practice, games, peeks, exams. */
  ko?: number;
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
  /** Set up for testers (core/tester.ts): home shows the test path. */
  tester?: boolean;
  /** Signs written the learner's own way (fluent mode): stroke count and order are not checked. */
  variants?: Record<string, true>;
  /** Alphabet mastery in %, one value per day (for the curve in Progrès). */
  hist?: Record<number, number>;
  /** Same for katakana, once started. */
  histK?: Record<number, number>;
  /** Vocabulary track: one card per word (meaning known), keyed by the word in kana. */
  words?: Record<string, Card>;
  /** The learner's own memory hooks, by sign (they replace the app's). */
  mnemos?: Record<string, string>;
}

export interface AppState {
  /** Data format version (see core/migrations.ts); absent means 1. */
  v?: number;
  active: string;
  profiles: Record<string, Profile>;
}

/** A backup file: the state plus when and by which version it was made. */
export interface Backup extends AppState {
  exportedAt?: string;
  appVersion?: string;
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
  /** The learner read the memory hook during this recall (grade capped at Bof). */
  hinted?: boolean;
  /** Strokes waiting for correction: closing the app on the comparison resumes there. */
  strokes?: Drawing;
  /** Not a drawing: another kind of exercise (choose, listen, words…). */
  drill?: import("./drills").Drill;
  /** Vocabulary item: `k` is a word, not a sign. */
  word?: boolean;
  /** A sign being learnt today: successful recalls so far in this lesson (it graduates at LEARN_RECALLS). */
  learn?: number;
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
