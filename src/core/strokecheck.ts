/**
 * Automatic check of a handwritten sign against its model (KanjiVG strokes).
 *
 * Fairness first:
 * - size and position are ignored: both drawings are centred and scaled as a whole
 *   (one factor for both axes, so the proportions between strokes still count);
 * - only what makes a sign right is checked: number of strokes, their order, their direction,
 *   and roughly their shape and place; stroke endings (hane, tome, harai) are not judged;
 * - common handwritten variants are accepted (き in 3 strokes, さ in 2, り in 1…);
 * - tolerances are wide: better to let a small slip through than to refuse a good sign.
 * The check never awards « Bien » by itself: it only rules it out when it finds a real error.
 */

export type Pt = [number, number];
export type Stroke = Pt[];

export interface StrokeIssue {
  /** 1-based stroke number in the learner's drawing. */
  n: number;
  kind: "reverse" | "shape";
}

export interface CheckResult {
  /** Same number of strokes (or an accepted variant). */
  count: boolean;
  /** Strokes in the right order and direction. */
  order: boolean;
  /** Overall shape and proportions close enough. */
  shape: boolean;
  /** Learner stroke numbers that seem swapped, e.g. [2, 3]. */
  swapped: number[];
  issues: StrokeIssue[];
  expected: number;
  got: number;
  /** Mean distance to the model, 0 = identical (unit-box scale), for tuning. */
  score: number;
}

const N = 24;

/* ---------- geometry ---------- */

