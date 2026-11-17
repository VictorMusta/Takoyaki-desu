export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const e = root.querySelector<T>(sel);
  if (!e) throw new Error(`Missing element ${sel}`);
  return e;
}

export function $opt<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

/** Builds one element from an HTML string. */
export function el<T extends Element = HTMLElement>(html: string): T {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const STROKE_VARS = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6"];

/** Colour of stroke i (Okabe-Ito palette, readable by colour-blind users). */
export function strokeColor(i: number): string {
  return cssVar(STROKE_VARS[i % STROKE_VARS.length]);
}

export function view(): HTMLElement {
  document.body.classList.remove("with-wave");
  return $("#view");
}

/**
 * « Abandonner », shown in the header in place of the profile picker during a lesson,
 * a training round or an exam. It stays across the screens of that lesson (cards, comparison,
 * exercises); navigation rebuilds the header, and the end screens clear it.
 */
export function setQuit(onQuit: (() => void) | null): void {
  const box = document.getElementById("prof");
  if (!box) return;
  box.querySelector(".quit")?.remove();
  box.querySelector<HTMLElement>("#who")?.classList.toggle("hidden", !!onQuit);
  if (!onQuit) return;
  const b = document.createElement("button");
  b.className = "btn sm quit";
  b.textContent = "Abandonner";
  b.title = "Retour à l'accueil : ce qui a été fait est gardé";
  b.onclick = onQuit;
  box.appendChild(b);
}

/** The seigaiha frieze: home and welcome only (one motif, rarely). */
export function showWave(): void {
  document.body.classList.add("with-wave");
}

export function toast(msg: string): void {
  const t = el(`<div class="note" role="status">${msg}</div>`);
  view().prepend(t);
  setTimeout(() => t.remove(), 3500);
}

/** Escapes text before putting it in HTML (profile names are typed by users). */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
