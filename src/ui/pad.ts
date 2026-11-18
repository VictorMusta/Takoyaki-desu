import { cssVar } from "./dom";
import { brushPath, getStrokeStyle } from "./brush";
import { buzz } from "./haptics";
import type { Point, Stroke } from "./model";

export interface Pad {
  strokes: Stroke[];
  undo(): void;
  clear(): void;
  onchange: (() => void) | null;
}

const PALM_SIZE = 45; // px: wider touches are treated as a resting palm

/** A drawing surface over `underSVG`, storing strokes in the 109 × 109 model space. */
export function makePad(stage: HTMLElement, underSVG: string): Pad {
  stage.innerHTML = underSVG;
  const cv = document.createElement("canvas");
  stage.appendChild(cv);
  const ctx = cv.getContext("2d")!;
  const strokes: Stroke[] = [];
  let cur: Stroke | null = null;
  let pid: number | null = null;

  const pt = (e: PointerEvent): Point => {
    const r = cv.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 109, ((e.clientY - r.top) / r.height) * 109];
  };

  function draw(): void {
    const s = cv.width / 109;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4.2 * s;
    ctx.strokeStyle = cssVar("--ink");
    ctx.fillStyle = cssVar("--ink");
    const brush = getStrokeStyle() === "brush";
    for (const st of cur ? [...strokes, cur] : strokes) {
      if (brush) {
        ctx.fill(new Path2D(brushPath(st, s)));
        continue;
      }
      ctx.beginPath();
      st.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)));
      if (st.length === 1) ctx.lineTo(st[0][0] * s + 0.1, st[0][1] * s);
      ctx.stroke();
    }
  }

  function size(): void {
    if (!stage.isConnected) return ro.disconnect();
    const r = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    draw();
  }

  cv.addEventListener("pointerdown", (e) => {
    if (pid !== null) return;
    if (e.pointerType === "touch" && (e.width > PALM_SIZE || e.height > PALM_SIZE)) return;
    pid = e.pointerId;
    cv.setPointerCapture(pid);
    cur = [pt(e)];
    buzz("tick");
    draw();
    e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pid || !cur) return;
    const p = pt(e), l = cur[cur.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.6) {
      cur.push(p);
      draw();
    }
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pid || !cur) return;
    strokes.push(cur);
    cur = null;
    pid = null;
    draw();
    pad.onchange?.();
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);

  const ro = new ResizeObserver(size);
  ro.observe(stage);

  const pad: Pad = {
    strokes,
    undo() {
      strokes.pop();
      draw();
      pad.onchange?.();
    },
    clear() {
      strokes.length = 0;
      draw();
      pad.onchange?.();
    },
    onchange: null,
  };
  return pad;
}
