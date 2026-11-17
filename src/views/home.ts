import { LINES } from "../data/kana";
import { buildQueue, dayRec, streak, today } from "../core/scheduler";
import { memoryOnly, profile, state } from "../core/store";
import { $opt, el, esc, view } from "../ui/dom";
import { startSession } from "./session";

export function viewHome(): void {
  const p = profile(), t = today();
  const q = buildQueue(p, t), d = dayRec(p, t);
  const nDue = q.filter((x) => !x.isNew).length, nNew = q.length - nDue;
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card">
    <h2>Séance du jour, ${esc(state.active)}</h2>
    <div class="stats">
      <div class="stat"><b>${nDue}</b><span>à réviser</span></div>
      <div class="stat"><b>${nNew}</b><span>nouveaux signes</span></div>
      <div class="stat"><b>${streak(p, t)}</b><span>jours d'affilée</span></div>
    </div>
    <button class="btn primary big" id="go" ${q.length ? "" : "disabled"}>${q.length ? "Commencer" : "Rien à faire aujourd'hui"}</button>
    <p class="muted small" style="margin:0">Aujourd'hui : ${d.nw} nouveau(x), ${d.rv} révision(s). Lignes ouvertes : ${LINES.slice(0, p.unlocked).join(", ")}.</p>
    ${memoryOnly ? '<p class="note">Ce navigateur ne garde pas les données : exportez votre progression (Réglages).</p>' : ""}
  </section>`),
  );
  v.appendChild(
    el(`<section class="card"><h3>Comment ça marche</h3>
    <p class="small muted" style="margin:0">Chaque nouveau signe passe par 4 étapes : découverte, pochoir, pochoir estompé, puis page blanche. Ensuite, vous l'écrivez toujours de mémoire, vous comparez au modèle et vous vous notez. La ligne suivante s'ouvre quand 80 % de la ligne « ${LINES[p.unlocked - 1]} » tient au moins 3 jours.</p></section>`),
  );
  const go = $opt<HTMLButtonElement>("#go");
  if (go) go.onclick = startSession;
}
