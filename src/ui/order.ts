import { el, esc } from "./dom";

/**
 * Put blocks of signs back in order: touch a block to add it to the sentence, touch it in the
 * sentence to take it back. « Vérifier » once every place is filled. `hints` is the reading
 * shown under a block (empty when its signs are known well enough).
 */
export function orderBoard(tiles: string[], hints: string[], places: number, onCheck: (order: number[], board: HTMLElement) => void): HTMLElement {
  const picked: number[] = [];
  const tile = (i: number) => `<button class="btn otile" type="button" data-i="${i}"><span class="kana-l">${esc(tiles[i])}</span>${hints[i] ? `<small>${esc(hints[i])}</small>` : ""}</button>`;
  const box = el(`<div class="order"><div class="order-line" aria-live="polite"></div><div class="order-bank"></div><button class="btn primary big" type="button" disabled>Vérifier</button></div>`);
  const line = box.querySelector<HTMLElement>(".order-line")!, bank = box.querySelector<HTMLElement>(".order-bank")!;
  const chk = box.querySelector<HTMLButtonElement>(".btn.primary")!;
  const paint = () => {
    line.innerHTML = picked.length ? picked.map(tile).join("") : `<span class="small muted">Touchez les blocs dans l'ordre.</span>`;
    bank.innerHTML = tiles.map((_, i) => (picked.includes(i) ? "" : tile(i))).join("");
    chk.disabled = picked.length !== places;
  };
  line.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-i]");
    if (!b || box.dataset.done) return;
    picked.splice(picked.indexOf(+b.dataset.i!), 1);
    paint();
  };
  bank.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-i]");
    if (!b || box.dataset.done || picked.length >= places) return;
    picked.push(+b.dataset.i!);
    paint();
  };
  chk.onclick = () => {
    box.dataset.done = "1";
    chk.remove();
    bank.remove();
    onCheck(picked.slice(), box);
  };
  paint();
  return box;
}

/** Marks the placed blocks right or wrong after the check. */
export function markOrder(box: HTMLElement, ok: boolean[]): void {
  box.querySelectorAll<HTMLElement>(".order-line [data-i]").forEach((b, i) => {
    b.classList.add(ok[i] ? "right" : "wrong");
    (b as HTMLButtonElement).disabled = true;
  });
}

/** A mixed order of n blocks that is never the right one (when n > 1). */
export function mixed(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return a;
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  } while (a.every((x, i) => x === i));
  return a;
}
