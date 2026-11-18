import { byK, KANA, LINES, lineCards } from "../data/kana";
import { alphabetMastery, calibration, mastery, recordMastery, status, streak, today } from "../core/scheduler";
import { profile, save, state } from "../core/store";
import { $, el, esc, view } from "../ui/dom";
import { ficheHTML } from "../ui/fiche";
import { animate, modelSVG, userSVG, type ModelMode } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";
import { WORDS } from "../data/words";
import { EXAMPLES } from "../data/examples";

/** Slots per line in the classic 5-column table (ya and wa have gaps). */
const SLOTS: Record<string, (number | null)[]> = { ya: [0, null, 1, null, 2], wa: [0, null, null, 1, 2] };

export function viewProgress(): void {
  const p = profile(), t = today(), v = view();
  v.innerHTML = "";
  let grid = "";
  LINES.forEach((ln, i) => {
    const cs = lineCards(i), locked = i >= p.unlocked;
    grid += `<div class="lineh">Ligne ${ln}${locked ? " · fermée" : ""}</div>`;
    (SLOTS[ln] ?? [0, 1, 2, 3, 4]).forEach((s) => {
      if (s === null) {
        grid += `<div class="cell empty"></div>`;
        return;
      }
      const k = cs[s], st = status(p, k.k), m = Math.round(mastery(p, k.k, t) * 100);
      grid += `<button class="cell ${locked ? "locked" : ""} ${st === "done" ? "done" : st === "learn" ? "learn" : ""}" style="--m:${m}%" data-k="${k.k}" aria-label="Fiche de ${k.k}, maîtrise ${m} %">${k.k}<small>${st === "new" ? k.r : m + " %"}</small></button>`;
    });
  });
  const done = KANA.filter((k) => status(p, k.k) === "done").length;
  recordMastery(p, t);
  save();
  const am = Math.round(alphabetMastery(p, t) * 100);
  const week = p.hist?.[t - 7] ?? Object.entries(p.hist ?? {}).filter(([d]) => +d <= t - 7).pop()?.[1];
  const delta = week === undefined ? null : Math.round(am - week);
  const fc = el(`<section class="card hidden" id="fc"></section>`);
  v.appendChild(fc);
  v.appendChild(
    el(`<section class="card"><h2>Progrès de ${esc(state.active)}</h2>
    <div class="stats"><div class="stat"><b>${am} %</b><span>maîtrise de l'alphabet${delta !== null && delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta} en 7 j)` : ""}</span></div><div class="stat"><b>${done}</b><span>maîtrisés / ${KANA.length}</span></div><div class="stat"><b>${streak(p, t)}</b><span>jours d'affilée</span></div></div>
    ${curve(p, t)}
    <p class="small muted" style="margin:0">Chaque case se remplit avec la maîtrise du signe : environ 33 % quand il tient un jour, 67 % à trois jours, et la case devient dorée (極) quand il tient une semaine. Une erreur la fait redescendre.</p>
    <div class="legend"><span><i class="cell" aria-hidden="true">あ</i>Pas encore vu</span><span><i class="cell learn" style="--m:50%" aria-hidden="true">あ</i>En cours</span><span><i class="cell done" aria-hidden="true">あ</i>Maîtrisé</span></div>
    <p class="small muted" style="margin:0">Touchez un signe pour voir sa fiche.</p>
    <div class="grid">${grid}</div></section>`),
  );
  v.querySelectorAll<HTMLButtonElement>(".cell[data-k]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k!;
      const c = p.cards[k], mk = Math.round(mastery(p, k, t) * 100);
      const when = !c?.seen ? "Pas encore vu en séance." : c.due! <= t ? "Révision prévue aujourd'hui." : `Prochaine révision dans ${c.due! - t} jour${c.due! - t > 1 ? "s" : ""}.`;
      fc.innerHTML = `<div class="spread"><h2>${k} · ${byK[k].r}</h2><div class="row"><button class="btn sm" id="fcs">Écouter</button><button class="btn sm" id="fcx">Fermer</button></div></div>
        <div><div class="mbar" role="img" aria-label="Maîtrise ${mk} %"><i style="width:${mk}%"></i></div><p class="small muted" style="margin:4px 0 0">Maîtrise ${mk} % · ${when}</p></div>
        <div class="stage" id="fcm" style="max-width:220px">${modelSVG(k, "anim", p.settings.showNums)}</div>
        <div class="row" style="justify-content:center"><button class="btn" id="fcr">Rejouer le tracé</button></div>
        <div class="sep"><i></i></div>
        <h3>S'entraîner librement</h3>
        <p class="small muted" style="margin:0">Sans note et sans effet sur vos révisions : tracez autant que vous voulez.</p>
        <div class="seg" role="group" aria-label="Aide au tracé"><button class="btn" data-pm="stencil" aria-pressed="true">Calque</button><button class="btn" data-pm="faded" aria-pressed="false">Estompé</button><button class="btn" data-pm="blank" aria-pressed="false">De mémoire</button></div>
        <div id="fpz"></div>
        ${wordsHTML(k)}
        ${ficheHTML(k)}`;
      fc.classList.remove("hidden");
      animate($("#fcm").firstElementChild!);
      $("#fcr").onclick = () => {
        $("#fcm").innerHTML = modelSVG(k, "anim", p.settings.showNums);
        animate($("#fcm").firstElementChild!);
      };
      $("#fcs").onclick = () => speak(k);
      $("#fcx").onclick = () => fc.classList.add("hidden");
      let mode: ModelMode = "stencil";
      fc.querySelectorAll<HTMLButtonElement>("[data-pm]").forEach((m) => {
        m.onclick = () => {
          mode = m.dataset.pm as ModelMode;
          fc.querySelectorAll("[data-pm]").forEach((x) => x.setAttribute("aria-pressed", String(x === m)));
          freePad(k, mode, p.settings.showNums);
        };
      });
      freePad(k, mode, p.settings.showNums);
      fc.querySelectorAll<HTMLButtonElement>("[data-say]").forEach((w) => (w.onclick = () => speak(w.dataset.say!)));
      fc.scrollIntoView({ behavior: "smooth" });
    };
  });

  const cal = calibration(p, t);
  v.appendChild(
    el(`<section class="card"><h3>Calibration (14 derniers jours)</h3>
    ${
      cal.length
        ? `<table><thead><tr><th>Ligne</th><th>« Bien » en séance</th><th>Réussite à l'examen</th><th>Écart</th></tr></thead><tbody>
      ${cal
        .map(
          (r) =>
            `<tr><td>${r.line}</td><td>${r.bien} %</td><td>${r.exam === null ? "pas d'examen" : r.exam + " %"}</td><td style="color:${r.gap !== null && r.gap > 15 ? "var(--beni)" : "inherit"}">${r.gap === null ? "–" : (r.gap > 0 ? "+" : "") + r.gap + " pts"}</td></tr>`,
        )
        .join("")}</tbody></table>
      <p class="small muted" style="margin:0">Au-delà de 15 points d'écart, vous vous notez trop généreusement sur cette ligne.</p>`
        : `<p class="small muted" style="margin:0">Faites quelques séances et un examen pour voir si vos notes sont fiables.</p>`
    }</section>`),
  );
}

/** Free tracing on a sign's fiche: no grade, no effect on reviews; compare against the model at will. */
function freePad(k: string, mode: ModelMode, nums: boolean): void {
  const box = $("#fpz");
  box.innerHTML = `<div class="stage" id="fps"></div>
    <div class="tools"><button class="btn" id="fpu" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="fpc">Recommencer</button><button class="btn primary" id="fpv" disabled>Comparer</button></div>`;
  const pad = makePad($("#fps"), modelSVG(k, mode, nums && mode === "stencil"));
  const cmp = $<HTMLButtonElement>("#fpv");
  pad.onchange = () => (cmp.disabled = pad.strokes.length === 0);
  $("#fpu").onclick = () => pad.undo();
  $("#fpc").onclick = () => pad.clear();
  cmp.onclick = () => {
    const mine = pad.strokes.slice();
    box.innerHTML = `<div class="pair"><div><div class="stage">${userSVG(mine, true)}</div><div class="label">Votre tracé · ${mine.length} trait${mine.length > 1 ? "s" : ""}</div></div><div><div class="stage">${modelSVG(k, "color", true)}</div><div class="label">Modèle · ${byK[k].s.length} trait${byK[k].s.length > 1 ? "s" : ""}</div></div></div>
      <div class="row"><button class="btn primary" id="fpa">Réessayer</button></div>`;
    $("#fpa").onclick = () => freePad(k, mode, nums);
  };
}

/** Words from the exercise bank that use this sign, the sign underlined; tap to hear them. */
function wordsHTML(k: string): string {
  // The fiche below already shows its two example words: list the others.
  const shown = new Set((EXAMPLES[k] ?? []).map((e) => e[0]));
  const ws = WORDS.filter(([w]) => w.includes(k) && !shown.has(w)).slice(0, 8);
  if (!ws.length) return "";
  const mark = (w: string) => [...w].map((c) => (c === k ? `<mark>${c}</mark>` : c)).join("");
  return `<h3>Mots avec ${k}</h3><dl class="ex words">${ws.map(([w, r, fr]) => `<dt><button class="wbtn" data-say="${w}" aria-label="Écouter ${r}">${mark(w)}</button></dt><dd class="rj">${r}</dd><dd>${fr}</dd>`).join("")}</dl>`;
}

/** The alphabet mastery over the last 30 days, as a thin line (days without a value carry the last one). */
function curve(p: import("../core/types").Profile, t: number): string {
  const h = p.hist ?? {};
  const days = Object.keys(h).map(Number).filter((d) => d > t - 30).sort((a, b) => a - b);
  if (days.length < 2) return "";
  const first = days[0], W = 300, H = 60;
  let last = h[first];
  const pts: [number, number][] = [];
  for (let d = first; d <= t; d++) {
    if (h[d] !== undefined) last = h[d];
    pts.push([d, last]);
  }
  const x = (d: number) => ((d - first) / Math.max(1, t - first)) * (W - 8) + 4;
  const y = (v: number) => H - 6 - (v / 100) * (H - 12);
  const line = pts.map(([d, v], i) => `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const [ld, lv] = pts[pts.length - 1];
  return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la maîtrise de l'alphabet sur ${t - first + 1} jours, de ${Math.round(h[first])} à ${Math.round(lv)} %">
    <line x1="4" y1="${y(100)}" x2="${W - 4}" y2="${y(100)}" class="c-g"/><line x1="4" y1="${y(0)}" x2="${W - 4}" y2="${y(0)}" class="c-g"/>
    <path d="${line}" class="c-l"/><circle cx="${x(ld)}" cy="${y(lv)}" r="3.5" class="c-d"/></svg>`;
}
