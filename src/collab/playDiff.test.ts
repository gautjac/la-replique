import { describe, expect, it } from "vitest";
import { compare, summary, type DocEl } from "./playDiff";

const el = (id: string, text: string, character = "A"): DocEl => ({ id, type: "cue", text, character });

describe("playDiff", () => {
  // Shared with the app's PlayDiffTests.testVectors.
  it("mints the same rows as the app", () => {
    const a = [el("1", "Un."), el("2", "Deux."), el("3", "Trois."), el("4", "Quatre.")];
    const b = [el("1", "Un."), el("3", "Trois."), el("2", "Deux, changé."), el("5", "Cinq.")];
    const rows = compare(a, b);
    expect(rows.map((r) => r.kind)).toEqual(["same", "moved", "changed", "removed", "added"]);
    expect(summary(rows)).toEqual({ added: 1, removed: 1, changed: 1, moved: 1 });
  });
  it("identical is all same; empty sides; speaker change is a change", () => {
    const a = [el("1", "Un."), el("2", "Deux.")];
    expect(compare(a, a).every((r) => r.kind === "same")).toBe(true);
    expect(summary(compare([], [el("1", "x")])).added).toBe(1);
    expect(summary(compare([el("1", "x")], [])).removed).toBe(1);
    expect(compare([el("1", "Un.", "A")], [el("1", "Un.", "B")])[0].kind).toBe("changed");
  });
});
