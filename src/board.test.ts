import { describe, it, expect } from "vitest";
import { decompose, elementStats, recompose, samplePlay } from "./model";
import { addActAtEnd, addSceneAfter, moveBlock, moveBlockToIndex } from "./ops";
import type { Play, SceneEl } from "./types";

// A two-act play: ACT I / SCENE 1 (Bruno) / ACT II / SCENE 2 (Alice)
function twoActPlay(): Play {
  const base = samplePlay("fr");
  const [bruno, alice] = base.characters;
  return {
    ...base,
    elements: [
      { id: "a1", type: "act", label: "ACTE I" },
      { id: "s1", type: "scene", label: "SCÈNE 1", setting: "" },
      { id: "c1", type: "cue", characterId: bruno.id, text: "Un." },
      { id: "a2", type: "act", label: "ACTE II" },
      { id: "s2", type: "scene", label: "SCÈNE 2", setting: "" },
      { id: "c2", type: "cue", characterId: alice.id, text: "Deux." },
    ],
  };
}

describe("decompose / recompose", () => {
  it("round-trips the element list exactly", () => {
    const play = twoActPlay();
    const { preamble, blocks } = decompose(play);
    expect(recompose(preamble, blocks)).toEqual(play.elements);
  });

  it("groups a scene's body with its heading", () => {
    const play = twoActPlay();
    const { blocks } = decompose(play);
    // ACT I, SCENE 1 (+cue), ACT II, SCENE 2 (+cue) = 4 blocks
    expect(blocks.map((b) => b.kind)).toEqual(["act", "scene", "act", "scene"]);
    const scene1 = blocks.find((b) => b.id === "s1")!;
    expect(scene1.els.map((e) => e.id)).toEqual(["s1", "c1"]);
  });
});

describe("moveBlock", () => {
  it("moves a scene up past the act divider, carrying its lines", () => {
    const play = twoActPlay();
    // move SCENE 2 up one → swaps with ACT II
    const next = moveBlock(play, "s2", -1);
    expect(next.elements.map((e) => e.id)).toEqual(["a1", "s1", "c1", "s2", "c2", "a2"]);
    // the cue stayed attached to its scene
    const s2i = next.elements.findIndex((e) => e.id === "s2");
    expect(next.elements[s2i + 1].id).toBe("c2");
  });

  it("is a no-op at the edges", () => {
    const play = twoActPlay();
    expect(moveBlock(play, "a1", -1).elements).toEqual(play.elements);
  });
});

describe("moveBlockToIndex (drag)", () => {
  it("places a scene block before a target position", () => {
    const play = twoActPlay();
    // drag SCENE 2 block to index 0 (very top)
    const next = moveBlockToIndex(play, "s2", 0);
    expect(next.elements.slice(0, 2).map((e) => e.id)).toEqual(["s2", "c2"]);
  });
});

describe("addSceneAfter / addActAtEnd", () => {
  it("inserts a scene right after a given block", () => {
    const play = twoActPlay();
    const { play: next, id } = addSceneAfter(play, "a1"); // after ACT I heading → first scene of act I
    const ai = next.elements.findIndex((e) => e.id === "a1");
    expect(next.elements[ai + 1].id).toBe(id);
    expect(next.elements[ai + 1].type).toBe("scene");
  });

  it("appends a scene at the end when afterId is null", () => {
    const play = twoActPlay();
    const { play: next, id } = addSceneAfter(play, null);
    expect(next.elements[next.elements.length - 1].id).toBe(id);
  });

  it("adds an act at the very end", () => {
    const play = twoActPlay();
    const { play: next } = addActAtEnd(play);
    expect(next.elements[next.elements.length - 1].type).toBe("act");
  });
});

describe("elementStats per scene", () => {
  it("counts a scene's speakers, lines and words", () => {
    const play = twoActPlay();
    const { blocks } = decompose(play);
    const scene1 = blocks.find((b) => b.id === "s1")!;
    const s = elementStats(scene1.els);
    expect(s.lines).toBe(1);
    expect(s.words).toBe(1); // "Un."
    expect(s.speakerIds.length).toBe(1);
  });
});

describe("scene planning fields survive edits", () => {
  it("holds synopsis and beat on the scene element", () => {
    const play = twoActPlay();
    const scene: SceneEl = { id: "sX", type: "scene", label: "SCÈNE 3", synopsis: "elle avoue", beat: "turn" };
    const p2: Play = { ...play, elements: [...play.elements, scene] };
    const { blocks } = decompose(p2);
    const found = blocks.find((b) => b.id === "sX")!.els[0] as SceneEl;
    expect(found.synopsis).toBe("elle avoue");
    expect(found.beat).toBe("turn");
  });
});
