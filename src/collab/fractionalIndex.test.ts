import { describe, expect, it } from "vitest";
import { between, spread } from "./fractionalIndex";

describe("fractionalIndex", () => {
  // Shared with the app's FractionalIndexTests.testVectors — keep them identical.
  it("mints the same keys as the app", () => {
    expect(between(null, null)).toBe("V");
    expect(between("V", null)).toBe("V00G");
    expect(between(null, "V")).toBe("Uzzk");
    expect(between("V", "W")).toBe("V7");
    expect(between("V", "V7")).toBe("V1");
    expect(between("V1", "V2")).toBe("V17");
    expect(between("A", "z")).toBe("G");
    expect(between("Az", "B")).toBe("Az7");
    expect(between("A", "A001")).toBe("A0007");
    expect(spread(3)).toEqual(["FV", "V1", "kV"]);
  });

  it("is always strictly between, never ends in 0, stays unique", () => {
    let seed = 42;
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
    const keys = [between(null, null)];
    for (let i = 0; i < 3000; i++) {
      const at = rand(keys.length + 1);
      const a = at > 0 ? keys[at - 1] : null;
      const b = at < keys.length ? keys[at] : null;
      const k = between(a, b);
      if (a) expect(a < k).toBe(true);
      if (b) expect(k < b).toBe(true);
      expect(k.endsWith("0")).toBe(false);
      keys.splice(at, 0, k);
    }
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps keys short for the playwright's two real patterns", () => {
    let last = between(null, null);
    for (let i = 0; i < 5000; i++) last = between(last, null);
    expect(last).toBe("VKoL"); // same value the app reaches
    let prev = "V";
    for (let i = 0; i < 300; i++) prev = between(prev, "W");
    expect(prev.length).toBeLessThanOrEqual(16);
  });

  it("spreads sorted, unique, with room between", () => {
    for (const n of [1, 2, 61, 1500, 20000]) {
      const keys = spread(n);
      expect(keys.length).toBe(n);
      expect([...keys].sort()).toEqual(keys);
      expect(new Set(keys).size).toBe(n);
      expect(keys.every((k) => !k.endsWith("0"))).toBe(true);
    }
  });
});
