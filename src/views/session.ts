import { byK } from "../data/kana";
import { buildQueue, dayRec, gradeCard, peekCard, practiceQueue, pullForward, recordMastery, status, today } from "../core/scheduler";
import { profile, save } from "../core/store";
import type { Drawing, Grade, QueueItem, SavedSession, SessionStats } from "../core/types";
import { $, el, esc, setQuit, view } from "../ui/dom";
import { celebrate } from "../ui/celebrate";
import { ficheHTML } from "../ui/fiche";
import { mnemoHTML, mnemoText } from "../ui/mnemo";
import { learnSeq, modelSVG } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";
import { viewCompare } from "./compare";
import { navigate } from "../router";
import { continueBlock } from "./more";
import { available, LESSON_MIX, makeDrill, type DrillType } from "../core/drills";
import { viewDrill } from "./drill";
import { viewWord } from "./word";
import { buildWordQueue, gradeWord } from "../core/vocab";

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

function tally(s: SavedSession, key: keyof SessionStats): void {
  s.stats ??= { bien: 0, bof: 0, rate: 0, vu: 0, ok: 0, ko: 0 };
  s.stats[key]++;
}

/** « Abandonner »: everything graded is already saved; the rest of the lesson is dropped. */
function quit(): void {
  delete profile().session;
  save();
  navigate("seance");
}

export function hasSession(): boolean {
  return cur() !== null;
}

export type SessionKind = "day" | "practice" | "more";

/** Every few drawings, a short exercise of another kind on signs already seen (variety). */
function mixDrills(q: QueueItem[]): QueueItem[] {
  const p = profile(), types = LESSON_MIX.filter((t) => available(p, t));
  if (!types.length) return q;
  const out: QueueItem[] = [];
  q.forEach((it, i) => {
    out.push(it);
    if (i % 3 === 2) {
      const d = makeDrill(p, types[Math.floor(Math.random() * types.length)], it.isNew ? undefined : it.k);
      if (d) out.push({ k: d.ks[0] ?? it.k, isNew: false, practice: true, drill: d });
    }
  });
  return out;
}

/** « S'entraîner »: ten exercises of one kind, free practice. */
export function startDrills(type: DrillType): void {
  const p = profile(), q: QueueItem[] = [];
  for (let i = 0; i < 10; i++) {
    const d = makeDrill(p, type);
    if (d) q.push({ k: d.ks[0] ?? "", isNew: false, practice: true, drill: d });
  }
  if (!q.length) return;
  p.session = { day: today(), queue: q, i: 0 };
  save();
  viewCard();
}

