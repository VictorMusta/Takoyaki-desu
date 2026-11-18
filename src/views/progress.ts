import { byK, KANA, LINES, lineCards } from "../data/kana";
import { calibration, status, streak, today } from "../core/scheduler";
import { profile, state } from "../core/store";
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
      const k = cs[s], st = status(p, k.k);
      grid += `<button class="cell ${locked ? "locked" : ""} ${st === "done" ? "done" : st === "learn" ? "learn" : ""}" data-k="${k.k}" aria-label="Fiche de ${k.k}">${k.k}<small>${k.r}</small></button>`;
    });
  });
  const done = KANA.filter((k) => status(p, k.k) === "done").length;
  const learn = KANA.filter((k) => status(p, k.k) === "learn").length;
  const fc = el(`<section class="card hidden" id="fc"></section>`);
  v.appendChild(fc);
  v.appendChild(
    el(`<section class="card"><h2>Progrès de ${esc(state.active)}</h2>
    <div class="stats"><div class="stat"><b>${done}</b><span>maîtrisés / ${KANA.length}</span></div><div class="stat"><b>${learn}</b><span>en cours</span></div><div class="stat"><b>${streak(p, t)}</b><span>jours d'affilée</span></div></div>
    <div class="legend"><span><i class="cell" aria-hidden="true">あ</i>Pas encore vu</span><span><i class="cell learn" aria-hidden="true">あ</i>En cours</span><span><i class="cell done" aria-hidden="true">あ</i>Maîtrisé (7 jours et +)</span></div>
    <p class="small muted" style="margin:0">Touchez un signe pour voir sa fiche.</p>
    <div class="grid">${grid}</div></section>`),
  );
  v.querySelectorAll<HTMLButtonElement>(".cell[data-k]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k!;
      fc.innerHTML = `<div class="spread"><h2>${k} · ${byK[k].r}</h2><div class="row"><button class="btn sm" id="fcs">Écouter</button><button class="btn sm" id="fcx">Fermer</button></div></div>
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
