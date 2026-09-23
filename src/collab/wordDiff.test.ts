import { describe, expect, it } from "vitest";
import { focus, hasChange, lines, wordDiff, type Focused, type Segment } from "./wordDiff";

const flatSeg = (s: Segment) => ({ same: "=", removed: "-", inserted: "+" })[s.kind] + s.text;
const flat = (a: string, b: string) => wordDiff(a, b).map(flatSeg);
const focused = (a: string, b: string) => focus(lines(wordDiff(a, b))).map((f: Focused) => f === "gap" ? "⋯" : f.segments.map(flatSeg).join(""));

describe("wordDiff", () => {
  // Shared with the app's WordDiffTests.testVectors.
  it("mints the same segments as the app", () => {
    expect(flat("Les plus bavards sont silencieux…", "Les plus bavards sont muets…")).toEqual(["=Les plus bavards sont ", "-silencieux…", "+muets…"]);
    expect(flat("Un deux trois", "Un deux trois")).toEqual(["=Un deux trois"]);
    expect(flat("", "Bonjour")).toEqual(["+Bonjour"]);
    expect(flat("Bonjour", "")).toEqual(["-Bonjour"]);
    expect(flat("a b c", "a X b c")).toEqual(["=a ", "+X ", "=b c"]);
    expect(flat("Ouvre la porte.", "Ferme la fenêtre.")).toEqual(["-Ouvre", "+Ferme", "= la ", "-porte.", "+fenêtre."]);
    expect(flat("Ligne un\nLigne deux", "Ligne un\nLigne trois")).toEqual(["=Ligne un\nLigne ", "-deux", "+trois"]);
  });
  // Shared with the app's WordDiffTests.testLineVectors.
  it("mints the same verses, newline marks and focus as the app", () => {
    expect(focused("L1\nL2\nL3\nL4\nL5\nL6", "L1\nL2\nL3\nL4\nL5\nL6 changé")).toEqual(["⋯", "=L5", "=L6+ changé"]);
    expect(focused("A\nB", "A\n\nB")).toEqual(["=A", "+↵", "=B"]);
    expect(focused("A\nB", "A B")).toEqual(["=A-↵+ =B"]);
    expect(focused("L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8", "L1\nL2 x\nL3\nL4\nL5\nL6\nL7\nL8 y")).toEqual(["=L1", "=L2+ x", "=L3", "⋯", "=L7", "=L8+ y"]);
    expect(focused("L1\nL2\nL3\nL4\nL5\nL6", "L1\nL2\nL3\nL4\nL5\nL6")).toEqual(["=L1", "=L2", "=L3", "=L4", "=L5", "=L6"]);
  });
  it("is empty for two empty texts, knows when nothing changed, and round-trips both sides", () => {
    expect(wordDiff("", "")).toEqual([]);
    expect(hasChange("a", "b")).toBe(true);
    expect(hasChange("même", "même")).toBe(false);
    const a = "C'est moi Maggie, la Star de l'île…", b = "C'est moi Maggie, la vraie Star de l'île !";
    const segs = wordDiff(a, b);
    expect(segs.filter((s) => s.kind !== "inserted").map((s) => s.text).join("")).toBe(a);
    expect(segs.filter((s) => s.kind !== "removed").map((s) => s.text).join("")).toBe(b);
  });
});
