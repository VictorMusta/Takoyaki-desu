import { toast } from "./dom";

/** Reads the sign aloud with the device's Japanese voice, if there is one. */
export function speak(text: string): void {
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