/** Points of a KanjiVG path (only M and relative c are used in the data). */
export function pathPoints(d: string): Pt[] {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const pts: Pt[] = [];
  let i = 0, x = 0, y = 0, cmd = "";
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    if (cmd === "M" || cmd === "m") {
      const nx = num(), ny = num();
      x = cmd === "m" ? x + nx : nx;
      y = cmd === "m" ? y + ny : ny;
      pts.push([x, y]);
      cmd = cmd === "m" ? "l" : "L";
    } else if (cmd === "c" || cmd === "C") {
      const rel = cmd === "c";
      const c1x = num(), c1y = num(), c2x = num(), c2y = num(), ex = num(), ey = num();
      const p1: Pt = rel ? [x + c1x, y + c1y] : [c1x, c1y];
      const p2: Pt = rel ? [x + c2x, y + c2y] : [c2x, c2y];
      const p3: Pt = rel ? [x + ex, y + ey] : [ex, ey];
      for (let k = 1; k <= 8; k++) {
        const t = k / 8, u = 1 - t;
        pts.push([
          u * u * u * x + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * y + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
      [x, y] = p3;
    } else if (cmd === "l" || cmd === "L") {
      const nx = num(), ny = num();
      x = cmd === "l" ? x + nx : nx;
      y = cmd === "l" ? y + ny : ny;
      pts.push([x, y]);
    } else {
      i++; // unknown token: skip
    }
  }
  return pts;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** n points evenly spaced along the polyline. */
export function resample(s: Stroke, n = N): Stroke {
  if (s.length === 0) return [];
  if (s.length === 1) return Array.from({ length: n }, () => s[0]);
  const len: number[] = [0];
  for (let i = 1; i < s.length; i++) len.push(len[i - 1] + dist(s[i - 1], s[i]));
  const total = len[len.length - 1] || 1;
  const out: Stroke = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const at = (total * k) / (n - 1);
    while (j < s.length - 2 && len[j + 1] < at) j++;
    const seg = len[j + 1] - len[j] || 1, t = Math.min(1, Math.max(0, (at - len[j]) / seg));
    out.push([s[j][0] + (s[j + 1][0] - s[j][0]) * t, s[j][1] + (s[j + 1][1] - s[j][1]) * t]);
  }
  return out;
}

/** Centre the whole drawing and scale it to a unit box (same factor on both axes). */
function normalize(strokes: Stroke[]): Stroke[] {
  const all = strokes.flat();
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY) || 1, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return strokes.map((s) => s.map(([x, y]) => [(x - cx) / size, (y - cy) / size] as Pt));
}

const mean = (a: Stroke, b: Stroke) => a.reduce((s, p, i) => s + dist(p, b[i]), 0) / a.length;
const rev = (s: Stroke) => s.slice().reverse();

function permutations(n: number): number[][] {
  if (n <= 1) return [[0]].slice(0, n);
  const out: number[][] = [];
  const rec = (pre: number[], rest: number[]) => {
    if (!rest.length) return out.push(pre);
    rest.forEach((r, i) => rec([...pre, r], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  rec([], [...Array(n).keys()]);
  return out;
}

/* ---------- accepted handwritten variants: model strokes that may be written as one ---------- */

/** 0-based model stroke indexes that may be joined into a single stroke. */
export const JOINS: Record<string, number[][]> = {
  き: [[2, 3]],
  さ: [[1, 2]],
  ぎ: [[2, 3]],
  ざ: [[1, 2]],
  り: [[0, 1]],
};

function joined(model: Stroke[], groups: number[][]): Stroke[] {
  const out: Stroke[] = [];
  for (let i = 0; i < model.length; i++) {
    const g = groups.find((x) => x[0] === i);
    if (g) {
      out.push(g.flatMap((j) => model[j]));
      i = g[g.length - 1];
    } else out.push(model[i]);
  }
  return out;
}

/* ---------- the check ---------- */

/** Wide tolerances, in units of the sign's size (1 = the whole sign). */
const SHAPE_STROKE = 0.24; // one stroke clearly elsewhere or another shape
const SHAPE_MEAN = 0.15; // the sign as a whole too different
const REVERSE_GAIN = 0.6; // drawn backwards: reversed is at least this much closer

export function checkDrawing(drawn: Stroke[], modelPaths: string[], sign = ""): CheckResult {
  const user = drawn.filter((s) => s.length > 0);
  let model = modelPaths.map(pathPoints);
  const expected = model.length;
  // An accepted variant with fewer strokes?
  if (user.length !== model.length && JOINS[sign]) {
    const v = joined(model, JOINS[sign]);
    if (v.length === user.length) model = v;
  }
  const res: CheckResult = { count: user.length === model.length, order: true, shape: true, swapped: [], issues: [], expected, got: user.length, score: 1 };
  if (!user.length) return { ...res, count: false, order: false, shape: false };

  const U = normalize(user.map((s) => resample(s)));
  const M = normalize(model.map((s) => resample(s)));

  if (!res.count) {
    // Without a stroke-to-stroke match, only judge the overall shape: every drawn point near the model?
    const cloud = M.flat();
    const near = (p: Pt) => Math.min(...cloud.map((q) => dist(p, q)));
    res.score = U.flat().reduce((s, p) => s + near(p), 0) / U.flat().length;
    res.shape = res.score < SHAPE_MEAN;
    res.order = false;
    return res;
  }

  // Cost of pairing learner stroke i with model stroke j (direction-free).
  const n = U.length;
  const cost = U.map((u) => M.map((m) => Math.min(mean(u, m), mean(rev(u), m))));
  const total = (perm: number[]) => perm.reduce((s, j, i) => s + cost[i][j], 0);
  const id = [...Array(n).keys()];
  let best = id, bestCost = total(id);
  if (n <= 6) {
    for (const perm of permutations(n)) {
      const c = total(perm);
      if (c < bestCost - 1e-9) [best, bestCost] = [perm, c];
    }
  }
  // Order: only when another pairing is clearly better than writing in order.
  const idCost = total(id);
  if (best.some((j, i) => j !== i) && idCost - bestCost > 0.15 * n && idCost > bestCost * 1.4) {
    res.order = false;
    res.swapped = best.map((j, i) => (j !== i ? i + 1 : 0)).filter(Boolean);
  }

  // Direction and shape, stroke by stroke, against the stroke it pairs with.
  const pair = res.order ? id : best;
  let sum = 0;
  pair.forEach((j, i) => {
    const fwd = mean(U[i], M[j]), bwd = mean(rev(U[i]), M[j]);
    if (bwd < fwd * REVERSE_GAIN && fwd > 0.12) {
      res.order = false;
      res.issues.push({ n: i + 1, kind: "reverse" });
    }
    const d = Math.min(fwd, bwd);
    sum += d;
    if (d > SHAPE_STROKE) res.issues.push({ n: i + 1, kind: "shape" });
  });
  res.score = sum / n;
  res.shape = res.score < SHAPE_MEAN && !res.issues.some((x) => x.kind === "shape");
  return res;
}

/** One short sentence per problem, for the comparison screen. */
export function explain(r: CheckResult): string[] {
  const out: string[] = [];
  if (!r.count) out.push(`${r.got} trait${r.got > 1 ? "s" : ""} au lieu de ${r.expected}.`);
  if (r.swapped.length) out.push(`Traits dans le désordre : ${r.swapped.join(" et ")}.`);
  r.issues.filter((x) => x.kind === "reverse").forEach((x) => out.push(`Le trait ${x.n} est tracé à l'envers.`));
  r.issues.filter((x) => x.kind === "shape").forEach((x) => out.push(`Le trait ${x.n} n'a pas la bonne forme ou la bonne place.`));
  if (r.count && !r.shape && !r.issues.some((x) => x.kind === "shape")) out.push("Les proportions du signe s'éloignent du modèle.");
  if (!r.count && !r.shape) out.push("La forme générale s'éloigne du modèle.");
  return out;
}
