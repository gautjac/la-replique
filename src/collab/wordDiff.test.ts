import { describe, expect, it } from "vitest";
import { wordDiff } from "./wordDiff";

const flat = (a: string, b: string) => wordDiff(a, b).map((s) => ({ same: "=", removed: "-", inserted: "+" })[s.kind] + s.text);

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
  it("is empty for two empty texts and round-trips both sides", () => {
    expect(wordDiff("", "")).toEqual([]);
    const a = "C'est moi Maggie, la Star de l'île…", b = "C'est moi Maggie, la vraie Star de l'île !";
    const segs = wordDiff(a, b);
    expect(segs.filter((s) => s.kind !== "inserted").map((s) => s.text).join("")).toBe(a);
    expect(segs.filter((s) => s.kind !== "removed").map((s) => s.text).join("")).toBe(b);
  });
});
