import { byK } from "../data/kana";
import { cssVar, strokeColor } from "./dom";

export type Point = [number, number];
export type Stroke = Point[];

/** How the model is drawn: plain ink + timed reveal, coloured, animated, stencils, ghost or nothing. */
export type ModelMode = "learn" | "color" | "anim" | "stencil" | "faded" | "ghost" | "blank";

const C = 54.5; // centre of the 109 × 109 box

export function startOf(d: string): Point {
  const m = d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
  return m ? [+m[1], +m[2]] : [0, 0];
}

function guides(): string {
  const g = cssVar("--guide");
  return `<line x1="54.5" y1="4" x2="54.5" y2="105" stroke="${g}" stroke-dasharray="3 3"/><line x1="4" y1="54.5" x2="105" y2="54.5" stroke="${g}" stroke-dasharray="3 3"/>`;
}

function markers(n: number): string {
  let m = "";
  for (let i = 0; i < n; i++) {
    m += `<marker id="ar${i}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="2.4" markerHeight="2.4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${strokeColor(i)}"/></marker>`;
  }
  return `<defs>${m}</defs>`;
}

/** Stroke number in a small disc, pushed away from the centre so it does not cover the stroke. */
export function numLabel(x: number, y: number, i: number, show: boolean): string {
  if (!show) return "";
  const dx = x - C, dy = y - C, L = Math.hypot(dx, dy) || 1;
  const nx = Math.min(103, Math.max(6, x + (7 * dx) / L));
  const ny = Math.min(103, Math.max(6, y + (7 * dy) / L));
  return `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="4.4" fill="${strokeColor(i)}" stroke="${cssVar("--card")}" stroke-width="0.8"/><text x="${nx.toFixed(1)}" y="${(ny + 1.9).toFixed(1)}" text-anchor="middle" font-size="5.4" font-weight="700" fill="#fff" font-family="system-ui">${i + 1}</text>`;
}

const round = `stroke-linecap="round" stroke-linejoin="round"`;

export function modelSVG(k: string, mode: ModelMode, showNums: boolean): string {
  const K = byK[k];
  let body = guides();
  const nums = (always = false) => K.s.map((d, i) => numLabel(...startOf(d), i, always || showNums)).join("");
  switch (mode) {
    case "learn":
      body += markers(K.s.length);
      body += `<g class="base" style="transition:opacity .5s ease">`;
      K.s.forEach((d, i) => {
        body += `<path class="bp" data-c="${strokeColor(i)}" d="${d}" fill="none" stroke="${cssVar("--ink")}" stroke-width="4.6" ${round} style="transition:stroke .45s ease"/>`;
      });
      body += `</g><g class="over" style="opacity:0">`;
      K.s.forEach((d, i) => {
        body += `<path class="mp" d="${d}" fill="none" stroke="${strokeColor(i)}" stroke-width="4.2" ${round} marker-end="url(#ar${i})"/>`;
      });
      body += `</g><g class="nums" style="opacity:0;transition:opacity .3s">${nums()}</g>`;
      break;
    case "color":
    case "anim":
      body += markers(K.s.length);
      K.s.forEach((d, i) => {
        body += `<path class="mp" d="${d}" fill="none" stroke="${strokeColor(i)}" stroke-width="4.2" ${round} marker-end="url(#ar${i})"/>`;
      });
      body += nums();
      break;
    case "stencil":
      K.s.forEach((d) => {
        body += `<path d="${d}" fill="none" stroke="${cssVar("--stencil")}" stroke-width="9" ${round}/>`;
      });
      body += nums(true);
      break;
    case "faded":
      K.s.forEach((d) => {
        body += `<path d="${d}" fill="none" stroke="${cssVar("--stencil")}" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;
      });
      K.s.forEach((d, i) => {
        const [x, y] = startOf(d);
        body += `<circle cx="${x}" cy="${y}" r="3.2" fill="${strokeColor(i)}"/>`;
      });
      break;
    case "ghost":
      K.s.forEach((d, i) => {
        body += `<path d="${d}" fill="none" stroke="${strokeColor(i)}" stroke-opacity=".4" stroke-width="5" stroke-linecap="round"/>`;
      });
      break;
    case "blank":
      break;
  }
  return `<svg viewBox="0 0 109 109" aria-hidden="true">${body}</svg>`;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Draws the coloured strokes one after the other. */
export function animate(svg: Element): void {
  svg.querySelectorAll<SVGPathElement>(".mp").forEach((p, i) => {
    if (reduced() || !p.getTotalLength) return;
    const L = p.getTotalLength();
    p.style.strokeDasharray = `${L}`;
    p.style.strokeDashoffset = `${L}`;
    p.setAttribute("marker-end", "");
    const a = p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], {
      duration: 650,
      delay: i * 800 + 200,
      fill: "forwards",
      easing: "ease-in-out",
    });
    a.onfinish = () => p.setAttribute("marker-end", `url(#ar${i})`);
  });
}

/** Discovery: plain sign → coloured strokes → faded → animated strokes with arrows on top. */
export function learnSeq(svg: Element): void {
  const base = svg.querySelector<SVGGElement>(".base");
  const over = svg.querySelector<SVGGElement>(".over");
  const nums = svg.querySelector<SVGGElement>(".nums");
  if (!base || !over || !nums) return;
  svg.querySelectorAll<SVGPathElement>(".bp").forEach((p) => p.setAttribute("stroke", p.dataset.c ?? ""));
  if (reduced()) {
    base.style.opacity = ".15";
    over.style.opacity = "1";
    nums.style.opacity = "1";
    return;
  }
  setTimeout(() => (base.style.opacity = ".15"), 800);
  setTimeout(() => {
    over.style.opacity = "1";
    nums.style.opacity = "1";
    animate(svg);
  }, 1400);
}

/** The user's strokes, recoloured in drawing order, light → dark along each stroke, arrow at the end. */
export function userSVG(strokes: Stroke[], showNums: boolean, under = ""): string {
  let grads = "";
  let body = "";
  strokes.forEach((st, i) => {
    const c = strokeColor(i), n = st.length, a = st[0], z = st[n - 1];
    const same = Math.hypot(z[0] - a[0], z[1] - a[1]) < 1;
    grads += `<linearGradient id="ug${i}" gradientUnits="userSpaceOnUse" x1="${a[0]}" y1="${a[1]}" x2="${same ? a[0] + 1 : z[0]}" y2="${same ? a[1] : z[1]}"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="1"/></linearGradient>`;
    const pts = st.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    body += `<polyline points="${pts}" fill="none" stroke="url(#ug${i})" stroke-width="4.2" ${round}/>`;
    if (n > 2) {
      const b = st[Math.max(0, n - 4)];
      body += `<path d="M${b[0]},${b[1]} L${z[0]},${z[1]}" stroke="${c}" stroke-width="4.2" fill="none" stroke-linecap="round" marker-end="url(#ar${i})"/>`;
    }
  });
  strokes.forEach((st, i) => (body += numLabel(st[0][0], st[0][1], i, showNums)));
  const defs = markers(strokes.length).replace("<defs>", `<defs>${grads}`);
  return `<svg viewBox="0 0 109 109" aria-hidden="true">${guides()}${under}${defs}${body}</svg>`;
}

/** Inner markup of an SVG string, to layer it under another drawing. */
export function innerOf(svg: string): string {
  return svg.replace(/^<svg[^>]*>|<\/svg>$/g, "");
}
