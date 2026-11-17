import { setActive, state } from "./core/store";
import { $, el } from "./ui/dom";
import { viewExam } from "./views/exam";
import { viewHome } from "./views/home";
import { viewProgress } from "./views/progress";
import { hasSession, resetSession, viewCard } from "./views/session";
import { viewSettings } from "./views/settings";

export type Route = "seance" | "progres" | "examen" | "reglages";
const ROUTES: Route[] = ["seance", "progres", "examen", "reglages"];

function current(): Route {
  const h = location.hash.slice(1) as Route;
  return ROUTES.includes(h) ? h : "seance";
}

export function navigate(r: Route): void {
  if (current() === r) route();
  else location.hash = r;
}

function renderProfiles(): void {
  const box = $("#prof");
  box.innerHTML = "";
  Object.keys(state.profiles).forEach((n) => {
    const b = el<HTMLButtonElement>(`<button class="chip" aria-pressed="${n === state.active}"></button>`);
    b.textContent = n;
    b.onclick = () => {
      setActive(n);
      resetSession();
      route();
    };
    box.appendChild(b);
  });
}

export function route(): void {
  const r = current();
  document.querySelectorAll("nav a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + r ? "page" : "false"));
  renderProfiles();
  window.scrollTo(0, 0);
  if (r === "progres") return viewProgress();
  if (r === "examen") return viewExam();
  if (r === "reglages") return viewSettings();
  if (hasSession()) return viewCard();
  viewHome();
}
