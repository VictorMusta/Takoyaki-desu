import { checkUnlock, freshProfile } from "./scheduler";
import type { AppState, Profile } from "./types";

const KEY = "takoyaki-desu-v1";

/** True when the browser refuses to keep data (private mode, storage disabled). */
export let memoryOnly = false;

export function defaultState(): AppState {
  return { active: "Victor", profiles: { Victor: freshProfile(), Amandine: freshProfile() } };
}

export function isState(o: unknown): o is AppState {
  if (!o || typeof o !== "object") return false;
  const s = o as AppState;
  return typeof s.active === "string" && !!s.profiles && typeof s.profiles === "object" && s.active in s.profiles;
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

export function profile(): Profile {
  return state.profiles[state.active];
}

export function setActive(name: string): void {
  state.active = name;
  save();
}

export function addProfile(name: string): boolean {
  if (!name || state.profiles[name]) return false;
  state.profiles[name] = freshProfile();
  state.active = name;
  save();
  return true;
}

/** Replaces all data with an imported backup. Returns false if the text is not a backup. */
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
