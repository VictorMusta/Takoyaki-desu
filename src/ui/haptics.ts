/**
 * Short vibrations as feedback (Android; iPhones ignore the Vibration API).
 * Kept discreet: a tick when the brush touches the paper, a tap for a right answer,
 * a double buzz for a wrong one. A per-device setting turns them off.
 */
const KEY = "takoyaki-haptics";

export function getHaptics(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setHaptics(on: boolean): void {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    /* storage unavailable */
  }
}
export const canVibrate = () => typeof navigator !== "undefined" && "vibrate" in navigator;

const PATTERNS = {
  /** The brush touches the paper. */
  tick: 6,
  /** Right answer, « Bien ». */
  ok: 14,
  /** « Bof »: a softer double tap. */
  soft: [8, 50, 8],
  /** Wrong answer, « Raté », a check that found an error. */
  ko: [28, 70, 28],
} as const;

export function buzz(kind: keyof typeof PATTERNS): void {
  if (!getHaptics() || !canVibrate()) return;
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[]);
  } catch {
    /* some browsers throw without a user gesture */
  }
}
