import { el } from "./dom";

/**
 * First-time bubbles: one sentence, shown once on this device the first time a screen or a
 * moment comes up, closed with a tap, never blocking. Réglages › « Revoir les bulles » brings
 * them all back.
 */
const KEY = "takoyaki-coach";

const seen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};
const keep = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode: the bubble may come back, no harm */
  }
};

export const coachSeen = (id: string) => seen().includes(id);
export const resetCoach = () => {
  keep([]);
  try {
    localStorage.removeItem("takoyaki-coach-shown");
  } catch {
    /* ignore */
  }
};

/** Times shown without « Compris »: a screen drawn again (reload, back) shows it again, up to 3 times. */
const SHOWN = "takoyaki-coach-shown";
const MAX_SHOWN = 3;
const shownCounts = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(SHOWN) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
};

/** The bubble for `id` if not closed yet, else null. Insert it where it belongs. */
export function coach(id: string, text: string): HTMLElement | null {
  if (coachSeen(id)) return null;
  const n = shownCounts();
  n[id] = (n[id] ?? 0) + 1;
  try {
    localStorage.setItem(SHOWN, JSON.stringify(n));
  } catch {
    /* ignore */
  }
  if (n[id] >= MAX_SHOWN) keep([...seen(), id]);
  const b = el(`<aside class="coach" role="note"><p>${text}</p><button class="btn sm" type="button">Compris</button></aside>`);
  b.querySelector("button")!.onclick = () => {
    keep([...new Set([...seen(), id])]);
    b.remove();
  };
  return b;
}

/** Puts the bubble before `ref` (or at the end of `parent`). */
export function coachAt(id: string, text: string, parent: Element, ref?: Element | null): void {
  const b = coach(id, text);
  if (b) parent.insertBefore(b, ref ?? null);
}
