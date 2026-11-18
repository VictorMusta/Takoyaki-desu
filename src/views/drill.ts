import { byK } from "../data/kana";
import { isHira, TEXTS, type Text } from "../data/texts";
import { knownSigns, type Drill } from "../core/drills";
import { profile } from "../core/store";
import { $, el, esc, view } from "../ui/dom";
import { kanaKeyboard } from "../ui/keyboard";
import { modelSVG, userSVG, type Stroke } from "../ui/model";
import { makePad } from "../ui/pad";
import { speak } from "../ui/speech";

/** ok: the learner got it; missed: signs to bring back sooner. */
export type DrillDone = (ok: boolean, missed: string[]) => void;

const TITLES: Record<Drill["type"], string> = {
  choose: "Choisissez le signe",
  listen: "Écoutez, puis choisissez",
  read: "Comment se lit ce signe ?",
  match: "Reliez chaque signe à sa syllabe",
  duel: "Lequel est-ce ?",
  combo: "Comment se lit cette combinaison ?",
  word: "Que veut dire ce mot ?",
  cloze: "Quel signe manque ?",
  dictation: "Écrivez ce mot",
  drawword: "Écrivez ce mot à la main",
  sentence: "Que veut dire cette phrase ?",
  text: "Que dit ce texte ?",
};

