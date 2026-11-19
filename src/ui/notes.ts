import { AUTHOR_MAIL } from "../config";
import { getLang, isJa } from "../i18n";
import { el, esc, toast } from "./dom";
import { confirmModal } from "./modal";

/**
 * Testers' notes: a « Remarque » button on every screen opens a box to write what they noticed,
 * in their own language. Each note keeps where it was written (screen, sign or word on screen,
 * time), stays on this phone, and can be sent all at once to the author by mail or share sheet,
 * or copied. The author then has them translated.
 */

export interface Note {
  at: string;
  screen: string;
  context: string;
  lang: string;
  text: string;
}

const KEY = "takoyaki-notes";
const SHOW = "takoyaki-notes-button";

export function notes(): Note[] {
  try {
    const n = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(n) ? (n as Note[]) : [];
  } catch {
    return [];
  }
}
function saveNotes(n: Note[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(n));
  } catch {
    toast("Impossible d'enregistrer la remarque sur cet appareil.");
  }
}
export function clearNotes(): void {
  saveNotes([]);
}

/** The button shows in Japanese (testers), or when turned on in Réglages. */
export function notesButtonOn(): boolean {
  try {
    return isJa() || localStorage.getItem(SHOW) === "1";
  } catch {
    return isJa();
  }
}
export function setNotesButton(on: boolean): void {
  try {
    if (on) localStorage.setItem(SHOW, "1");
    else localStorage.removeItem(SHOW);
  } catch {
    /* storage unavailable */
  }
  renderNotesButton();
}

/** Where the tester is: the tab, and the title on screen (« う · u », « Séance du jour »…). */
function where(): { screen: string; context: string } {
  const screen = location.hash.slice(1) || "seance";
  const h = document.querySelector("#view h2, #view h1, .modal h2");
  return { screen, context: (h?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80) };
}

/** All notes as plain text, ready to mail or paste. */
export function notesText(list = notes()): string {
  const head = `Takoyaki desu · remarques de test (${list.length}) · appli ${__APP_VERSION__} · ${navigator.userAgent}`;
  const body = list
    .map((n, i) => `#${i + 1} · ${new Date(n.at).toLocaleString("fr-FR")} · écran « ${n.screen} »${n.context ? ` · « ${n.context} »` : ""} · langue ${n.lang}\n${n.text}`)
    .join("\n\n");
  return `${head}\n\n${body}\n`;
}

/** Sends every note: share sheet (mail, messages…) where possible, else mail, else copy. */
export async function sendNotes(): Promise<void> {
  const list = notes();
  if (!list.length) return toast("Aucune remarque pour l'instant.");
  const text = notesText(list);
  const subject = `Takoyaki desu : ${list.length} remarque(s) de test`;
  try {
    if (navigator.share) {
      await navigator.share({ title: subject, text });
      return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  if (AUTHOR_MAIL) {
    location.href = `mailto:${AUTHOR_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Remarques copiées : collez-les dans un message à l'auteur.");
  } catch {
    toast("Envoi impossible ici : copiez les remarques depuis Réglages.");
  }
}

/** The writing box. */
export async function writeNote(): Promise<void> {
  const w = where();
  const n = notes().length;
  const body = `<p class="small muted" style="margin:0">Écran : ${esc(w.context || w.screen)}</p>
    <label class="sr-only" for="note-text">Votre remarque</label>
    <textarea id="note-text" rows="6" placeholder="Ce qui est faux, bizarre, difficile à comprendre, une idée… Écrivez dans votre langue."></textarea>
    <p class="small muted" style="margin:0">${n ? `${n} remarque(s) déjà enregistrée(s) sur ce téléphone.` : "Les remarques restent sur ce téléphone jusqu'à leur envoi."}</p>`;
  const asked = confirmModal({ title: "Une remarque", body, ok: "Enregistrer", cancel: "Annuler" });
  // The window is on screen now: follow what is typed (it is gone once closed) and type at once.
  const ta = document.querySelector<HTMLTextAreaElement>("#note-text");
  let text = "";
  if (ta) {
    ta.oninput = () => {
      text = ta.value.trim();
    };
    ta.focus();
  }
  if (!(await asked) || !text) return;
  saveNotes([...notes(), { at: new Date().toISOString(), ...w, lang: getLang(), text }]);
  const send = await confirmModal({
    title: "Merci !",
    body: `<p style="margin:0">Remarque enregistrée (${notes().length} en tout).</p><p class="small muted" style="margin:0">Vous pouvez en écrire d'autres au fil des écrans, puis tout envoyer d'un coup.</p>`,
    ok: "Tout envoyer maintenant",
    cancel: "Continuer à tester",
  });
  if (send) await sendNotes();
}

/** The floating button, added once and kept in sync with the setting. */
export function renderNotesButton(): void {
  let b = document.querySelector<HTMLButtonElement>("#note-fab");
  if (!notesButtonOn()) {
    b?.remove();
    return;
  }
  if (b) return;
  b = el<HTMLButtonElement>(`<button id="note-fab" class="note-fab" type="button">Remarque</button>`);
  b.onclick = () => void writeNote();
  document.body.appendChild(b);
}
