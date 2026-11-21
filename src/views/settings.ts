import { resetCoach } from "../ui/coach";
import { setSilentAlways, silentAlways } from "../core/sound";
import { KANA, LINES } from "../data/kana";
import { addProfile, deleteProfile, exportState, importState, profile, profileNames, readBackup, renameProfile, save, setActive, state } from "../core/store";
import { $, el, esc, toast, view } from "../ui/dom";
import { getTheme, paceHTML, setPace, setTheme, type Theme } from "../ui/prefs";
import { confirmNextLine } from "../ui/openline";
import { confirmModal } from "../ui/modal";
import { enableFluent, revertFluent } from "../core/fluent";
import { today } from "../core/scheduler";
import { mailTo } from "../config";
import { route } from "../router";
import { newsHTML } from "../ui/news";
import { getLang, isJa, setLang, type Lang } from "../i18n";
import { clearNotes, notes, notesButtonOn, notesText, sendNotes, setNotesButton } from "../ui/notes";
import { getStrokeStyle, setStrokeStyle, type StrokeStyle } from "../ui/brush";
import { buzz, canVibrate, getHaptics, setHaptics } from "../ui/haptics";
import { daysSinceBackup, downloadBackup, everBackedUp, persisted, sendBackup, shareError } from "../core/backup";

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
      <input id="pn" class="text" aria-label="Prénom du nouveau profil" placeholder="Prénom du nouveau profil" maxlength="24">
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
          inp.onkeydown = (e) => {
            if (e.key === "Enter") ok();
          };
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
  const fl = p.fluent;
  const since = fl ? new Date(Date.now() - (today() - fl.since) * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
  v.appendChild(
    el(`<section class="card"><h2>Réglages de ${esc(state.active)}</h2>
    <h3>Rythme</h3>
    ${paceHTML(p.settings.newPerDay, "space", p.settings.intensive)}
    <label class="field" for="nw">Nouveaux mots par jour <input type="number" id="nw" min="0" max="20" value="${p.settings.wordsPerDay ?? 3}"></label>
    <label class="field" for="sn">Afficher les numéros des traits <input type="checkbox" id="sn" ${p.settings.showNums ? "checked" : ""}></label>
    <details class="fine"><summary>Réglages fins</summary>
    <label class="field" for="nn">Nombre précis de signes par jour <input type="number" id="nn" min="1" max="${KANA.length}" value="${p.settings.newPerDay}"></label>
    <label class="field" for="rc">Plafond de révisions par jour <input type="number" id="rc" min="10" max="300" value="${p.settings.revCap}"></label>
    <div class="row"><button class="btn" id="unl" ${p.unlocked >= LINES.length ? "disabled" : ""}>Ouvrir la ligne suivante maintenant</button></div>
    <p class="small muted" style="margin:0">Lignes ouvertes : ${p.unlocked} / ${LINES.length}. Utile si vous connaissez déjà certains signes.</p>
    <h3>Niveau</h3>
    <p class="small muted" style="margin:0">${
      fl
        ? `Depuis le ${since}, ${esc(state.active)} est en mode « je parle déjà japonais » : tout est ouvert et l'examen propose tous les signes.`
        : "Vous lisez et écrivez déjà les hiragana ? Ouvrez tout d'un coup et vérifiez-vous avec des examens sur tous les signes."
    }</p>
    <div class="row"><button class="btn" id="fluent">${fl ? "J'ai menti" : "Je parle déjà japonais"}</button></div>
    </details></section>`),
  );
  $<HTMLInputElement>("#nn").onchange = (e) => {
    p.settings.newPerDay = Math.min(KANA.length, Math.max(1, +(e.target as HTMLInputElement).value || 10));
    p.settings.intensive = false;
    save();
    viewSettings();
  };
  v.querySelectorAll<HTMLInputElement>('input[name="space"]').forEach((r) => {
    r.onchange = () => {
      setPace(p.settings, +r.value);
      save();
      $<HTMLInputElement>("#nn").value = String(p.settings.newPerDay);
    };
  });
  $<HTMLInputElement>("#nw").onchange = (e) => {
    p.settings.wordsPerDay = Math.min(20, Math.max(0, Math.round(+(e.target as HTMLInputElement).value)));
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
  $("#unl").onclick = async () => {
    if (!(await confirmNextLine(p))) return;
    p.unlocked = Math.min(LINES.length, p.unlocked + 1);
    save();
    viewSettings();
  };

  $("#fluent").onclick = async () => {
    const yes = fl
      ? await confirmModal({
          title: "Revenir en arrière ?",
          body: `<p style="margin:0">La progression de ${esc(state.active)} redevient exactement celle du ${since}, juste avant d'avoir choisi « Je parle déjà japonais ».</p><p class="small muted" style="margin:0">Ce qui a été fait depuis (séances, examens) sera effacé.</p>`,
          ok: "Revenir à ma progression",
        })
      : await confirmModal({
          title: "Je parle déjà japonais",
          body: `<p style="margin:0">Toutes les lignes s'ouvrent et tous les signes sont considérés comme connus. Ils reviendront peu à peu en révision, et l'Examen proposera tous les signes : un signe raté y revient dès le lendemain.</p><p style="margin:0"><b>C'est réversible.</b> Votre progression actuelle est mise de côté : le bouton deviendra « J'ai menti » et la rétablira telle qu'elle est aujourd'hui.</p>`,
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
  const stOpt = (s: StrokeStyle, label: string) => `<button class="btn" data-st="${s}" aria-pressed="${getStrokeStyle() === s}">${label}</button>`;
  v.appendChild(
    el(`<section class="card"><h3>Apparence</h3>
    <div class="seg" role="group" aria-label="Langue" data-noi18n><button class="btn" data-lang="fr" aria-pressed="${getLang() === "fr"}" lang="fr">Français</button><button class="btn" data-lang="ja" aria-pressed="${getLang() === "ja"}" lang="ja">日本語</button></div>
    <div class="seg" role="group" aria-label="Thème">${thOpt("auto", "Automatique")}${thOpt("light", "Papier")}${thOpt("dark", "Nuit")}</div>
    <p class="small muted" style="margin:0">Automatique suit le téléphone.</p>
    <h3 style="margin-top:8px">Trait</h3>
    <div class="seg" role="group" aria-label="Rendu du trait">${stOpt("brush", "Pinceau")}${stOpt("plain", "Simple")}</div>
    <p class="small muted" style="margin:0">Simple est le plus lisible.</p>
    ${canVibrate() ? `<label class="field" for="hap">Vibrations <input type="checkbox" id="hap" ${getHaptics() ? "checked" : ""}></label>` : ""}
    <label class="field" for="mute">Jamais de son <input type="checkbox" id="mute" ${silentAlways() ? "checked" : ""}></label>
    <p class="small muted" style="margin:0">Ni jeu d'écoute, ni son automatique. « Écouter » marche toujours.</p>
    <div class="row"><button class="btn" id="coach-reset">Revoir les bulles d'aide</button></div></section>`),
  );
  v.querySelectorAll<HTMLButtonElement>("[data-st]").forEach((b) => {
    b.onclick = () => {
      setStrokeStyle(b.dataset.st as StrokeStyle);
      v.querySelectorAll("[data-st]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    };
  });
  $("#coach-reset").onclick = () => {
    resetCoach();
    toast("Les bulles d'aide reviendront au fil des écrans.");
  };
  const mute = v.querySelector<HTMLInputElement>("#mute")!;
  mute.onchange = () => setSilentAlways(mute.checked);
  const hap = v.querySelector<HTMLInputElement>("#hap");
  if (hap)
    hap.onchange = () => {
      setHaptics(hap.checked);
      if (hap.checked) buzz("ok");
    };
  v.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => {
    b.onclick = () => {
      if (b.dataset.lang === getLang()) return;
      setLang(b.dataset.lang as Lang);
      location.reload();
    };
  });
  v.querySelectorAll<HTMLButtonElement>("[data-th]").forEach((b) => {
    b.onclick = () => {
      setTheme(b.dataset.th as Theme);
      v.querySelectorAll("[data-th]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    };
  });

  /* ---- feedback ---- */
  const fb = mailTo(
    "Takoyaki desu : mon retour",
    `Bonjour,\n\n(Ce qui vous plaît, ce qui gêne, une idée, un bug…)\n\n\n---\nAppareil : ${navigator.userAgent}`,
  );
  const nn = notes().length;
  const fbBox = el(`<section class="card"><h3>Un avis ?</h3>
      <p class="small muted" style="margin:0">L'appli est en bêta : un bug, une gêne, une idée, tout aide.</p>
      <div class="row">${fb ? `<a class="btn" href="${fb}">Faire un retour</a>` : ""}<a class="btn" href="#invite">Faire tester en japonais</a></div>
      <label class="field" for="nfab">Bouton « Remarque » sur chaque écran <input type="checkbox" id="nfab" ${notesButtonOn() ? "checked" : ""} ${isJa() ? "disabled" : ""}></label>
      <p class="small muted" style="margin:0">Pour noter au fil des écrans ce qui cloche. Toujours affiché en japonais, pour les testeurs.</p>
      ${
        nn
          ? `<h3 style="margin-top:8px">Remarques sur ce téléphone (${nn})</h3>
      <div class="row"><button class="btn primary" id="nsend">Tout envoyer</button><button class="btn" id="nshow">Afficher</button><button class="btn" id="nclear">Effacer</button></div>
      <textarea id="ntext" class="hidden" readonly aria-label="Remarques des testeurs" data-noi18n></textarea>`
          : ""
      }</section>`);
  v.appendChild(fbBox);
  const nfab = fbBox.querySelector<HTMLInputElement>("#nfab")!;
  nfab.onchange = () => setNotesButton(nfab.checked);
  if (nn) {
    $<HTMLButtonElement>("#nsend", fbBox).onclick = () => void sendNotes();
    $<HTMLButtonElement>("#nshow", fbBox).onclick = () => {
      const ta = $<HTMLTextAreaElement>("#ntext", fbBox);
      ta.value = notesText();
      ta.classList.remove("hidden");
      ta.select();
    };
    $<HTMLButtonElement>("#nclear", fbBox).onclick = async () => {
      if (await confirmModal({ title: "Effacer les remarques ?", body: `<p style="margin:0">Les ${nn} remarques enregistrées sur ce téléphone seront supprimées. Envoyez-les d'abord si ce n'est pas fait.</p>`, ok: "Effacer" })) {
        clearNotes();
        refresh();
      }
    };
  }

  /* ---- credits ---- */
  // News, privacy and credits: one quiet card at the bottom.
  v.appendChild(
    el(`<section class="card about">${isJa() ? "" : `<details><summary>Nouveautés</summary>${newsHTML()}</details>`}
    <details><summary>Confidentialité</summary><div class="small" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <p style="margin:0"><b>Rien ne quitte votre téléphone sans vous.</b> Pas de compte, pas de serveur à nous : votre progression vit uniquement dans ce navigateur.</p>
      <p style="margin:0">Aucune mesure d'audience, aucun cookie, aucune publicité, aucun outil tiers. Les polices sont livrées avec l'appli.</p>
      <p style="margin:0">Des données ne partent que si vous le décidez : une sauvegarde que vous vous envoyez, un retour par mail, un ticket GitHub.</p>
      <p style="margin:0">Ce qui reste hors de nos mains : l'hébergeur (GitHub Pages) voit, comme tout site, l'adresse IP qui charge l'appli. Selon le téléphone, la voix de « Écouter » peut être produite en ligne par le système.</p>
      <p style="margin:0">Tout effacer : supprimez les profils ci-dessus, ou effacez les données du site dans votre navigateur.</p>
    </div></details>
    <details><summary>Crédits</summary>
    <div class="small" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <p style="margin:0">Tracés et ordre des traits : <a href="http://kanjivg.tagaini.net">KanjiVG</a>, d'Ulrich Apel, sous licence CC BY-SA 3.0.</p>
      <p style="margin:0">Polices : Shippori Mincho B1, Zen Kaku Gothic New, Klee One, Shippori Mincho, Zen Maru Gothic et Yuji Syuku (SIL Open Font License), livrées avec l'appli.</p>
      <p style="margin:0">Code de l'appli : <a href="https://github.com/VictorMusta/Takoyaki-desu">github.com/VictorMusta/Takoyaki-desu</a>, licence MIT.</p>
    </div></details></section>`),
  );

  /* ---- backup ---- */
  v.appendChild(
    el(`<section class="card"><h3>Sauvegarde</h3>
    <p class="small muted" style="margin:0">Votre progression ne vit que dans ce téléphone. Envoyez-vous le fichier par mail de temps en temps, à votre propre adresse.</p>
    <p class="small" style="margin:0">${everBackedUp() ? `Dernière sauvegarde : il y a ${daysSinceBackup()} jour(s).` : "Aucune sauvegarde pour l'instant."}${persisted === true ? " Stockage protégé : le navigateur ne l'effacera pas de lui-même." : persisted === false ? " Le navigateur peut effacer ces données s'il manque de place : installez l'appli sur l'écran d'accueil pour les protéger." : ""}</p>
    <button class="btn primary big" id="bksend">M'envoyer ma sauvegarde</button>
    <div class="row"><button class="btn" id="bkdl">Télécharger le fichier</button><label class="btn" for="file">Importer un fichier</label><input type="file" id="file" accept=".json,.txt,application/json,text/plain" class="hidden"></div>
    <details><summary class="small">Par copier-coller</summary>
    <p class="small muted" style="margin:8px 0 0">Les mêmes données en texte. Importer remplace les données actuelles.</p>
    <textarea id="exp" aria-label="Données de progression"></textarea>
    <div class="row"><button class="btn" id="cp">Copier les données</button><button class="btn" id="im">Importer le texte collé</button></div></details>
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
  // Import: say what the backup holds and when it was made, then ask before replacing anything.
  const imp = async (txt: string) => {
    const b = readBackup(txt);
    if (!b) return msg("Ce texte n'est pas une sauvegarde valide.");
    if (b.newer) return msg("Cette sauvegarde vient d'une version plus récente de l'appli : mettez d'abord l'appli à jour (fermez-la et rouvrez-la).");
    const when = b.exportedAt ? new Date(b.exportedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "date inconnue";
    const who = Object.entries(b.state.profiles).map(([n, pr]) => `${esc(n)} (${Object.values(pr.cards).filter((c) => c.seen).length} signes vus)`).join(", ");
    const ok = await confirmModal({
      title: "Restaurer cette sauvegarde ?",
      body: `<p style="margin:0">Sauvegarde du ${when}.</p><p class="small" style="margin:0">Profils : ${who || "aucun"}.</p><p class="small muted" style="margin:0">Elle remplace toutes les données de ce téléphone.</p>`,
      ok: "Restaurer",
    });
    if (ok && importState(txt)) refresh();
  };
  $("#im").onclick = () => imp(exp.value);
  $("#bksend").onclick = async () => {
    const r = await sendBackup();
    if (r === "shared") msg("Sauvegarde envoyée. Pour la restaurer : « Importer un fichier » avec la pièce jointe.");
    else if (r === "shared-text") msg("Ce téléphone refuse les pièces jointes : la sauvegarde est partie en texte. Pour la restaurer : « Par copier-coller ».");
    else if (r === "downloaded") msg(`Le partage est indisponible sur ce navigateur : le fichier est téléchargé. (${shareError})`);
  };
  $("#bkdl").onclick = () => {
    downloadBackup();
    msg("Fichier téléchargé.");
  };
  $<HTMLInputElement>("#file").onchange = (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) f.text().then(imp);
  };

  // Most used first: pace and backup; profiles, level and the rest further down.
  const order = ["Réglages de", "Sauvegarde", "Apparence", "Profils sur", "Un avis", "Nouveautés", "Confidentialité"];
  const secs = [...v.querySelectorAll<HTMLElement>(":scope > section")];
  const rank = (sec: HTMLElement) => {
    const h = sec.querySelector("h2, h3, summary")?.textContent ?? "";
    const r = order.findIndex((o) => h.startsWith(o));
    return r < 0 ? order.length : r;
  };
  secs.sort((a, b) => rank(a) - rank(b)).forEach((sec) => v.appendChild(sec));
}
