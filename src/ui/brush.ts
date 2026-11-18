import type { Point, Stroke } from "./model";

/**
 * Brush look for handwritten strokes, computed from the stroke's shape alone (so the same
 * drawing renders identically on the pad, in comparisons and in saved data):
 * - the brush lands: thinner at the start;
 * - it thins where the hand moves fast (points far apart, since they are sampled in time);
 * - nothing is recomputed afterwards: ink already laid down keeps its width.
 * Readability first: never thinner than MIN, and the « Simple » setting turns it off.
 */

const KEY = "takoyaki-brush";
export type StrokeStyle = "brush" | "plain";

export function getStrokeStyle(): StrokeStyle {
  try {
    return localStorage.getItem(KEY) === "plain" ? "plain" : "brush";
  } catch {
    return "brush";
  }
}
export function setStrokeStyle(s: StrokeStyle): void {
  try {
    if (s === "brush") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, s);
  } catch {
    /* storage unavailable: keep the default */
  }
}

/** Widths in the 109 × 109 model space. Plain strokes are 4.2 wide. */
const BASE = 5.4, MIN = 2.8, MAX = 6.4;

/**
 * Width at each point of the stroke. Causal: a point's width depends only on the points
 * drawn before it, so what is already on the paper never changes as the stroke goes on.
 * - landing: the first 6 units grow from 55 % to full width;
 * - speed: a smoothed (past-only) distance between samples; a quick hand thins the line.
 */
export function brushWidths(st: Stroke): number[] {
  const out: number[] = [];
  let along = 0, pace = 0;
  for (let i = 0; i < st.length; i++) {
    const seg = i ? Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]) : 0;
    along += seg;
    pace = i <= 1 ? seg : pace * 0.7 + seg * 0.3;
    const land = Math.min(1, 0.55 + (along / 6) * 0.45);
    const speed = Math.max(0.72, Math.min(1.12, 1.18 - pace * 0.07));
    out.push(Math.max(MIN, Math.min(MAX, BASE * land * speed)));
  }
  return out;
}

/**
 * The brushed stroke as one closed outline, round ends included (a single shape, so a
 * semi-transparent fill never darkens where parts overlap). Model space, times `scale`.
 */
export function brushPath(st: Stroke, scale = 1): string {
  const n = st.length;
  if (n === 0) return "";
  const w = brushWidths(st);
  const ring: Point[] = [];
  const arc = (c: Point, r: number, from: number, to: number) => {
    const steps = 8;
    for (let k = 0; k <= steps; k++) {
      const a = from + ((to - from) * k) / steps;
      ring.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
    }
  };
  if (n === 1) arc(st[0], w[0] / 2, 0, Math.PI * 2);
  else {
    const dir = st.map((_, i) => {
      const a = st[Math.max(0, i - 1)], b = st[Math.min(n - 1, i + 1)];
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    });
    const side = (i: number, sgn: 1 | -1): Point => {
      const h = (w[i] / 2) * sgn, t = dir[i];
      return [st[i][0] - Math.sin(t) * h, st[i][1] + Math.cos(t) * h];
    };
    for (let i = 0; i < n; i++) ring.push(side(i, 1));
    const te = dir[n - 1];
    arc(st[n - 1], w[n - 1] / 2, te + Math.PI / 2, te - Math.PI / 2); // round tip
    for (let i = n - 1; i >= 0; i--) ring.push(side(i, -1));
    const t0 = dir[0];
    arc(st[0], w[0] / 2, t0 - Math.PI / 2, t0 - (3 * Math.PI) / 2); // round start
  }
  return "M" + ring.map((p) => `${(p[0] * scale).toFixed(1)} ${(p[1] * scale).toFixed(1)}`).join("L") + "Z";
}

/** SVG markup of a brushed stroke, filled with `fill`. */
export function brushSVG(st: Stroke, fill: string): string {
  return `<path d="${brushPath(st)}" fill="${fill}"/>`;
}
