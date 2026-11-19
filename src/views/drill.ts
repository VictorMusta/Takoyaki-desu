import { buzz } from "../ui/haptics";
import { byK } from "../data/kana";
import { isHira, TEXTS, type Text } from "../data/texts";
import { knownSigns, type Drill } from "../core/drills";
import { profile } from "../core/store";
import { $, el, esc, view } from "../ui/dom";
import { kanaField, kanaKeyboard } from "../ui/keyboard";
import { markOrder, mixed, orderBoard } from "../ui/order";
import { tileHints } from "./word";
import { modelSVG, userSVG, type Stroke } from "../ui/model";
import { makePad } from "../ui/pad";
import { checkDrawing, explain } from "../core/strokecheck";
import { speak } from "../ui/speech";
import { setQuietNow, soundOff } from "../core/sound";

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
  pickword: "Quel est le bon mot ?",
  typo: "Un signe est faux : lequel ?",
  order: "Remettez la phrase dans l'ordre",
  gap: "Quel bloc manque ?",
};

/** One exercise screen. `head` is the lesson caption (what, how many left). */
export function viewDrill(d: Drill, head: string, done: DrillDone): void {
  // A listening game planned before « Sans son » was chosen: the same signs, read instead.
  if (d.type === "listen" && soundOff()) d = { ...d, type: "choose" };
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
    buzz(ok ? "ok" : "ko");
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
    case "sentence":
    case "pickword":
    case "gap": {
      const big =
        d.type === "listen" ? `<button class="btn big" id="play">Réécouter le son</button>`
        : d.type === "pickword" ? `<p class="drill-big" style="font-family:var(--display)">${esc(d.prompt)}</p>`
        : d.type === "gap" ? `<p class="drill-big" style="font-family:var(--display);font-size:22px">${esc(d.prompt)}</p><p class="drill-big kana-l" style="font-size:26px">${d.tiles!.map((t2, i) => (i === d.gap ? `<span class="gap">？</span>` : t2)).join(" ")}</p>`
        : d.type === "choose" || d.type === "duel" ? `<p class="drill-big romaji">${d.prompt}</p>`
        : `<p class="drill-big kana-l">${d.prompt}</p>`;
      const kana = d.type === "choose" || d.type === "listen" || d.type === "duel" || d.type === "pickword" || d.type === "gap";
      body.appendChild(el(`<div>${big}</div>`));
      const grid = el(`<div class="opts-grid${kana ? " kana" : ""}${d.type === "sentence" || d.type === "word" ? " one" : ""}">${d.options!.map((o) => `<button class="btn opt-b" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`);
      body.appendChild(grid);
      if (d.type === "listen") {
        speak(d.say!);
        $("#play", body).onclick = () => speak(d.say!);
        const mute = el(`<button class="btn sm" type="button">Pas de son ici (dans le train…)</button>`);
        body.appendChild(mute);
        mute.onclick = () => {
          setQuietNow(true);
          try { speechSynthesis.cancel(); } catch { /* no voice */ }
          viewDrill(d, head, done);
        };
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
        const note =
          d.type === "sentence" ? `Lecture : ${d.meaning}.`
          : d.type === "pickword" ? `${d.answer} · ${d.reading}`
          : d.type === "gap" ? `${d.tiles!.join(" ")} · ${d.readings!.join(" ")}`
          : d.type === "word" || d.type === "read" || d.type === "combo" ? "" : `${d.answer} se lit « ${byK[d.answer!]?.r ?? ""} ».`;
        next(ok, ok ? [] : d.ks, note);
      };
      break;
    }
    case "match": {
      // Signs on top, sounds below, a line between them. One sign is always selected: touch its
      // sound to link them, and the next free sign is selected. Links can be moved or cleared;
      // the check comes at the end, with the right sound under each mistake.
      const left = d.pairs!.map(([k]) => k), right = [...d.pairs!.map(([, r]) => r)].sort(() => Math.random() - 0.5);
      const n = left.length;
      const box = el(`<div class="match2" style="--n:${n}">
        <div class="mrow">${left.map((k, i) => `<button class="btn mk kana-m" data-i="${i}">${k}</button>`).join("")}</div>
        <svg class="mlinks" aria-hidden="true"></svg>
        <div class="mrow">${right.map((r, j) => `<button class="btn mk" data-j="${j}">${r}</button>`).join("")}</div>
      </div>`);
      const tools = el(`<div class="opts-grid"><button class="btn" id="m-clr" disabled>Effacer</button><button class="btn primary" id="m-chk" disabled>Vérifier</button></div>`);
      body.appendChild(box);
      body.appendChild(tools);
      const tops = [...box.querySelectorAll<HTMLButtonElement>("[data-i]")], bots = [...box.querySelectorAll<HTMLButtonElement>("[data-j]")];
      const svg = box.querySelector<SVGSVGElement>(".mlinks")!;
      const link = new Map<number, number>(), order: number[] = []; // order: signs, last linked last
      let sel: number | null = 0, result: boolean[] | null = null;
      const nextFree = (from: number) => {
        for (let s2 = 1; s2 <= n; s2++) if (!link.has((from + s2) % n)) return (from + s2) % n;
        return null;
      };
      const paint = () => {
        const R = box.getBoundingClientRect();
        let lines = `<line class="msep" x1="0" x2="${R.width}" y1="50%" y2="50%"/>`;
        link.forEach((j, i) => {
          const a = tops[i].getBoundingClientRect(), z = bots[j].getBoundingClientRect();
          const cls = result ? (result[i] ? "ok" : "ko") : "";
          lines += `<line class="${cls}" x1="${a.left + a.width / 2 - R.left}" y1="${a.bottom - R.top}" x2="${z.left + z.width / 2 - R.left}" y2="${z.top - R.top}"/>`;
        });
        svg.innerHTML = lines;
        const used = new Set(link.values());
        tops.forEach((b, i) => { b.classList.toggle("sel", i === sel && !result); b.classList.toggle("linked", link.has(i)); });
        bots.forEach((b, j) => b.classList.toggle("linked", used.has(j)));
        $<HTMLButtonElement>("#m-chk", tools).disabled = link.size < n || !!result;
        $<HTMLButtonElement>("#m-clr", tools).disabled = link.size === 0;
      };
      requestAnimationFrame(paint);
      const ro = new ResizeObserver(() => (box.isConnected ? paint() : ro.disconnect()));
      ro.observe(box);
      box.onclick = (e) => {
        if (result) return;
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!b) return;
        if (b.dataset.i !== undefined) sel = +b.dataset.i;
        else if (b.dataset.j !== undefined && sel !== null) {
          const j = +b.dataset.j;
          link.forEach((jj, i) => jj === j && link.delete(i)); // a sound belongs to one sign
          link.set(sel, j);
          order.splice(0, order.length, ...order.filter((i) => link.has(i) && i !== sel), sel);
          buzz("tick");
          sel = nextFree(sel);
        }
        paint();
      };
      // « Effacer »: takes back the last link only, and selects its sign again.
      $<HTMLButtonElement>("#m-clr", tools).onclick = () => {
        const i = order.filter((x) => link.has(x)).pop();
        if (i === undefined) return;
        link.delete(i);
        order.splice(order.lastIndexOf(i), 1);
        sel = i;
        paint();
      };
      $<HTMLButtonElement>("#m-chk", tools).onclick = () => {
        result = left.map((k, i) => byK[k].r === right[link.get(i)!]);
        tops.forEach((b, i) => {
          b.classList.add(result![i] ? "right" : "wrong");
          if (!result![i]) b.insertAdjacentHTML("beforeend", `<small>${byK[left[i]].r}</small>`);
        });
        tools.remove();
        paint();
        const missed = left.filter((_, i) => !result![i]);
        next(missed.length === 0, missed, missed.length ? `${missed.length} lien${missed.length > 1 ? "s" : ""} faux sur ${n}.` : "");
      };
      break;
    }
    case "typo": {
      // The misspelt word, sign by sign: touch the wrong one.
      body.appendChild(el(`<p class="drill-big" style="font-family:var(--display);font-size:22px;margin:0">${esc(d.meaning!)}</p>`));
      const row = el(`<div class="typo-row">${d.tiles!.map((c, i) => `<button class="btn key" type="button" data-i="${i}">${c}</button>`).join("")}</div>`);
      body.appendChild(row);
      row.onclick = (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-i]");
        if (!b || row.dataset.done) return;
        row.dataset.done = "1";
        const ok = +b.dataset.i! === d.gap;
        const bad = row.querySelector<HTMLButtonElement>(`[data-i="${d.gap}"]`)!;
        bad.classList.add("wrong");
        bad.innerHTML = `${d.tiles![d.gap!]}<small>${[...d.full!][d.gap!]}</small>`;
        if (!ok) b.classList.add("picked");
        speak(d.say!, true);
        next(ok, ok ? [] : d.ks, `${d.full} · ${d.reading}`);
      };
      break;
    }
    case "order": {
      const order = mixed(d.tiles!.length);
      const hints = tileHints(d.tiles!, d.readings!);
      body.appendChild(el(`<p class="drill-big" style="font-family:var(--display);font-size:22px;margin:0">${esc(d.prompt)}</p>`));
      body.appendChild(
        orderBoard(order.map((i) => d.tiles![i]), order.map((i) => hints[i]), d.tiles!.length, (picked, board) => {
          const ok = picked.map((j, pos) => d.tiles![order[j]] === d.tiles![pos]);
          markOrder(board, ok);
          speak(d.say!, true);
          const all = ok.every(Boolean);
          next(all, all ? [] : d.ks, `${d.tiles!.join(" ")} · ${d.readings!.join(" ")}`);
        }),
      );
      break;
    }
    case "cloze": {
      const chars = [...d.full!];
      const shown = chars.map((c, i) => (i === d.gap ? `<span class="gap" id="gap">？</span>` : c === " " ? " " : c)).join("");
      body.appendChild(el(`<div><p class="drill-big kana-l" style="white-space:pre-wrap">${shown}</p><p class="reading">${d.reading}</p><p class="small muted" style="margin:0;text-align:center">${esc(d.meaning!)}</p></div>`));
      const answer = (k: string) => {
        if (kb.dataset.done) return;
        kb.dataset.done = "1";
        field.disabled = true;
        const ok = k === chars[d.gap!];
        const g = $("#gap", body);
        g.textContent = chars[d.gap!];
        g.classList.add(ok ? "right" : "wrong");
        next(ok, ok ? [] : d.ks, ok ? "" : `Vous avez tapé ${k}.`);
      };
      const kb = kanaKeyboard(new Set(knownSigns(profile())), answer, undefined, chars[d.gap!]);
      const field = kanaField((ks) => ks[0] && answer(ks[0]));
      body.appendChild(field);
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
      const set = (ks: string[]) => {
        typed = ks.slice(0, want.length);
        paint();
        check.disabled = typed.length < want.length;
      };
      const field = kanaField((ks) => set(ks), () => !check.disabled && check.click());
      const kb = kanaKeyboard(new Set(knownSigns(profile())), (k) => {
        set([...typed, k]);
        field.value = typed.join("");
      }, () => { set(typed.slice(0, -1)); field.value = typed.join(""); }, d.full);
      body.appendChild(field);
      body.appendChild(check);
      body.appendChild(kb);
      check.onclick = () => {
        kb.remove();
        check.remove();
        field.remove();
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
        // The same stroke check as a lesson, compact: a short note in ocre under each sign
        // and a halo on the wrong strokes. The learner still decides.
        const checks = want.map((k, i) => {
          const r = checkDrawing(drawn[i], byK[k].s, k);
          const ok = r.count && r.order && r.shape;
          const bad = ok ? [] : [...new Set([...r.swapped, ...r.issues.map((x) => x.n)])].map((n) => n - 1);
          return { ok, bad, why: ok ? [] : explain(r) };
        });
        body.appendChild(el(`<div class="word-cmp">${want.map((k, i) => `<div><div class="stage">${userSVG(drawn[i], false, "", checks[i].bad)}</div><div class="stage">${modelSVG(k, "color", false)}</div>
          <p class="wc-note ${checks[i].ok ? "ok" : "ko"}"><b>${k}</b> ${(checks[i].ok ? ["Traits vérifiés."] : checks[i].why).map((w) => `<span>${esc(w)}</span>`).join(" ")}</p></div>`).join("")}</div>`));
        const g = el(`<div class="opts-grid"><button class="btn g-rate" data-g="ko">Raté</button><button class="btn g-bien" data-g="ok">Juste</button></div>`);
        body.appendChild(g);
        g.onclick = (e) => {
          const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-g]");
          if (!b) return;
          // A miss brings back the signs the check flagged (all of them if it saw nothing).
          const flagged = want.filter((_, i) => !checks[i].ok);
          done(b.dataset.g === "ok", b.dataset.g === "ok" ? [] : flagged.length ? flagged : want);
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
  const guess = el(`<div style="display:flex;flex-direction:column;gap:8px"><label class="small" for="g">${soundOff() ? "Ce que je comprends" : "Ce que je comprends (ou dites-le à voix haute)"}</label><textarea id="g" class="fb" placeholder="Devinez à partir des signes que vous reconnaissez…"></textarea><button class="btn primary big" id="show">Voir la correction</button></div>`);
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
