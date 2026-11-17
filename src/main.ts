import "./styles.css";
import { checkUnlock } from "./core/scheduler";
import { state } from "./core/store";
import { announceUpdate, setupUpdates } from "./pwa";
import { route } from "./router";
import { applyTheme } from "./ui/prefs";

applyTheme();

Object.values(state.profiles).forEach(checkUnlock);
window.addEventListener("hashchange", route);
route();
announceUpdate();

// Offline support + automatic updates (checked at launch, applied between sessions).
setupUpdates();
