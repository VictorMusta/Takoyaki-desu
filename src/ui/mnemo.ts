import { MNEMO } from "../data/mnemonics";

/**
 * The sign's memory hook behind a circled « i ». Open at discovery and on the fiche;
 * folded on the comparison (a help after writing, never during recall or the exam).
 */
export function mnemoHTML(k: string, open: boolean): string {
  const m = MNEMO[k];
  if (!m) return "";
  return `<details class="mnemo"${open ? " open" : ""}><summary><span class="ii" aria-hidden="true">i</span>Astuce pour retenir ${k}</summary><p>${m}</p></details>`;
}
