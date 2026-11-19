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

/**
 * The daily paces, with honest landmarks (estimates, no invented statistics). A new sign takes
 * about a minute and a half (three tracing steps, two recalls); reviews then grow for a week.
 * Value 0 = « Sans limite »: batches of 5, as many as wanted.
 */
export const PACES = [
  { n: 5, name: "Tranquille", sub: "Les 75 hiragana en 3 à 4 semaines. Environ 10 min par jour au début, 15 ensuite." },
  { n: 10, name: "Soutenu", sub: "Les hiragana en 2 semaines environ, 15 à 25 min par jour. Recommandé." },
  { n: 15, name: "Intensif", sub: "Les hiragana en 10 jours environ, 25 à 35 min par jour." },
  { n: 0, name: "Sans limite", sub: "Par lots de 5, autant que vous voulez chaque jour ; la ligne suivante s'ouvre d'elle-même. Chaque signe appris revient ensuite en révision : les jours suivants s'alourdissent d'autant." },
];

/** Radio cards for the pace; a custom value from Réglages shows as « Personnalisé ». */
export function paceHTML(current: number, name = "pace", intensive = false): string {
  const cur = intensive ? 0 : current;
  const known = PACES.some((p) => p.n === cur);
  return `<fieldset class="pace"><legend class="sr-only">Nouveaux signes par jour</legend>${PACES.map(
    (p) =>
      `<label class="opt"><input type="radio" name="${name}" value="${p.n}" ${p.n === cur ? "checked" : ""}><span>${p.n ? `${p.name} · ${p.n} par jour` : p.name}</span><small>${p.sub}</small></label>`,
  ).join("")}${known ? "" : `<p class="small muted" style="margin:0">Actuellement : ${current} par jour (personnalisé).</p>`}</fieldset>`;
}

/** Applies a pace choice (0 = « Sans limite », batches of 5). */
export function setPace(s: { newPerDay: number; intensive?: boolean }, n: number): void {
  s.intensive = n === 0;
  s.newPerDay = n === 0 ? 5 : n;
}
