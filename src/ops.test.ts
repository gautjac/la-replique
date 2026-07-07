import { describe, it, expect } from "vitest";
import { samplePlay } from "./model";
import {
  convertElement,
  insertAfter,
  moveElement,
  removeCharacter,
  removeElement,
  updateElement,
} from "./ops";
import type { CueEl, StageEl } from "./types";

describe("insertAfter", () => {
  it("inserts a new element right after the index and returns its id", () => {
    const play = samplePlay("fr");
    const before = play.elements.length;
    const { play: next, id } = insertAfter(play, 0, "cue");
    expect(next.elements.length).toBe(before + 1);
    expect(next.elements[1].id).toBe(id);
    expect(next.elements[1].type).toBe("cue");
  });
});

describe("convertElement carries text across types", () => {
  it("cue → stage keeps the words", () => {
    const play = samplePlay("fr");
    const cue = play.elements.find((e) => e.type === "cue") as CueEl;
    const next = convertElement(play, cue.id, "stage");
    const conv = next.elements.find((e) => e.id === cue.id) as StageEl;
    expect(conv.type).toBe("stage");
    expect(conv.text).toBe(cue.text);
  });
  it("stage → cue assigns the previous speaker", () => {
    const play = samplePlay("fr");
    const stage = play.elements.find((e) => e.type === "stage")!;
    const next = convertElement(play, stage.id, "cue");
    const conv = next.elements.find((e) => e.id === stage.id) as CueEl;
    expect(conv.type).toBe("cue");
    expect(conv.characterId).toBeTruthy();
  });
});

describe("removeCharacter keeps their lines", () => {
  it("unassigns rather than deleting cues", () => {
    const play = samplePlay("fr");
    const before = play.elements.filter((e) => e.type === "cue").length;
    const victim = play.characters[0];
    const next = removeCharacter(play, victim.id);
    const after = next.elements.filter((e) => e.type === "cue").length;
    expect(after).toBe(before); // no lines lost
    expect(next.characters.find((c) => c.id === victim.id)).toBeUndefined();
    const orphaned = next.elements.filter((e) => e.type === "cue" && e.characterId === "");
    expect(orphaned.length).toBeGreaterThan(0);
  });
});

describe("moveElement and removeElement", () => {
  it("swaps neighbours", () => {
    const play = samplePlay("fr");
    const first = play.elements[0].id;
    const next = moveElement(play, first, 1);
    expect(next.elements[1].id).toBe(first);
  });
  it("clamps at the edges", () => {
    const play = samplePlay("fr");
    const first = play.elements[0].id;
    expect(moveElement(play, first, -1).elements[0].id).toBe(first);
  });
  it("removes by id", () => {
    const play = samplePlay("fr");
    const id = play.elements[2].id;
    const next = removeElement(play, id);
    expect(next.elements.find((e) => e.id === id)).toBeUndefined();
  });
  it("updateElement patches in place", () => {
    const play = samplePlay("fr");
    const cue = play.elements.find((e) => e.type === "cue") as CueEl;
    const next = updateElement(play, cue.id, { text: "changed" } as Partial<CueEl>);
    const patched = next.elements.find((e) => e.id === cue.id) as CueEl;
    expect(patched.text).toBe("changed");
  });
});
