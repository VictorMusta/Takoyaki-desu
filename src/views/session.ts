import { byK, sound } from "../data/kana";
import { buildQueue, cardOf, dayRec, gradeCard, peekCard, practiceQueue, pullForward, recordMastery, status, today } from "../core/scheduler";
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

/** One more exercise for today's activity (drills, free practice, words). */
function countEx(): void {
  const d = dayRec(profile(), today());
  d.ex = (d.ex ?? 0) + 1;
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
/** A free round of ten exercises, mixing the given types (each one possible). */
export function startDrills(types: DrillType | DrillType[]): void {
  const p = profile(), q: QueueItem[] = [];
  const ts = Array.isArray(types) ? types : [types];
  if (!ts.length) return;
  for (let i = 0; i < 10; i++) {
    const d = makeDrill(p, ts[Math.floor(Math.random() * ts.length)]);
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

/** Three visible steps: trace on the animated model, faded stencil, blank page (step 2 is legacy). */
function stepper(step: number): string {
  const n = step <= 2 ? 1 : step - 1;
  let s = "";
  for (let i = 1; i <= 3; i++) s += `<i class="${i <= n ? "on" : ""}"></i>`;
  return `<div class="steps" aria-label="Étape ${n} sur 3">${s}</div>`;
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
      countEx();
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
      countEx();
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
  const what = it.isNew ? "Nouveau signe · ligne " + K.l : it.learn !== undefined ? `Nouveau signe · à confirmer ${it.learn + 1} / ${LEARN_RECALLS}` : it.practice ? "Entraînement libre" : "Révision";
  const task = recall ? (it.peeked ? " · recopiez le modèle" : " · de mémoire") : "";
  const head = `<div class="prompt"><div><div class="romaji">${sound(K.k)}</div><div class="small muted">${what} · ${left} restant(s)${task}</div></div>
    <div class="row">${it.isNew && !recall ? stepper(it.step!) : ""}<button class="btn sm" id="say">Écouter</button></div></div>`;

  if (it.isNew && it.step === 1) {
    // The sign, its stroke order playing by itself, and a pad right on it: people want to
    // draw at once (a tester tried before finding « Apprendre »), so there is nothing to tap first.
    v.appendChild(
      el(`<section class="card">${head}
      <p class="small muted" style="margin:0">Regardez l'ordre des traits, puis tracez par-dessus avec le doigt, en suivant les numéros.</p>
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="replay">Revoir l'ordre</button><button class="btn" id="clr">Recommencer</button><button class="btn primary" id="next" disabled>Suivant</button></div>
      ${mnemoHTML(it.k, true)}
      <h3>Le signe ${K.k} dans les polices courantes</h3>${ficheHTML(it.k)}</section>`),
    );
    const st = $("#st");
    const pad = makePad(st, modelSVG(it.k, "learn", show));
    const play = () => requestAnimationFrame(() => requestAnimationFrame(() => learnSeq(st.firstElementChild!)));
    play();
    const next = $<HTMLButtonElement>("#next");
    pad.onchange = () => (next.disabled = pad.strokes.length === 0);
    $("#replay").onclick = play;
    $("#clr").onclick = () => pad.clear();
    next.onclick = () => {
      it.step = 3; // the plain stencil step is now part of this one
      viewCard();
    };
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

/**
 * A new sign is learnt, not just seen: after its discovery it must be written from memory
 * LEARN_RECALLS times in the lesson, a few cards apart, before it counts as learnt (« Anki
 * learning steps »). A miss brings it back two cards later and starts the count again.
 */
export const LEARN_RECALLS = 2;

function onGrade(it: QueueItem, g: Grade | "peek"): void {
  const session = cur();
  if (!session) return;
  delete it.strokes;
  tally(session, g === "peek" ? "vu" : g);
  const p = profile(), t = today(), d = dayRec(p, t);
  if (it.practice) {
    countEx();
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
    requeue(session, { k: it.k, isNew: false, counted: true, ...(it.isNew || it.learn !== undefined ? { learn: 0 } : {}) });
    session.i++;
    save();
    return viewCard();
  }
  if (!it.counted) {
    if (it.isNew) d.nw++;
    else d.rv++;
    it.counted = true;
  }
  // Learning a new sign: count the recalls; it graduates (first real grade) at the last one.
  if (it.isNew || it.learn !== undefined) {
    const c = cardOf(p, it.k);
    c.seen = true;
    c.due ??= t; // left mid-lesson, it comes back as a review today
    if (g === "rate") {
      gradeCard(p, it.k, g, t);
      session.queue.splice(Math.min(session.queue.length, session.i + 3), 0, { k: it.k, isNew: false, counted: true, learn: 0 });
      session.i++;
      save();
      return viewCard();
    }
    const done = (it.learn ?? 0) + 1;
    if (done < LEARN_RECALLS) {
      requeue(session, { k: it.k, isNew: false, counted: true, learn: done });
      session.i++;
      save();
      return viewCard();
    }
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
