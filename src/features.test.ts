import { describe, it, expect } from "vitest";
import {
  doublingSuggestion,
  parseScript,
  throughLines,
  timelineSegments,
} from "./model";
import { fromJSON, linesDiff, toAiJSON, toSides, toSurtitles } from "./export";
import { applySurtitles, buildBundle } from "./translate";
import { samplePlay } from "./model";
import type { CueEl, Play } from "./types";

function fixture(): Play {
  const base = samplePlay("fr");
  const [alice, bruno] = base.characters; // samplePlay order is [ALICE, BRUNO]
  const carol = { id: "carol", name: "CAROL", color: "#10b981" };
  return {
    ...base,
    characters: [bruno, alice, carol],
    elements: [
      { id: "a1", type: "act", label: "ACTE I" },
      { id: "s1", type: "scene", label: "SCÈNE 1", setting: "Cuisine" },
      { id: "c1", type: "cue", characterId: bruno.id, text: "Un deux trois." },
      { id: "c1b", type: "cue", characterId: carol.id, text: "Oui." },
      { id: "a2", type: "act", label: "ACTE II" },
      { id: "s2", type: "scene", label: "SCÈNE 2", setting: "Rue" },
      { id: "c2", type: "cue", characterId: alice.id, text: "Quatre." },
      { id: "c2b", type: "cue", characterId: carol.id, text: "Non." },
    ],
  };
}

