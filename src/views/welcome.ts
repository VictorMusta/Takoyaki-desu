import { addProfile, importState } from "../core/store";
import { $, el, showWave, view } from "../ui/dom";
import { paceHTML, setPace } from "../ui/prefs";
import { profile, save } from "../core/store";
import { route } from "../router";

/** First launch on a device: create the first profile, or restore a backup. */
export function viewWelcome(): void {
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card">
    <p class="hero" aria-hidden="true">あいう</p>
    <h2>Bienvenue</h2>
    <p class="small muted" style="margin:0">Apprenez les hiragana en les écrivant de mémoire, puis en comparant votre tracé au modèle. Un signe est maîtrisé quand il tient plusieurs jours : la progression se compte en jours, pas en heures.</p>
    <form id="f" novalidate style="display:flex;flex-direction:column;gap:16px">
      <label class="sr-only" for="name">Votre prénom</label>
      <input id="name" class="text" aria-label="Votre prénom" placeholder="Votre prénom" autocomplete="given-name" maxlength="24" required>
      <h3>Votre rythme</h3>
      ${paceHTML(10)}
      <p class="small muted" style="margin:0">Vous pourrez le changer dans Réglages, et toujours continuer après la séance du jour.</p>
      <button class="btn primary big" type="submit">Commencer</button>
    </form>
    <p class="err hidden" id="e" role="alert"></p>
  </section>`),
  );
  v.appendChild(
    el(`<section class="card"><details><summary>Restaurer une sauvegarde</summary>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      <p class="small muted" style="margin:0">Collez le texte copié depuis Réglages → Sauvegarde sur un autre appareil.</p>
      <textarea id="bk" aria-label="Sauvegarde à restaurer"></textarea>
      <div class="row"><button class="btn" id="im">Restaurer</button></div>
      <p class="err hidden" id="ie" role="alert"></p>
    </div></details></section>`),
  );
  const show = (id: string, msg: string) => {
    const e = $(id);
    e.textContent = msg;
    e.classList.remove("hidden");
  };
  $("#f").onsubmit = (ev) => {
    ev.preventDefault();
    const err = addProfile($<HTMLInputElement>("#name").value);
    if (err) return show("#e", err);
    const pace = document.querySelector<HTMLInputElement>('input[name="pace"]:checked');
    if (pace) setPace(profile().settings, +pace.value);
    save();
    route();
  };
  $("#im").onclick = () => {
    if (importState($<HTMLTextAreaElement>("#bk").value)) route();
    else show("#ie", "Ce texte n'est pas une sauvegarde valide.");
  };
  showWave();
  $<HTMLInputElement>("#name").focus();
}
