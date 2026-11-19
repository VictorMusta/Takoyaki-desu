import { isJa } from "../i18n";
import type { Profile } from "../core/types";

const WEEKS = 18;
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Everything done on a day: new signs, reviews, new words, exercises. */
export const dayCount = (p: Profile, d: number) => {
  const r = p.days[d];
  return r ? r.nw + r.rv + (r.nwW ?? 0) + (r.ex ?? 0) : 0;
};

/** 0 (nothing) to 4 (a big day). */
export const level = (n: number) => (n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4);

/**
 * Activity over the last 18 weeks, one square per day, weeks in columns from Monday,
 * GitHub style. The squares are aria-hidden; one sentence sums it up for screen readers.
 */
export function calendarHTML(p: Profile, t: number): string {
  const dow = (d: number) => (new Date(d * 864e5).getUTCDay() + 6) % 7; // 0 = Monday
  const start = t - dow(t) - (WEEKS - 1) * 7;
  const S = 12, G = 3, top = 14, left = 0;
  let cells = "", labels = "", lastMonth = -1, lastLabel = -9, active = 0, total = 0;
  for (let w = 0; w < WEEKS; w++) {
    const first = new Date((start + w * 7) * 864e5);
    if (first.getUTCMonth() !== lastMonth && w < WEEKS - 1) {
      lastMonth = first.getUTCMonth();
      if (w - lastLabel < 3) labels = labels.replace(/<text[^>]*>[^<]*<\/text>$/, ""); // too close: keep the newer month
      lastLabel = w;
      labels += `<text x="${left + w * (S + G)}" y="9" class="cal-m">${MONTHS[lastMonth]}</text>`;
    }
    for (let i = 0; i < 7; i++) {
      const d = start + w * 7 + i;
      if (d > t) continue;
      const n = dayCount(p, d);
      if (n) (active++, (total += n));
      const today = d === t ? ' class="cal-t"' : "";
      cells += `<rect x="${left + w * (S + G)}" y="${top + i * (S + G)}" width="${S}" height="${S}" data-l="${level(n)}"${today}><title>${new Date(d * 864e5).toLocaleDateString(isJa() ? "ja-JP" : "fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })} : ${n ? n + " activité" + (n > 1 ? "s" : "") : "rien"}</title></rect>`;
    }
  }
  const W = WEEKS * (S + G) - G, H = top + 7 * (S + G) - G;
  const legend = [0, 1, 2, 3, 4].map((l) => `<i data-l="${l}"></i>`).join("");
  return `<div class="cal">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Activité des 18 dernières semaines : ${active} jour${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}, ${total} exercice${total > 1 ? "s" : ""} en tout.">${labels}${cells}</svg>
    <div class="cal-legend small muted"><span>${active} jour${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}</span><span class="cal-scale" aria-hidden="true">Moins ${legend} Plus</span></div></div>`;
}
