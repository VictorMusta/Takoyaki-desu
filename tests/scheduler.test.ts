import { KANA } from "../src/data/kana";
import { isKata } from "../src/data/kana";
import { describe, expect, it } from "vitest";
import { lineCards } from "../src/data/kana";
import {
  alphabetMastery,
  applyGrade,
  mastery,
  recordMastery,
  dueCount,
  peekCard,
  practiceQueue,
  pullForward,
  unseenOpen,
  buildQueue,
  calibration,
  checkUnlock,
  freshProfile,
  gradeCard,
  newCard,
  status,
  streak,
  today,
} from "../src/core/scheduler";

const T = 20_000;

describe("today", () => {
  it("uses the local day, not UTC", () => {
    // 2026-11-17 23:30 UTC is already 2026-11-18 in Tokyo (UTC+9, offset −540 min).
    const utc = Date.UTC(2026, 10, 17, 23, 30);
    expect(today(utc, -540)).toBe(today(Date.UTC(2026, 10, 18, 12), 0));
  });
  it("changes day at 4 a.m.: 00:10 still belongs to the evening before", () => {
    // 00:10 and 03:59 in Tokyo on the 19th = 15:10 and 18:59 UTC on the 18th.
    const evening = today(Date.UTC(2026, 10, 18, 12), -540); // 21:00 on the 18th
    expect(today(Date.UTC(2026, 10, 18, 15, 10), -540)).toBe(evening);
    expect(today(Date.UTC(2026, 10, 18, 18, 59), -540)).toBe(evening);
    expect(today(Date.UTC(2026, 10, 18, 19, 1), -540)).toBe(evening + 1);
  });
});

describe("applyGrade (SM-2 simplifié)", () => {
  it("Bien gives 1, then 3, then interval × ease days", () => {
    const c = newCard();
    expect(applyGrade(c, "bien", T).interval).toBe(1);
    expect(applyGrade(c, "bien", T).interval).toBe(3);
    expect(applyGrade(c, "bien", T).interval).toBe(8); // 3 × 2.5 = 7.5 → 8
    expect(c.due).toBe(T + 8);
    expect(c.seen).toBe(true);
  });

  it("Raté resets to 1 day and lowers ease, never below 1.3", () => {
    const c = newCard();
    for (let i = 0; i < 10; i++) applyGrade(c, "rate", T);
    expect(c.interval).toBe(1);
    expect(c.reps).toBe(0);
    expect(c.ease).toBeCloseTo(1.3);
  });

  it("Bof stretches the interval by 1.2 and lowers ease by 0.15", () => {
    const c = { ...newCard(), seen: true, interval: 10, reps: 3 };
    applyGrade(c, "bof", T);
    expect(c.interval).toBe(12);
    expect(c.ease).toBeCloseTo(2.35);
  });
});

describe("unlocking lines", () => {
  it("opens the next line when 80 % of the line holds 3 days or more", () => {
    const p = freshProfile();
    const line = lineCards(0);
    line.slice(0, 3).forEach((k) => (p.cards[k.k] = { ...newCard(), seen: true, interval: 3 }));
    checkUnlock(p);
    expect(p.unlocked).toBe(1);
    p.cards[line[3].k] = { ...newCard(), seen: true, interval: 5 };
    checkUnlock(p);
    expect(p.unlocked).toBe(2);
  });
});

describe("buildQueue", () => {
  it("puts due reviews first, then new signs up to the daily quota", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 1, due: T };
    p.cards["い"] = { ...newCard(), seen: true, interval: 3, due: T + 2 };
    const q = buildQueue(p, T);
    expect(q[0]).toEqual({ k: "あ", isNew: false });
    expect(q.filter((x) => x.isNew).map((x) => x.k)).toEqual(["う", "え", "お"]);
  });

  it("respects what was already done today", () => {
    const p = freshProfile();
    p.settings.newPerDay = 5;
    p.days[T] = { nw: 4, rv: 0 };
    expect(buildQueue(p, T).filter((x) => x.isNew)).toHaveLength(1);
  });

  it("only offers signs from open lines", () => {
    const p = freshProfile();
    lineCards(0).forEach((k) => (p.cards[k.k] = { ...newCard(), seen: true, interval: 1, due: T + 1 }));
    expect(buildQueue(p, T)).toEqual([]);
  });
});

