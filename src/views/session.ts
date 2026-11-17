import { byK } from "../data/kana";
import { buildQueue, dayRec, gradeCard, status, today } from "../core/scheduler";
import { profile, save } from "../core/store";
import type { Grade, QueueItem } from "../core/types";
import { $, el, view } from "../ui/dom";
import { celebrate } from "../ui/celebrate";
import { ficheHTML } from "../ui/fiche";
import { learnSeq, modelSVG } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";
import { viewCompare } from "./compare";
import { navigate } from "../router";

interface Session {
  queue: QueueItem[];
  i: number;
}

let session: Session | null = null;

export function hasSession(): boolean {
  return session !== null;
}

export function resetSession(): void {
  session = null;
}

export function startSession(): void {
  const q = buildQueue(profile(), today());
  if (!q.length) return;
  session = { queue: q, i: 0 };
  viewCard();
}

function stepper(n: number): string {
  let s = "";
  for (let i = 1; i <= 4; i++) s += `<i class="${i <= n ? "on" : ""}"></i>`;
  return `<div class="steps" aria-label="Étape ${n} sur 4">${s}</div>`;
}

export function viewCard(): void {
  if (!session || session.i >= session.queue.length) return viewEnd();
  const it = session.queue[session.i];
  if (it.isNew && !it.step) it.step = 1;
  const K = byK[it.k];
  const show = profile().settings.showNums;
  const v = view();
  v.innerHTML = "";
  const left = session.queue.length - session.i;
  const head = `<div class="prompt"><div><div class="romaji">${K.r}</div><div class="small muted">${it.isNew ? "Nouveau signe · ligne " + K.l : "Révision"} · ${left} restant(s)</div></div>
    <div class="row">${it.isNew ? stepper(it.step!) : ""}<button class="btn" id="say" aria-label="Écouter"><span class="kj" aria-hidden="true">音</span></button></div></div>`;

  if (it.isNew && it.step === 1) {
    v.appendChild(
      el(`<section class="card">${head}
      <p class="small muted" style="margin:0" id="ins">Voici le signe ${K.k}. Observez sa forme, puis touchez « Apprendre » pour voir l'ordre des traits.</p>
      <div class="stage" id="st"></div>
      <div class="row" id="acts"><button class="btn primary big" id="learn">Apprendre</button></div>
      <h3>Le signe ${K.k} dans les polices courantes</h3>${ficheHTML(it.k)}</section>`),
    );
    const st = $("#st");
    st.innerHTML = modelSVG(it.k, "learn", show);
    const run = () => {
      st.innerHTML = modelSVG(it.k, "learn", show);
      $("#ins").textContent = "Chaque couleur est un trait ; le chiffre marque où il commence, la flèche montre le sens.";
      $("#acts").innerHTML = `<button class="btn" id="replay">Revoir</button><button class="btn primary" id="next" style="flex:1">Je trace dans le pochoir</button>`;
      $("#replay").onclick = run;
      $("#next").onclick = () => {
        it.step = 2;
        viewCard();
      };
      requestAnimationFrame(() => requestAnimationFrame(() => learnSeq(st.firstElementChild!)));
    };
    $("#learn").onclick = run;
  } else if (it.isNew && (it.step === 2 || it.step === 3)) {
    const full = it.step === 2;
    v.appendChild(
      el(`<section class="card">${head}
      <p class="small muted" style="margin:0">${full ? "Tracez dans le pochoir, en suivant les numéros." : "Le pochoir s'efface : seuls restent les points de départ."}</p>
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="undo">Annuler</button><button class="btn" id="clr">Effacer</button><button class="btn primary" id="next" disabled>Suivant</button></div></section>`),
    );
    const pad = makePad($("#st"), modelSVG(it.k, full ? "stencil" : "faded", show));
    const next = $<HTMLButtonElement>("#next");
    pad.onchange = () => (next.disabled = pad.strokes.length === 0);
    $("#undo").onclick = () => pad.undo();
    $("#clr").onclick = () => pad.clear();
    next.onclick = () => {
      it.step = it.step! + 1;
      viewCard();
    };
  } else {
    if (it.isNew) it.step = 4;
    v.appendChild(
      el(`<section class="card">${head}
      <p class="small muted" style="margin:0">Écrivez « ${K.r} » de mémoire, sans aide.</p>
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="undo">Annuler</button><button class="btn" id="clr">Effacer</button><button class="btn primary" id="next" disabled>Comparer</button></div></section>`),
    );
    const pad = makePad($("#st"), modelSVG(it.k, "blank", show));
    const next = $<HTMLButtonElement>("#next");
    pad.onchange = () => (next.disabled = pad.strokes.length === 0);
    $("#undo").onclick = () => pad.undo();
    $("#clr").onclick = () => pad.clear();
    next.onclick = () => viewCompare(it.k, pad.strokes.slice(), false, (g) => onGrade(it, g as Grade));
  }
  $("#say").onclick = () => speak(K.k);
}

function onGrade(it: QueueItem, g: Grade): void {
  if (!session) return;
  const p = profile(), t = today(), d = dayRec(p, t);
  if (!it.counted) {
    if (it.isNew) d.nw++;
    else d.rv++;
    it.counted = true;
  }
  const before = status(p, it.k);
  gradeCard(p, it.k, g, t);
  save();
  if (g === "rate") session.queue.push({ k: it.k, isNew: false, counted: true });
  session.i++;
  if (before !== "done" && status(p, it.k) === "done") celebrate(it.k, viewCard);
  else viewCard();
}

function viewEnd(): void {
  const p = profile(), t = today();
  const nb = { rate: 0, bof: 0, bien: 0 };
  p.log.filter((x) => x.d === t).forEach((x) => nb[x.g]++);
  session = null;
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card"><h2>Séance terminée</h2>
    <div class="stats"><div class="stat"><b>${nb.bien}</b><span>Bien</span></div><div class="stat"><b>${nb.bof}</b><span>Bof</span></div><div class="stat"><b>${nb.rate}</b><span>Raté</span></div></div>
    <p class="small muted" style="margin:0">Revenez demain pour les prochaines révisions.</p>
    <button class="btn primary big" id="home">Retour à l'accueil</button></section>`),
  );
  $("#home").onclick = () => navigate("seance");
}
