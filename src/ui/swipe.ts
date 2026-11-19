/**
 * A horizontal swipe moves between the four tabs (Séance, S'entraîner, Progrès, Réglages),
 * like the tabs of a phone app. Never during a lesson or a drill (« Abandonner » is shown),
 * never on the drawing pad, a keyboard, a text field, or something that scrolls sideways.
 */
const MIN_DX = 70; // px
const MAX_MS = 700;

function blocked(t: EventTarget | null): boolean {
  if (document.querySelector("#prof .quit, .modal") || document.querySelector("nav")?.classList.contains("hidden")) return true;
  for (let n = t instanceof Element ? t : null; n && n !== document.body; n = n.parentElement) {
    if (n.matches(".stage, .kbd, input, textarea, select, [contenteditable], .seg")) return true;
    if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflowX.match(/auto|scroll/)) return true;
  }
  return false;
}

export function setupSwipe(): void {
  let x0 = 0, y0 = 0, t0 = 0, on = false;
  document.addEventListener("touchstart", (e) => {
    on = e.touches.length === 1 && !blocked(e.target);
    if (!on) return;
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    t0 = Date.now();
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (on && e.touches.length > 1) on = false;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!on) return;
    on = false;
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (Date.now() - t0 > MAX_MS || Math.abs(dx) < MIN_DX || Math.abs(dx) < 2 * Math.abs(dy)) return;
    if (window.getSelection()?.toString()) return;
    const tabs = [...document.querySelectorAll<HTMLAnchorElement>("nav a")];
    const i = tabs.findIndex((a) => a.getAttribute("aria-current") === "page");
    const j = i + (dx < 0 ? 1 : -1);
    if (i < 0 || j < 0 || j >= tabs.length) return;
    location.hash = tabs[j].getAttribute("href")!;
  }, { passive: true });
}
