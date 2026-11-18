import { LINES, lineCards, SLOTS } from "../data/kana";
import { el } from "./dom";


/**
 * A kana keyboard laid out as the table of 50 sounds, showing only the signs already seen
 * (no auto-conversion to kanji, no unknown signs to guess from).
 */
export function kanaKeyboard(known: Set<string>, onKey: (k: string) => void, onBack?: () => void): HTMLElement {
  let keys = "";
  LINES.forEach((ln, i) => {
    const cs = lineCards(i);
    (SLOTS[ln] ?? [0, 1, 2, 3, 4]).forEach((s) => {
      const k = s === null ? null : cs[s]?.k;
      keys += k && known.has(k) ? `<button class="key" data-k="${k}">${k}</button>` : `<span class="key off" aria-hidden="true"></span>`;
    });
  });
  const box = el(`<div class="kbd" role="group" aria-label="Clavier hiragana">${keys}${onBack ? `<button class="key back" data-back aria-label="Effacer le dernier signe">⌫</button>` : ""}</div>`);
  box.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b) return;
    if (b.dataset.back !== undefined) onBack?.();
    else if (b.dataset.k) onKey(b.dataset.k);
  };
  return box;
}
