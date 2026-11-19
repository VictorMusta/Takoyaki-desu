import { quietNow, setQuietNow, silentAlways, soundOff } from "../core/sound";
import { toast } from "./dom";

/** Reads the sign aloud with the device's Japanese voice, if there is one. `auto`: not asked for by a tap, so silent in « Sans son ». */
export function speak(text: string, auto = false): void {
  if (auto && soundOff()) return;
  // A tap on « Écouter » during « Sans son pour l'instant »: headphones are on, sound is back.
  if (!auto && quietNow() && !silentAlways()) {
    setQuietNow(false);
    toast("Son réactivé : les jeux d'écoute reviennent.");
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    toast("Lecture audio indisponible sur cet appareil.");
  }
}
