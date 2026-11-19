import { PHRASES, shown } from "../data/phrases";
import { coachAt } from "../ui/coach";
import { shareStory } from "../ui/story";
import { rivals, shareMyLink } from "./duel";
import { dayDate, history, historyCSV } from "../core/stats";
import { meaningFor } from "../data/gloss-ja";
import { isJa } from "../i18n";
import { byK, isKata, KANA, KATA_START, LINES, lineCards, lineLabel, SLOTS, sound } from "../data/kana";
import { alphabetMastery, calibration, kataStarted, mastery, recordMastery, status, streak, today, pending, saturated } from "../core/scheduler";
import { profile, save, state } from "../core/store";
import { $, el, esc, view } from "../ui/dom";
import { ficheHTML } from "../ui/fiche";
import { calendarHTML } from "../ui/calendar";
import { animate, modelSVG, userSVG, type ModelMode } from "../ui/model";
import { makePad } from "../ui/pad";
import { mnemoHTML } from "../ui/mnemo";
import { speak } from "../ui/speech";
import { WORDS } from "../data/words";
import { EXAMPLES } from "../data/examples";
import { knownWordCount, openWords, wordMastery } from "../core/vocab";


export function viewProgress(): void {
  const p = profile(), t = today(), v = view();
  v.innerHTML = "";
  // Open lines in full; the lines still closed fold into one line each script, sheets still reachable.
  const lineHTML = (ln: string, i: number) => {
    const cs = lineCards(i), locked = i >= p.unlocked;
    let h = `<div class="lineh">Ligne ${lineLabel(ln).replace(" · katakana", "")}${locked ? " · fermée" : ""}</div>`;
    (SLOTS[ln] ?? [0, 1, 2, 3, 4]).forEach((s) => {
      if (s === null) {
        h += `<div class="cell empty"></div>`;
        return;
      }
      const k = cs[s], st = status(p, k.k), m = Math.round(mastery(p, k.k, t) * 100);
      const b = Math.min(100, m + Math.round(pending(p.cards[k.k]) * 100));
      h += `<button class="cell ${locked ? "locked" : ""} ${st === "done" ? "done" : st === "learn" ? "learn" : ""}" style="--m:${m}%;--b:${b}%" data-k="${k.k}">${k.k}<small>${st === "new" ? (k.small ? `(${k.r})` : k.r) : m + " %"}</small><span class="sr-only">${st === "new" ? "" : " de maîtrise"}, ouvrir la fiche</span></button>`;
    });
    return h;
  };
  let grid = "";
  [0, KATA_START].forEach((from) => {
    const to = from ? LINES.length : KATA_START, kat = from > 0;
    const idx = Array.from({ length: to - from }, (_, j) => from + j);
    const open = idx.filter((i) => i < p.unlocked || lineCards(i).some((c) => p.cards[c.k]?.seen));
    const closed = idx.filter((i) => !open.includes(i));
    grid += `<h3 class="scripth">${kat ? "Katakana" : "Hiragana"}</h3>`;
    grid += open.map((i) => lineHTML(LINES[i], i)).join("");
    if (closed.length)
      grid += `<details class="later"><summary class="small">${!open.length ? "Pas encore commencés" : closed.length === 1 ? "1 ligne à venir" : `${closed.length} lignes à venir`}</summary><div class="grid">${closed.map((i) => lineHTML(LINES[i], i)).join("")}</div></details>`;
  });
  const hira = KANA.filter((k) => !isKata(k.k)), doneH = hira.filter((k) => status(p, k.k) === "done").length;
  recordMastery(p, t);
  save();
  const kata = kataStarted(p);
  const stat = (kat: boolean) => {
    const h = (kat ? p.histK : p.hist) ?? {};
    const am = Math.round(alphabetMastery(p, t, kat) * 100);
    const week = h[t - 7] ?? Object.entries(h).filter(([d]) => +d <= t - 7).pop()?.[1];
    const delta = week === undefined ? null : Math.round(am - week);
    return `<div class="stat"><b>${am} %</b><span>${kat ? "katakana" : kata ? "hiragana" : "maîtrise des hiragana"}${delta !== null && delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta} en 7 j)` : ""}</span></div>`;
  };
  const fc = el(`<section class="card hidden" id="fc"></section>`);
  v.appendChild(fc);
  v.appendChild(
    el(`<section class="card"><h2>Progrès de ${esc(state.active)}</h2>
    <div class="stats">${stat(false)}${kata ? stat(true) : `<div class="stat"><b>${doneH}</b><span>maîtrisés / ${hira.length}</span></div>`}<div class="stat"><b>${streak(p, t)}</b><span>jours d'affilée</span></div></div>
    ${curve(p.hist ?? {}, t, "hiragana")}${kata ? curve(p.histK ?? {}, t, "katakana") : ""}
    ${calendarHTML(p, t)}
    <details><summary class="small">Lire le tableau</summary><p class="small muted" style="margin:8px 0 0">Chaque case se remplit avec la maîtrise du signe : environ 33 % quand il tient un jour, 67 % à trois jours, et la case devient dorée (極) quand il tient une semaine. Une erreur la fait redescendre. À partir de 67 %, les romaji du signe ne sont plus affichés dans les mots.</p>
    <div class="legend"><span><i class="cell" aria-hidden="true">あ</i>Pas encore vu</span><span><i class="cell learn" style="--m:50%" aria-hidden="true">あ</i>En cours</span><span><i class="cell done" aria-hidden="true">あ</i>Maîtrisé</span></div>
    </details>
    <p class="small muted" style="margin:0">Touchez un signe pour voir sa fiche.</p>
    <div class="grid">${grid}</div></section>`),
  );
  const gridEl = v.querySelector(".grid");
  if (gridEl) coachAt("progress", "Une case par signe : elle se remplit sur plusieurs jours, pas en une seule séance.", gridEl.parentElement!, gridEl);
  // Show it, compare it, keep it.
  const rv = Object.keys(rivals());
  const sh = el(`<section class="card"><h3>Partager ma progression</h3>
    <div class="opts">
      <button class="btn opt" id="sh-story"><span>Story de progression</span><small>Une image à poster : signes maîtrisés, série, temps de pratique, calendrier</small></button>
      <button class="btn opt" id="sh-link"><span>Se comparer</span><small>Envoyez votre lien à quelqu'un qui apprend aussi ; ouvrez le sien pour voir vos progressions côte à côte</small></button>
      ${rv.length ? `<a class="btn opt" href="#duel"><span>Mes comparaisons</span><small>${rv.map(esc).join(", ")}</small></a>` : ""}
    </div>
    <details><summary class="small">Exporter l'historique</summary>
      <p class="small muted" style="margin:8px 0">Jour par jour : nouveaux signes, révisions, mots, exercices, minutes actives, ratés, maîtrise. Pour un tableur ou un carnet de voyage.</p>
      <div class="row"><button class="btn" id="sh-csv">Tableur (CSV)</button><button class="btn" id="sh-json">Données (JSON)</button></div>
    </details></section>`);
  v.appendChild(sh);
  sh.querySelector<HTMLButtonElement>("#sh-story")!.onclick = () => void shareStory(p, state.active, t);
  sh.querySelector<HTMLButtonElement>("#sh-link")!.onclick = () => void shareMyLink();
  const dl = (text: string, name: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const stamp = new Date().toISOString().slice(0, 10);
  sh.querySelector<HTMLButtonElement>("#sh-csv")!.onclick = () => dl("\ufeff" + historyCSV(p), `takoyaki-desu-historique-${state.active}-${stamp}.csv`, "text/csv");
  sh.querySelector<HTMLButtonElement>("#sh-json")!.onclick = () =>
    dl(JSON.stringify({ app: "takoyaki-desu", version: __APP_VERSION__, name: state.active, exportedAt: new Date().toISOString(), days: history(p).map((l) => ({ date: dayDate(l.d), ...l })) }, null, 1), `takoyaki-desu-historique-${state.active}-${stamp}.json`, "application/json");
  v.querySelectorAll<HTMLButtonElement>(".cell[data-k]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k!;
      const c = p.cards[k], mk = Math.round(mastery(p, k, t) * 100), pk = Math.min(100 - mk, Math.round(pending(c) * 100));
      const when = !c?.seen ? "Pas encore vu en séance." : c.due! <= t ? "Révision prévue aujourd'hui." : `Prochaine révision dans ${c.due! - t} jour${c.due! - t > 1 ? "s" : ""}.`;
      fc.innerHTML = `<div class="spread"><h2>${k} · ${sound(k)}</h2><div class="row"><button class="btn sm" id="fcs">Écouter</button><button class="btn sm" id="fcx">Fermer</button></div></div>
        <div><div class="mbar" role="img" aria-label="Maîtrise ${mk} %"><i style="width:${mk}%"></i><i class="pend" style="width:${pk}%"></i></div><p class="small muted" style="margin:4px 0 0">Maîtrise ${mk} % · ${when}</p>${pk ? `<p class="small muted" style="margin:0">+${pk} % d'entraînement, à confirmer à la prochaine révision.</p>` : ""}${saturated(c, t) ? `<p class="small muted" style="margin:0">Assez vu pour aujourd'hui.</p>` : ""}</div>
        <div class="stage" id="fcm" style="max-width:220px">${modelSVG(k, "anim", p.settings.showNums)}</div>
        <div class="row" style="justify-content:center"><button class="btn" id="fcr">Rejouer le tracé</button></div>
        ${mnemoHTML(k, true)}
        <details class="own"><summary>${p.mnemos?.[k] ? "Modifier mon astuce" : "Écrire ma propre astuce"}</summary>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
            <label class="sr-only" for="myh">Mon astuce pour ${k}</label>
            <textarea id="myh" class="fb" maxlength="300" placeholder="Une image qui relie la forme de ${k} au son « ${byK[k].r} »…"></textarea>
            <div class="row"><button class="btn sm primary" id="myok">Enregistrer</button>${p.mnemos?.[k] ? `<button class="btn sm" id="myx">Revenir à l'astuce de l'appli</button>` : ""}</div>
          </div></details>
        <div class="sep"><i></i></div>
        <h3>S'entraîner librement</h3>
        <p class="small muted" style="margin:0">Sans note et sans effet sur vos révisions : tracez autant que vous voulez.</p>
        <div class="seg" role="group" aria-label="Aide au tracé"><button class="btn" data-pm="stencil" aria-pressed="true">Calque</button><button class="btn" data-pm="faded" aria-pressed="false">Estompé</button><button class="btn" data-pm="blank" aria-pressed="false">De mémoire</button></div>
        <div id="fpz"></div>
        ${wordsHTML(k)}
        ${ficheHTML(k)}`;
      fc.classList.remove("hidden");
      animate($("#fcm").firstElementChild!);
      $("#fcr").onclick = () => {
        $("#fcm").innerHTML = modelSVG(k, "anim", p.settings.showNums);
        animate($("#fcm").firstElementChild!);
      };
      $("#fcs").onclick = () => speak(k);
      $<HTMLTextAreaElement>("#myh").value = p.mnemos?.[k] ?? "";
      $("#myok").onclick = () => {
        const txt = $<HTMLTextAreaElement>("#myh").value.trim();
        if (txt) (p.mnemos ??= {})[k] = txt;
        else delete p.mnemos?.[k];
        save();
        b.click();
      };
      const myx = document.querySelector<HTMLButtonElement>("#myx");
      if (myx)
        myx.onclick = () => {
          delete p.mnemos?.[k];
          save();
          b.click();
        };
      $("#fcx").onclick = () => fc.classList.add("hidden");
      let mode: ModelMode = "stencil";
      fc.querySelectorAll<HTMLButtonElement>("[data-pm]").forEach((m) => {
        m.onclick = () => {
          mode = m.dataset.pm as ModelMode;
          fc.querySelectorAll("[data-pm]").forEach((x) => x.setAttribute("aria-pressed", String(x === m)));
          freePad(k, mode, p.settings.showNums);
        };
      });
      freePad(k, mode, p.settings.showNums);
      fc.querySelectorAll<HTMLButtonElement>("[data-say]").forEach((w) => (w.onclick = () => speak(w.dataset.say!)));
      fc.scrollIntoView({ behavior: "smooth" });
    };
  });

  /* ---- vocabulary ---- */
  const studied = WORDS.filter(([w]) => p.words?.[w]?.seen);
  const phr = PHRASES.filter((x) => p.words?.[x.w]?.seen);
  const open = openWords(p).length;
  v.appendChild(
    el(`<section class="card"><h3>Vocabulaire</h3>
    <div class="stats"><div class="stat"><b>${knownWordCount(p)}</b><span>mots sus</span></div><div class="stat"><b>${studied.length}</b><span>mots étudiés</span></div><div class="stat"><b>${open - studied.length}</b><span>à découvrir</span></div></div>
    <p class="small muted" style="margin:0">Un mot compte comme su quand son sens a été retrouvé et tient au moins un jour. De nouveaux mots s'ouvrent à mesure que vous apprenez leurs signes.</p>
    ${
      studied.length
        ? `<details><summary>Mes mots (${studied.length})</summary><div class="wlist">${studied
            .map(([w, r, fr]) => {
              const m = Math.round(wordMastery(p, w, t) * 100);
              return `<div class="wrow"><span class="kana-s">${w}</span><span class="small">${r} · ${esc(meaningFor(w, fr, isJa()))}</span><span class="mbar" role="img" aria-label="Maîtrise ${m} %"><i style="width:${m}%"></i></span></div>`;
            })
            .join("")}</div></details>`
        : ""
    }${
      phr.length
        ? `<details><summary>Mes phrases (${phr.length})</summary><div class="wlist">${phr
            .map((x) => {
              const m = Math.round(wordMastery(p, x.w, t) * 100);
              return `<div class="wrow"><span class="kana-s">${shown(x.w)}</span><span class="small">${shown(x.r)} · ${esc(x.fr)}</span><span class="mbar" role="img" aria-label="Maîtrise ${m} %"><i style="width:${m}%"></i></span></div>`;
            })
            .join("")}</div></details>`
        : ""
    }</section>`),
  );

  // Calibration only shows up when it has something to say: self-grades far above exam results.
  const cal = calibration(p, t);
  if (!cal.some((r) => r.gap !== null && r.gap > 15)) return;
  v.appendChild(
    el(`<section class="card"><h3>Vos notes sont-elles fiables ?</h3>
    ${
      cal.length
        ? `<table><thead><tr><th>Ligne</th><th>« Bien » en séance</th><th>Réussite à l'examen</th><th>Écart</th></tr></thead><tbody>
      ${cal
        .map(
          (r) =>
            `<tr><td>${r.line}</td><td>${r.bien} %</td><td>${r.exam === null ? "pas d'examen" : r.exam + " %"}</td><td style="color:${r.gap !== null && r.gap > 15 ? "var(--beni)" : "inherit"}">${r.gap === null ? "–" : (r.gap > 0 ? "+" : "") + r.gap + " pts"}</td></tr>`,
        )
        .join("")}</tbody></table>
      <p class="small muted" style="margin:0">Au-delà de 15 points d'écart, vous vous notez trop généreusement sur cette ligne.</p>`
        : `<p class="small muted" style="margin:0">Faites quelques séances et un examen pour voir si vos notes sont fiables.</p>`
    }</section>`),
  );
}

/** Free tracing on a sign's fiche: no grade, no effect on reviews; compare against the model at will. */
function freePad(k: string, mode: ModelMode, nums: boolean): void {
  const box = $("#fpz");
  box.innerHTML = `<div class="stage" id="fps"></div>
    <div class="tools"><button class="btn" id="fpu" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="fpc">Recommencer</button><button class="btn primary" id="fpv" disabled>Comparer</button></div>`;
  const pad = makePad($("#fps"), modelSVG(k, mode, nums && mode === "stencil"));
  const cmp = $<HTMLButtonElement>("#fpv");
  pad.onchange = () => (cmp.disabled = pad.strokes.length === 0);
  $("#fpu").onclick = () => pad.undo();
  $("#fpc").onclick = () => pad.clear();
  cmp.onclick = () => {
    const mine = pad.strokes.slice();
    box.innerHTML = `<div class="pair"><div><div class="stage">${userSVG(mine, true)}</div><div class="label">Votre tracé · ${mine.length} trait${mine.length > 1 ? "s" : ""}</div></div><div><div class="stage">${modelSVG(k, "color", true)}</div><div class="label">Modèle · ${byK[k].s.length} trait${byK[k].s.length > 1 ? "s" : ""}</div></div></div>
      <div class="row"><button class="btn primary" id="fpa">Réessayer</button></div>`;
    $("#fpa").onclick = () => freePad(k, mode, nums);
  };
}

/** Words from the exercise bank that use this sign, the sign underlined; tap to hear them. */
function wordsHTML(k: string): string {
  // The fiche below already shows its two example words: list the others.
  const shown = new Set((EXAMPLES[k] ?? []).map((e) => e[0]));
  const ws = WORDS.filter(([w]) => w.includes(k) && !shown.has(w)).slice(0, 8);
  if (!ws.length) return "";
  const mark = (w: string) => [...w].map((c) => (c === k ? `<mark>${c}</mark>` : c)).join("");
  return `<h3>Mots avec ${k}</h3><dl class="ex words">${ws.map(([w, r, fr]) => `<dt><button class="wbtn" data-say="${w}" aria-label="Écouter ${r}">${mark(w)}</button></dt><dd class="rj">${r}</dd><dd>${esc(meaningFor(w, fr, isJa()))}</dd>`).join("")}</dl>`;
}

/** The alphabet mastery over the last 30 days, as a thin line (days without a value carry the last one). */
function curve(h: Record<number, number>, t: number, what: string): string {
  const days = Object.keys(h).map(Number).filter((d) => d > t - 30).sort((a, b) => a - b);
  if (days.length < 2) return "";
  const first = days[0], W = 300, H = 60;
  let last = h[first];
  const pts: [number, number][] = [];
  for (let d = first; d <= t; d++) {
    if (h[d] !== undefined) last = h[d];
    pts.push([d, last]);
  }
  const x = (d: number) => ((d - first) / Math.max(1, t - first)) * (W - 8) + 4;
  const y = (v: number) => H - 6 - (v / 100) * (H - 12);
  const line = pts.map(([d, v], i) => `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const [ld, lv] = pts[pts.length - 1];
  return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la maîtrise des ${what} sur ${t - first + 1} jours, de ${Math.round(h[first])} à ${Math.round(lv)} %">
    <line x1="4" y1="${y(100)}" x2="${W - 4}" y2="${y(100)}" class="c-g"/><line x1="4" y1="${y(0)}" x2="${W - 4}" y2="${y(0)}" class="c-g"/>
    <path d="${line}" class="c-l"/><circle cx="${x(ld)}" cy="${y(lv)}" r="3.5" class="c-d"/></svg>`;
}
