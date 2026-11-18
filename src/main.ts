import "./styles.css";
import { checkUnlock, dayRec, today } from "./core/scheduler";
import { save, state } from "./core/store";
import { announceUpdate, setupUpdates } from "./pwa";
import { route } from "./router";
import { applyTheme } from "./ui/prefs";
import { askPersist } from "./core/backup";

applyTheme();

Object.values(state.profiles).forEach(checkUnlock);

// The day used to change at midnight, now at 4 a.m.: activity logged after midnight on the
// last evening sits on a day that has not started yet. Fold it back into today.
{
  const t = today();
  for (const p of Object.values(state.profiles)) {
    for (const [k, r] of Object.entries(p.days)) {
      if (+k <= t) continue;
      const d = dayRec(p, t);
      d.nw += r.nw;
      d.rv += r.rv;
      d.nwW = (d.nwW ?? 0) + (r.nwW ?? 0) || undefined;
      d.ex = (d.ex ?? 0) + (r.ex ?? 0) || undefined;
      delete p.days[+k];
    }
  }
  save();
}
window.addEventListener("hashchange", route);
route();
announceUpdate();

// Offline support + automatic updates (checked at launch, applied between sessions).
setupUpdates();

// Ask the browser to keep our storage (no prompt on Chrome/Android when installed).
void askPersist();
