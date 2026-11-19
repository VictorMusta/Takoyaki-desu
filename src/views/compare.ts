import { byK } from "../data/kana";
import type { Grade } from "../core/types";
import { profile } from "../core/store";
import { $, el, view } from "../ui/dom";
import { ficheHTML } from "../ui/fiche";
import { animate, badSVG, innerOf, modelSVG, userSVG, type Stroke } from "../ui/model";
import { markSeen, pickTip, setHidden } from "../core/tips";
import { today } from "../core/scheduler";
import { compact, viewFeedback } from "./feedback";
import { checkDrawing, explain } from "../core/strokecheck";
import { mailTo } from "../config";
import { buzz } from "../ui/haptics";
import { mnemoHTML } from "../ui/mnemo";
import { save } from "../core/store";

type Answer = Grade | "ok" | "ko" | "peek" | "fixed" | "again" | "skip";

/**
 * Side-by-side (or overlaid) comparison, an automatic check of the drawing, then the grade.
 * The check never grades by itself: it only blocks « Bien » / « Correct » when it finds a real error
 * (stroke count, order, direction, clearly wrong shape). The learner can contest it once.
 */
/** peeked: the learner looked at the sign while recalling it; no self-grade, it simply comes back sooner. */
/** hinted: the memory hook was read during recall, so « Bien » is out of reach (Bof at best). */
export function viewCompare(k: string, strokes: Stroke[], exam: boolean, onAnswer: (a: Answer) => void, peeked = false, hinted = false, retry = false): void {
  const K = byK[k];
  const show = profile().settings.showNums;
  const prof = profile();
  const own = !!prof.variants?.[k];
  const v = view();
  v.innerHTML = "";
  // Own variant (fluent mode): count and order are the learner's; only the shape is judged.
  const chk = peeked ? null : checkDrawing(strokes, K.s, k);
  if (chk && own) Object.assign(chk, { count: true, order: true, swapped: [], issues: chk.issues.filter((x) => x.kind === "shape") });
  const okAll = !chk || (chk.count && chk.order && chk.shape);
  const why = chk && !okAll ? explain(chk) : [];
  const bad = chk ? [...new Set([...chk.swapped, ...chk.issues.map((x) => x.n)])].map((n) => n - 1) : [];
  let contested = false;
  v.appendChild(
    el(`<section class="card">
    <div class="spread"><h2>${K.k} · ${K.r}</h2><button class="btn" id="ov" aria-pressed="false">Superposer</button></div>
    <div id="cmp"></div>
    ${
      peeked
        ? ""
        : `<div class="verdict ${okAll ? "ok" : "ko"}" id="verdict" role="status"><p class="v-h">${okAll ? "Traits vérifiés : rien à redire." : "La vérification a trouvé un souci"}</p>${
            okAll
              ? `<p class="small muted" style="margin:0">${own ? "Votre façon d'écrire : seule la forme est comparée." : "Nombre, ordre et sens corrects."} À vous de juger la forme fine.</p>`
              : `<ul>${why.map((t) => `<li>${t}</li>`).join("")}</ul><button class="btn sm" id="contest">Je pense que c'est juste</button>`
          }</div>`
    }
    <div class="row"><button class="btn" id="anim">Revoir l'ordre des traits</button>${
      prof.fluent && !peeked ? `<button class="btn sm" id="mine">${own ? "Revenir au modèle" : "Moi je le fais pas comme ça"}</button>` : ""
    }</div>
    ${exam ? "" : mnemoHTML(k, false)}
    <div id="tip"></div>
    <details><summary>Le signe et des exemples</summary>${ficheHTML(k)}</details>

    <div class="gradebar"><p class="hintline" id="hint" aria-live="polite">${retry ? "Deuxième essai : il ne change pas votre note." : peeked ? "Vous avez regardé le signe : ça compte comme « Raté ». Il reviendra plus tard dans cette séance, puis demain." : ""}</p>
    ${
      retry
        ? `<div class="grades" style="grid-template-columns:1fr 1fr 1fr"><button class="btn" data-g="skip">Passer à la suite</button><button class="btn" data-g="again">Réessayer</button><button class="btn g-bien" data-g="fixed">C'est bon !</button></div>`
        : peeked
        ? `<div class="grades" style="grid-template-columns:1fr"><button class="btn primary" data-g="peek">Continuer (compte comme Raté)</button></div>`
        : exam
        ? `<div class="grades" style="grid-template-columns:1fr 1fr"><button class="btn g-rate" data-g="ko"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg>Faux</button><button class="btn g-bien" data-g="ok" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>Correct</button></div>`
        : `<div class="grades"><button class="btn g-rate" data-g="rate"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg>Raté</button><button class="btn g-bof" data-g="bof"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5L21.5 20H2.5Z"/></svg>Bof</button><button class="btn g-bien" data-g="bien"${hinted ? " disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>Bien</button></div>`
    }
    </div>
  </section>`),
  );

  // A tip, rarely (lessons only): the sign's trap first, else now and then a generic one.
  const p = profile(), day = today();
  const tip = exam ? null : pickTip(p, k, day);
  if (tip) {
    markSeen(p, tip.id, day);
    save();
    const ill = tip.illus ? badSVG(k, tip.illus) : "";
    $("#tip").outerHTML = `<aside class="tip">${ill ? `<div class="stage tip-ill">${ill}</div>` : ""}<div class="tip-body"><p class="tip-h">${tip.id.startsWith("t-") ? "Piège" : "Astuce"}</p><p class="tip-t">${tip.text}</p>
      <label class="tip-off"><input type="checkbox" id="tipoff"> Ne plus afficher cette astuce</label></div></aside>`;
    $<HTMLInputElement>("#tipoff").onchange = (e) => {
      setHidden(p, tip.id, (e.target as HTMLInputElement).checked);
      save();
    };
  }

  let overlay = false;
  const cmp = $("#cmp");
  const ovBtn = $<HTMLButtonElement>("#ov");
  const render = () => {
    cmp.innerHTML = overlay
      ? `<div class="stage">${userSVG(strokes, show, innerOf(modelSVG(k, "ghost", show)), contested ? [] : bad)}</div><div class="label">Votre tracé sur le modèle</div>`
      : `<div class="pair"><div><div class="stage">${userSVG(strokes, show, "", contested ? [] : bad)}</div><div class="label">Votre tracé</div></div><div><div class="stage" id="mod">${modelSVG(k, "color", show)}</div><div class="label">Modèle</div></div></div>`;
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

  const mine = v.querySelector<HTMLButtonElement>("#mine");
  if (mine)
    mine.onclick = () => {
      prof.variants ??= {};
      if (own) {
        delete prof.variants[k];
        save();
        return viewCompare(k, strokes, exam, onAnswer, peeked, hinted);
      }
      // « Moi je le fais pas comme ça »: draw it your way and send it to the author.
      viewFeedback(k, () => viewCompare(k, strokes, exam, onAnswer, peeked, hinted));
    };
  const btn = (g: string) => $<HTMLButtonElement>(`[data-g="${g}"]`, v);
  const update = () => {
    if (peeked) return;
    const blocked = !okAll && !contested;
    const hint = $("#hint");
    if (retry) {
      btn("fixed").disabled = blocked;
      hint.textContent = blocked ? "Pas encore tout à fait : réessayez, ou passez à la suite." : "Deuxième essai : il ne change pas votre note.";
      return;
    }
    if (exam) {
      btn("ok").disabled = blocked;
      hint.textContent = blocked ? "« Correct » est bloqué par la vérification." : "";
      hint.classList.toggle("hidden", !blocked);
      return;
    }
    btn("bien").disabled = blocked || hinted;
    hint.textContent = hinted ? "Astuce utilisée : au mieux « Bof »." : blocked ? "« Bien » est bloqué : notez « Bof » ou « Raté »." : "";
    hint.classList.toggle("hidden", !hint.textContent);
  };
  // A wrong order or direction: show the right one straight away.
  if (chk && !chk.order) setTimeout(replay, 300);
  const contest = v.querySelector<HTMLButtonElement>("#contest");
  if (contest)
    contest.onclick = () => {
      contested = true;
      render();
      const vd = $("#verdict");
      vd.className = "verdict ok";
      const body = `Takoyaki desu · contestation sur ${k} (${K.r})\nLa vérification disait : ${why.join(" ")}\nScore ${chk!.score.toFixed(3)} · ${strokes.length} traits (modèle ${K.s.length}).\n\nTracé : ${compact(strokes)}`;
      const link = mailTo(`Takoyaki desu : vérification contestée sur ${k}`, body);
      vd.innerHTML = `<p class="v-h">D'accord, vous avez le dernier mot.</p><p class="small muted" style="margin:0">« ${exam ? "Correct" : "Bien"} » est débloqué.${link ? ` <a href="${link}">Envoyer ce tracé à l'auteur</a> pour qu'il corrige la vérification.` : ""}</p>`;
      update();
    };
  update();
  if (chk) buzz(okAll ? "ok" : "ko");
  const feel: Record<string, "ok" | "soft" | "ko"> = { bien: "ok", ok: "ok", fixed: "ok", bof: "soft", again: "soft", rate: "ko", ko: "ko", peek: "ko" };
  v.querySelectorAll<HTMLButtonElement>("[data-g]").forEach(
    (b) =>
      (b.onclick = () => {
        buzz(feel[b.dataset.g!] ?? "ok");
        onAnswer(b.dataset.g as Answer);
      }),
  );
}
