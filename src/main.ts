import "./fonts.css";
import "./styles.css";
import { checkUnlock } from "./core/scheduler";
import { state } from "./core/store";
import { announceUpdate, setupUpdates } from "./pwa";
import { route } from "./router";
import { applyTheme } from "./ui/prefs";
import { askPersist } from "./core/backup";
import { showNews } from "./ui/news";
import { isJa, langFromUrl, startTranslation } from "./i18n";
import { renderNotesButton } from "./ui/notes";
import { trackActivity } from "./ui/activity";
import { setupSwipe } from "./ui/swipe";
import { setupReadHelp } from "./ui/readhelp";

langFromUrl();
applyTheme();
// Japanese: translate everything on screen, now and as it changes (src/i18n).
startTranslation();

Object.values(state.profiles).forEach(checkUnlock);

window.addEventListener("hashchange", route);
route();
renderNotesButton();
trackActivity();
setupReadHelp();
setupSwipe();
announceUpdate();
// « Quoi de neuf ? » is written for the French app; testers in Japanese don't need it.
if (!isJa()) showNews();

// Offline support + automatic updates (checked at launch, applied between sessions).
setupUpdates();

// Ask the browser to keep our storage (no prompt on Chrome/Android when installed).
void askPersist();
