import { LINES, lineLabel } from "../data/kana";
import { buildQueue, dayRec, today } from "../core/scheduler";
import { buildWordQueue } from "../core/vocab";
import { memoryOnly, profile, state } from "../core/store";
import { $, $opt, el, esc, showWave, view } from "../ui/dom";
import { startSession } from "./session";
import { continueBlock } from "./more";
import { FAMILIES, familyTypes } from "../core/drills";
import { startDrills } from "./session";
import { backupDue, daysSinceBackup, everBackedUp, sendBackup, snoozeBackup } from "../core/backup";

export function viewHome(): void {
  const p = profile(), t = today();
  const q = [...buildQueue(p, t), ...buildWordQueue(p, t)], d = dayRec(p, t);
  const nWords = q.filter((x) => x.word).length;
  const nDue = q.filter((x) => !x.isNew && !x.word).length, nNew = q.filter((x) => x.isNew && !x.word).length;
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card">
    <h2>Séance du jour, ${esc(state.active)}</h2>
    <div class="stats">
      <div class="stat"><b>${nDue}</b><span>à réviser</span></div>
      <div class="stat"><b>${nNew}</b><span>nouveaux signes</span></div>
      <div class="stat"><b>${nWords}</b><span>mots</span></div>
    </div>
    ${q.length ? `<button class="btn primary big" id="go">Commencer</button>` : `<p style="margin:0">La séance du jour est faite. Vous pouvez continuer :</p><div id="more"></div>`}
    <p class="muted small" style="margin:0">Aujourd'hui : ${d.nw} nouveau(x), ${d.rv} révision(s). Ligne en cours : ${lineLabel(LINES[p.unlocked - 1])}.</p>
    ${memoryOnly ? '<p class="note">Ce navigateur ne garde pas les données : exportez votre progression (Réglages).</p>' : ""}
  </section>`),
  );
  if (backupDue()) {
    const n = daysSinceBackup();
    const bk = el(`<section class="card backup-nag"><h3>Mettre votre progression à l'abri</h3>
      <p class="small" style="margin:0">${everBackedUp() ? `Dernière sauvegarde il y a ${n} jours.` : "Aucune sauvegarde pour l'instant."} Elle ne vit que dans ce téléphone : envoyez-vous le fichier par mail, il suffira de l'importer pour tout retrouver.</p>
      <div class="row"><button class="btn primary" id="bk">M'envoyer ma sauvegarde</button><button class="btn" id="bkl">Plus tard</button></div>
      <p class="small muted hidden" id="bkm" role="status" style="margin:0"></p></section>`);
    v.appendChild(bk);
    $<HTMLButtonElement>("#bk").onclick = async () => {
      const r = await sendBackup();
      if (r === "cancelled") return;
      bk.innerHTML = `<p class="small" style="margin:0">${r === "shared" ? "Merci ! Gardez ce mail : prochain rappel dans une semaine." : "Le fichier est téléchargé. Envoyez-le-vous ou gardez-le en lieu sûr : prochain rappel dans une semaine."}</p>`;
    };
    $<HTMLButtonElement>("#bkl").onclick = () => {
      snoozeBackup();
      bk.remove();
    };
  }
  v.appendChild(
    el(`<section class="card"><details><summary>Comment ça marche</summary>
    <p class="small muted" style="margin:8px 0 0">Chaque nouveau signe passe par 4 étapes : découverte, pochoir, pochoir estompé, puis page blanche. Ensuite, vous l'écrivez toujours de mémoire, vous comparez au modèle et vous vous notez. La ligne suivante s'ouvre quand 80 % de la ligne « ${lineLabel(LINES[p.unlocked - 1])} » tient au moins 3 jours.</p></details></section>`),
  );
  const modes = FAMILIES.map((f) => {
    const ok = familyTypes(p, f.id).length > 0;
    return `<button class="btn opt" data-m="${f.id}" ${ok ? "" : "disabled"}><span>${f.title}</span><small>${ok ? f.sub : "Après quelques signes de plus"}</small></button>`;
  }).join("");
  const tr = el(`<section class="card"><details><summary>S'entraîner autrement</summary><p class="small muted" style="margin:8px 0">Dix exercices variés sur ce que vous avez déjà vu, sans limite et sans repousser vos révisions.</p><div class="modes">${modes}</div></details></section>`);
  v.appendChild(tr);
  tr.querySelectorAll<HTMLButtonElement>("[data-m]").forEach((b) => (b.onclick = () => startDrills(familyTypes(p, b.dataset.m!))));
  showWave();
  const go = $opt<HTMLButtonElement>("#go");
  if (go) go.onclick = () => startSession("day");
  const more = $opt<HTMLElement>("#more");
  if (more) continueBlock(more, startSession);
}
