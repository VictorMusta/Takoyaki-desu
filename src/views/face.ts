import { common, GAME_NAMES, knowledgeFromSnapshot, knowledgeOf, makeMatch, pairs, playable, saveMatch, type Game, type Knowledge, type Match, type Round } from "../core/f2f";
import { shuffle } from "../core/drills";
import { soundOff } from "../core/sound";
import { profile, state } from "../core/store";
import { isJa } from "../i18n";
import { el, esc, view } from "../ui/dom";
import { buzz } from "../ui/haptics";
import { speak } from "../ui/speech";
import { rivals } from "./duel";

/**
 * « Duel face à face » : one phone flat between two players, the top half turned round. Same
 * question for both, each with their own buttons; the first right answer takes the point, a
 * wrong one locks that player for a second. Only what both know. The running tally between two
 * people lives in the history (this page), never on the end screen of a match.
 */

const ROUNDS = 10;
const LOCK_MS = 1000;
const ROUND_MS = 12000;

/** Who can be played against: the other profiles on this phone, and comparison links. */
function opponents(): { k: Knowledge; from: string }[] {
  const me = state.active;
  const out: { k: Knowledge; from: string }[] = Object.entries(state.profiles)
    .filter(([n]) => n !== me)
    .map(([n, p]) => ({ k: knowledgeOf(p, n), from: "Profil sur ce téléphone" }));
  for (const s of Object.values(rivals())) {
    if (out.some((o) => o.k.name === s.n) || s.n === me) continue;
    const k = knowledgeFromSnapshot(s);
    if (k) out.push({ k, from: "D'après son lien" });
  }
  return out;
}

