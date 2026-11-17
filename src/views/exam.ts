import { byK, KANA } from "../data/kana";
import { today } from "../core/scheduler";
import { profile, save } from "../core/store";
import type { ExamResult } from "../core/types";
import { $, $opt, el, view } from "../ui/dom";
import { modelSVG } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";
import { viewCompare } from "./compare";
import { navigate } from "../router";

interface ExamRun {
  items: string[];
  i: number;
  res: ExamResult[];
}

let run: ExamRun | null = null;

export function examRunning(): boolean {
  return !!run && run.i < run.items.length;
}

/** Strict exam: up to 20 seen signs, no help. Does not change review dates; feeds calibration. */
export function viewExam(): void {
  const v = view();
  v.innerHTML = "";
  if (run && run.i < run.items.length) {
    const k = run.items[run.i], K = byK[k];
    v.appendChild(
      el(`<section class="card"><div class="prompt"><div><div class="romaji">${K.r}</div><div class="small muted">Examen strict · ${run.i + 1} / ${run.items.length}</div></div><button class="btn" id="say" aria-label="Écouter">🔊</button></div>
      <div class="stage" id="st"></div>
      <div class="tools"><button class="btn" id="undo">Annuler</button><button class="btn" id="clr">Effacer</button><button class="btn primary" id="next" disabled>Comparer</button></div></section>`),
    );
    const pad = makePad($("#st"), modelSVG(k, "blank", false));
    const next = $<HTMLButtonElement>("#next");
    pad.onchange = () => (next.disabled = pad.strokes.length === 0);
    $("#undo").onclick = () => pad.undo();
    $("#clr").onclick = () => pad.clear();
    $("#say").onclick = () => speak(K.k);
    next.onclick = () =>
      viewCompare(k, pad.strokes.slice(), true, (a) => {
        if (!run) return;
        run.res.push({ k, ok: a === "ok" });
        run.i++;
        viewExam();
      });
    return;
  }
  if (run) {
    const ok = run.res.filter((r) => r.ok).length;
    profile().exams.push({ d: today(), r: run.res });
    save();
    const misses = run.res.filter((r) => !r.ok).map((r) => r.k).join(" ");
    v.appendChild(
      el(`<section class="card"><h2>Examen terminé : ${ok} / ${run.res.length}</h2>
      <p class="small muted" style="margin:0">${misses ? "À retravailler : " + misses : "Aucune erreur."}</p>
      <button class="btn primary big" id="back">Voir la calibration</button></section>`),
    );
    run = null;
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
      run = { items, i: 0, res: [] };
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
