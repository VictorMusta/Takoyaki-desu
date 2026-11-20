import { decodeSnapshot, encodeSnapshot, snapshot, dayDate, type Snapshot } from "../core/stats";
import { today } from "../core/scheduler";
import { hasProfile, profile, state } from "../core/store";
import { el, esc, toast, view } from "../ui/dom";
import { isJa } from "../i18n";

/**
 * Comparing with someone: each sends the other a link holding a small snapshot of their
 * progress (core/stats). Opening it shows both side by side and keeps their latest snapshot on
 * this phone, to compare again later. No server: a newer comparison needs a newer link.
 */

const KEY = "takoyaki-rivals";

export function rivals(): Record<string, Snapshot> {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const out: Record<string, Snapshot> = {};
    for (const [n, s] of Object.entries(o)) {
      const ok = decodeSnapshot(encodeSnapshot(s as Snapshot));
      if (ok) out[n] = ok;
    }
    return out;
  } catch {
    return {};
  }
}
function keepRival(s: Snapshot): void {
  const all = rivals();
  if (all[s.n] && all[s.n].at > s.at) return; // an older link doesn't replace a newer one
  all[s.n] = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* comparing still works, it just won't be remembered */
  }
}
export function forgetRival(n: string): void {
  const all = rivals();
  delete all[n];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function myLink(): string {
  const s = snapshot(profile(), state.active, today());
  return `${location.origin}${location.pathname}#duel=${encodeSnapshot(s)}`;
}

/** Sends my progress link (share sheet, else copy). */
export async function shareMyLink(): Promise<void> {
  const url = myLink();
  const text = `${state.active} apprend à écrire le japonais avec Takoyaki desu. Compare ta progression avec la mienne :`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Takoyaki desu", text, url });
      return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast("Lien copié : envoyez-le à qui vous voulez.");
  } catch {
    toast("Copie impossible ici.");
  }
}

const week = (s: Snapshot, i: number) => s.d.filter((r) => r[0] > s.at - 7).reduce((a, r) => a + r[i], 0);