describe("status, streak, calibration", () => {
  it("classifies signs", () => {
    const p = freshProfile();
    expect(status(p, "あ")).toBe("new");
    p.cards["あ"] = { ...newCard(), seen: true, interval: 3 };
    expect(status(p, "あ")).toBe("learn");
    p.cards["あ"].interval = 7;
    expect(status(p, "あ")).toBe("done");
  });

  it("counts consecutive active days, today included or not yet", () => {
    const p = freshProfile();
    p.days[T - 1] = { nw: 1, rv: 0 };
    p.days[T - 2] = { nw: 0, rv: 3 };
    expect(streak(p, T)).toBe(2);
    p.days[T] = { nw: 0, rv: 1 };
    expect(streak(p, T)).toBe(3);
  });

  it("compares self-grading with strict exams per line", () => {
    const p = freshProfile();
    gradeCard(p, "あ", "bien", T);
    gradeCard(p, "い", "bien", T);
    gradeCard(p, "う", "bof", T);
    gradeCard(p, "え", "bien", T);
    p.exams.push({ d: T, r: [{ k: "あ", ok: true }, { k: "い", ok: false }] });
    const [row] = calibration(p, T);
    expect(row).toEqual({ line: "a", bien: 75, exam: 50, gap: 25 });
  });
});

describe("going further than the daily quota", () => {
  it("« 5 signes de plus » raises today's new-sign quota", () => {
    const p = freshProfile();
    p.unlocked = 2;
    p.settings.newPerDay = 5;
    p.days[T] = { nw: 5, rv: 0 };
    expect(buildQueue(p, T)).toEqual([]);
    p.days[T].bonus = 5;
    expect(buildQueue(p, T).filter((x) => x.isNew)).toHaveLength(5);
  });

  it("free practice picks the weakest seen signs and never new ones", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 1, ease: 1.5, due: T + 1 };
    p.cards["い"] = { ...newCard(), seen: true, interval: 30, ease: 2.5, due: T + 30 };
    p.cards["う"] = { ...newCard(), seen: true, interval: 3, ease: 2.5, due: T + 3 };
    const q = practiceQueue(p, 2, () => 0);
    expect(q.map((x) => x.k).sort()).toEqual(["あ", "う"]);
    expect(q.every((x) => x.practice && !x.isNew)).toBe(true);
  });

  it("counts tomorrow's reviews and the unseen signs left", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 1, due: T + 1 };
    p.cards["い"] = { ...newCard(), seen: true, interval: 3, due: T + 3 };
    expect(dueCount(p, T + 1)).toBe(1);
    expect(unseenOpen(p)).toBe(3);
  });
});

describe("voir le signe", () => {
  it("a peek counts as Raté: back tomorrow, ease −0.2", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 8, reps: 3, ease: 2.5, due: T };
    peekCard(p, "あ", T);
    expect(p.cards["あ"]).toMatchObject({ interval: 1, reps: 0, ease: 2.3, due: T + 1 });
    expect(p.log.at(-1)).toEqual({ d: T, k: "あ", g: "rate" });
  });

  it("free practice only ever brings a date closer", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 8, reps: 3, due: T + 8 };
    pullForward(p, "あ", T);
    expect(p.cards["あ"].due).toBe(T + 1);
    p.cards["い"] = { ...newCard(), seen: true, interval: 1, reps: 0, due: T };
    pullForward(p, "い", T);
    expect(p.cards["い"].due).toBe(T);
  });
});

