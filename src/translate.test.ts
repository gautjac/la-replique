import { describe, it, expect } from "vitest";
import { applyBundle, buildBundle } from "./translate";
import { samplePlay } from "./model";
import type { CueEl, SceneEl } from "./types";

describe("buildBundle", () => {
  const play = samplePlay("fr");
  const bundle = buildBundle(play);
  it("includes the title and dialogue but not act/scene labels", () => {
    const keys = bundle.map((b) => b.k);
    expect(keys).toContain("title");
    expect(keys.some((k) => k.startsWith("cue:"))).toBe(true);
    expect(keys.some((k) => k.startsWith("act"))).toBe(false);
  });
  it("skips empty strings", () => {
    expect(bundle.every((b) => b.t.trim().length > 0)).toBe(true);
  });
});

describe("applyBundle", () => {
  const play = samplePlay("fr");
  const bundle = buildBundle(play);
  // Simulate a translation by uppercasing every value.
  const translated = bundle.map((b) => ({ k: b.k, t: b.t.toUpperCase() }));
  const out = applyBundle(play, "en", translated);

  it("relabels acts and scenes in the target language", () => {
    const scene = out.elements.find((e) => e.type === "scene") as SceneEl;
    expect(scene.label).toBe("SCENE 1");
    expect(out.lang).toBe("en");
  });
  it("applies translated dialogue", () => {
    const cue = out.elements.find((e) => e.type === "cue") as CueEl;
    expect(cue.text).toBe(cue.text.toUpperCase());
  });
  it("keeps character↔line mapping intact", () => {
    const origCue = play.elements.find((e) => e.type === "cue") as CueEl;
    const outCue = out.elements.find((e) => e.type === "cue") as CueEl;
    expect(outCue.characterId).toBe(origCue.characterId);
  });
  it("falls back to the original when a key is missing", () => {
    const partial = translated.filter((b) => !b.k.startsWith("cue:"));
    const out2 = applyBundle(play, "en", partial);
    const origCue = play.elements.find((e) => e.type === "cue") as CueEl;
    const outCue = out2.elements.find((e) => e.type === "cue") as CueEl;
    expect(outCue.text).toBe(origCue.text); // untranslated, but never dropped
  });
  it("marks the title with a language suffix", () => {
    expect(out.title.endsWith("(EN)")).toBe(true);
  });
});
