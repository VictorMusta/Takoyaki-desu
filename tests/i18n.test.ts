import { it, expect, describe } from "vitest";
import strings from "../src/i18n/strings.json";
import { JA } from "../src/i18n/ja";
import { translate } from "../src/i18n";

describe("Japanese interface", () => {
  it("every French text of the interface has a Japanese translation", () => {
    const missing = (strings as { s: string }[]).map((x) => x.s).filter((s) => !(s in JA));
    expect(missing).toEqual([]);
  });
  it("translations keep the inserted values they need", () => {
    for (const [fr, ja] of Object.entries(JA)) {
      const used = new Set(ja.match(/\{\d+\}/g) ?? []);
      for (const ph of used) expect(fr, `${ja} uses ${ph}`).toContain(ph);
    }
  });
  it("translates exact texts and patterns, values included", () => {
    expect(translate("Comparer")).toBe("比べる");
    expect(translate("  Séance du jour, Victor ")).toBe("Victorさんの今日のレッスン");
    expect(translate("3 traits au lieu de 2.")).toBe("3画になっています（正しくは2画）。");
    expect(translate("Le trait 2 est tracé à l'envers.")).toBe("2画目が逆向きに書かれています。");
    // A value that is itself French is translated too.
    expect(translate("Aujourd'hui : 5 nouveaux signes, 18 révisions.")).not.toBeNull();
    expect(translate("Texte inconnu")).toBeNull();
  });
});