/** day: today's queue · practice: free review round · more: five extra new signs today. */
export function startSession(kind: SessionKind = "day"): void {
  const p = profile(), t = today();
  if (kind === "more") dayRec(p, t).bonus = (dayRec(p, t).bonus ?? 0) + 5;
  const q = kind === "practice" ? practiceQueue(p) : kind === "day" ? [...mixDrills(buildQueue(p, t)), ...buildWordQueue(p, t)] : buildQueue(p, t);
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
  // Read before cur(): it drops a finished lesson, results included.
  const practice = !!profile().session?.queue[0]?.practice;
  const stats = profile().session?.stats;
  const session = cur();
  if (!session) return viewEnd(practice, stats);
  setQuit(quit);
  save(); // keeps the discovery step of a new sign
  const it = session.queue[session.i];
  if (it.word) {
    setQuit(quit);
    return viewWord(it, `${session.queue.length - session.i} restant(s)`, () => save(), (g) => {
      const s = cur();
      if (!s) return;
      tally(s, g);
      gradeWord(profile(), it.k, g, today(), it.isNew && !it.counted);
      it.counted = true;
      if (g === "rate") requeue(s, { k: it.k, isNew: false, word: true, counted: true, step: 2 });
      s.i++;
      save();
      viewCard();
    });
  }
  if (it.drill) {
    const left0 = session.queue.length - session.i;
    setQuit(quit);
    return viewDrill(it.drill, `${it.drill.type === "text" ? "Entraînement" : "Exercice"} · ${left0} restant(s)`, (ok, missed) => {
      const s = cur();
      if (!s) return;
      // Like free practice: a miss brings the signs back sooner, a success changes nothing.
      if (!ok) missed.forEach((k) => pullForward(profile(), k, today()));
      tally(s, ok ? "ok" : "ko");
      s.i++;
      save();
      viewCard();
    });
  }
  if (it.isNew && !it.step) it.step = 1;
  const K = byK[it.k];
  const show = profile().settings.showNums;
  const v = view();
  v.innerHTML = "";
  const left = session.queue.length - session.i;
  const recall = !it.isNew || (it.step ?? 1) >= 4;
  const what = it.isNew ? "Nouveau signe · ligne " + K.l : it.practice ? "Entraînement libre" : "Révision";
  const task = recall ? (it.peeked ? " · recopiez le modèle" : " · de mémoire") : "";
  const head = `<div class="prompt"><div><div class="romaji">${K.r}</div><div class="small muted">${what} · ${left} restant(s)${task}</div></div>
    <div class="row">${it.isNew && !recall ? stepper(it.step!) : ""}<button class="btn sm" id="say">Écouter</button></div></div>`;

  if (it.isNew && it.step === 1) {
    v.appendChild(
      el(`<section class="card">${head}
      <p class="small muted" style="margin:0" id="ins">Voici le signe ${K.k}. Observez sa forme, puis touchez « Apprendre » pour voir l'ordre des traits.</p>
      <div class="stage" id="st"></div>
      <div class="row" id="acts"><button class="btn primary big" id="learn">Apprendre</button></div>
      ${mnemoHTML(it.k, true)}
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
      ${it.hinted && !it.peeked ? `<div class="mnemo hint"><p><span class="ii" aria-hidden="true">i</span> ${esc(mnemoText(it.k))}</p></div>` : ""}
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="undo" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="clr">Recommencer</button><button class="btn primary" id="next" disabled>Comparer</button></div>
      ${
        it.peeked
          ? ""
          : `<div class="helps"><span class="small muted">Besoin d'aide ?</span>${
              it.hinted || !mnemoText(it.k) ? "" : `<button class="btn sm" id="hint1"><span class="ii" aria-hidden="true">i</span> L'astuce</button>`
            }<button class="btn sm" id="peek">Voir le signe</button></div>
      <p class="small muted" style="margin:-8px 0 0">${it.hinted ? "Astuce utilisée : la note ira au mieux jusqu'à « Bof »." : "L'astuce limite la note à « Bof » ; voir le signe compte comme « Raté »."}</p>`
      }</section>`),
    );
    const pad = makePad($("#st"), modelSVG(it.k, it.peeked ? "stencil" : "blank", show));
    const h1 = document.querySelector<HTMLButtonElement>("#hint1");
    if (h1)
      h1.onclick = () => {
        it.hinted = true;
        save();
        viewCard();
      };
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
    const correct = (strokes: Drawing) => {
      it.strokes = strokes;
      save();
      viewCompare(it.k, strokes, false, (g) => onGrade(it, g as Grade | "peek"), !!it.peeked, !!it.hinted);
    };
    if (it.strokes) return correct(it.strokes);
    next.onclick = () => correct(pad.strokes.slice() as Drawing);

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
  delete it.strokes;
  tally(session, g === "peek" ? "vu" : g);
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

function viewEnd(practice = false, st?: SessionStats): void {
  setQuit(null);
  const p = profile(), t = today();
  recordMastery(p, t);
  save();
  const s = st ?? { bien: 0, bof: 0, rate: 0, vu: 0, ok: 0, ko: 0 };
  const drawn = s.bien + s.bof + s.rate + s.vu, ex = s.ok + s.ko;
  const day = p.log.filter((x) => x.d === t).length;
  const stat = (n: number, label: string) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
  const v = view();
  v.innerHTML = "";
  const card = el(`<section class="card"><h2>${practice ? "Entraînement terminé" : "Séance terminée"}</h2>
    ${drawn ? `<div class="stats">${stat(s.bien, "Bien")}${stat(s.bof, "Bof")}${stat(s.rate + s.vu, s.vu ? `Raté (dont ${s.vu} « vu »)` : "Raté")}</div>` : ""}
    ${ex ? `<div class="stats">${stat(s.ok, "exercice" + (s.ok > 1 ? "s" : "") + " juste" + (s.ok > 1 ? "s" : ""))}${stat(s.ko, "à revoir")}${stat(Math.round((s.ok / ex) * 100), "% de réussite")}</div>` : ""}
    ${!drawn && !ex ? `<p class="small muted" style="margin:0">Rien de noté cette fois.</p>` : ""}
    ${!practice && day ? `<p class="small muted" style="margin:0">Aujourd'hui en tout : ${day} signe${day > 1 ? "s" : ""} noté${day > 1 ? "s" : ""}.</p>` : ""}
    <div class="sep"><i></i></div>
    <h3>Continuer ?</h3>
    <div id="more"></div>
    <button class="btn" id="home">Retour à l'accueil</button></section>`);
  v.appendChild(card);
  continueBlock($("#more"), startSession);
  $("#home").onclick = () => navigate("seance");
}