export function viewFace(): void {
  const v = view();
  v.innerHTML = "";
  const me = knowledgeOf(profile(), state.active);
  const ops = opponents();
  const rows = ops
    .map(({ k, from }, i) => {
      const c = common(me, k), g = playable(c, !soundOff());
      return `<div class="face-op"><div><b>${esc(k.name)}</b><div class="small muted">${from} · ${c.signs.length} signes et ${c.words.length} mots en commun</div></div>${
        g.length ? `<button class="btn primary" data-op="${i}">Jouer</button>` : `<span class="small muted">Pas assez de signes en commun</span>`
      }</div>`;
    })
    .join("");
  v.appendChild(
    el(`<section class="card"><h2>Duel face à face</h2>
    <p style="margin:0">Posez le téléphone à plat entre vous deux : chacun a sa moitié d'écran, à l'endroit. Même question pour les deux, le premier qui touche la bonne réponse marque le point. Une erreur bloque une seconde. Seulement les signes et les mots que vous connaissez tous les deux.</p>
    ${rows || `<p class="small muted" style="margin:0">Pas encore d'adversaire. Créez son profil sur ce téléphone (Réglages › Profils), ou ouvrez le lien « Se comparer » qu'elle ou il vous envoie, depuis une version récente de l'appli.</p>`}
    </section>`),
  );
  v.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((b) => (b.onclick = () => play(me, ops[+b.dataset.op!].k)));
  v.appendChild(historyCard());
}

/** Per pair: matches won, then each mini-game's rounds won (a small leaderboard), then the last matches. */
function historyCard(): HTMLElement {
  const ps = pairs().filter((s) => s.played > 0);
  const date = (t: number) => new Date(t).toLocaleDateString(isJa() ? "ja-JP" : "fr-FR", { day: "numeric", month: "short" });
  const body = ps
    .map((s) => {
      const [a, b] = s.names;
      const games = (Object.keys(GAME_NAMES) as Game[])
        .filter((g) => s.games[g])
        .map((g) => {
          const [x, y] = s.games[g]!;
          return `<tr><th scope="row">${GAME_NAMES[g]}</th><td${x > y ? ' class="win"' : ""}>${x}</td><td${y > x ? ' class="win"' : ""}>${y}</td></tr>`;
        })
        .join("");
      const last = s.last
        .slice(-10)
        .reverse()
        .map((m: Match) => {
          const flip = m.names[0] !== a, sc = flip ? [m.score[1], m.score[0]] : m.score;
          return `<li>${date(m.at)} · ${esc(a)} ${sc[0]} – ${sc[1]} ${esc(b)}</li>`;
        })
        .join("");
      return `<details><summary>${esc(a)} et ${esc(b)} · ${s.played} partie${s.played > 1 ? "s" : ""}</summary>
        <table class="face-board"><thead><tr><th></th><th scope="col">${esc(a)}</th><th scope="col">${esc(b)}</th></tr></thead><tbody>
        <tr class="tot"><th scope="row">Parties gagnées</th><td${s.won[0] > s.won[1] ? ' class="win"' : ""}>${s.won[0]}</td><td${s.won[1] > s.won[0] ? ' class="win"' : ""}>${s.won[1]}</td></tr>
        ${games}</tbody></table>${s.draws ? `<p class="small muted" style="margin:4px 0">Égalités : ${s.draws}</p>` : ""}
        <p class="small" style="margin:8px 0 4px">Dernières parties</p><ul class="face-last">${last}</ul></details>`;
    })
    .join("");
  return el(`<section class="card"><h3>Historique des duels</h3>${body || `<p class="small muted" style="margin:0">Aucune partie pour l'instant.</p>`}</section>`);
}

/* ---------- the match ---------- */

function play(me: Knowledge, them: Knowledge): void {
  const c = common(me, them), games = playable(c, !soundOff());
  const rounds = makeMatch(c, games, ROUNDS);
  const names: [string, string] = [me.name, them.name]; // 0: bottom (this phone's profile), 1: top
  const score: [number, number] = [0, 0];
  const per: Partial<Record<Game, [number, number]>> = {};
  let lock: WakeLockSentinel | null = null;
  void (navigator as Navigator & { wakeLock?: { request(t: string): Promise<WakeLockSentinel> } }).wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});

  const box = el(`<div class="f2f" role="application" aria-label="Duel face à face">
    <div class="f2f-half top" data-p="1"></div>
    <div class="f2f-mid"><span id="f2f-n"></span><button class="btn sm" id="f2f-x" type="button">Quitter</button></div>
    <div class="f2f-half" data-p="0"></div></div>`);
  document.body.appendChild(box);
  const halves = [box.querySelector<HTMLElement>('[data-p="0"]')!, box.querySelector<HTMLElement>('[data-p="1"]')!];
  const close = () => {
    box.remove();
    void lock?.release().catch(() => {});
    viewFace();
  };
  box.querySelector<HTMLButtonElement>("#f2f-x")!.onclick = close;

  let i = -1, done = true, timer = 0;
  const locked = [0, 0];

  const head = (p: number) => `<div class="f2f-head"><b>${esc(names[p])}</b><span class="f2f-score">${score[p]}</span></div>`;
  const promptHTML = (r: Round) =>
    r.promptKind === "sound" ? `<button class="btn f2f-say" type="button" data-say>Écouter à nouveau</button>`
    : r.promptKind === "kana" ? `<div class="f2f-q kana">${r.prompt}</div>`
    : r.promptKind === "romaji" ? `<div class="f2f-q romaji">${r.prompt}</div>`
    : `<div class="f2f-q meaning">${esc(r.prompt)}</div>`;

  const next = () => {
    i++;
    if (i >= rounds.length) return end();
    const r = rounds[i];
    done = false;
    locked[0] = locked[1] = 0;
    box.querySelector("#f2f-n")!.textContent = `${GAME_NAMES[r.game]} · ${i + 1} / ${rounds.length}`;
    halves.forEach((h, p) => {
      const opts = shuffle(r.options, Math.random);
      h.className = p === 1 ? "f2f-half top" : "f2f-half";
      h.innerHTML = `${head(p)}${promptHTML(r)}<div class="f2f-opts">${opts
        .map((o) => `<button class="btn f2f-o${r.kanaOptions ? " kana" : ""}" type="button" data-o="${esc(o)}">${esc(o)}</button>`)
        .join("")}</div><p class="f2f-msg" aria-live="polite"></p>`;
    });
    if (r.say && r.promptKind === "sound") speak(r.say);
    clearTimeout(timer);
    timer = window.setTimeout(() => finish(-1), ROUND_MS);
  };

  const finish = (winner: number) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const r = rounds[i];
    const t = (per[r.game] ??= [0, 0]);
    if (winner >= 0) {
      score[winner]++;
      t[winner]++;
    }
    halves.forEach((h, p) => {
      h.querySelector(".f2f-score")!.textContent = String(score[p]);
      h.querySelectorAll<HTMLButtonElement>("[data-o]").forEach((b) => b.dataset.o === r.answer && b.classList.add("right"));
      h.querySelector(".f2f-msg")!.textContent = winner < 0 ? "Personne : trop tard." : winner === p ? "Point pour vous !" : `Point pour ${names[winner]}.`;
    });
    if (r.game === "mot" && r.say) speak(r.say, true);
    setTimeout(next, 1300);
  };

  const end = () => {
    clearTimeout(timer);
    const m: Match = { at: Date.now(), names, score: [score[0], score[1]], games: per };
    saveMatch(m);
    box.querySelector("#f2f-n")!.textContent = "Fin de la partie";
    halves.forEach((h, p) => {
      const o = 1 - p, res = score[p] > score[o] ? "Gagné !" : score[p] < score[o] ? "Perdu" : "Égalité";
      h.className = p === 1 ? "f2f-half end top" : "f2f-half end";
      h.innerHTML = `<div class="f2f-res">${res}</div><div class="f2f-final">${score[p]} – ${score[o]}</div>
        <div class="row" style="justify-content:center"><button class="btn primary" data-again type="button">Revanche</button><button class="btn" data-quit type="button">Terminer</button></div>`;
    });
    box.querySelectorAll<HTMLButtonElement>("[data-again]").forEach((b) => (b.onclick = () => {
      box.remove();
      void lock?.release().catch(() => {});
      play(me, them);
    }));
    box.querySelectorAll<HTMLButtonElement>("[data-quit]").forEach((b) => (b.onclick = close));
  };

  // pointerdown, not click: both players tap at once, and speed counts
  box.addEventListener("pointerdown", (e) => {
    const t = e.target as HTMLElement;
    const half = t.closest<HTMLElement>(".f2f-half");
    if (!half || done) return;
    const p = +half.dataset.p!;
    if (t.closest("[data-say]")) return speak(rounds[i].say!);
    const b = t.closest<HTMLButtonElement>("[data-o]");
    if (!b || Date.now() < locked[p]) return;
    e.preventDefault();
    if (b.dataset.o === rounds[i].answer) {
      buzz("ok");
      finish(p);
    } else {
      buzz("ko");
      b.classList.add("wrong");
      locked[p] = Date.now() + LOCK_MS;
      half.classList.add("locked");
      setTimeout(() => half.classList.remove("locked"), LOCK_MS);
    }
  });

  // « Prêts ? » then go
  halves.forEach((h, p) => (h.innerHTML = `${head(p)}<div class="f2f-res">Prêts ?</div><p class="small muted" style="text-align:center">${esc(names[p])}, c'est votre moitié.</p>`));
  box.querySelector("#f2f-n")!.textContent = `${rounds.length} manches · ${games.map((g) => GAME_NAMES[g]).join(", ")}`;
  setTimeout(next, 2000);
}
