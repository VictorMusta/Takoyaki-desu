import { MNEMO } from "../data/mnemonics";
import { profile } from "../core/store";
import { esc } from "./dom";

/** The learner's own hook if they wrote one, else the app's. */
export function mnemoText(k: string): string {
  return profile()?.mnemos?.[k] || MNEMO[k] || "";
}

/**
 * The sign's memory hook behind a circled « i ». Open at discovery and on the fiche;
 * folded on the comparison. During recall it is « Indice 1 » (grade capped at Bof).
 */
export function mnemoHTML(k: string, open: boolean): string {
  const own = profile()?.mnemos?.[k];
  const m = mnemoText(k);
  if (!m) return "";
  return `<details class="mnemo"${open ? " open" : ""}><summary><span class="ii" aria-hidden="true">i</span>${own ? "Mon astuce pour" : "Astuce pour retenir"} ${k}</summary><p>${esc(m)}</p>${
    own && MNEMO[k] ? `<p class="small muted">L'astuce de l'appli : ${MNEMO[k]}</p>` : ""
  }</details>`;
}
