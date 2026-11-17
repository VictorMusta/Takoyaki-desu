import { LINES } from "../data/kana";
import { addProfile, exportState, importState, profile, save, state } from "../core/store";
import { $, el, view } from "../ui/dom";
import { resetSession } from "./session";
import { route } from "../router";

export function viewSettings(): void {
  const p = profile(), v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card"><h2>Réglages de ${state.active}</h2>
    <label class="field" for="nn">Nouveaux signes par jour <input type="number" id="nn" min="1" max="20" value="${p.settings.newPerDay}"></label>
    <label class="field" for="rc">Plafond de révisions par jour <input type="number" id="rc" min="10" max="300" value="${p.settings.revCap}"></label>
    <label class="field" for="sn">Afficher les numéros des traits <input type="checkbox" id="sn" ${p.settings.showNums ? "checked" : ""}></label>
    <div class="row"><button class="btn" id="unl" ${p.unlocked >= LINES.length ? "disabled" : ""}>Ouvrir la ligne suivante maintenant</button></div>
    <p class="small muted" style="margin:0">Lignes ouvertes : ${p.unlocked} / ${LINES.length}. Utile si vous connaissez déjà certains signes.</p></section>`),
  );
  $<HTMLInputElement>("#nn").onchange = (e) => {
    p.settings.newPerDay = Math.max(1, +(e.target as HTMLInputElement).value || 5);
    save();
  };
  $<HTMLInputElement>("#rc").onchange = (e) => {
    p.settings.revCap = Math.max(10, +(e.target as HTMLInputElement).value || 60);
    save();
  };
  $<HTMLInputElement>("#sn").onchange = (e) => {
    p.settings.showNums = (e.target as HTMLInputElement).checked;
    save();
  };
  $("#unl").onclick = () => {
    p.unlocked = Math.min(LINES.length, p.unlocked + 1);
    save();
    viewSettings();
  };

  v.appendChild(
    el(`<section class="card"><h3>Sauvegarde</h3>
    <p class="small muted" style="margin:0">La progression reste sur ce téléphone. Copiez-la de temps en temps pour ne rien perdre, ou pour la transférer sur un autre appareil.</p>
    <textarea id="exp" aria-label="Données de progression"></textarea>
    <div class="row"><button class="btn" id="cp">Copier les données</button><button class="btn" id="im">Importer le texte collé</button><label class="btn" for="file">Importer un fichier</label><input type="file" id="file" accept=".json,application/json" class="hidden"></div>
    <p class="small muted hidden" id="msg" role="status"></p></section>`),
  );
  const exp = $<HTMLTextAreaElement>("#exp");
  exp.value = exportState();
  const msg = (t: string) => {
    const m = $("#msg");
    m.textContent = t;
    m.classList.remove("hidden");
  };
  $("#cp").onclick = async () => {
    try {
      await navigator.clipboard.writeText(exportState());
      msg("Données copiées.");
    } catch {
      exp.select();
      msg("Copie bloquée : le texte est sélectionné, copiez-le à la main.");
    }
  };
  const imp = (txt: string) => {
    if (importState(txt)) {
      resetSession();
      route();
      msg("Progression importée.");
    } else msg("Ce texte n'est pas une sauvegarde valide.");
  };
  $("#im").onclick = () => imp(exp.value);
  $<HTMLInputElement>("#file").onchange = (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) f.text().then(imp);
  };

  v.appendChild(
    el(`<section class="card"><h3>Profils</h3>
    <div class="row"><input id="pn" placeholder="Nouveau prénom" aria-label="Nouveau prénom" class="text"><button class="btn" id="add">Ajouter</button></div></section>`),
  );
  $("#add").onclick = () => {
    if (addProfile($<HTMLInputElement>("#pn").value.trim())) {
      resetSession();
      route();
    }
  };
}
