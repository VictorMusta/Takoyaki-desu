import { freshProfile } from "./scheduler";
import type { AppState } from "./types";

export const MAX_NAME = 24;

/** Returns an error message, or null when the name can be used. */
export function nameError(s: AppState, name: string, except?: string): string | null {
  const n = name.trim();
  if (!n) return "Entrez un prénom.";
  if (n.length > MAX_NAME) return `${MAX_NAME} caractères maximum.`;
  const taken = Object.keys(s.profiles).some((p) => p !== except && p.toLowerCase() === n.toLowerCase());
  return taken ? "Ce prénom existe déjà sur cet appareil." : null;
}

export function addProfile(s: AppState, name: string): string | null {
  const err = nameError(s, name);
  if (err) return err;
  const n = name.trim();
  s.profiles[n] = freshProfile();
  s.active = n;
  return null;
}

export function renameProfile(s: AppState, from: string, to: string): string | null {
  if (!(from in s.profiles)) return "Profil introuvable.";
  const err = nameError(s, to, from);
  if (err) return err;
  const n = to.trim();
  if (n === from) return null;
  // Rebuild to keep the profile's position in the list.
  s.profiles = Object.fromEntries(Object.entries(s.profiles).map(([k, v]) => [k === from ? n : k, v]));
  if (s.active === from) s.active = n;
  return null;
}

export function deleteProfile(s: AppState, name: string): void {
  delete s.profiles[name];
  if (s.active === name) s.active = Object.keys(s.profiles)[0] ?? "";
}

export function hasProfiles(s: AppState): boolean {
  return Object.keys(s.profiles).length > 0 && s.active in s.profiles;
}