describe("mastery", () => {
  it("grows with how long a sign is remembered, 100 % at 7 days", () => {
    const p = freshProfile();
    const at = (interval: number) => {
      p.cards["あ"] = { ...newCard(), seen: true, interval, due: T + interval };
      return Math.round(mastery(p, "あ", T) * 100);
    };
    expect(at(1)).toBe(33);
    expect(at(3)).toBe(67);
    expect(at(7)).toBe(100);
    expect(at(30)).toBe(100);
    delete p.cards["あ"];
    expect(mastery(p, "あ", T)).toBe(0);
  });

  it("fades when a review is left waiting, never below half", () => {
    const p = freshProfile();
    p.cards["あ"] = { ...newCard(), seen: true, interval: 3, due: T };
    const fresh = mastery(p, "あ", T);
    expect(mastery(p, "あ", T + 3)).toBeLessThan(fresh);
    expect(mastery(p, "あ", T + 100)).toBeCloseTo(fresh / 2);
  });

  it("alphabet mastery averages every sign of a script and is recorded per day", () => {
    const p = freshProfile();
    const nH = KANA.filter((k) => !isKata(k.k)).length, nK = KANA.length - nH;
    p.cards["あ"] = { ...newCard(), seen: true, interval: 7, due: T + 7 };
    expect(alphabetMastery(p, T)).toBeCloseTo(1 / nH);
    recordMastery(p, T);
    expect(p.hist![T]).toBe(Math.round(1000 / nH) / 10);
    expect(p.histK).toBeUndefined();
    p.cards["ア"] = { ...newCard(), seen: true, interval: 7, due: T + 7 };
    recordMastery(p, T);
    expect(p.histK![T]).toBe(Math.round(1000 / nK) / 10);
  });
});

import { gradeCard as gradeSign, nextSoon, SOON_MS, buildQueue as queueAt } from "../src/core/scheduler";
describe("same-day second chance", () => {
  const H = 36e5;
  it("a sign learnt today can move to 2 days if recalled 4 hours later", () => {
    const p = freshProfile(), t = 20776, now = Date.UTC(2026, 10, 19, 1); // 10:00 in Tokyo
    gradeSign(p, "あ", "bien", t, now);
    expect(p.cards["あ"]).toMatchObject({ interval: 1, due: t + 1, soon: now + SOON_MS });
    expect(queueAt(p, t, now + H).map((x) => x.k)).not.toContain("あ"); // too soon
    expect(queueAt(p, t, now + 4 * H).map((x) => x.k)).toContain("あ"); // second chance open
    gradeSign(p, "あ", "bien", t, now + 5 * H);
    expect(p.cards["あ"]).toMatchObject({ interval: 2, due: t + 2 });
    expect(p.cards["あ"].soon).toBeUndefined();
    gradeSign(p, "あ", "bien", t + 2, now + 50 * H); // then the usual path
    expect(p.cards["あ"].interval).toBe(3);
  });
  it("« Bof » at the second chance keeps tomorrow; « Raté » restarts", () => {
    const p = freshProfile(), t = 20776, now = Date.UTC(2026, 10, 19, 1);
    gradeSign(p, "い", "bien", t, now);
    gradeSign(p, "い", "bof", t, now + 5 * H);
    expect(p.cards["い"]).toMatchObject({ interval: 1, due: t + 1 });
    gradeSign(p, "う", "bien", t, now);
    gradeSign(p, "う", "rate", t, now + 5 * H);
    expect(p.cards["う"]).toMatchObject({ interval: 1, due: t + 1, soon: now + 9 * H });
  });
  it("tells when the next second chance opens", () => {
    const p = freshProfile(), t = 20776, now = Date.UTC(2026, 10, 19, 1);
    gradeSign(p, "あ", "bien", t, now);
    gradeSign(p, "い", "bien", t, now + 10 * 60e3);
    expect(nextSoon(p, t, now + H)).toEqual({ at: now + SOON_MS, n: 2 });
    expect(nextSoon(p, t, now + 5 * H)).toBeNull();
  });
});
