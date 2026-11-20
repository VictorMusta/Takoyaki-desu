import { breakdown, hasRule } from "../core/reading";
import { esc } from "./dom";

/**
 * « Comment ça se lit ? » : touch a word marked data-read (or this button) to see it sound by
 * sound, with the reading rule at work for each piece, and a link to all the rules.
 */
const KANA_ONLY = /^[ぁ-ゖァ-ヺー\s|、。！？]+$/u;
/** Worth marking: kana only (no kanji the breakdown could not read). */
export const readable = (text: string) => KANA_ONLY.test(text);

/** The button shown after an answer when the word or sentence has a reading rule in it. */
export const readButton = (text: string) =>
  readable(text) && hasRule(text) ? `<button class="btn sm read-btn" type="button" data-read="${esc(text)}">Comment ça se lit ?</button>` : "";

export function showReading(text: string): void {
  const blocks = breakdown(text);
  const rows = blocks
    .map((b) =>
      b
        .map((p) => `<tr class="${p.rule ? "rule" : ""}"><td class="kana-l">${p.kana}</td><td class="rd-r">${p.r}</td><td class="small">${p.why ? esc(p.why) : ""}</td></tr>`)
        .join(""),
    )
    .join(`<tr class="sep"><td colspan="3"></td></tr>`);
  const box = document.createElement("div");
  box.className = "modal";
  box.innerHTML = `<div class="modal-card card read-card" role="dialog" aria-modal="true" aria-labelledby="rdt">
    <h2 id="rdt" class="kana-l">${esc(text.replace(/\|/g, " "))}</h2>
    <p class="rd-all" style="margin:0">${blocks.map((b) => b.map((p) => p.r).join("")).join(" ")}</p>
    <table class="read-table" data-noi18n>${rows}</table>
    <div class="row"><button class="btn primary" data-a="ok">Fermer</button><a class="btn" href="#lecture" data-a="rules">Toutes les règles</a></div></div>`;
  const close = () => {
    box.remove();
    document.removeEventListener("keydown", key);
  };
  const key = (e: KeyboardEvent) => e.key === "Escape" && close();
  box.onclick = (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]");
    if (a || e.target === box) close();
  };
  document.addEventListener("keydown", key);
  document.body.appendChild(box);
  box.querySelector<HTMLButtonElement>('[data-a="ok"]')!.focus({ preventScroll: true });
}

/** Once, at start: any element with data-read opens its breakdown. */
export function setupReadHelp(): void {
  document.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-read]");
    if (!t || t.closest(".modal")) return;
    e.preventDefault();
    showReading(t.dataset.read!);
  });
}
