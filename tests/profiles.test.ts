import { describe, expect, it } from "vitest";
import { addProfile, deleteProfile, hasProfiles, nameError, renameProfile } from "../src/core/profiles";
import type { AppState } from "../src/core/types";

const empty = (): AppState => ({ active: "", profiles: {} });

describe("profiles", () => {
  it("a new device has no profile until one is created", () => {
    const s = empty();
    expect(hasProfiles(s)).toBe(false);
    expect(addProfile(s, "  Léa ")).toBeNull();
    expect(s.active).toBe("Léa");
    expect(hasProfiles(s)).toBe(true);
  });

  it("refuses empty, too long and duplicate names (case-insensitive)", () => {
    const s = empty();
    addProfile(s, "Léa");
    expect(nameError(s, "   ")).not.toBeNull();
    expect(nameError(s, "x".repeat(25))).not.toBeNull();
    expect(addProfile(s, "léa")).not.toBeNull();
    expect(Object.keys(s.profiles)).toEqual(["Léa"]);
  });

  it("renames in place and keeps the active profile", () => {
    const s = empty();
    addProfile(s, "Tom");
    addProfile(s, "Léa");
    s.profiles["Tom"].unlocked = 3;
    expect(renameProfile(s, "Tom", "Thomas")).toBeNull();
    expect(Object.keys(s.profiles)).toEqual(["Thomas", "Léa"]);
    expect(s.profiles["Thomas"].unlocked).toBe(3);
    expect(renameProfile(s, "Léa", "thomas")).not.toBeNull();
    expect(renameProfile(s, "Léa", "Léa")).toBeNull();
  });

  it("deleting the active profile switches to another, or to none", () => {
    const s = empty();
    addProfile(s, "Tom");
    addProfile(s, "Léa");
    deleteProfile(s, "Léa");
    expect(s.active).toBe("Tom");
    deleteProfile(s, "Tom");
    expect(s.active).toBe("");
    expect(hasProfiles(s)).toBe(false);
  });
});