/** #duel=… (a link received) or #duel (the people already compared with). */
export function viewDuel(code: string): void {
  const v = view();
  v.innerHTML = "";
  const them = code ? decodeSnapshot(code) : null;
  if (code && !them) {
    v.appendChild(el(`<section class="card"><h2>Lien illisible</h2><p style="margin:0">Ce lien de comparaison est incomplet ou abîmé. Demandez-en un nouveau.</p></section>`));
    return;
  }
  // Your own link, opened on your own phone (to check it): nothing to compare, keep nothing.
  const self = hasProfile() ? state.active : "";
  if (self) forgetRival(self);
  if (them && them.n === self) {
    v.appendChild(el(`<section class="card"><h2>C'est votre propre lien</h2><p style="margin:0">Il est fait pour être envoyé : la personne qui l'ouvre sur son téléphone pourra se comparer à vous, ou jouer contre vous en duel face à face. Pour vous comparer à elle, demandez-lui le sien.</p><div class="row"><button class="btn primary" id="send">Envoyer mon lien</button></div></section>`));
    v.querySelector<HTMLButtonElement>("#send")!.onclick = () => void shareMyLink();
    return;
  }
  if (them) keepRival(them);
  const list = Object.values(rivals()).filter((s) => s.n !== self).sort((a, b) => a.n.localeCompare(b.n));
  const other = them ?? list[0];
  if (!other) {
    v.appendChild(el(`<section class="card"><h2>Se comparer</h2><p style="margin:0">Envoyez votre lien à quelqu'un qui utilise l'appli, et demandez-lui le sien : en l'ouvrant, vous verrez vos progressions côte à côte.</p><div class="row"><button class="btn primary" id="send">Envoyer mon lien</button></div></section>`));
    v.querySelector<HTMLButtonElement>("#send")!.onclick = () => void shareMyLink();
    return;
  }
  const me = hasProfile() ? snapshot(profile(), state.active, today()) : null;
  const fmtDate = (d: number) => new Date(dayDate(d) + "T12:00:00").toLocaleDateString(isJa() ? "ja-JP" : "fr-FR", { day: "numeric", month: "long" });
  type Row = [string, (s: Snapshot) => number, (n: number) => string];
  const rows: Row[] = [
    ["Hiragana maîtrisés", (s) => s.h[1], (n) => `${n} / 75`],
    ["Maîtrise des hiragana", (s) => s.h[2], (n) => `${n} %`],
    ["Katakana maîtrisés", (s) => s.k?.[1] ?? 0, (n) => `${n} / 76`],
    ["Mots sus", (s) => s.w, String],
    ["Jours d'affilée", (s) => s.s, String],
    ["Minutes cette semaine", (s) => Math.round(week(s, 4)), String],
    ["Exercices cette semaine", (s) => week(s, 3) + week(s, 2) + week(s, 1), String],
  ];
  const table = rows
    .map(([label, f, fmt]) => {
      const a = me ? f(me) : null, b = f(other);
      const win = (x: number | null, y: number | null) => (x !== null && y !== null && x > y ? ' class="win"' : "");
      return `<tr><th scope="row">${label}</th><td${win(a, b)}>${a === null ? "–" : fmt(a)}</td><td${win(b, a)}>${fmt(b)}</td></tr>`;
    })
    .join("");
  // Active minutes over the last 14 days, side by side.
  const days = Array.from({ length: 14 }, (_, i) => today() - 13 + i);
  const mins = (s: Snapshot | null, d: number) => (s ? (s.d.find((r) => r[0] === d)?.[4] ?? 0) : 0);
  const max = Math.max(10, ...days.map((d) => Math.max(mins(me, d), mins(other, d))));
  const bars = days
    .map((d, i) => {
      const x = 8 + i * 22, h1 = (mins(me, d) / max) * 100, h2 = (mins(other, d) / max) * 100;
      return `<rect x="${x}" y="${110 - h1}" width="9" height="${h1}" class="b-me"/><rect x="${x + 10}" y="${110 - h2}" width="9" height="${h2}" class="b-them"/>`;
    })
    .join("");
  v.appendChild(
    el(`<section class="card duel"><h2>${me ? `${esc(me.n)} et ${esc(other.n)}` : esc(other.n)}</h2>
    <table><thead><tr><th></th><th scope="col">${me ? esc(me.n) : "Vous"}</th><th scope="col">${esc(other.n)}</th></tr></thead><tbody>${table}</tbody></table>
    <h3>Minutes de pratique, 14 derniers jours</h3>
    <svg viewBox="0 0 318 116" role="img" aria-label="Minutes de pratique par jour sur 14 jours, ${me ? esc(me.n) + " et " : ""}${esc(other.n)}">${bars}<line x1="0" y1="110.5" x2="318" y2="110.5" class="axis"/></svg>
    <p class="small muted legend2"><span class="k-me"></span>${me ? esc(me.n) : "Vous"} <span class="k-them"></span>${esc(other.n)}</p>
    <p class="small muted" style="margin:0">Progression de ${esc(other.n)} au ${fmtDate(other.at)}. Pour la mettre à jour, demandez-lui un nouveau lien.</p>
    <div class="row">${me && other.ks ? `<a class="btn primary" href="#face">Duel face à face</a>` : ""}${me ? `<button class="btn${other.ks ? "" : " primary"}" id="send">Envoyer mon lien</button>` : `<a class="btn primary" href="#seance">Commencer à apprendre</a>`}${list.length > 1 ? list.filter((s) => s.n !== other.n).map((s) => `<button class="btn" data-r="${esc(s.n)}">Avec ${esc(s.n)}</button>`).join("") : ""}</div>
    </section>`),
  );
  v.querySelector<HTMLButtonElement>("#send")?.addEventListener("click", () => void shareMyLink());
  v.querySelectorAll<HTMLButtonElement>("[data-r]").forEach((b) => {
    b.onclick = () => {
      const s = rivals()[b.dataset.r!];
      if (s) location.hash = `duel=${encodeSnapshot(s)}`;
    };
  });
}
