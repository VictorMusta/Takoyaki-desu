import { EXAMPLES, NOTES } from "../data/examples";
import { byK } from "../data/kana";

const FONTS: [cls: string, name: string, use: string][] = [
  ["f-kyo", "Manuscrit", "kyōkasho"],
  ["f-min", "Mincho", "imprimé"],
  ["f-got", "Gothique", "panneaux"],
  ["f-maru", "Arrondi", "enseignes"],
  ["f-fude", "Pinceau", "calligraphie"],
];

/** The sign in the common typefaces, its stroke count, example words and reading notes. */
export function ficheHTML(k: string): string {
  const K = byK[k];
  const tiles = FONTS.map(([cls, name, use]) => `<div class="ft"><b class="${cls}">${k}</b><span>${name}</span><span>${use}</span></div>`).join("");
  const ex = (EXAMPLES[k] ?? [])
    .map(([w, r, fr]) => `<dt>${w.split(k).join(`<mark>${k}</mark>`)}</dt><span class="rj">${r}</span><dd>${fr}</dd>`)
    .join("");
  const n = K.s.length;
  return `<div class="fiche"><div class="fonts">${tiles}</div>
    <p class="small muted" style="margin:0">${n} trait${n > 1 ? "s" : ""} · le modèle d'écriture est la forme « manuscrit » (manuels scolaires).</p>
    <dl class="ex">${ex}</dl>${NOTES[k] ? `<p class="note" style="margin:0">${NOTES[k]}</p>` : ""}</div>`;
}
