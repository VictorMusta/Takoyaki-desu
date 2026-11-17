import * as profiles from "./profiles";
import { checkUnlock } from "./scheduler";
import type { AppState, Profile } from "./types";

const KEY = "takoyaki-desu-v1";

/** True when the browser refuses to keep data (private mode, storage disabled). */
export let memoryOnly = false;

/** A new device starts with no profile: the welcome screen creates the first one. */
export function defaultState(): AppState {
  return { active: "", profiles: {} };
}

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
  try {
    const s: unknown = JSON.parse(raw ?? "null");
    if (isState(s)) return s;
  } catch {
    /* corrupt data: start fresh */
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

/** Replaces all data on this device with an imported backup. Returns false if the text is not a backup. */
export function importState(text: string): boolean {
  try {
    const o: unknown = JSON.parse(text);
    if (!isState(o)) return false;
    state = o;
    Object.values(state.profiles).forEach(checkUnlock);
    save();
    return true;
  } catch {
    return false;
  }
}

export function exportState(): string {
  return JSON.stringify(state);
}
