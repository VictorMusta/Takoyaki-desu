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
  return $("#view");
}

export function toast(msg: string): void {
  const t = el(`<div class="note" role="status">${msg}</div>`);
  view().prepend(t);
  setTimeout(() => t.remove(), 3500);
}
