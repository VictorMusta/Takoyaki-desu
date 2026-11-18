import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import kana from "../src/data/kana.json" with { type: "json" };

// An advanced learner: hiragana known, katakana started, some words and activity.
const T = 20775;
const cards = Object.fromEntries((kana as { k: string }[]).slice(0, 90).map((x, i) => [x.k, { seen: true, ease: 2.5, interval: i % 5, reps: 2, due: i % 3 ? 99999 : 0 }]));
const STATE = {
  v: 2,
  active: "Prénom assez long",
  profiles: {
    "Prénom assez long": {
      cards, unlocked: 18, settings: { newPerDay: 10, revCap: 60, showNums: true, wordsPerDay: 3 },
      days: { [T - 1]: { nw: 5, rv: 20, ex: 12 }, [T - 2]: { nw: 3, rv: 8 } }, log: [], exams: [],
      words: { あめ: { seen: true, ease: 2.5, interval: 1, reps: 1, due: 0 } },
    },
  },
};

async function open(page: Page, state: unknown, hash = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.evaluate((s) => {
    localStorage.clear();
    if (s) localStorage.setItem("takoyaki-desu-v1", JSON.stringify(s));
    localStorage.setItem("takoyaki-backup", JSON.stringify({ last: Date.now(), done: true }));
    localStorage.setItem("takoyaki-seen-version", "99.0.0");
  }, state);
  await page.goto("./" + hash);
  await page.reload();
  return errors;
}

async function check(page: Page, errors: string[]) {
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  await page.waitForTimeout(700); // let the 400 ms fade-ins finish before measuring colours
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, "horizontal scroll").toBeLessThanOrEqual(0);
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  expect(errors).toEqual([]);
}

test("welcome screen", async ({ page }) => {
  const errors = await open(page, null);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await check(page, errors);
});

for (const hash of ["", "#progres", "#examen", "#reglages"]) {
  test(`screen ${hash || "#seance"}`, async ({ page }) => {
    const errors = await open(page, STATE, hash);
    await check(page, errors);
  });
}

test("a lesson runs through drawings, exercises and grades", async ({ page }) => {
  const errors = await open(page, STATE);
  await page.click("#go");
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(150);
    const st = page.locator("#st");
    if (await st.count()) {
      const b = (await st.boundingBox())!;
      await page.mouse.move(b.x + 30, b.y + 30);
      await page.mouse.down();
      await page.mouse.move(b.x + 90, b.y + 90, { steps: 8 });
      await page.mouse.up();
      if (await page.locator("#next").count()) await page.click("#next");
    } else if (await page.locator('[data-g="bof"]').count()) await page.click('[data-g="bof"]');
    else if (await page.locator(".drill-end button").count()) await page.click(".drill-end button");
    else if (await page.locator("#rj").count()) {
      await page.fill("#rj", "ame");
      await page.click("#chk");
    } else {
      const opt = page.locator(".drill button.btn:not([disabled]), [data-o]").first();
      if (await opt.count()) await opt.click();
    }
  }
  expect(errors).toEqual([]);
});
