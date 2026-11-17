import { byK } from "../data/kana";
import { buildQueue, dayRec, gradeCard, peekCard, practiceQueue, pullForward, status, today } from "../core/scheduler";
import { profile, save } from "../core/store";
import type { Grade, QueueItem, SavedSession } from "../core/types";
import { $, el, view } from "../ui/dom";
import { celebrate } from "../ui/celebrate";
import { ficheHTML } from "../ui/fiche";
import { learnSeq, modelSVG } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";
import { viewCompare } from "./compare";
import { navigate } from "../router";
import { continueBlock } from "./more";

/**
 * The lesson in progress lives in the active profile and is saved after every step,
 * so closing the app (or a crash, or an update) resumes exactly where it stopped.
 * A lesson from a previous day is dropped: today's queue is rebuilt instead.
 */
function cur(): SavedSession | null {
  const p = profile();
  if (!p?.session) return null;
  if (p.session.day !== today() || p.session.i >= p.session.queue.length) {
    delete p.session;
    save();
    return null;
  }
  return p.session;
}

export function hasSession(): boolean {
  return cur() !== null;
}

export type SessionKind = "day" | "practice" | "more";

/** day: today's queue · practice: free review round · more: five extra new signs today. */
export function startSession(kind: SessionKind = "day"): void {
  const p = profile(), t = today();
  if (kind === "more") dayRec(p, t).bonus = (dayRec(p, t).bonus ?? 0) + 5;
  const q = kind === "practice" ? practiceQueue(p) : buildQueue(p, t);
  if (!q.length) return;
  p.session = { day: t, queue: q, i: 0 };
  save();
  viewCard();
}

function stepper(n: number): string {
  let s = "";
  for (let i = 1; i <= 4; i++) s += `<i class="${i <= n ? "on" : ""}"></i>`;
  return `<div class="steps" aria-label="Étape ${n} sur 4">${s}</div>`;
}

export function viewCard(): void {
  const practice = !!profile().session?.queue[0]?.practice;
  const session = cur();
  if (!session) return viewEnd(practice);
  save(); // keeps the discovery step of a new sign
  const it = session.queue[session.i];
  if (it.isNew && !it.step) it.step = 1;
  const K = byK[it.k];
  const show = profile().settings.showNums;
  const v = view();
  v.innerHTML = "";
  const left = session.queue.length - session.i;
  const head = `<div class="prompt"><div><div class="romaji">${K.r}</div><div class="small muted">${it.isNew ? "Nouveau signe · ligne " + K.l : it.practice ? "Entraînement libre" : "Révision"} · ${left} restant(s)</div></div>
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
      <div class="tools"><button class="btn" id="undo" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="clr">Recommencer</button><button class="btn primary" id="next" disabled>Suivant</button></div></section>`),
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
      <p class="small muted" style="margin:0" id="ins">${it.peeked ? "Recopiez le signe en suivant le modèle." : `Écrivez « ${K.r} » de mémoire, sans aide.`}</p>
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="undo" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="clr">Recommencer</button><button class="btn primary" id="next" disabled>Comparer</button></div>
      ${it.peeked ? "" : `<button class="btn" id="peek">Je ne m'en souviens pas : voir le signe</button><p class="small muted" style="margin:-8px 0 0">Le signe reviendra plus tôt : plus tard dans cette séance, puis demain.</p>`}</section>`),
    );
    const pad = makePad($("#st"), modelSVG(it.k, it.peeked ? "stencil" : "blank", show));
    const next = $<HTMLButtonElement>("#next");
    pad.onchange = () => (next.disabled = pad.strokes.length === 0);
    $("#undo").onclick = () => pad.undo();
    $("#clr").onclick = () => pad.clear();
    const peek = document.querySelector<HTMLButtonElement>("#peek");
    if (peek)
      peek.onclick = () => {
        it.peeked = true;
        save();
        viewCard();
      };
    next.onclick = () => viewCompare(it.k, pad.strokes.slice(), false, (g) => onGrade(it, g as Grade | "peek"), !!it.peeked);

  }
  $("#say").onclick = () => speak(K.k);
}

/** Puts a sign back a few cards later in this lesson (or at the end if the lesson is short). */
function requeue(session: SavedSession, item: QueueItem): void {
  session.queue.splice(Math.min(session.queue.length, session.i + 4), 0, item);
}

function onGrade(it: QueueItem, g: Grade | "peek"): void {
  const session = cur();
  if (!session) return;
  const p = profile(), t = today(), d = dayRec(p, t);
  if (it.practice) {
    // Free practice never pushes a date away; a miss or a peek brings the sign back tomorrow.
    if (g === "rate" || g === "peek") {
      pullForward(p, it.k, t);
      requeue(session, { k: it.k, isNew: false, practice: true });
    }
    session.i++;
    save();
    return viewCard();
  }
  if (g === "peek") {
    if (!it.counted) {
      if (it.isNew) d.nw++;
      else d.rv++;
    }
    peekCard(p, it.k, t);
    requeue(session, { k: it.k, isNew: false, counted: true });
    session.i++;
    save();
    return viewCard();
  }
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
  save();
  if (before !== "done" && status(p, it.k) === "done") celebrate(it.k, viewCard);
  else viewCard();
}

function viewEnd(practice = false): void {
  const p = profile(), t = today();
  const nb = { rate: 0, bof: 0, bien: 0 };
  p.log.filter((x) => x.d === t).forEach((x) => nb[x.g]++);
  const v = view();
  v.innerHTML = "";
  const card = el(`<section class="card"><h2>${practice ? "Entraînement terminé" : "Séance terminée"}</h2>
    <div class="stats"><div class="stat"><b>${nb.bien}</b><span>Bien aujourd'hui</span></div><div class="stat"><b>${nb.bof}</b><span>Bof</span></div><div class="stat"><b>${nb.rate}</b><span>Raté</span></div></div>
    <div class="sep"><i></i></div>
    <h3>Continuer ?</h3>
    <div id="more"></div>
    <button class="btn" id="home">Retour à l'accueil</button></section>`);
  v.appendChild(card);
  continueBlock($("#more"), startSession);
  $("#home").onclick = () => navigate("seance");
}
