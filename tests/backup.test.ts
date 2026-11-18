import { describe, it, expect, beforeEach } from "vitest";

const DAY = 86_400_000;
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
describe("backup reminder", () => {
  beforeEach(() => localStorage.clear());
  it("waits a week after first launch, only with progress, and can be snoozed", async () => {
    const store = await import("../src/core/store");
    const b = await import("../src/core/backup");
    const now = Date.now();
    expect(b.backupDue(now)).toBe(false); // first launch starts the clock
    store.addProfile("T");
    const p = store.state.profiles["T"];
    p.cards["あ"] = { seen: true, ease: 2.5, interval: 1, reps: 1, due: 0 };
    expect(b.backupDue(now + 3 * DAY)).toBe(false);
    expect(b.backupDue(now + 8 * DAY)).toBe(true);
    b.snoozeBackup(3, now + 8 * DAY);
    expect(b.backupDue(now + 9 * DAY)).toBe(false);
    expect(b.backupDue(now + 12 * DAY)).toBe(true);
    expect(b.everBackedUp()).toBe(false);
  });
});
