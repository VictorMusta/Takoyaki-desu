import { CHANGELOG } from "../data/changelog";
import { hasProfile } from "../core/store";
import { confirmModal } from "./modal";

const KEY = "takoyaki-seen-version";

const newer = (a: string, b: string) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function newsHTML(releases = CHANGELOG): string {
  return releases
    .map((r) => `<section class="news"><p class="small muted" style="margin:0">Version ${r.v} · ${fmt(r.date)}</p><ul>${r.items.map((i) => `<li>${i}</li>`).join("")}</ul></section>`)
    .join("");
}

/** After an update: the changes since the version last seen on this device, once. New users see nothing. */
export function showNews(): void {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(KEY);
    localStorage.setItem(KEY, __APP_VERSION__);
  } catch {
    return;
  }
  if (!hasProfile()) return; // first launch: no « what's new » for someone who has seen nothing yet
  const since = CHANGELOG.filter((r) => !seen || newer(r.v, seen)).slice(0, 2);
  if (!since.length) return;
  void confirmModal({ title: "Quoi de neuf ?", body: newsHTML(since), ok: "C'est noté", cancel: "" });
}