/** One exercise screen. `head` is the lesson caption (what, how many left). */
export function viewDrill(d: Drill, head: string, done: DrillDone): void {
  const v = view();
  v.innerHTML = "";
  const card = el(`<section class="card drill"><div class="prompt"><div><h2 style="font-size:21px">${TITLES[d.type]}</h2><div class="small muted">${head}</div></div>${
    d.say ? `<button class="btn sm" id="say">Écouter</button>` : ""
  }</div><div id="body" style="display:flex;flex-direction:column;gap:16px"></div></section>`);
  v.appendChild(card);
  const body = $("#body", card);
  const sayBtn = card.querySelector<HTMLButtonElement>("#say");
  if (sayBtn) sayBtn.onclick = () => speak(d.say!);
  const next = (ok: boolean, missed: string[], note = "") => {
    const end = el(`<div class="drill-end"><p class="${ok ? "good" : "bad"}">${ok ? "Juste." : "Pas tout à fait."}${note ? " " + note : ""}</p><button class="btn primary big" id="cont">Continuer</button></div>`);
    body.appendChild(end);
    $<HTMLButtonElement>("#cont", end).onclick = () => done(ok, missed);
    $<HTMLButtonElement>("#cont", end).focus();
  };

  switch (d.type) {
    case "choose":
    case "listen":
    case "read":
    case "duel":
    case "combo":
    case "word":
    case "sentence": {
      const big =
        d.type === "listen" ? `<button class="btn big" id="play">Réécouter le son</button>`
        : d.type === "choose" || d.type === "duel" ? `<p class="drill-big romaji">${d.prompt}</p>`
        : `<p class="drill-big kana-l">${d.prompt}</p>`;
      const kana = d.type === "choose" || d.type === "listen" || d.type === "duel";
      body.appendChild(el(`<div>${big}</div>`));
      const grid = el(`<div class="opts-grid${kana ? " kana" : ""}${d.type === "sentence" || d.type === "word" ? " one" : ""}">${d.options!.map((o) => `<button class="btn opt-b" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`);
      body.appendChild(grid);
      if (d.type === "listen") {
        speak(d.say!);
        $("#play", body).onclick = () => speak(d.say!);
      }
      grid.onclick = (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-o]");
        if (!b || grid.dataset.done) return;
        grid.dataset.done = "1";
        const ok = b.dataset.o === d.answer;
        grid.querySelectorAll<HTMLButtonElement>("[data-o]").forEach((x) => {
          x.disabled = true;
          if (x.dataset.o === d.answer) x.classList.add("right");
        });
        if (!ok) b.classList.add("wrong");
        const note = d.type === "sentence" ? `Lecture : ${d.meaning}.` : d.type === "word" || d.type === "read" || d.type === "combo" ? "" : `${d.answer} se lit « ${byK[d.answer!]?.r ?? ""} ».`;
        next(ok, ok ? [] : d.ks, note);
      };
      break;
    }
    case "match": {
      const left = d.pairs!.map(([k]) => k), right = [...d.pairs!.map(([, r]) => r)].sort(() => Math.random() - 0.5);
      const box = el(`<div class="match"><div>${left.map((k) => `<button class="btn mk kana-m" data-k="${k}">${k}</button>`).join("")}</div><div>${right.map((r) => `<button class="btn mk" data-r="${r}">${r}</button>`).join("")}</div></div>`);
      body.appendChild(box);
      let selK: HTMLButtonElement | null = null, selR: HTMLButtonElement | null = null, found = 0;
      const missed = new Set<string>();
      const tryPair = () => {
        if (!selK || !selR) return;
        const k = selK.dataset.k!, r = selR.dataset.r!;
        if (byK[k].r === r) {
          [selK, selR].forEach((b) => { b.disabled = true; b.classList.add("right"); b.classList.remove("sel"); });
          found++;
          if (found === left.length) next(missed.size <= 1, [...missed]);
        } else {
          missed.add(k);
          const a = selK, b2 = selR;
          [a, b2].forEach((b) => b.classList.add("wrong"));
          setTimeout(() => [a, b2].forEach((b) => b.classList.remove("wrong", "sel")), 500);
        }
        selK = selR = null;
      };
      box.onclick = (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!b || b.disabled) return;
        if (b.dataset.k) { selK?.classList.remove("sel"); selK = b; } else { selR?.classList.remove("sel"); selR = b; }
        b.classList.add("sel");
        tryPair();
      };
      break;
    }
    case "cloze": {
      const chars = [...d.full!];
      const shown = chars.map((c, i) => (i === d.gap ? `<span class="gap" id="gap">？</span>` : c === " " ? " " : c)).join("");
      body.appendChild(el(`<div><p class="drill-big kana-l" style="white-space:pre-wrap">${shown}</p><p class="reading">${d.reading}</p><p class="small muted" style="margin:0;text-align:center">${esc(d.meaning!)}</p></div>`));
      const kb = kanaKeyboard(new Set(knownSigns(profile())), (k) => {
        if (kb.dataset.done) return;
        kb.dataset.done = "1";
        const ok = k === chars[d.gap!];
        const g = $("#gap", body);
        g.textContent = chars[d.gap!];
        g.classList.add(ok ? "right" : "wrong");
        next(ok, ok ? [] : d.ks, ok ? "" : `Vous avez tapé ${k}.`);
      });
      body.appendChild(kb);
      break;
    }
    case "dictation": {
      const want = [...d.full!];
      let typed: string[] = [];
      body.appendChild(el(`<div><p class="drill-big romaji" style="font-size:44px">${d.reading}</p><p class="small muted" style="margin:0;text-align:center">${esc(d.meaning!)}</p></div>`));
      const boxes = el(`<div class="boxes">${want.map(() => `<span class="box"></span>`).join("")}</div>`);
      body.appendChild(boxes);
      const paint = () => boxes.querySelectorAll(".box").forEach((b, i) => (b.textContent = typed[i] ?? ""));
      const check = el(`<button class="btn primary big" disabled>Vérifier</button>`) as HTMLButtonElement;
      const kb = kanaKeyboard(new Set(knownSigns(profile())), (k) => {
        if (typed.length < want.length) typed.push(k);
        paint();
        check.disabled = typed.length < want.length;
      }, () => { typed.pop(); paint(); check.disabled = true; });
      body.appendChild(kb);
      body.appendChild(check);
      check.onclick = () => {
        kb.remove();
        check.remove();
        const missed: string[] = [];
        boxes.querySelectorAll(".box").forEach((b, i) => {
          const ok = typed[i] === want[i];
          b.classList.add(ok ? "right" : "wrong");
          if (!ok) { missed.push(want[i]); b.innerHTML = `${typed[i]}<small>${want[i]}</small>`; }
        });
        next(missed.length === 0, missed, missed.length ? `On écrit ${d.full}.` : "");
      };
      break;
    }
    case "drawword": {
      const want = [...d.full!], drawn: Stroke[][] = [];
      const step = () => {
        body.innerHTML = "";
        const i = drawn.length;
        if (i === want.length) return review();
        body.appendChild(el(`<div><p class="drill-big romaji" style="font-size:44px">${d.reading}</p><p class="small muted" style="margin:0;text-align:center">${esc(d.meaning!)} · signe ${i + 1} sur ${want.length} : « ${byK[want[i]].r} »</p></div>`));
        const st = el(`<div class="stage"></div>`);
        body.appendChild(st);
        const tools = el(`<div class="tools"><button class="btn">Arrière</button><button class="btn">Recommencer</button><button class="btn primary" disabled>${i + 1 < want.length ? "Signe suivant" : "Comparer"}</button></div>`);
        body.appendChild(tools);
        const pad = makePad(st, modelSVG(want[i], "blank", false));
        const [undo, clr, ok] = tools.querySelectorAll<HTMLButtonElement>("button");
        pad.onchange = () => (ok.disabled = pad.strokes.length === 0);
        undo.onclick = () => pad.undo();
        clr.onclick = () => pad.clear();
        ok.onclick = () => { drawn.push(pad.strokes.slice()); step(); };
      };
      const review = () => {
        body.appendChild(el(`<div class="word-cmp">${want.map((k, i) => `<div><div class="stage">${userSVG(drawn[i], false)}</div><div class="stage">${modelSVG(k, "color", false)}</div></div>`).join("")}</div>`));
        const g = el(`<div class="opts-grid"><button class="btn" data-g="ko">Pas tout à fait</button><button class="btn g-bien" data-g="ok">Juste</button></div>`);
        body.appendChild(g);
        g.onclick = (e) => {
          const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-g]");
          if (b) done(b.dataset.g === "ok", b.dataset.g === "ok" ? [] : want);
        };
      };
      step();
      break;
    }
    case "text": {
      const t = TEXTS.find((x) => x.id === d.text)!;
      textDrill(body, t, done);
      break;
    }
  }
}

/** Real text in 3 scripts: guess from what you know, write or say it, then read the correction. */
function textDrill(body: HTMLElement, t: Text, done: DrillDone): void {
  const known = new Set(knownSigns(profile()));
  const marked = t.parts.map((x) => [...x.t].map((c) => (isHira(c) && known.has(c) ? `<b>${c}</b>` : c)).join("")).join("");
  body.appendChild(el(`<div><p class="small muted" style="margin:0">${esc(t.where)}</p><div class="look look-${t.look}"><span>${marked}</span></div>
    <label class="tip-off" style="justify-content:center"><input type="checkbox" id="hl"> Souligner les signes que je connais</label></div>`));
  const look = $(".look", body);
  $<HTMLInputElement>("#hl", body).onchange = (e) => look.classList.toggle("hl", (e.target as HTMLInputElement).checked);
  const guess = el(`<div style="display:flex;flex-direction:column;gap:8px"><label class="small" for="g">Ce que je comprends (ou dites-le à voix haute)</label><textarea id="g" class="fb" placeholder="Devinez à partir des signes que vous reconnaissez…"></textarea><button class="btn primary big" id="show">Voir la correction</button></div>`);
  body.appendChild(guess);
  $("#show", guess).onclick = () => {
    $("#show", guess).remove();
    const rows = t.parts.filter((x) => x.r).map((x) => `<tr><td class="kana-s">${x.t}</td><td>${x.r}</td><td>${esc(x.fr)}</td></tr>`).join("");
    body.appendChild(el(`<div class="corr"><p style="margin:0"><b>${esc(t.fr)}</b></p><table>${rows}</table></div>`));
    const g = el(`<div class="opts-grid three"><button class="btn" data-g="0">Pas compris</button><button class="btn" data-g="1">En partie</button><button class="btn g-bien" data-g="2">Compris</button></div>`);
    body.appendChild(g);
    g.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-g]");
      if (b) done(b.dataset.g !== "0", []);
    };
  };
}
