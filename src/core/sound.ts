/**
 * « Sans son » : no game that needs sound, no sound played on its own. Either for a while
 * (on the train: until the app is reopened, at most a few hours) or always (a setting).
 * Device-wide, like the theme.
 */
const ALWAYS = "takoyaki-silent";
const FOR_NOW = "takoyaki-quiet";
const FOR_NOW_MS = 3 * 3600_000;

const get = (s: Storage | undefined, k: string) => { try { return s?.getItem(k) ?? null; } catch { return null; } };
const set = (s: Storage | undefined, k: string, v: string | null) => {
  try { if (v === null) s?.removeItem(k); else s?.setItem(k, v); } catch { /* private mode */ }
};
const local = () => (typeof localStorage === "undefined" ? undefined : localStorage);
const session = () => (typeof sessionStorage === "undefined" ? undefined : sessionStorage);

export const silentAlways = (): boolean => get(local(), ALWAYS) === "1";
export const setSilentAlways = (on: boolean) => set(local(), ALWAYS, on ? "1" : null);

/** Quiet for now: kept for this opening of the app, and never more than a few hours. */
export const quietNow = (): boolean => Date.now() - Number(get(session(), FOR_NOW) ?? 0) < FOR_NOW_MS;
export const setQuietNow = (on: boolean) => set(session(), FOR_NOW, on ? String(Date.now()) : null);

export const soundOff = (): boolean => silentAlways() || quietNow();
