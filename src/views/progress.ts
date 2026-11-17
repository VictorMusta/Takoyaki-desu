import { byK, KANA, LINES, lineCards } from "../data/kana";
import { calibration, status, streak, today } from "../core/scheduler";
import { profile, state } from "../core/store";
import { $, el, esc, view } from "../ui/dom";
import { ficheHTML } from "../ui/fiche";
import { animate, modelSVG } from "../ui/model";

/** Slots per line in the classic 5-column table (ya and wa have gaps). */
const SLOTS: Record<string, (number | null)[]> = { ya: [0, null, 1, null, 2], wa: [0, null, null, 1, 2] };

export function viewProgress(): void {
  const p = profile(), t = today(), v = view();
  v.innerHTML = "";
  let grid = "";
  LINES.forEach((ln, i) => {
    const cs = lineCards(i), locked = i >= p.unlocked;
    grid += `<div class="lineh">Ligne ${ln}${locked ? " · fermée" : ""}</div>`;
    (SLOTS[ln] ?? [0, 1, 2, 3, 4]).forEach((s) => {
      if (s === null) {
        grid += `<div class="cell empty"></div>`;
        return;
      }
      const k = cs[s], st = status(p, k.k);
      grid += `<button class="cell ${locked ? "locked" : ""} ${st === "done" ? "done" : st === "learn" ? "learn" : ""}" data-k="${k.k}" aria-label="Fiche de ${k.k}">${k.k}<small>${k.r}</small></button>`;
    });
  });
  const done = KANA.filter((k) => status(p, k.k) === "done").length;
  const learn = KANA.filter((k) => status(p, k.k) === "learn").length;
  const fc = el(`<section class="card hidden" id="fc"></section>`);
  v.appendChild(fc);
  v.appendChild(
    el(`<section class="card"><h2>Progrès de ${esc(state.active)}</h2>
    <div class="stats"><div class="stat"><b>${done}</b><span>acquis / ${KANA.length}</span></div><div class="stat"><b>${learn}</b><span>en cours</span></div><div class="stat"><b>${streak(p, t)}</b><span>jours d'affilée</span></div></div>
    <div class="legend"><span style="--sw:transparent">Pas encore vu</span><span style="--sw:var(--paper)">En cours</span><span style="--sw:transparent;--bd:var(--kin)">極 Maîtrisé (7 jours et +)</span></div>
    <p class="small muted" style="margin:0">Touchez un signe pour voir sa fiche.</p>
    <div class="grid">${grid}</div></section>`),
  );
  v.querySelectorAll<HTMLButtonElement>(".cell[data-k]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k!;
      fc.innerHTML = `<div class="spread"><h2>${k} · ${byK[k].r}</h2><button class="btn" id="fcx">Fermer</button></div><div class="stage" id="fcm" style="max-width:220px">${modelSVG(k, "anim", p.settings.showNums)}</div>${ficheHTML(k)}`;
      fc.classList.remove("hidden");
      animate($("#fcm").firstElementChild!);
      $("#fcx").onclick = () => fc.classList.add("hidden");
      fc.scrollIntoView({ behavior: "smooth" });
    };
  });

  const cal = calibration(p, t);
  v.appendChild(
    el(`<section class="card"><h3>Calibration (14 derniers jours)</h3>
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
