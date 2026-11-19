import { dayCount, level } from "./calendar";
import { isJa, translate } from "../i18n";
import type { Profile } from "../core/types";
import { snapshot, history } from "../core/stats";
import { confirmModal } from "./modal";
import { toast } from "./dom";

/**
 * A progress story to post (Instagram, WhatsApp…): a 1080 × 1920 image drawn on a canvas in
 * the charte (paper, ink, beni seal, take green), from the numbers on this phone. Shared with
 * the share sheet when files can be shared, downloaded otherwise.
 */

const W = 1080, H = 1920;
const C = { paper: "#EAE0CC", card: "#F2EADB", ink: "#3A2A24", wood: "#5A3C2E", beni: "#B5223A", take: "#4F7F53", kin: "#765B10", guide: "#C9B9A0" };
const T = (fr: string) => (isJa() ? translate(fr) ?? fr : fr);

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}` : `${Math.round(m)} min`);
const big = (n: number) => n.toLocaleString(isJa() ? "ja-JP" : "fr-FR");

async function fonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('500 64px "Shippori Mincho B1"', "たこ焼きです蛸Victor0123456789"),
      document.fonts.load('400 40px "Zen Kaku Gothic New"', "abcéèà0123456789"),
      document.fonts.load('500 40px "Zen Kaku Gothic New"', "abc"),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

export async function drawStory(p: Profile, name: string, t: number): Promise<HTMLCanvasElement> {
  await fonts();
  const s = snapshot(p, name, t);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  const serif = (w: number, px: number) => `${w} ${px}px "Shippori Mincho B1", serif`;
  const sans = (w: number, px: number) => `${w} ${px}px "Zen Kaku Gothic New", sans-serif`;

  // Paper, card, hairline frame.
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  g.fillStyle = C.card;
  g.fillRect(64, 64, W - 128, H - 128);
  g.strokeStyle = C.wood;
  g.lineWidth = 2;
  g.strokeRect(64, 64, W - 128, H - 128);

  // Seal and name of the app.
  g.fillStyle = C.beni;
  g.fillRect(128, 128, 96, 96);
  g.fillStyle = "#fff";
  g.font = serif(500, 64);
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText("蛸", 176, 180);
  g.textAlign = "left";
  g.fillStyle = C.ink;
  g.fillText("たこ焼きです", 256, 180);

  // Who.
  g.textBaseline = "alphabetic";
  g.font = serif(500, 104);
  g.fillText(s.n, 128, 400);
  g.fillStyle = C.wood;
  g.font = sans(400, 40);
  g.fillText(T("apprend à écrire le japonais"), 128, 470);

  // The script in progress: big count, bar.
  const script = (label: string, v: [number, number, number], y: number, main: boolean) => {
    g.fillStyle = C.ink;
    g.font = serif(500, main ? 220 : 120);
    const txt = `${v[1]}`;
    g.fillText(txt, 128, y);
    const tw = g.measureText(txt).width;
    g.font = serif(500, main ? 72 : 48);
    g.fillStyle = C.wood;
    g.fillText(`/ ${label === "hiragana" ? 75 : 76}`, 128 + tw + 24, y);
    g.font = sans(400, main ? 40 : 34);
    g.fillText(T(label === "hiragana" ? "hiragana maîtrisés" : "katakana maîtrisés") + ` · ${v[0]} ${T("découverts")}`, 128, y + (main ? 64 : 52));
    const by = y + (main ? 100 : 80), bw = W - 256;
    g.fillStyle = C.paper;
    g.fillRect(128, by, bw, 20);
    g.fillStyle = C.take;
    g.fillRect(128, by, (bw * v[2]) / 100, 20);
    g.strokeStyle = C.wood;
    g.lineWidth = 1;
    g.strokeRect(128, by, bw, 20);
    g.fillStyle = C.wood;
    g.font = sans(500, 32);
    g.textAlign = "right";
    g.fillText(`${T("maîtrise")} ${v[2]} %`, W - 128, by + 64);
    g.textAlign = "left";
  };
  script("hiragana", s.h, 760, true);
  if (s.k) script("katakana", s.k, 1080, false);

  // Three numbers.
  const all = history(p);
  const totMin = all.reduce((a, l) => a + l.min, 0), totEx = all.reduce((a, l) => a + l.ex + l.rv + l.nw, 0);
  const stats: [string, string][] = [
    [String(s.s), T("jours d'affilée")],
    [minutes(totMin), T("de pratique")],
    [big(totEx), T("signes et exercices")],
  ];
  const top = s.k ? 1260 : 1060;
  stats.forEach(([v, l], i) => {
    const x = 128 + i * ((W - 256) / 3);
    g.fillStyle = C.ink;
    g.font = serif(500, 72);
    g.fillText(v, x, top);
    g.fillStyle = C.wood;
    g.font = sans(400, 30);
    g.fillText(l, x, top + 48);
  });

  // The last 12 weeks, one square a day.
  const weeks = 12, cell = 60, gap = 9, x0 = (W - (weeks * (cell + gap) - gap)) / 2, y0 = top + 120;
  const dow = (d: number) => (new Date(d * 864e5).getUTCDay() + 6) % 7;
  const start = t - dow(t) - (weeks - 1) * 7;
  const shade = ["", "rgba(79,127,83,.3)", "rgba(79,127,83,.55)", "rgba(79,127,83,.8)", C.take];
  for (let w = 0; w < weeks; w++)
    for (let i = 0; i < 7; i++) {
      const d = start + w * 7 + i;
      if (d > t) continue;
      const l = level(dayCount(p, d));
      g.fillStyle = l ? shade[l] : "rgba(201,185,160,.45)";
      g.fillRect(x0 + w * (cell + gap), y0 + i * (cell + gap), cell, cell);
      if (d === t) {
        g.strokeStyle = C.ink;
        g.lineWidth = 3;
        g.strokeRect(x0 + w * (cell + gap), y0 + i * (cell + gap), cell, cell);
      }
    }

  // Footer.
  g.fillStyle = C.wood;
  g.font = sans(400, 30);
  g.textAlign = "center";
  g.fillText(T("Takoyaki desu · apprendre les kana en les écrivant"), W / 2, H - 150);
  g.font = sans(500, 30);
  g.fillText(location.host + location.pathname.replace(/\/$/, ""), W / 2, H - 104);
  return cv;
}

/** Shows the story, then shares or downloads it. */
export async function shareStory(p: Profile, name: string, t: number): Promise<void> {
  const cv = await drawStory(p, name, t);
  const url = cv.toDataURL("image/png");
  const ok = await confirmModal({
    title: "Votre story de progression",
    body: `<img src="${url}" alt="Story de progression" style="width:100%;max-width:280px;display:block;margin:0 auto;border:.5px solid var(--wood)">`,
    ok: "Partager",
    cancel: "Fermer",
  });
  if (!ok) return;
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/png"));
  if (!blob) return toast("Image impossible à créer sur cet appareil.");
  const file = new File([blob], `takoyaki-desu-${name}-${new Date().toISOString().slice(0, 10)}.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Takoyaki desu" });
      return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Image téléchargée : ajoutez-la à votre story depuis la galerie.");
}