describe("timelineSegments", () => {
  it("one segment per scene with act labels and fractions summing to 1", () => {
    const play = fixture();
    const segs = timelineSegments(play);
    expect(segs.map((s) => s.label)).toEqual(["SCÈNE 1", "SCÈNE 2"]);
    expect(segs[0].actLabel).toBe("ACTE I");
    expect(segs[1].actLabel).toBe("ACTE II");
    const sum = segs.reduce((a, s) => a + s.fraction, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("throughLines", () => {
  it("counts each character's lines per scene", () => {
    const play = fixture();
    const { scenes, lines } = throughLines(play);
    expect(scenes.length).toBe(2);
    const bruno = lines.find((l) => l.character.name === "BRUNO")!;
    const carol = lines.find((l) => l.character.name === "CAROL")!;
    expect(bruno.perScene).toEqual([1, 0]);
    expect(carol.perScene).toEqual([1, 1]); // Carol is in both scenes
  });
});

describe("doublingSuggestion", () => {
  it("groups roles that never share a scene", () => {
    const play = fixture();
    const groups = doublingSuggestion(play);
    const names = (g: { characterIds: string[] }) =>
      g.characterIds.map((id) => play.characters.find((c) => c.id === id)!.name).sort();
    const all = groups.map(names);
    // Carol appears in both scenes → must be alone. Bruno + Alice never overlap → can double.
    expect(all.some((g) => g.length === 1 && g[0] === "CAROL")).toBe(true);
    expect(all.some((g) => g.join(",") === "ALICE,BRUNO")).toBe(true);
    expect(groups.length).toBe(2); // two actors cover three roles
  });
});

describe("parseScript", () => {
  it("parses NAME: line into cues, with parentheticals", () => {
    const { characters, elements } = parseScript("ALICE: Bonjour.\nBRUNO: (fâché) Va-t'en.", "fr");
    expect(characters.map((c) => c.name)).toEqual(["ALICE", "BRUNO"]);
    const cues = elements.filter((e) => e.type === "cue") as CueEl[];
    expect(cues.length).toBe(2);
    expect(cues[1].parenthetical).toBe("fâché");
    expect(cues[1].text).toBe("Va-t'en.");
    // an implicit scene heading is added when none is present
    expect(elements[0].type).toBe("scene");
  });

  it("recognises explicit scene headings and stage directions", () => {
    const { elements } = parseScript("SCÈNE 1\n(les lumières baissent)\nALICE: Ici.", "fr");
    expect(elements[0].type).toBe("scene");
    expect(elements[1].type).toBe("stage");
    expect(elements[2].type).toBe("cue");
  });
});

describe("toSides", () => {
  it("includes the character's lines and a cue-in", () => {
    const play = fixture();
    const bruno = play.characters.find((c) => c.name === "BRUNO")!;
    const sides = toSides(play, bruno.id);
    expect(sides).toContain("BRUNO");
    expect(sides).toContain("Un deux trois.");
  });
});

describe("surtitles", () => {
  it("applySurtitles attaches alt in place, keeping ids", () => {
    const play = fixture();
    const bundle = buildBundle(play).map((b) => ({ k: b.k, t: b.t.toUpperCase() }));
    const withAlt = applySurtitles(play, "en", bundle);
    expect(withAlt.altLang).toBe("en");
    const c1 = withAlt.elements.find((e) => e.id === "c1") as CueEl;
    expect(c1.alt).toBe("UN DEUX TROIS.");
    // original id preserved for alignment
    expect(withAlt.elements.map((e) => e.id)).toEqual(play.elements.map((e) => e.id));
  });

  it("toSurtitles numbers cues and includes alt", () => {
    const play = fixture();
    const bundle = buildBundle(play).map((b) => ({ k: b.k, t: "EN:" + b.t }));
    const sheet = toSurtitles(applySurtitles(play, "en", bundle));
    expect(sheet).toMatch(/1\. BRUNO/);
    expect(sheet).toContain("EN:Un deux trois.");
  });
});

describe("toAiJSON — clean export for AI round-trips", () => {
  const play = fixture();

  it("names the speaker instead of using ids, and omits empty fields", () => {
    const doc = JSON.parse(toAiJSON(play));
    const cue = doc.elements.find((e: { type: string }) => e.type === "cue");
    expect(cue.character).toBe("BRUNO"); // by NAME
    expect(cue.characterId).toBeUndefined();
    expect("parenthetical" in cue).toBe(false); // omitted when empty
    expect(doc.format).toBe("la-replique/1");
    // characters carry name (+ note), not color/id
    expect(doc.characters[0]).not.toHaveProperty("color");
    expect(doc.characters[0]).not.toHaveProperty("id");
  });

  it("round-trips through fromJSON (content + speaker links preserved)", () => {
    const back = fromJSON(toAiJSON(play));
    expect(back.title).toBe(play.title);
    expect(back.characters.map((c) => c.name).sort()).toEqual(play.characters.map((c) => c.name).sort());
    expect(back.elements.filter((e) => e.type === "cue")).toHaveLength(
      play.elements.filter((e) => e.type === "cue").length,
    );
    // a re-imported cue still resolves to a real character
    const cue = back.elements.find((e) => e.type === "cue") as CueEl;
    expect(back.characters.some((c) => c.id === cue.characterId)).toBe(true);
  });

  it("preserves scene setting and a beat tag on export", () => {
    const withBeat: Play = {
      ...play,
      elements: play.elements.map((e) => (e.type === "scene" ? { ...e, beat: "turn" as const, setting: "Cuisine" } : e)),
    };
    const doc = JSON.parse(toAiJSON(withBeat));
    const scene = doc.elements.find((e: { type: string }) => e.type === "scene");
    expect(scene.beat).toBe("turn");
    expect(scene.setting).toBe("Cuisine");
  });
});

describe("AI-friendly JSON import (fromJSON)", () => {
  it("links cues to characters by NAME and auto-creates missing ones", () => {
    const doc = JSON.stringify({
      lang: "fr",
      title: "Test",
      elements: [
        { type: "scene", label: "SCÈNE 1" },
        { type: "cue", character: "ALICE", text: "Bonjour." },
        { type: "cue", character: "BRUNO", parenthetical: "sec", text: "Salut." },
        { type: "cue", character: "ALICE", text: "Ça va ?" },
      ],
    });
    const play = fromJSON(doc);
    expect(play.characters.map((c) => c.name).sort()).toEqual(["ALICE", "BRUNO"]);
    const cues = play.elements.filter((e) => e.type === "cue") as CueEl[];
    // both ALICE cues resolve to the SAME character id
    expect(cues[0].characterId).toBe(cues[2].characterId);
    expect(cues[1].parenthetical).toBe("sec");
    // every cue is linked to a real character
    for (const c of cues) expect(play.characters.some((ch) => ch.id === c.characterId)).toBe(true);
  });

  it("honours an explicit characters list (by name) and gives them colours", () => {
    const doc = JSON.stringify({
      lang: "en",
      characters: [{ name: "MARIE", note: "the witness" }],
      elements: [{ type: "cue", character: "MARIE", text: "I saw it." }],
    });
    const play = fromJSON(doc);
    expect(play.characters).toHaveLength(1);
    expect(play.characters[0].note).toBe("the witness");
    expect(play.characters[0].color).toMatch(/^#/);
    expect((play.elements[0] as CueEl).characterId).toBe(play.characters[0].id);
  });

  it("accepts a minimal document", () => {
    const play = fromJSON('{ "lang": "en", "elements": [ { "type": "cue", "character": "A", "text": "Hi." } ] }');
    expect(play.characters.map((c) => c.name)).toEqual(["A"]);
    expect(play.elements.filter((e) => e.type === "cue")).toHaveLength(1);
  });

  it("preserves an explicit voiceId on a character", () => {
    const doc = JSON.stringify({
      lang: "fr",
      characters: [{ id: "x", name: "ALICE", color: "#4f7cff", voiceId: "voice-123" }],
      elements: [{ type: "cue", characterId: "x", text: "Allô." }],
    });
    const play = fromJSON(doc);
    expect(play.characters[0].voiceId).toBe("voice-123");
    expect((play.elements[0] as CueEl).characterId).toBe(play.characters[0].id);
  });
});

describe("linesDiff", () => {
  it("marks added and removed lines", () => {
    const diff = linesDiff("a\nb\nc", "a\nx\nc");
    expect(diff.find((d) => d.type === "del")?.text).toBe("b");
    expect(diff.find((d) => d.type === "add")?.text).toBe("x");
    expect(diff.filter((d) => d.type === "same").map((d) => d.text)).toEqual(["a", "c"]);
  });
});
