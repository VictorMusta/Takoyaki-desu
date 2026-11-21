import { LINES, lineCards, lineLabel } from "../data/kana";
import { dueCount, today } from "../core/scheduler";
import type { Profile } from "../core/types";
import { confirmModal } from "./modal";

/**
 * Ouvrir la ligne suivante avant l'heure : on dit d'abord ce que ça change. Ses signes entrent tout de
 * suite dans l'apprentissage, les révisions de demain s'alourdissent, et une ligne ouverte ne se referme pas.
 */
export function confirmNextLine(p: Profile): Promise<boolean> {
  const line = LINES[p.unlocked];
  if (!line) return Promise.resolve(false);
  const signs = lineCards(p.unlocked).map((k) => k.k).join(" ");
  const n = lineCards(p.unlocked).length;
  const tomorrow = dueCount(p, today() + 1) + Math.min(5, n);
  return confirmModal({
    title: `Ouvrir la ligne «\u00a0${lineLabel(line)}\u00a0»\u00a0?`,
    body: `<p style="margin:0">Ses ${n} signes entrent tout de suite dans votre apprentissage : vous commencez à en apprendre 5 maintenant, et ils reviendront dans vos révisions des jours suivants.</p>
      <p lang="ja" data-noi18n style="margin:0;font-size:1.4em;letter-spacing:.1em">${signs}</p>
      <ul class="small" style="margin:0;padding-left:1.2em">
        <li>L'entraînement devient plus difficile : plus de signes à retenir à la fois, et les anciens reviennent moins souvent.</li>
        <li>Demain : environ ${tomorrow} révisions.</li>
        <li>C'est définitif : une ligne ouverte ne se referme pas.</li>
      </ul>
      <p class="small muted" style="margin:0">D'habitude, elle s'ouvre seule quand 80 % de la ligne précédente tient 3 jours : c'est le bon moment pour la plupart des gens.</p>`,
    ok: "Ouvrir la ligne",
    cancel: "Pas encore",
  });
}
