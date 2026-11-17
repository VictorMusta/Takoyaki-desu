import { byK, KANA } from "../data/kana";
import { today } from "../core/scheduler";
import { profile, save } from "../core/store";
import type { Drawing, ExamRun } from "../core/types";
import { $, $opt, el, view } from "../ui/dom";
import { modelSVG } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";
import { viewCompare } from "./compare";
import { navigate } from "../router";

/** The exam lives in the profile and is saved after every answer, so it resumes after a closed app. */
const getRun = (): ExamRun | undefined => profile()?.examRun;

export function examRunning(): boolean {
  const run = getRun();
  return !!run && run.i < run.items.length;
}

/** Strict exam: up to 20 seen signs, no help. Does not change review dates; feeds calibration. */
export function viewExam(): void {
  const v = view();
  v.innerHTML = "";
  const run = getRun();
  const correct = (k: string, strokes: Drawing) => {
    run!.pending = strokes;
    save();
    viewCompare(k, strokes, true, (a) => {
      run!.res.push({ k, ok: a === "ok" });
      run!.i++;
      delete run!.pending;
      save();
      viewExam();
    });
  };
  if (run && run.i < run.items.length) {
    const k = run.items[run.i], K = byK[k];
    if (run.pending) return correct(k, run.pending);
    v.appendChild(
      el(`<section class="card"><div class="prompt"><div><div class="romaji">${K.r}</div><div class="small muted">Examen strict · ${run.i + 1} / ${run.items.length}</div></div><button class="btn" id="say" aria-label="Écouter"><span class="kj" aria-hidden="true">音</span></button></div>
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="undo" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="clr">Recommencer</button><button class="btn primary" id="next" disabled>Comparer</button></div>
      <button class="btn sm" id="stop" style="align-self:flex-start">Arrêter l'examen</button></section>`),
    );
    $("#stop").onclick = () => {
      $("#stop").outerHTML = `<div class="row"><span class="small">Arrêter et perdre cet examen ?</span><button class="btn sm danger" id="stopok">Arrêter</button><button class="btn sm" id="stopno">Continuer</button></div>`;
      $("#stopok").onclick = () => {
        delete profile().examRun;
        save();
        viewExam();
      };
      $("#stopno").onclick = () => viewExam();
    };
    const pad = makePad($("#st"), modelSVG(k, "blank", false));
    const next = $<HTMLButtonElement>("#next");
    pad.onchange = () => (next.disabled = pad.strokes.length === 0);
    $("#undo").onclick = () => pad.undo();
    $("#clr").onclick = () => pad.clear();
    $("#say").onclick = () => speak(K.k);
    next.onclick = () => correct(k, pad.strokes.slice() as Drawing);
    return;
  }
  if (run) {
    const ok = run.res.filter((r) => r.ok).length;
    profile().exams.push({ d: today(), r: run.res });
    delete profile().examRun;
    save();
    const misses = run.res.filter((r) => !r.ok).map((r) => r.k).join(" ");
    v.appendChild(
      el(`<section class="card"><h2>Examen terminé : ${ok} / ${run.res.length}</h2>
      <p class="small muted" style="margin:0">${misses ? "À retravailler : " + misses : "Aucune erreur."}</p>
      <button class="btn primary big" id="back">Voir la calibration</button></section>`),
    );
    $("#back").onclick = () => navigate("progres");
    return;
  }
  const p = profile();
  const seen = KANA.filter((k) => p.cards[k.k]?.seen).map((k) => k.k);
  v.appendChild(
    el(`<section class="card"><h2>Examen strict</h2>
    <p class="small muted" style="margin:0">Jusqu'à 20 signes déjà vus, tirés au hasard. Aucune aide, aucun pochoir. « Correct » demande trois « Oui » à la checklist. L'examen ne change pas vos dates de révision : il sert à vérifier vos notes.</p>
    <button class="btn primary big" id="start" ${seen.length ? "" : "disabled"}>${seen.length ? `Commencer (${Math.min(20, seen.length)} signes)` : "Apprenez d'abord quelques signes"}</button></section>`),
  );
  const start = $opt<HTMLButtonElement>("#start");
  if (start)
    start.onclick = () => {
      const items = shuffle(seen).slice(0, 20);
      profile().examRun = { items, i: 0, res: [] };
      save();
      viewExam();
    };
}

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
