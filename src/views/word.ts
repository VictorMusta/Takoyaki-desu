import { meaningFor } from "../data/gloss-ja";
import { isJa } from "../i18n";
import { buzz } from "../ui/haptics";
import { byK } from "../data/kana";
import { WORDS } from "../data/words";
import { isPhrase, phraseOf, readingsOf, shown, spoken, tilesOf } from "../data/phrases";
import { markOrder, mixed, orderBoard } from "../ui/order";
import { readable, readButton } from "../ui/readhelp";
import { LOOKALIKES, shuffle } from "../core/drills";
import { profile } from "../core/store";
import { romajiOk, wordOf } from "../core/vocab";
import { allSolid, solid, today } from "../core/scheduler";
import type { Grade, QueueItem } from "../core/types";
import { $, el, esc, view } from "../ui/dom";
import { speak } from "../ui/speech";

/**
 * A word of the vocabulary track.
 * New word: discovery (sound, reading, meaning, its signs), then « lire ».
 * Review: « lire » (spell the reading, then pick the meaning) or « écrire » (from the meaning,
 * rebuild the word from a set of signs). Both parts right → Bien, one → Bof, none → Raté.
 */
export function viewWord(it: QueueItem, head: string, onStep: () => void, done: (g: Grade) => void): void {
  if (isPhrase(it.k)) return viewPhrase(it, head, onStep, done);
  const [w, r, frOnly] = wordOf(it.k)!;
  const fr = meaningFor(w, frOnly, isJa());
  const v = view();
  v.innerHTML = "";
  const card = el(`<section class="card drill"><div class="prompt"><div><h2 style="font-size:21px">${it.isNew && !it.step ? "Nouveau mot" : "Vocabulaire"}</h2><div class="small muted">${head}</div></div><button class="btn sm" id="say">Écouter</button></div><div id="body" style="display:flex;flex-direction:column;gap:16px"></div></section>`);
  v.appendChild(card);
  const body = $("#body", card);
  $("#say", card).onclick = () => speak(w);

  if (it.isNew && !it.step) {
    speak(w, true);
    // Romaji fade out: only for signs that do not hold 3 days yet; all solid → reading hidden behind a tap.
    const p = profile(), t = today(), bare = allSolid(p, w, t);
    body.innerHTML = `<p class="drill-big kana-l" style="font-size:64px;margin:0"${readable(w) ? ` data-read="${w}"` : ""}>${w}</p>
      ${bare ? `<button class="btn sm" id="showr" style="align-self:center">Voir la lecture</button><p class="reading hidden" id="rd">${r}</p>` : `<p class="reading">${r}</p>`}<p class="drill-big" style="font-family:var(--display);margin:0">${esc(fr)}</p>
      <div class="chips">${[...w].map((c) => `<span class="chip"><b>${c}</b>${solid(p, c, t) ? "" : byK[c]?.r ?? ""}</span>`).join("")}</div>
      <button class="btn primary big" id="ok">Je le retiens, on vérifie</button>`;
    const sr = body.querySelector<HTMLButtonElement>("#showr");
    if (sr)
      sr.onclick = () => {
        sr.remove();
        $("#rd", body).classList.remove("hidden");
      };
    $("#ok", body).onclick = () => {
      it.step = 2;
      onStep();
      viewWord(it, head, onStep, done);
    };
    return;
  }

  const c = profile().words?.[w];
  const mode = it.isNew || !c || c.interval < 3 || Math.random() < 0.5 ? "read" : "write";
  if (mode === "read") readWord(body, w, r, fr, done);
  else writeWord(body, w, r, fr, done);
}

const verdict = (g: Grade) => (g === "bien" ? "Juste." : g === "bof" ? "À moitié." : "Pas encore.");

function finish(body: HTMLElement, g: Grade, note: string, done: (g: Grade) => void): void {
  buzz(g === "bien" ? "ok" : g === "bof" ? "soft" : "ko");
  const end = el(`<div class="drill-end"><p class="${g === "rate" ? "bad" : "good"}">${verdict(g)} ${note}</p><button class="btn primary big">Continuer</button></div>`);
  body.appendChild(end);
  const b = end.querySelector("button")!;
  b.onclick = () => done(g);
  b.focus();
}

