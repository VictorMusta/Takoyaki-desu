/** Device-level preferences (not per profile): the colour theme. */
export type Theme = "auto" | "light" | "dark";
const KEY = "takoyaki-theme";

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Applies the theme on <html data-theme> and the browser bar colour. */
export function applyTheme(t: Theme = getTheme()): void {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  const [light, dark] = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (!light || !dark) return;
  // auto: one colour per system scheme · forced: both metas carry the chosen colour
  light.content = t === "dark" ? "#1F1C17" : "#EAE0CC";
  dark.content = t === "light" ? "#EAE0CC" : "#1F1C17";
}

export function setTheme(t: Theme): void {
  try {
    if (t === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  applyTheme(t);
}

/** The three daily paces, with honest landmarks (no invented statistics). */
export const PACES = [
  { n: 5, name: "Tranquille", sub: "Tout l'alphabet en 10 jours environ, 10 à 15 min par jour." },
  { n: 10, name: "Soutenu", sub: "En 5 jours environ, 20 à 25 min par jour. Recommandé." },
  { n: 15, name: "Intensif", sub: "En 3 à 4 jours, environ 35 min par jour, puis beaucoup de révisions les jours suivants." },
];

/** Radio cards for the pace; a custom value from Réglages shows as « Personnalisé ». */
export function paceHTML(current: number, name = "pace"): string {
  const known = PACES.some((p) => p.n === current);
  return `<fieldset class="pace"><legend class="sr-only">Nouveaux signes par jour</legend>${PACES.map(
    (p) =>
      `<label class="opt"><input type="radio" name="${name}" value="${p.n}" ${p.n === current ? "checked" : ""}><span>${p.name} · ${p.n} par jour</span><small>${p.sub}</small></label>`,
  ).join("")}${known ? "" : `<p class="small muted" style="margin:0">Actuellement : ${current} par jour (personnalisé).</p>`}</fieldset>`;
}
