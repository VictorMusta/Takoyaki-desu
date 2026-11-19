import { isJa } from "../i18n";
import { writeNote } from "../ui/notes";
import { isKata, KANA, LINES, lineLabel } from "../data/kana";
import { alphabetMastery, buildQueue, dayRec, kataStarted, nextSoon, pending, recordMastery, streak, today } from "../core/scheduler";
import { save } from "../core/store";
import type { DayRec, Profile } from "../core/types";
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
  if (p.tester) v.appendChild(testerPath(p));
  v.appendChild(
    el(`<section class="card">
    <h2>Séance du jour, ${esc(state.active)}</h2>
    <div class="stats">
      <div class="stat"><b>${nDue}</b><span>à réviser</span></div>
      <div class="stat"><b>${nNew}</b><span>nouveaux signes</span></div>
      <div class="stat"><b>${nWords}</b><span>mots</span></div>
    </div>
    ${q.length ? `<button class="btn primary big" id="go">Commencer</button>` : `<p style="margin:0">La séance du jour est faite. Vous pouvez continuer :</p><div id="more"></div>`}
    ${soonLine(p, t, q.length > 0)}
    ${progressLine(p, t, d)}
    <p class="muted small" style="margin:0">Ligne en cours : ${lineLabel(LINES[p.unlocked - 1])}.</p>
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
    <p class="small muted" style="margin:8px 0 0">Chaque nouveau signe passe par 3 étapes : tracer sur le modèle animé, pochoir estompé, puis page blanche. Ensuite, vous l'écrivez toujours de mémoire, vous comparez au modèle et vous vous notez. La ligne suivante s'ouvre quand 80 % de la ligne « ${lineLabel(LINES[p.unlocked - 1])} » tient au moins 3 jours.</p></details></section>`),
  );
  showWave();
  const go = $opt<HTMLButtonElement>("#go");
  if (go) go.onclick = () => startSession("day");
  const more = $opt<HTMLElement>("#more");
  if (more) continueBlock(more, startSession);
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
const activity = (r?: DayRec) => {
  if (!r) return "";
  // A list of counts doesn't go through the translation layer well (one text, many pieces): built here.
  if (isJa())
    return [r.nw && `新しい文字${r.nw}`, r.nwW && `新しい単語${r.nwW}`, r.rv && `復習${r.rv}`, r.ex && `問題${r.ex}`].filter(Boolean).join("・");
  const parts = [r.nw && plural(r.nw, "nouveau signe", "nouveaux signes"), r.nwW && plural(r.nwW, "nouveau mot", "nouveaux mots"), r.rv && plural(r.rv, "révision", "révisions"), r.ex && plural(r.ex, "exercice", "exercices")].filter(Boolean);
  return parts.join(", ");
};

/** What was done today (or yesterday), the streak, and how much the alphabet moved. */
function progressLine(p: Profile, t: number, d: DayRec): string {
  recordMastery(p, t);
  save();
  const kata = kataStarted(p);
  const m = Math.round(alphabetMastery(p, t, kata) * 100);
  const h = (kata ? p.histK : p.hist) ?? {};
  const prev = Object.entries(h).filter(([k]) => +k < t).sort((a, b) => +a[0] - +b[0]).pop()?.[1];
  const gain = prev === undefined ? 0 : Math.round(m - prev);
  const s = streak(p, t);
  // Practice not yet confirmed, as points of the whole script (see practiceGain).
  const pend = Math.round((KANA.filter((k) => isKata(k.k) === kata).reduce((a, k) => a + pending(p.cards[k.k]), 0) / KANA.filter((k) => isKata(k.k) === kata).length) * 100);
  const pool = KANA.filter((k) => isKata(k.k) === kata), total = pool.length, seen = pool.filter((k) => p.cards[k.k]?.seen).length;
  const now = activity(d), before = activity(p.days[t - 1]);
  return `<div class="today">
    <p style="margin:0">${now ? `Aujourd'hui : ${now}.` : before ? `Hier : ${before}.` : "Pas encore d'activité aujourd'hui."}</p>
    <p class="small" style="margin:0">${seen} ${kata ? "katakana" : "hiragana"} découverts sur ${total} · maîtrise ${m} %${pend ? ` <span>(+${pend} à confirmer)</span>` : ""}${gain > 0 ? ` <b class="up">+${gain}</b> depuis la veille` : ""}${s > 1 ? ` · ${s} jours d'affilée` : ""}</p>
  </div>`;
}

/* ---------- the testers' path ---------- */

const DONE = "takoyaki-tester-done";
const doneSteps = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(DONE) ?? "[]") as string[];
  } catch {
    return [];
  }
};
const markDone = (id: string) => {
  try {
    sessionStorage.setItem(DONE, JSON.stringify([...new Set([...doneSteps(), id])]));
  } catch {
    /* the ticks are only a guide */
  }
};

/** A checklist that walks a tester through every kind of screen, ticked as they go. */
function testerPath(p: Profile): HTMLElement {
  const done = new Set(doneSteps());
  const step = (id: string, label: string, sub: string) =>
    `<li class="${done.has(id) ? "done" : ""}"><button class="btn opt" data-step="${id}"><span>${label}</span><small>${sub}</small></button></li>`;
  const fam = FAMILIES.filter((f) => familyTypes(p, f.id).length).map((f) => step(f.id, f.title, f.sub)).join("");
  const box = el(`<section class="card tester"><h3>Parcours de test</h3>
    <p class="small muted" style="margin:0">Une fois chaque étape, dans l'ordre que vous voulez. Notez tout ce qui cloche avec « Remarque ».</p>
    <ol class="steps">
      ${step("lesson", "La séance du jour", "Écrire des signes de mémoire, la vérification des traits, un nouveau signe")}
      ${fam}
      ${step("exam", "Un examen", "Quelques signes sans aide")}
      ${step("fiche", "Les fiches des signes", "Dans Progrès : touchez un signe, regardez l'ordre des traits")}
      ${step("note", "Une remarque", "Ce qui est faux, bizarre ou difficile")}
    </ol></section>`);
  box.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.step!;
      markDone(id);
      if (id === "lesson") return startSession("day");
      if (id === "exam") return void (location.hash = "examen");
      if (id === "fiche") return void (location.hash = "progres");
      if (id === "note") return void writeNote().then(() => b.closest("li")?.classList.add("done"));
      startDrills(familyTypes(p, id));
    };
  });
  return box;
}

/** When today's lesson is done but some signs get their same-day second chance later. */
function soonLine(p: Profile, t: number, busy: boolean): string {
  const s = nextSoon(p, t);
  if (!s || busy) return "";
  const at = new Date(s.at).toLocaleTimeString(isJa() ? "ja-JP" : "fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `<p class="soon" style="margin:0">Revenez vers ${at} : ${s.n} signe(s) pourront déjà progresser.</p>`;
}