/** Kana shown: spell the reading, then pick the meaning among four. */
function readWord(body: HTMLElement, w: string, r: string, fr: string, done: (g: Grade) => void): void {
  body.innerHTML = `<p class="drill-big kana-l" style="font-size:56px;margin:0">${w}</p>
    <label class="small" for="rj">Comment ça se lit ? (en lettres latines)</label>
    <div class="row" style="flex-wrap:nowrap"><input id="rj" class="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="par exemple : sakana"><button class="btn primary" id="chk">Vérifier</button></div>
    <p class="small hidden" id="rr" style="margin:0"></p>
    <div id="mean"></div>`;
  const inp = $<HTMLInputElement>("#rj", body);
  inp.focus();
  let spelled = false;
  const check = () => {
    if (!inp.value.trim()) return;
    spelled = romajiOk(inp.value, w, r);
    inp.disabled = true;
    $("#chk", body).remove();
    const rr = $("#rr", body);
    rr.classList.remove("hidden");
    rr.innerHTML = spelled ? `<span class="good">Juste : ${r}.</span>` : `<span class="bad">On lit « ${r} ».</span>`;
    speak(w, true);
    const wrong = shuffle(WORDS.filter((x) => x[0] !== w && meaningFor(x[0], x[2], isJa()) !== fr), Math.random).slice(0, 3).map((x) => meaningFor(x[0], x[2], isJa()));
    const opts = shuffle([fr, ...wrong], Math.random);
    const m = $("#mean", body);
    m.innerHTML = `<p class="small" style="margin:0 0 8px">Et que veut dire ce mot ?</p><div class="opts-grid">${opts.map((o) => `<button class="btn opt-b" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    m.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-o]");
      if (!b || m.dataset.done) return;
      m.dataset.done = "1";
      const meant = b.dataset.o === fr;
      m.querySelectorAll<HTMLButtonElement>("[data-o]").forEach((x) => {
        x.disabled = true;
        if (x.dataset.o === fr) x.classList.add("right");
      });
      if (!meant) b.classList.add("wrong");
      const g: Grade = spelled && meant ? "bien" : spelled || meant ? "bof" : "rate";
      finish(body, g, `${w} · ${r} · ${fr}`, done);
    };
  };
  $("#chk", body).onclick = check;
  // A handler must not return false: that would cancel every key (Backspace included).
  inp.onkeydown = (e) => {
    if (e.key === "Enter") check();
  };
}

/** Meaning shown: rebuild the word from its signs mixed with look-alikes. */
function writeWord(body: HTMLElement, w: string, r: string, fr: string, done: (g: Grade) => void): void {
  const want = [...w];
  const known = Object.keys(profile().cards).filter((k) => profile().cards[k].seen);
  const near = want.flatMap((c) => LOOKALIKES.find((g) => g.includes(c)) ?? []).filter((c) => !want.includes(c) && known.includes(c));
  const extra = shuffle([...new Set(near.length >= 3 ? near : [...near, ...known.filter((c) => !want.includes(c))])], Math.random).slice(0, 3);
  const tiles = shuffle([...want, ...extra], Math.random);
  const typed: number[] = [];
  body.innerHTML = `<p class="drill-big" style="font-family:var(--display);margin:0">${esc(fr)}</p>
    <p class="small muted" style="margin:0;text-align:center">Écrivez ce mot en hiragana (${want.length} signe${want.length > 1 ? "s" : ""}).</p>
    <div class="boxes">${want.map(() => `<span class="box"></span>`).join("")}</div>
    <div class="tiles">${tiles.map((c, i) => `<button class="key" data-i="${i}">${c}</button>`).join("")}<button class="key back" data-back aria-label="Effacer le dernier signe">⌫</button></div>
    <button class="btn primary big" id="chk" disabled>Vérifier</button>`;
  const boxes = body.querySelectorAll<HTMLElement>(".box"), chk = $<HTMLButtonElement>("#chk", body);
  const paint = () => {
    boxes.forEach((b, i) => (b.textContent = typed[i] !== undefined ? tiles[typed[i]] : ""));
    body.querySelectorAll<HTMLButtonElement>(".tiles [data-i]").forEach((b) => (b.disabled = typed.includes(+b.dataset.i!)));
    chk.disabled = typed.length !== want.length;
  };
  $(".tiles", body).onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b || b.disabled) return;
    if (b.dataset.back !== undefined) typed.pop();
    else if (typed.length < want.length) typed.push(+b.dataset.i!);
    paint();
  };
  chk.onclick = () => {
    $(".tiles", body).remove();
    chk.remove();
    let wrong = 0;
    boxes.forEach((b, i) => {
      const ok = tiles[typed[i]] === want[i];
      b.classList.add(ok ? "right" : "wrong");
      if (!ok) {
        wrong++;
        b.innerHTML = `${tiles[typed[i]]}<small>${want[i]}</small>`;
      }
    });
    speak(w, true);
    const g: Grade = wrong === 0 ? "bien" : wrong === 1 && want.length >= 3 ? "bof" : "rate";
    finish(body, g, `${w} · ${r}`, done);
  };
}

