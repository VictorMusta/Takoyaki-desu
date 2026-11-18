import type { Point, Stroke } from "./model";

/**
 * Brush look for handwritten strokes, computed from the stroke's shape alone (so the same
 * drawing renders identically on the pad, in comparisons and in saved data):
 * - the brush lands and lifts: thinner at both ends;
 * - it thins where the hand moved fast (points far apart, since they are sampled in time).
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

/** Width at each point of the stroke. */
export function brushWidths(st: Stroke): number[] {
  const n = st.length;
  if (n < 2) return st.map(() => BASE);
  const seg = st.map((p, i) => (i ? Math.hypot(p[0] - st[i - 1][0], p[1] - st[i - 1][1]) : 0));
  seg[0] = seg[1];
  const len = seg.reduce((a, b) => a + b, 0) - seg[0] || 1;
  let along = 0;
  const raw = st.map((_, i) => {
    if (i) along += seg[i];
    const t = along / len;
    // Landing and lifting: ramps over the first 12 % and last 18 % of the stroke.
    const ends = Math.min(1, 0.55 + (t / 0.12) * 0.45, 0.5 + ((1 - t) / 0.18) * 0.5);
    // Speed: about 1–2 units between samples is a calm hand; 6+ is a quick flick.
    const speed = Math.max(0.72, Math.min(1.12, 1.18 - seg[i] * 0.07));
    return BASE * ends * speed;
  });
  // Smooth so the width never jumps between two samples.
  return raw.map((_, i) => {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) (s += raw[j]), c++;
    return Math.max(MIN, Math.min(MAX, s / c));
  });
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
