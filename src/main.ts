import "./styles.css";
import { checkUnlock } from "./core/scheduler";
import { state } from "./core/store";
import { announceUpdate, setupUpdates } from "./pwa";
import { route } from "./router";
import { applyTheme } from "./ui/prefs";
import { askPersist } from "./core/backup";

applyTheme();

Object.values(state.profiles).forEach(checkUnlock);

window.addEventListener("hashchange", route);
route();
announceUpdate();

// Offline support + automatic updates (checked at launch, applied between sessions).
setupUpdates();

// Ask the browser to keep our storage (no prompt on Chrome/Android when installed).
void askPersist();
