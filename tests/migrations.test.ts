import { describe, it, expect } from "vitest";
import { DATA_VERSION, migrate } from "../src/core/migrations";
import { exportState, readBackup } from "../src/core/store";
import type { AppState } from "../src/core/types";

const T = 20775;
const v1 = (): AppState =>
  JSON.parse(JSON.stringify({
    active: "Victor",
    profiles: { Victor: { cards: {}, unlocked: 2, settings: { newPerDay: 10, revCap: 60, showNums: true },
      days: { 20774: { nw: 5, rv: 0 }, 20775: { nw: 5, rv: 5, bonus: 5 }, 20776: { nw: 0, rv: 10, nwW: 3 } }, log: [], exams: [] } },
  }));

describe("data migrations", () => {
  it("v1 → current: activity after midnight joins the evening, nothing is lost", () => {
    const m = migrate(v1(), T);
    expect(m.from).toBe(1);
    expect(m.state.v).toBe(DATA_VERSION);
    const d = m.state.profiles.Victor.days;
    expect(d[20776]).toBeUndefined();
    expect(d[20775]).toEqual({ nw: 5, rv: 15, bonus: 5, nwW: 3 });
    expect(d[20774]).toEqual({ nw: 5, rv: 0 });
  });
  it("is idempotent: migrating current data changes nothing", () => {
    const a = migrate(v1(), T).state, b = JSON.parse(JSON.stringify(a));
    expect(migrate(b, T + 3).state).toEqual(a);
  });
  it("leaves data from a newer app untouched", () => {
    const s = { ...v1(), v: DATA_VERSION + 5 };
    const m = migrate(s, T);
    expect(m.newer).toBe(true);
    expect(m.state.profiles.Victor.days[20776]).toBeDefined();
  });
  it("fills fields an old backup may lack", () => {
    const s = v1();
    delete (s.profiles.Victor as Partial<typeof s.profiles.Victor>).exams;
    expect(migrate(s, T).state.profiles.Victor.exams).toEqual([]);
  });
});

describe("backups", () => {
  it("carry their format, date and app version, and read back", () => {
    const b = JSON.parse(exportState());
    expect(b.v).toBe(DATA_VERSION);
    expect(Date.parse(b.exportedAt)).toBeGreaterThan(Date.parse("2026-01-01"));
    expect(typeof b.appVersion).toBe("string");
    const r = readBackup(JSON.stringify({ ...v1(), exportedAt: "2026-11-18T12:03:00.000Z", appVersion: "0.9.0" }))!;
    expect(r.exportedAt).toBe("2026-11-18T12:03:00.000Z");
    expect("appVersion" in r.state).toBe(false);
    expect(r.state.v).toBe(DATA_VERSION);
  });
  it("refuse what is not a backup", () => {
    expect(readBackup("bonjour")).toBeNull();
    expect(readBackup('{"a":1}')).toBeNull();
  });
});

describe("2 → 3: small signs right after ya", () => {
  it("every line open stays open (the small signs open with ra and beyond)", () => {
    const mk = (u: number) => ({ cards: {}, unlocked: u, settings: { newPerDay: 5, revCap: 60, showNums: true }, days: {}, log: [], exams: [] });
    const s = { v: 2, active: "a", profiles: { a: mk(5), b: mk(8), c: mk(9), d: mk(16), e: mk(20) } } as unknown as AppState;
    migrate(s, 100);
    const u = Object.fromEntries(Object.entries(s.profiles).map(([k, p]) => [k, p.unlocked]));
    expect(u).toEqual({ a: 5, b: 8, c: 10, d: 16, e: 20 });
  });
});
