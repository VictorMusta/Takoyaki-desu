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
 * The stroke as runs of constant width along a smoothed centre line.
 * - The sampled points are joined by quadratic curves through their midpoints, then cut into
 *   short steps (about 0.5 unit): no straight edges between distant samples.
 * - Widths follow the causal brushWidths(), with a cap on how fast they may change per unit
 *   of length, so a jerky sample never notches the line.
 * - Each run is drawn as a round-capped line: overlaps never leave holes (an outline polygon
 *   would, wherever the inner edge folds on a tight turn).
 */
export interface Run {
  w: number;
  pts: Point[];
}

export function brushRuns(st: Stroke): Run[] {
  const n = st.length;
  if (n === 0) return [];
  const w0 = brushWidths(st);
  if (n === 1) return [{ w: w0[0], pts: [st[0], st[0]] }];
  const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // Dense centre line with each point's source width.
  const dense: Point[] = [st[0]], dw: number[] = [w0[0]];
  const add = (a: Point, c: Point, b: Point, wa: number, wb: number) => {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]) + Math.hypot(b[0] - c[0], b[1] - c[1]);
    const k = Math.max(1, Math.ceil(len / 0.5));
    for (let j = 1; j <= k; j++) {
      const t = j / k, u = 1 - t;
      dense.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
      dw.push(wa + (wb - wa) * t);
    }
  };
  let from = st[0];
  for (let i = 1; i < n - 1; i++) {
    const to = mid(st[i], st[i + 1]);
    add(from, st[i], to, w0[i - 1], w0[i]);
    from = to;
  }
  add(from, st[n - 1], st[n - 1], w0[n - 2], w0[n - 1]);
  // Limit the change of width per unit of length.
  for (let i = 1; i < dense.length; i++) {
    const ds = Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    const lim = 0.12 * ds + 0.02;
    dw[i] = Math.max(dw[i - 1] - lim, Math.min(dw[i - 1] + lim, dw[i]));
  }
  // Group into runs of the same (rounded) width; consecutive runs share their joint point.
  const runs: Run[] = [];
  const q = (x: number) => Math.round(x * 8) / 8;
  for (let i = 0; i < dense.length; i++) {
    const w = q(dw[i]), last = runs[runs.length - 1];
    if (last && last.w === w) last.pts.push(dense[i]);
    else runs.push({ w, pts: last ? [last.pts[last.pts.length - 1], dense[i]] : [dense[i], dense[i]] });
  }
  return runs;
}

/** Draws a brushed stroke on a canvas (model space times `scale`). */
export function drawBrush(ctx: CanvasRenderingContext2D, st: Stroke, scale: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const r of brushRuns(st)) {
    ctx.lineWidth = r.w * scale;
    ctx.beginPath();
    r.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * scale, p[1] * scale) : ctx.moveTo(p[0] * scale, p[1] * scale)));
    ctx.stroke();
  }
}

/** SVG markup of a brushed stroke in one solid colour (wrap it in a group for opacity or masks). */
export function brushSVG(st: Stroke, color: string): string {
  return brushRuns(st)
    .map((r) => `<polyline points="${r.pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${r.w}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
}