/* ---------- travel phrases ---------- */

/** The reading under a block while one of its signs is not solid yet (romaji fade out). */
export function tileHints(tiles: string[], readings: string[]): string[] {
  const p = profile(), t = today();
  return tiles.map((x, i) => ([...x].every((c) => !byK[c] || solid(p, c, t)) ? "" : readings[i] ?? ""));
}

/**
 * A phrase: discovery (sound, blocks with their reading, meaning), then « compose »: from the
 * meaning, put the blocks back in order. Right → Bien, wrong → Raté (with the right order).
 */
function viewPhrase(it: QueueItem, head: string, onStep: () => void, done: (g: Grade) => void): void {
  const ph = phraseOf(it.k)!;
  const tiles = tilesOf(ph), rs = readingsOf(ph), hints = tileHints(tiles, rs);
  const v = view();
  v.innerHTML = "";
  const card = el(`<section class="card drill"><div class="prompt"><div><h2 style="font-size:21px">${it.isNew && !it.step ? "Nouvelle phrase" : "Phrase utile"}</h2><div class="small muted">${head}</div></div><button class="btn sm" id="say">Écouter</button></div><div id="body" style="display:flex;flex-direction:column;gap:16px"></div></section>`);
  v.appendChild(card);
  const body = $("#body", card);
  $("#say", card).onclick = () => speak(spoken(ph.w));
  if (it.isNew && !it.step) {
    speak(spoken(ph.w), true);
    body.innerHTML = `<p class="drill-big" style="font-family:var(--display);margin:0">${esc(ph.fr)}</p>
      <div class="order-bank" data-read="${ph.w}" title="Comment ça se lit ?">${tiles.map((x, i) => `<span class="otile btn"><span class="kana-l">${x}</span><small>${rs[i]}</small></span>`).join("")}</div>
      ${readButton(ph.w)}
      <p class="reading">${shown(ph.r)}</p>
      <button class="btn primary big" id="ok">Je la retiens, on vérifie</button>`;
    $("#ok", body).onclick = () => {
      it.step = 2;
      onStep();
      viewPhrase(it, head, onStep, done);
    };
    return;
  }
  const order = mixed(tiles.length);
  body.appendChild(el(`<p class="drill-big" style="font-family:var(--display);margin:0">${esc(ph.fr)}</p>`));
  body.appendChild(
    orderBoard(order.map((i) => tiles[i]), order.map((i) => hints[i]), tiles.length, (picked, board) => {
      const ok = picked.map((j, pos) => order[j] === pos || tiles[order[j]] === tiles[pos]);
      markOrder(board, ok);
      speak(spoken(ph.w), true);
      const g: Grade = ok.every(Boolean) ? "bien" : "rate";
      finish(body, g, `${shown(ph.w)} · ${shown(ph.r)}`, done);
    }),
  );
}
