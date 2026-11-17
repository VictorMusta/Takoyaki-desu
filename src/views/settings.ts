import { LINES } from "../data/kana";
import { addProfile, deleteProfile, exportState, importState, profile, profileNames, renameProfile, save, setActive, state } from "../core/store";
import { $, el, esc, view } from "../ui/dom";
import { getTheme, paceHTML, setTheme, type Theme } from "../ui/prefs";
import { confirmModal } from "../ui/modal";
import { enableFluent, revertFluent } from "../core/fluent";
import { today } from "../core/scheduler";
import { route } from "../router";

export function viewSettings(): void {
  const p = profile(), v = view();
  v.innerHTML = "";

  /* ---- profiles ---- */
  const names = profileNames();
  const rows = names
    .map(
      (n, i) => `<div class="prow" data-i="${i}">
        <span class="pn">${esc(n)}${n === state.active ? '<span class="tag">actif</span>' : ""}</span>
        ${n === state.active ? "" : `<button class="btn sm" data-act="use">Choisir</button>`}
        <button class="btn sm" data-act="ren">Renommer</button>
        <button class="btn sm danger" data-act="del">Supprimer</button>
      </div>`,
    )
    .join("");
  v.appendChild(
    el(`<section class="card"><h2>Profils sur ce téléphone</h2>
    <div class="plist">${rows}</div>
    <form id="addf" class="row" novalidate>
      <label class="sr-only" for="pn">Prénom du nouveau profil</label>
      <input id="pn" class="text" placeholder="Prénom du nouveau profil" maxlength="24">
      <button class="btn" type="submit">Ajouter</button>
    </form>
    <p class="err hidden" id="pe" role="alert"></p>
    <p class="small muted" style="margin:0">Chaque profil a sa propre progression. Rien ne quitte ce téléphone.</p></section>`),
  );
  const perr = (msg: string | null) => {
    const e = $("#pe");
    e.textContent = msg ?? "";
    e.classList.toggle("hidden", !msg);
  };
  const refresh = () => route();
  $("#addf").onsubmit = (ev) => {
    ev.preventDefault();
    const err = addProfile($<HTMLInputElement>("#pn").value);
    if (err) perr(err);
    else refresh();
  };
  v.querySelectorAll<HTMLElement>(".prow").forEach((row) => {
    const name = names[+row.dataset.i!];
    row.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((b) => {
      b.onclick = () => {
        const act = b.dataset.act;
        if (act === "use") {
          setActive(name);
          refresh();
        } else if (act === "ren") {
          row.innerHTML = `<input class="text" maxlength="24" aria-label="Nouveau prénom"><button class="btn sm primary" data-ok>OK</button><button class="btn sm" data-no>Annuler</button>`;
          const inp = $<HTMLInputElement>("input", row);
          inp.value = name;
          inp.focus();
          inp.select();
          const ok = () => {
            const err = renameProfile(name, inp.value);
            if (err) perr(err);
            else refresh();
          };
          $("[data-ok]", row).onclick = ok;
          inp.onkeydown = (e) => e.key === "Enter" && ok();
          $("[data-no]", row).onclick = () => viewSettings();
        } else if (act === "del") {
          row.innerHTML = `<span class="pn">Supprimer ${esc(name)} et toute sa progression ?</span><button class="btn sm danger" data-ok>Supprimer</button><button class="btn sm" data-no>Annuler</button>`;
          $("[data-ok]", row).onclick = () => {
            deleteProfile(name);
            refresh();
          };
          $("[data-no]", row).onclick = () => viewSettings();
        }
      };
    });
  });
  try {
    if (sessionStorage.getItem("focus-new-profile")) {
      sessionStorage.removeItem("focus-new-profile");
      $<HTMLInputElement>("#pn").focus();
    }
  } catch {
    /* ignore */
  }

  /* ---- learning settings for the active profile ---- */
  v.appendChild(
    el(`<section class="card"><h2>Réglages de ${esc(state.active)}</h2>
    <h3>Rythme</h3>
    ${paceHTML(p.settings.newPerDay, "space")}
    <label class="field" for="nn">Ou un nombre précis par jour <input type="number" id="nn" min="1" max="46" value="${p.settings.newPerDay}"></label>
    <label class="field" for="rc">Plafond de révisions par jour <input type="number" id="rc" min="10" max="300" value="${p.settings.revCap}"></label>
    <label class="field" for="sn">Afficher les numéros des traits <input type="checkbox" id="sn" ${p.settings.showNums ? "checked" : ""}></label>
    <div class="row"><button class="btn" id="unl" ${p.unlocked >= LINES.length ? "disabled" : ""}>Ouvrir la ligne suivante maintenant</button></div>
    <p class="small muted" style="margin:0">Lignes ouvertes : ${p.unlocked} / ${LINES.length}. Utile si vous connaissez déjà certains signes.</p></section>`),
  );
  $<HTMLInputElement>("#nn").onchange = (e) => {
    p.settings.newPerDay = Math.min(46, Math.max(1, +(e.target as HTMLInputElement).value || 10));
    save();
    viewSettings();
  };
  v.querySelectorAll<HTMLInputElement>('input[name="space"]').forEach((r) => {
    r.onchange = () => {
      p.settings.newPerDay = +r.value;
      save();
      $<HTMLInputElement>("#nn").value = r.value;
    };
  });
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

  /* ---- level: « je parle déjà japonais » (reversible) ---- */
  const fl = p.fluent;
  const since = fl ? new Date(Date.now() - (today() - fl.since) * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
  v.appendChild(
    el(`<section class="card"><h3>Niveau</h3>
    <p class="small muted" style="margin:0">${
      fl
        ? `Depuis le ${since}, ${esc(state.active)} est en mode « je parle déjà japonais » : tout est ouvert et l'examen propose les 46 signes.`
        : "Si vous lisez et écrivez déjà les hiragana, ouvrez tout d'un coup et vérifiez-vous avec des examens sur les 46 signes."
    }</p>
    <div class="row"><button class="btn" id="fluent">${fl ? "J'ai menti" : "Je parle déjà japonais"}</button></div></section>`),
  );
  $("#fluent").onclick = async () => {
    const yes = fl
      ? await confirmModal({
          title: "Revenir en arrière ?",
          body: `<p style="margin:0">La progression de ${esc(state.active)} redevient exactement celle du ${since}, juste avant d'avoir choisi « Je parle déjà japonais ».</p><p class="small muted" style="margin:0">Ce qui a été fait depuis (séances, examens) sera effacé.</p>`,
          ok: "Revenir à ma progression",
        })
      : await confirmModal({
          title: "Je parle déjà japonais",
          body: `<p style="margin:0">Toutes les lignes s'ouvrent et les 46 signes sont considérés comme connus. Ils reviendront peu à peu en révision, et l'Examen proposera les 46 signes : un signe raté y revient dès le lendemain.</p><p style="margin:0"><b>C'est réversible.</b> Votre progression actuelle est mise de côté : le bouton deviendra « J'ai menti » et la rétablira telle qu'elle est aujourd'hui.</p>`,
          ok: "Tout débloquer",
        });
    if (!yes) return;
    if (fl) revertFluent(p);
    else enableFluent(p, today());
    save();
    route();
  };

  /* ---- appearance (this device) ---- */
  const th = getTheme();
  const thOpt = (val: Theme, label: string) => `<button class="btn" data-th="${val}" aria-pressed="${th === val}">${label}</button>`;
  v.appendChild(
    el(`<section class="card"><h3>Apparence</h3>
    <div class="seg" role="group" aria-label="Thème">${thOpt("auto", "Automatique")}${thOpt("light", "Papier")}${thOpt("dark", "Nuit")}</div>
    <p class="small muted" style="margin:0">Automatique suit le réglage du téléphone. Vaut pour tous les profils de cet appareil.</p></section>`),
  );
  v.querySelectorAll<HTMLButtonElement>("[data-th]").forEach((b) => {
    b.onclick = () => {
      setTheme(b.dataset.th as Theme);
      v.querySelectorAll("[data-th]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    };
  });

  /* ---- credits ---- */
  v.appendChild(
    el(`<section class="card"><details><summary>Crédits</summary>
    <div class="small" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <p style="margin:0">Tracés et ordre des traits : <a href="http://kanjivg.tagaini.net">KanjiVG</a>, d'Ulrich Apel, sous licence CC BY-SA 3.0.</p>
      <p style="margin:0">Polices : Shippori Mincho B1, Zen Kaku Gothic New, Klee One, Shippori Mincho, Zen Maru Gothic et Yuji Syuku, via Google Fonts (SIL Open Font License).</p>
      <p style="margin:0">Code de l'appli : <a href="https://github.com/VictorMusta/Takoyaki-desu">github.com/VictorMusta/Takoyaki-desu</a>, licence MIT.</p>
    </div></details></section>`),
  );

  /* ---- backup ---- */
  v.appendChild(
    el(`<section class="card"><h3>Sauvegarde</h3>
    <p class="small muted" style="margin:0">Tous les profils de ce téléphone tiennent dans ce texte. Copiez-le de temps en temps pour ne rien perdre, ou pour tout transférer sur un autre appareil. Importer remplace les données actuelles.</p>
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
    if (importState(txt)) refresh();
    else msg("Ce texte n'est pas une sauvegarde valide.");
  };
  $("#im").onclick = () => imp(exp.value);
  $<HTMLInputElement>("#file").onchange = (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) f.text().then(imp);
  };
}
