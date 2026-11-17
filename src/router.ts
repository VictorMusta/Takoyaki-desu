import { hasProfile, profileNames, setActive, state } from "./core/store";
import { $, el, esc } from "./ui/dom";
import { viewExam } from "./views/exam";
import { viewHome } from "./views/home";
import { viewProgress } from "./views/progress";
import { hasSession, resetSession, viewCard } from "./views/session";
import { viewSettings } from "./views/settings";
import { viewWelcome } from "./views/welcome";
import { maybeApplyUpdate } from "./pwa";

export type Route = "seance" | "progres" | "examen" | "reglages";
const ROUTES: Route[] = ["seance", "progres", "examen", "reglages"];
const NEW = "__new__";

function current(): Route {
  const h = location.hash.slice(1) as Route;
  return ROUTES.includes(h) ? h : "seance";
}

export function navigate(r: Route): void {
  if (current() === r) route();
  else location.hash = r;
}

/** Profile picker in the header: switch person, or jump to « add a profile ». */
function renderProfiles(): void {
  const box = $("#prof");
  box.innerHTML = "";
  if (!hasProfile()) return;
  const opts = profileNames()
    .map((n) => `<option value="${esc(n)}" ${n === state.active ? "selected" : ""}>${esc(n)}</option>`)
    .join("");
  const sel = el<HTMLSelectElement>(`<select id="who" class="who" aria-label="Profil">${opts}<option value="${NEW}">＋ Nouveau profil</option></select>`);
  sel.onchange = () => {
    if (sel.value === NEW) {
      sel.value = state.active;
      sessionStorageSafe("focus-new-profile");
      navigate("reglages");
      return;
    }
    setActive(sel.value);
    resetSession();
    route();
  };
  box.appendChild(sel);
}

/** Leaves a one-shot flag for the settings view (focus the new-profile field). */
function sessionStorageSafe(flag: string): void {
  try {
    sessionStorage.setItem(flag, "1");
  } catch {
    /* ignore */
  }
}

/** Screen transition: fade + 8 px rise (400 ms), replayed on each navigation only. */
function enter(): void {
  const v = $("#view");
  v.classList.remove("enter");
  void v.offsetWidth;
  v.classList.add("enter");
}

export function route(): void {
  maybeApplyUpdate();
  const r = current();
  const nav = $("nav");
  renderProfiles();
  window.scrollTo(0, 0);
  enter();
  if (!hasProfile()) {
    nav.classList.add("hidden");
    return viewWelcome();
  }
  nav.classList.remove("hidden");
  nav.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + r ? "page" : "false"));
  if (r === "progres") return viewProgress();
  if (r === "examen") return viewExam();
  if (r === "reglages") return viewSettings();
  if (hasSession()) return viewCard();
  viewHome();
}
