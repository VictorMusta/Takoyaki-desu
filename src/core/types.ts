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
}

/** A lesson in progress, saved after every step so it survives a closed app. */
export interface SavedSession {
  day: number;
  queue: QueueItem[];
  i: number;
}
