import { byK } from "../data/kana";
import { profile, save } from "../core/store";
import { $, el, strokeColor, view } from "../ui/dom";
import { modelSVG, type Stroke } from "../ui/model";
import { makePad } from "../ui/pad";

const REPO_ISSUE = "https://github.com/VictorMusta/Takoyaki-desu/issues/new";
import { AUTHOR_MAIL, mailTo } from "../config";

/** The learner's drawing as a PNG: dashed cross, strokes in order colours, stroke numbers. */
async function drawingPNG(strokes: Stroke[]): Promise<Blob | null> {
  const S = 436, k = S / 109;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#F2EADB";
  c.fillRect(0, 0, S, S);
  c.strokeStyle = "#AE9C8D";
  c.setLineDash([12, 12]);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(S / 2, 16); c.lineTo(S / 2, S - 16); c.moveTo(16, S / 2); c.lineTo(S - 16, S / 2);
  c.stroke();
  c.setLineDash([]);
  c.lineCap = c.lineJoin = "round";
  strokes.forEach((st, i) => {
    c.strokeStyle = strokeColor(i);
    c.lineWidth = 18;
    c.beginPath();
    st.forEach(([x, y], j) => (j ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k)));
    c.stroke();
  });
  strokes.forEach((st, i) => {
    const [x, y] = st[0];
    c.fillStyle = strokeColor(i);
    c.beginPath(); c.arc(x * k, y * k, 17, 0, 7); c.fill();
    c.fillStyle = "#fff";
    c.font = "bold 20px system-ui";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(String(i + 1), x * k, y * k + 1);
  });
  return new Promise((r) => cv.toBlob(r, "image/png"));
}

/** Compact path data: integer points, enough to redraw the sign later. */
export const compact = (strokes: Stroke[]) => JSON.stringify(strokes.map((s) => s.map(([x, y]) => [Math.round(x), Math.round(y)])));

/**
 * « Moi je le fais pas comme ça » (fluent mode): the learner draws the sign their way and sends it
 * to the author as feedback, through the phone's share sheet (picture + text) or a GitHub ticket.
 */
export function viewFeedback(k: string, back: () => void): void {
  const K = byK[k], p = profile();
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card">
    <div class="spread"><h2>${k} · ${K.r} à votre façon</h2></div>
    <p class="small muted" style="margin:0">Écrivez-le comme vous l'écrivez vraiment, dans votre ordre. Votre tracé sera envoyé à l'auteur de l'appli pour améliorer le modèle.</p>
    <div class="pair"><div><div class="stage" id="st"></div><div class="label">Votre façon</div></div><div><div class="stage">${modelSVG(k, "color", true)}</div><div class="label">Modèle actuel</div></div></div>
    <div class="tools"><button class="btn" id="undo" aria-label="Revenir un trait en arrière">Arrière</button><button class="btn" id="clr">Recommencer</button><button class="btn" id="back">Retour</button></div>
    <label class="sr-only" for="fbc">Commentaire</label>
    <textarea id="fbc" class="fb" placeholder="Ce qui change, pourquoi c'est mieux, d'où vient cette façon de l'écrire…"></textarea>
    <label class="tip-off"><input type="checkbox" id="acc" checked> Accepter ma façon dans mes séances (nombre et ordre des traits non vérifiés)</label>
    ${AUTHOR_MAIL ? `<button class="btn primary big" id="mail" disabled>Envoyer par mail</button>` : ""}
    <button class="btn${AUTHOR_MAIL ? "" : " primary big"}" id="send" disabled>${AUTHOR_MAIL ? "Partager autrement, avec l'image" : "Envoyer mon retour"}</button>
    <button class="btn" id="gh">Ou ouvrir un ticket sur GitHub</button>
    <p class="small muted hidden" id="msg" role="status" style="margin:0"></p></section>`),
  );
  const pad = makePad($("#st"), modelSVG(k, "blank", false));
  const send = $<HTMLButtonElement>("#send");
  const mail = document.querySelector<HTMLButtonElement>("#mail");
  pad.onchange = () => {
    send.disabled = pad.strokes.length === 0;
    if (mail) mail.disabled = send.disabled;
  };
  $("#undo").onclick = () => pad.undo();
  $("#clr").onclick = () => pad.clear();
  $("#back").onclick = back;
  const msg = (t: string) => {
    const m = $("#msg");
    m.textContent = t;
    m.classList.remove("hidden");
  };
  const text = () => {
    const n = pad.strokes.length, c = $<HTMLTextAreaElement>("#fbc").value.trim();
    return `Takoyaki desu · retour sur ${k} (${K.r})\nJe l'écris en ${n} trait${n > 1 ? "s" : ""} (modèle : ${K.s.length}).${c ? "\n\n" + c : ""}\n\nTracé : ${compact(pad.strokes)}`;
  };
  const accept = () => {
    if (!$<HTMLInputElement>("#acc").checked) return;
    (p.variants ??= {})[k] = true;
    save();
  };
  send.onclick = async () => {
    accept();
    const t = text();
    const png = await drawingPNG(pad.strokes);
    const file = png ? new File([png], `takoyaki-${K.r}.png`, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Retour sur ${k}`, text: t, files: [file] });
      else if (navigator.share) await navigator.share({ title: `Retour sur ${k}`, text: t });
      else throw new Error("no share");
      msg("Merci ! Votre retour est parti.");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(t);
        msg("Partage indisponible : le texte est copié, collez-le dans un message à l'auteur.");
      } catch {
        msg("Partage indisponible : utilisez plutôt le ticket GitHub.");
      }
    }
  };
  if (mail)
    mail.onclick = () => {
      accept();
      location.href = mailTo(`Takoyaki desu : tracé de ${k} (${K.r})`, text());
      msg("Votre appli de mail s'ouvre avec le message prêt : il n'y a plus qu'à l'envoyer.");
    };
  $("#gh").onclick = () => {
    accept();
    const url = `${REPO_ISSUE}?title=${encodeURIComponent(`Tracé de ${k} (${K.r})`)}&body=${encodeURIComponent(text())}`;
    window.open(url, "_blank", "noopener");
  };
}
