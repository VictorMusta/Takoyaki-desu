import * as profiles from "./profiles";
import { checkUnlock } from "./scheduler";
import type { AppState, Backup, Profile } from "./types";
import { DATA_VERSION, migrate } from "./migrations";
import { today } from "./scheduler";

const KEY = "takoyaki-desu-v1";

/** True when the browser refuses to keep data (private mode, storage disabled). */
export let memoryOnly = false;

/** A new device starts with no profile: the welcome screen creates the first one. */
export function defaultState(): AppState {
  return { v: DATA_VERSION, active: "", profiles: {} };
}

/** Where unreadable data is set aside instead of being overwritten (a chance to recover it). */
const RESCUE = "takoyaki-desu-rescue";

export function isState(o: unknown): o is AppState {
  if (!o || typeof o !== "object") return false;
  const s = o as AppState;
  if (typeof s.active !== "string" || !s.profiles || typeof s.profiles !== "object") return false;
  return Object.keys(s.profiles).length === 0 || s.active in s.profiles;
}

function load(): AppState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    memoryOnly = true;
  }
  if (raw === null) return defaultState();
  try {
    const s: unknown = JSON.parse(raw);
    if (isState(s)) {
      const m = migrate(s, today());
      if (m.from !== DATA_VERSION && !m.newer) localStorage.setItem(KEY, JSON.stringify(m.state));
      return m.state;
    }
  } catch {
    /* unreadable: set aside below */
  }
  try {
    localStorage.setItem(RESCUE, raw);
  } catch {
    /* nothing more we can do */
  }
  return defaultState();
}

export let state: AppState = load();

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    memoryOnly = true;
  }
}

export function hasProfile(): boolean {
  return profiles.hasProfiles(state);
}

/** The active profile. Only call once hasProfile() is true. */
export function profile(): Profile {
  return state.profiles[state.active];
}

export function profileNames(): string[] {
  return Object.keys(state.profiles);
}

export function setActive(name: string): void {
  if (!(name in state.profiles)) return;
  state.active = name;
  save();
}

/** Each returns an error message for the user, or null on success. */
export function addProfile(name: string): string | null {
  const err = profiles.addProfile(state, name);
  if (!err) save();
  return err;
}

export function renameProfile(from: string, to: string): string | null {
  const err = profiles.renameProfile(state, from, to);
  if (!err) save();
  return err;
}

export function deleteProfile(name: string): void {
  profiles.deleteProfile(state, name);
  save();
}

/** Reads a backup without applying it: the migrated state and when it was made, or null. */
export function readBackup(text: string): { state: AppState; exportedAt?: string; newer: boolean } | null {
  try {
    const o: unknown = JSON.parse(text);
    if (!isState(o)) return null;
    const { exportedAt, appVersion: _v, ...rest } = o as Backup;
    const m = migrate(rest, today());
    return { state: m.state, exportedAt, newer: m.newer };
  } catch {
    return null;
  }
}

/** Replaces all data on this device with an imported backup. Returns false if the text is not a backup. */
export function importState(text: string): boolean {
  const b = readBackup(text);
  if (!b) return false;
  state = b.state;
  Object.values(state.profiles).forEach(checkUnlock);
  save();
  return true;
}

/** The backup file's content: the data, its format, the date and the app version. */
export function exportState(): string {
  const b: Backup = { ...state, v: DATA_VERSION, exportedAt: new Date().toISOString(), appVersion: __APP_VERSION__ };
  return JSON.stringify(b);
}
