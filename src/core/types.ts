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
}
