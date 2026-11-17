import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import { checkUnlock } from "./core/scheduler";
import { state } from "./core/store";
import { route } from "./router";

Object.values(state.profiles).forEach(checkUnlock);
window.addEventListener("hashchange", route);
route();

// Offline support: caches the app; updates install themselves on the next launch.
registerSW({ immediate: true });
