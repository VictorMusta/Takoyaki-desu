import { registerSW } from "virtual:pwa-register";
import { toast } from "./ui/dom";
import { examRunning } from "./views/exam";
import { hasSession } from "./views/session";

const HOUR = 60 * 60 * 1000;
const FLAG = "takoyaki-updated";

let apply: ((reload?: boolean) => Promise<void>) | null = null;
let pending = false;

/** A session or an exam in progress would be lost by a reload. */
const busy = () => hasSession() || examRunning();

/** Installs the waiting update now if nothing would be lost. Called at launch and on every screen change. */
export function maybeApplyUpdate(): void {
  if (!pending || !apply || busy()) return;
  pending = false;
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
  void apply(true);
}

/**
 * Automatic updates:
 * - at launch, the service worker checks for a new version;
 * - it checks again whenever the app comes back to the foreground
 *   (an installed PWA is often resumed rather than relaunched) and every hour;
 * - a new version is applied (reload) right away, or at the end of the
 *   current session or exam, never in the middle of one.
 */
export function setupUpdates(): void {
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      if (busy()) toast("Nouvelle version prête : elle s'installera à la fin de la séance.");
      maybeApplyUpdate();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine && !reg.installing) reg.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      setInterval(check, HOUR);
    },
  });
}

/** Shown once after the reload that installed an update. */
export function announceUpdate(): void {
  try {
    if (!sessionStorage.getItem(FLAG)) return;
    sessionStorage.removeItem(FLAG);
    toast("Appli mise à jour.");
  } catch {
    /* ignore */
  }
}
