import { isKata, KATA_START, LINES, lineCards, SLOTS } from "../data/kana";
import { el } from "./dom";

/** Lines a to wa (with ん), then the voiced lines and the small signs. */
const BASIC = 10;
const PER_SCRIPT = LINES.length / 2;

/** Kana as typed by a phone keyboard: hiragana, katakana and the long-vowel bar. */
export const isKanaChar = (c: string) => {
  const n = c.codePointAt(0) ?? 0;
  return (n >= 0x3041 && n <= 0x3096) || (n >= 0x30a1 && n <= 0x30fa) || n === 0x30fc;
};

/**
 * A kana keyboard laid out like the table of 50 sounds: one column per line (あいうえお from top
 * to bottom), only the lines with at least one sign already seen, and blank keys for the signs
 * not seen yet (no unknown signs to guess from). `text` is the expected answer: the keyboard
 * opens on its script and offers a あ / ア switch only when both are useful.
 */
export function kanaKeyboard(known: Set<string>, onKey: (k: string) => void, onBack?: () => void, text = ""): HTMLElement {
  const block = (from: number, to: number) => {
    let cols = "", n = 0;
    for (let i = from; i < to; i++) {
      const cs = lineCards(i);
      if (!cs.some((c) => known.has(c.k))) continue;
      n++;
      (SLOTS[LINES[i]] ?? [0, 1, 2, 3, 4]).forEach((s) => {
        const k = s === null ? null : cs[s]?.k;
        cols += k && known.has(k) ? `<button class="key" type="button" data-k="${k}">${k}</button>` : `<span class="key off" aria-hidden="true"></span>`;
      });
    }
    return n ? `<div class="kbd-grid" style="--cols:${n}">${cols}</div>` : "";
  };
  const page = (s: number) => block(s * PER_SCRIPT, s * PER_SCRIPT + BASIC) + block(s * PER_SCRIPT + BASIC, (s + 1) * PER_SCRIPT);
  const pages = [page(0), page(1)];
  const hasKata = [...text].some(isKata), hasHira = [...text].some((c) => isKanaChar(c) && !isKata(c));
  let shown = (hasKata && !hasHira) || !pages[0] ? 1 : 0;
  const both = pages[0] && pages[1] && (!text || (hasKata && hasHira));
  const box = el(`<div class="kbd" role="group" aria-label="Clavier kana">
    ${both ? `<div class="kbd-tabs"><button class="key" type="button" data-s="0">あ</button><button class="key" type="button" data-s="1">ア</button></div>` : ""}
    <div class="kbd-page"></div>
    ${onBack ? `<button class="key back" type="button" data-back aria-label="Effacer le dernier signe">⌫</button>` : ""}</div>`);
  const show = (s: number) => {
    shown = s;
    box.querySelector(".kbd-page")!.innerHTML = pages[s];
    box.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.classList.toggle("sel", b.dataset.s === String(s)));
  };
  show(shown);
  box.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b) return;
    if (b.dataset.s) show(+b.dataset.s);
    else if (b.dataset.back !== undefined) onBack?.();
    else if (b.dataset.k) onKey(b.dataset.k);
  };
  return box;
}

void KATA_START;

/**
 * A text field for the phone's own Japanese keyboard. It calls `onText` with the kana typed,
 * once the keyboard has finished composing (never in the middle of a word being converted).
 */
export function kanaField(onText: (kana: string[]) => void, onEnter?: () => void): HTMLInputElement {
  const f = el<HTMLInputElement>(`<input class="text kana-in" lang="ja" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="ou le clavier japonais du téléphone" aria-label="Taper avec le clavier japonais du téléphone">`);
  let composing = false;
  const sync = () => onText([...f.value].filter(isKanaChar));
  f.addEventListener("compositionstart", () => (composing = true));
  f.addEventListener("compositionend", () => { composing = false; sync(); });
  f.addEventListener("input", (e) => { if (!composing && !(e as InputEvent).isComposing) sync(); });
  f.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); onEnter?.(); } });
  return f;
}
