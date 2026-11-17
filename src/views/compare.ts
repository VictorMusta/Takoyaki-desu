import { byK } from "../data/kana";
import type { Grade } from "../core/types";
import { profile } from "../core/store";
import { $, el, view } from "../ui/dom";
import { ficheHTML } from "../ui/fiche";
import { animate, innerOf, modelSVG, userSVG, type Stroke } from "../ui/model";

type Answer = Grade | "ok" | "ko" | "peek";

/**
 * Side-by-side (or overlaid) comparison, the 3-question checklist, then the grade.
 * Exam: « Correct » needs three yes. Lesson: the questions are optional; a « Non » blocks « Bien ».
 */
/** peeked: the learner looked at the sign while recalling it; no self-grade, it simply comes back sooner. */
export function viewCompare(k: string, strokes: Stroke[], exam: boolean, onAnswer: (a: Answer) => void, peeked = false): void {
  const K = byK[k];
  const show = profile().settings.showNums;
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card">
    <div class="spread"><h2>${K.k} · ${K.r}</h2><button class="btn" id="ov" aria-pressed="false">Superposer</button></div>
    <div id="cmp"></div>
    <div class="row"><button class="btn" id="anim">Revoir l'ordre des traits</button></div>
    <details><summary>Le signe et des exemples</summary>${ficheHTML(k)}</details>
    <div id="checks"${peeked ? ' class="hidden"' : ""}>
      <div class="q"><span>Même nombre de traits ? <span class="muted small">(vous ${strokes.length}, modèle ${K.s.length})</span></span><div class="yn" data-q="n"><button class="y">Oui</button><button class="n">Non</button></div></div>
      <div class="q"><span>Ordre et sens des traits respectés ?</span><div class="yn" data-q="o"><button class="y">Oui</button><button class="n">Non</button></div></div>
      <div class="q"><span>Forme et proportions correctes ?</span><div class="yn" data-q="p"><button class="y">Oui</button><button class="n">Non</button></div></div>
    </div>
    <div class="gradebar"><p class="hintline" id="hint" aria-live="polite">${peeked ? "Vous avez regardé le signe : il reviendra plus tard dans cette séance, puis demain." : exam ? "Répondez aux trois questions pour noter." : "Notez directement, ou vérifiez d'abord avec les questions."}</p>
    ${
      peeked
        ? `<div class="grades" style="grid-template-columns:1fr"><button class="btn primary" data-g="peek">Continuer</button></div>`
        : exam
        ? `<div class="grades" style="grid-template-columns:1fr 1fr"><button class="btn g-rate" data-g="ko" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg>Faux</button><button class="btn g-bien" data-g="ok" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>Correct</button></div>`
        : `<div class="grades"><button class="btn g-rate" data-g="rate"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg>Raté</button><button class="btn g-bof" data-g="bof"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5L21.5 20H2.5Z"/></svg>Bof</button><button class="btn g-bien" data-g="bien"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>Bien</button></div>`
    }
    </div>
  </section>`),
  );

  let overlay = false;
  const cmp = $("#cmp");
  const ovBtn = $<HTMLButtonElement>("#ov");
  const render = () => {
    cmp.innerHTML = overlay
      ? `<div class="stage">${userSVG(strokes, show, innerOf(modelSVG(k, "ghost", show)))}</div><div class="label">Votre tracé sur le modèle</div>`
      : `<div class="pair"><div><div class="stage">${userSVG(strokes, show)}</div><div class="label">Votre tracé</div></div><div><div class="stage" id="mod">${modelSVG(k, "color", show)}</div><div class="label">Modèle</div></div></div>`;
  };
  render();
  ovBtn.onclick = () => {
    overlay = !overlay;
    ovBtn.setAttribute("aria-pressed", String(overlay));
    ovBtn.textContent = overlay ? "Côte à côte" : "Superposer";
    render();
  };
  const replay = () => {
    overlay = false;
    ovBtn.setAttribute("aria-pressed", "false");
    ovBtn.textContent = "Superposer";
    render();
    const m = $("#mod");
    m.innerHTML = modelSVG(k, "anim", show);
    animate(m.firstElementChild!);
  };
  $("#anim").onclick = replay;

  const ans: Partial<Record<"n" | "o" | "p", boolean>> = {};
  const btn = (g: string) => $<HTMLButtonElement>(`[data-g="${g}"]`, v);
  const update = () => {
    if (peeked) return;
    const all = ans.n !== undefined && ans.o !== undefined && ans.p !== undefined;
    const perfect = all && ans.n && ans.o && ans.p;
    const hint = $("#hint");
    if (exam) {
      btn("ko").disabled = !all;
      btn("ok").disabled = !perfect;
      hint.textContent = all ? (perfect ? "" : "« Correct » demande trois « Oui ».") : "Répondez aux trois questions pour noter.";
      return;
    }
    // Outside the exam the questions are optional: grade straight away,
    // but a « Non » given to one of them still blocks « Bien ».
    const no = ans.n === false || ans.o === false || ans.p === false;
    btn("bien").disabled = no;
    if (ans.n === false || ans.p === false) hint.textContent = "Nombre de traits ou forme incorrecte : « Bien » est bloqué.";
    else if (ans.o === false) hint.textContent = "Ordre ou sens faux : animation rejouée, note plafonnée à « Bof ».";
    else hint.textContent = "Notez directement, ou vérifiez d'abord avec les questions.";
  };
  v.querySelectorAll<HTMLElement>(".yn").forEach((g) => {
    const q = g.dataset.q as "n" | "o" | "p";
    g.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.onclick = () => {
        const yes = b.classList.contains("y");
        ans[q] = yes;
        g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        if (q === "o" && !yes) replay();
        update();
      };
    });
  });
  v.querySelectorAll<HTMLButtonElement>("[data-g]").forEach((b) => (b.onclick = () => onAnswer(b.dataset.g as Answer)));
}
