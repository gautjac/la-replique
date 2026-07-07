import { describe, it, expect } from "vitest";
import { fromJSON, slugify, toJSON, toPlainText } from "./export";
import { samplePlay } from "./model";

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("La Réplique — Été 76!")).toBe("la-replique-ete-76");
  });
  it("falls back for empty input", () => {
    expect(slugify("   ")).toBe("piece");
  });
});

describe("toPlainText", () => {
  const play = samplePlay("fr");
  const txt = toPlainText(play);
  it("opens with the uppercased title", () => {
    expect(txt.startsWith("LA PORTE")).toBe(true);
  });
  it("uppercases act and scene headings", () => {
    expect(txt).toContain("ACTE I");
    expect(txt).toContain("SCÈNE 1");
  });
  it("uppercases character cues with parentheticals", () => {
    expect(txt).toContain("BRUNO, derrière la porte");
  });
  it("indents stage directions", () => {
    expect(txt).toMatch(/\n {4}Alice essuie/);
  });
  it("never leaves 3+ blank lines", () => {
    expect(txt).not.toMatch(/\n{3,}/);
  });
});

describe("JSON round-trip", () => {
  it("survives export then import (content preserved, fresh id)", () => {
    const play = samplePlay("en");
    const restored = fromJSON(toJSON(play));
    expect(restored.title).toBe(play.title);
    expect(restored.characters.length).toBe(play.characters.length);
    expect(restored.elements.length).toBe(play.elements.length);
    expect(restored.id).not.toBe(play.id); // import never clobbers an existing play
  });
  it("rejects non-backups", () => {
    expect(() => fromJSON("{}")).toThrow();
    expect(() => fromJSON('{"nope":1}')).toThrow();
  });
  it("drops unknown element types instead of crashing", () => {
    const bad = JSON.stringify({ play: { title: "x", characters: [], elements: [{ type: "weird" }, { type: "stage", text: "ok" }] } });
    const p = fromJSON(bad);
    expect(p.elements.length).toBe(1);
    expect(p.elements[0].type).toBe("stage");
  });
});
