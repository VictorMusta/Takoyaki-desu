import { quietNow, setQuietNow, silentAlways } from "../core/sound";
import { FAMILIES, familyTypes } from "../core/drills";
import type { DrillType } from "../core/drills";
import { profile } from "../core/store";
import { el, showWave, view } from "../ui/dom";
import { startDrills, startSession, startWords } from "./session";
import { dueItems, learnedItems, nextToLearn } from "../core/vocab";
import { today } from "../core/scheduler";

/** Every exercise type possible right now, for a « Jouer » round. */
export const allGames = (): DrillType[] => FAMILIES.flatMap((f) => familyTypes(profile(), f.id));

/**
 * « S'entraîner »: everything beyond the day's lesson, in one place. Write (the weakest signs,
 * from memory), play (a random mix of every game), one precise game, or the strict exam.
 * None of it pushes a review away; successes add a little capped, provisional mastery.
 */
export function viewTrain(): void {
  const p = profile();
  const seen = Object.values(p.cards).some((c) => c.seen);
  const games = allGames();
  const v = view();
  v.innerHTML = "";
  const fam = FAMILIES.map((f) => {
    const ok = familyTypes(p, f.id).length > 0;
    return `<button class="btn opt" data-m="${f.id}" ${ok ? "" : "disabled"}><span>${f.title}</span><small>${ok ? f.sub : "Après quelques signes de plus"}</small></button>`;
  }).join("");
  v.appendChild(
    el(`<section class="card"><h2>S'entraîner</h2>
    <p class="small muted" style="margin:0">Autant que vous voulez, sans repousser vos révisions. Chaque réussite fait un peu progresser le signe, jusqu'à « Assez vu pour aujourd'hui ».</p>
    <div class="train-main">
      <button class="btn tile" id="t-write" ${seen ? "" : "disabled"}><b aria-hidden="true">書</b><span>Écrire</span><small>10 signes fragiles, de mémoire</small></button>
      <button class="btn tile" id="t-play" ${games.length ? "" : "disabled"}><b aria-hidden="true">遊</b><span>Jouer</span><small>10 jeux au hasard</small></button>
    </div>
    ${silentAlways() ? "" : `<label class="field" for="quiet">Sans son pour l'instant <input type="checkbox" id="quiet" ${quietNow() ? "checked" : ""}></label>`}
    ${seen ? "" : `<p class="small muted" style="margin:0">Apprenez d'abord quelques signes dans la séance du jour.</p>`}
    </section>`),
  );
  // Vocabulary on demand: travel words and phrases first.
  const toLearn = nextToLearn(p, 5).length, learned = learnedItems(p).length, due = dueItems(p, today()).length;
  v.appendChild(
    el(`<section class="card"><h3>Mots et phrases du voyage</h3>
    <div class="train-main">
      <button class="btn tile" id="w-learn" ${toLearn ? "" : "disabled"}><b aria-hidden="true">言</b><span>Apprendre ${toLearn || 5} mots</span><small>${toLearn ? "Mots et phrases utiles en voyage" : "Apprenez d'abord quelques signes"}</small></button>
      <button class="btn tile" id="w-review" ${learned ? "" : "disabled"}><b aria-hidden="true">復</b><span>Réviser mes mots</span><small>${learned ? (due ? `${due} à revoir aujourd'hui, puis des jeux` : `${learned} appris, en jeux`) : "Après vos premiers mots"}</small></button>
    </div></section>`),
  );
  v.appendChild(el(`<section class="card"><h3>Un jeu précis</h3><div class="modes">${fam}</div></section>`));
  v.appendChild(
    el(`<section class="card"><h3>Examen strict</h3>
    <p class="small muted" style="margin:0">Quelques signes sans aide, pour vérifier que vos notes sont honnêtes. Ne change pas vos révisions.</p>
    <div class="row"><a class="btn" href="#examen">Passer un examen</a></div></section>`),
  );
  const qt = v.querySelector<HTMLInputElement>("#quiet");
  if (qt) qt.onchange = () => setQuietNow(qt.checked);
  showWave();
  (v.querySelector("#t-write") as HTMLButtonElement).onclick = () => startSession("practice");
  (v.querySelector("#t-play") as HTMLButtonElement).onclick = () => startDrills(allGames());
  (v.querySelector("#w-learn") as HTMLButtonElement).onclick = () => startWords("learn");
  (v.querySelector("#w-review") as HTMLButtonElement).onclick = () => startWords("review");
  v.querySelectorAll<HTMLButtonElement>("[data-m]").forEach((b) => (b.onclick = () => startDrills(familyTypes(p, b.dataset.m!))));
}
