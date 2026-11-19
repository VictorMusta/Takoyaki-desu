import { dayRec, today } from "../core/scheduler";
import { hasProfile, profile, save } from "../core/store";

/**
 * Active time, counted honestly: each touch or key press in the app adds the time since the
 * previous one, up to 30 s (a longer gap means the learner was away). An app left open on a
 * table counts nothing. Saved every 15 s of activity and when the app is hidden.
 */
const GAP = 30_000;
let last = 0, unsaved = 0;

function tick(): void {
  if (!hasProfile()) return;
  const now = Date.now();
  if (last) {
    const dt = Math.min(GAP, now - last);
    if (dt > 0) {
      const d = dayRec(profile(), today(now));
      d.sec = Math.round(((d.sec ?? 0) + dt / 1000) * 10) / 10;
      unsaved += dt;
    }
  }
  last = now;
  if (unsaved > 15_000) {
    unsaved = 0;
    save();
  }
}

export function trackActivity(): void {
  document.addEventListener("pointerdown", tick, { passive: true, capture: true });
  document.addEventListener("keydown", tick, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      last = 0; // away: the next touch starts a new stretch
      if (unsaved) save();
      unsaved = 0;
    }
  });
}
