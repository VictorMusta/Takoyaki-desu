import { exportState, state } from "./store";

/**
 * Keeping progress safe. Everything lives in this browser's storage, which the system may clear
 * (low space, « clear site data », a new phone). Two defences:
 * - ask the browser to keep the storage (navigator.storage.persist), once per launch;
 * - a backup file the learner sends to themselves (share sheet → their mail app), with a gentle
 *   reminder once a week. The file only holds learning progress: nothing private.
 * Backup dates are kept per device, outside the saved state, so importing a file does not fake them.
 */

const KEY = "takoyaki-backup";
const DAY = 86_400_000;
export const BACKUP_EVERY_DAYS = 7;

interface Meta {
  /** Last backup sent or downloaded (ms), or the first launch if none yet. */
  last: number;
  /** Whether a real backup was ever made on this device. */
  done?: boolean;
  /** The reminder is snoozed until then (ms). */
  snooze?: number;
}

function read(): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) ?? "null") as Meta | null;
    if (m && typeof m.last === "number") return m;
  } catch {
    /* fall through */
  }
  const m = { last: Date.now() };
  write(m);
  return m;
}
function write(m: Meta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

export let persisted: boolean | null = null;

/** Ask the browser not to clear our storage on its own (granted silently for installed apps). */
export async function askPersist(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    persisted = (await navigator.storage.persisted?.()) || (await navigator.storage.persist());
  } catch {
    persisted = null;
  }
}

/** Some real progress to lose: a sign or a word seen. */
function hasProgress(): boolean {
  return Object.values(state.profiles).some((p) => Object.values(p.cards).some((c) => c.seen) || Object.keys(p.words ?? {}).length > 0);
}

/** Days since the last backup (or since first launch when none was made). */
export function daysSinceBackup(now = Date.now()): number {
  return Math.floor((now - read().last) / DAY);
}
export const everBackedUp = (): boolean => !!read().done;

/** True when the weekly reminder should show. */
export function backupDue(now = Date.now()): boolean {
  const m = read();
  if ((m.snooze ?? 0) > now || !hasProgress()) return false;
  return now - m.last >= BACKUP_EVERY_DAYS * DAY;
}

export function snoozeBackup(days = 3, now = Date.now()): void {
  write({ ...read(), snooze: now + days * DAY });
}

function markDone(): void {
  write({ last: Date.now(), done: true });
}

const fileName = (ext = "json") => `takoyaki-desu-sauvegarde-${new Date().toISOString().slice(0, 10)}.${ext}`;

function download(file: File): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export type BackupResult = "shared" | "shared-text" | "downloaded" | "cancelled";

/**
 * « M'envoyer ma sauvegarde »: the share sheet with the file attached, so the learner picks
 * their mail app and sends it to themselves. Without file sharing (most computers), the file is
 * downloaded instead.
 */
/** Why the last share fell back (error names), shown to help debugging on a given phone. */
export let shareError = "";

export async function sendBackup(): Promise<BackupResult> {
  shareError = "share" in navigator ? "" : "no share";
  const data = exportState();
  // The share sheet (mail, Drive…) only takes a few file types: .json is refused on Android and
  // iOS, .txt is accepted almost everywhere. Same content; « Importer un fichier » reads both.
  const file = new File([data], fileName("txt"), { type: "text/plain" });
  const text = "Ma sauvegarde Takoyaki desu. Pour la restaurer : Réglages › Sauvegarde › Importer un fichier.";
  if ("share" in navigator) {
    // 1. As an attachment. canShare is only a hint (some browsers answer « no » and share anyway).
    try {
      await navigator.share({ title: "Sauvegarde Takoyaki desu", text, files: [file] });
      markDone();
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      shareError = (e as Error).name;
    }
    // 2. No attachments here: the data itself as text, for a mail or a note (restore by copy-paste).
    try {
      await navigator.share({ title: "Sauvegarde Takoyaki desu", text: data });
      markDone();
      return "shared-text";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      shareError += " / " + (e as Error).name;
    }
  }
  download(file);
  markDone();
  return "downloaded";
}

export function downloadBackup(): void {
  download(new File([exportState()], fileName(), { type: "application/json" }));
  markDone();
}
