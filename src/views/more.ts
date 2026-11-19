import { LINES, lineLabel } from "../data/kana";
import { dueCount, unseenOpen, today } from "../core/scheduler";
import { profile, save } from "../core/store";
import { el } from "../ui/dom";
import type { SessionKind } from "./session";

/**
 * « Continuer » once today's lesson is done. Three safe ways to go on:
 * - free practice (unlimited, never changes review dates);
 * - five more new signs, only when today's reviews are done, showing tomorrow's load;
 * - open the next line when every sign of the open lines has been studied.
 */
export function continueBlock(box: HTMLElement, start: (k: SessionKind) => void): void {
  const p = profile(), t = today();
  const seen = Object.values(p.cards).some((c) => c.seen);
  const dueNow = dueCount(p, t), unseen = unseenOpen(p);
  const opt = (id: string, title: string, sub: string) =>
    `<button class="btn opt" id="${id}"><span>${title}</span><small>${sub}</small></button>`;
  let html = "";
  // « Sans limite »: the next batch first, practice after.
  const prac = seen ? opt("m-prac", "Réviser encore", "10 signes, les plus fragiles d'abord. Sans limite, et sans changer vos dates de révision.") : "";
  if (seen && !p.settings.intensive) html += opt("m-prac", "Réviser encore", "10 signes, les plus fragiles d'abord. Sans limite, et sans changer vos dates de révision.");
  if (dueNow > 0) {
    html += `<p class="small muted" style="margin:0">Encore ${dueNow} révision(s) prévue(s) aujourd'hui au-delà de votre plafond : faites-les avant d'apprendre de nouveaux signes.</p>`;
  } else if (unseen > 0) {
    const n = Math.min(5, unseen);
    html += opt("m-more", `${n} signe${n > 1 ? "s" : ""} de plus`, `Demain : environ ${dueCount(p, t + 1) + n} révisions.`);
  } else if (p.settings.intensive && p.unlocked < LINES.length) {
    // « Sans limite »: the next line opens by itself, as just one more batch.
    html += opt("m-line", `5 signes de plus · ligne « ${lineLabel(LINES[p.unlocked])} »`, `Demain : environ ${dueCount(p, t + 1) + 5} révisions.`);
  } else if (p.unlocked < LINES.length) {
    html += opt("m-line", `Ouvrir la ligne « ${lineLabel(LINES[p.unlocked])} » et continuer`, "D'habitude, elle s'ouvre quand 80 % de la ligne précédente tient 3 jours. Vous pouvez aller plus vite.");
  } else if (!seen) {
    html += `<p class="small muted" style="margin:0">Rien d'autre pour l'instant.</p>`;
  }
  if (p.settings.intensive) html += prac;
  box.replaceChildren(el(`<div class="opts">${html}</div>`));
  if (p.settings.intensive) box.querySelector("#m-more, #m-line")?.classList.add("primary-opt");
  const on = (id: string, f: () => void) => {
    const b = box.querySelector<HTMLButtonElement>("#" + id);
    if (b) b.onclick = f;
  };
  on("m-prac", () => start("practice"));
  on("m-more", () => start("more"));
  on("m-line", () => {
    p.unlocked++;
    save();
    start("more");
  });
}
