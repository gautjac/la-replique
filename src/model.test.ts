import { describe, it, expect } from "vitest";
import {
  actLabel,
  alternateSpeaker,
  castStats,
  cycleType,
  findCharacterByName,
  formatRuntime,
  makeElement,
  presenceGrid,
  roman,
  sceneLabel,
  sceneRange,
  sceneSpeakers,
  samplePlay,
} from "./model";
import type { CueEl, Play } from "./types";

describe("roman numerals", () => {
  it("maps common act numbers", () => {
    expect(roman(1)).toBe("I");
    expect(roman(4)).toBe("IV");
    expect(roman(9)).toBe("IX");
    expect(roman(12)).toBe("XII");
  });
  it("falls back outside range", () => {
    expect(roman(40)).toBe("40");
    expect(roman(0)).toBe("0");
  });
});

describe("labels are language-aware", () => {
  it("acts", () => {
    expect(actLabel(2, "fr")).toBe("ACTE II");
    expect(actLabel(2, "en")).toBe("ACT II");
  });
  it("scenes", () => {
    expect(sceneLabel(3, "fr")).toBe("SCÈNE 3");
    expect(sceneLabel(3, "en")).toBe("SCENE 3");
  });
});

describe("makeElement auto-numbers acts and scenes", () => {
  const play = samplePlay("fr"); // has one act, one scene
  it("next act continues the count", () => {
    const el = makeElement("act", play);
    expect(el.type).toBe("act");
    if (el.type === "act") expect(el.label).toBe("ACTE II");
  });
  it("next scene continues the count", () => {
    const el = makeElement("scene", play);
    if (el.type === "scene") expect(el.label).toBe("SCÈNE 2");
  });
  it("new cue inherits the last speaker", () => {
    const el = makeElement("cue", play);
    if (el.type === "cue") expect(play.characters.some((c) => c.id === el.characterId)).toBe(true);
  });
});

describe("cycleType", () => {
  it("cycles and wraps", () => {
    expect(cycleType("cue")).toBe("stage");
    expect(cycleType("stage")).toBe("scene");
    expect(cycleType("action")).toBe("cue");
  });
});

describe("castStats", () => {
  const play = samplePlay("fr");
  const stats = castStats(play);
  it("counts total lines across the cast", () => {
    expect(stats.totalLines).toBe(3); // sample has 3 cues (Bruno, Alice, Bruno)
  });
  it("attributes lines per character", () => {
    const bruno = stats.perCharacter.find((c) => c.character.name === "BRUNO");
    expect(bruno?.lines).toBe(2);
  });
  it("estimates a positive runtime", () => {
    expect(stats.runtimeMinutes).toBeGreaterThan(0);
  });
  it("counts one act and one scene", () => {
    expect(stats.actCount).toBe(1);
    expect(stats.sceneCount).toBe(1);
  });
});

describe("presenceGrid", () => {
  it("groups speakers by scene", () => {
    const play = samplePlay("en");
    const grid = presenceGrid(play);
    const withScene = grid.segments.filter((s) => s.scene);
    expect(withScene.length).toBe(1);
    expect(withScene[0].characterIds.size).toBe(2);
  });
});

describe("sceneRange", () => {
  const play: Play = {
    ...samplePlay("fr"),
  };
  it("returns the run for the containing scene", () => {
    // index 3 is inside SCÈNE 1 (act=0, scene=1, stage=2, cue=3…)
    const r = sceneRange(play, 4);
    expect(r.start).toBe(1); // the scene heading
    expect(r.end).toBe(play.elements.length);
  });
  it("handles empty plays", () => {
    const empty = { ...play, elements: [] };
    expect(sceneRange(empty, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("speaker helpers", () => {
  const play = samplePlay("fr"); // BRUNO + ALICE, one scene, cues B/A/B
  const aliceId = play.characters.find((c) => c.name === "ALICE")!.id;
  const brunoId = play.characters.find((c) => c.name === "BRUNO")!.id;

  it("findCharacterByName is case-insensitive", () => {
    expect(findCharacterByName(play, "alice")?.id).toBe(aliceId);
    expect(findCharacterByName(play, "  BRUNO ")?.id).toBe(brunoId);
    expect(findCharacterByName(play, "nobody")).toBeUndefined();
  });

  it("sceneSpeakers lists distinct speakers in order", () => {
    // first cue index in the fr sample is 3 (act, scene, stage, cue…)
    const speakers = sceneSpeakers(play, 3);
    expect(speakers).toEqual([brunoId, aliceId]); // Bruno speaks first
  });

  it("alternateSpeaker flips in a two-hander", () => {
    const brunoCueIdx = play.elements.findIndex((e) => e.type === "cue" && (e as CueEl).characterId === brunoId);
    expect(alternateSpeaker(play, brunoCueIdx)).toBe(aliceId);
  });

  it("alternateSpeaker returns null on non-cue or single-speaker scenes", () => {
    const stageIdx = play.elements.findIndex((e) => e.type === "stage");
    expect(alternateSpeaker(play, stageIdx)).toBeNull();

    const solo: Play = {
      ...play,
      elements: [
        { id: "s", type: "scene", label: "SCÈNE 1" },
        { id: "c", type: "cue", characterId: brunoId, text: "Seul en scène." },
      ],
    };
    expect(alternateSpeaker(solo, 1)).toBeNull();
  });
});

describe("formatRuntime", () => {
  it("handles sub-minute", () => {
    expect(formatRuntime(0.2, "fr")).toMatch(/moins/);
    expect(formatRuntime(0.2, "en")).toMatch(/under/);
  });
  it("formats hours", () => {
    expect(formatRuntime(95, "fr")).toBe("~1 h 35");
    expect(formatRuntime(95, "en")).toBe("~1h35");
  });
});
