// Pure operations on a Play's element list. Each returns a new Play (updatedAt bumped).
import { actLabel, decompose, makeElement, recompose, sceneLabel, uid } from "./model";
import type { CueEl, Element, ElementType, Play, SceneEl } from "./types";

function withElements(play: Play, elements: Element[]): Play {
  return { ...play, elements, updatedAt: Date.now() };
}

/** Insert a fresh element of `type` after `index`. Returns the new play and the new id. */
export function insertAfter(play: Play, index: number, type: ElementType): { play: Play; id: string } {
  const el = makeElement(type, play);
  const elements = [...play.elements];
  elements.splice(index + 1, 0, el);
  return { play: withElements(play, elements), id: el.id };
}

export function updateElement(play: Play, id: string, patch: Partial<Element>): Play {
  const elements = play.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e));
  return withElements(play, elements);
}

export function removeElement(play: Play, id: string): Play {
  return withElements(
    play,
    play.elements.filter((e) => e.id !== id),
  );
}

export function moveElement(play: Play, id: string, dir: -1 | 1): Play {
  const i = play.elements.findIndex((e) => e.id === id);
  if (i < 0) return play;
  const j = i + dir;
  if (j < 0 || j >= play.elements.length) return play;
  const elements = [...play.elements];
  [elements[i], elements[j]] = [elements[j], elements[i]];
  return withElements(play, elements);
}

function textOf(el: Element): string {
  switch (el.type) {
    case "cue":
    case "stage":
    case "action":
      return el.text;
    case "scene":
    case "act":
      return el.label;
  }
}

/** Convert an element to another type, carrying its text where it makes sense. */
export function convertElement(play: Play, id: string, to: ElementType): Play {
  const idx = play.elements.findIndex((e) => e.id === id);
  if (idx < 0) return play;
  const src = play.elements[idx];
  if (src.type === to) return play;
  const text = textOf(src);

  let next: Element;
  switch (to) {
    case "cue": {
      const lastCue = play.elements
        .slice(0, idx)
        .reverse()
        .find((e) => e.type === "cue") as CueEl | undefined;
      const characterId = lastCue?.characterId ?? play.characters[0]?.id ?? "";
      next = { id, type: "cue", characterId, text, parenthetical: "" };
      break;
    }
    case "stage":
      next = { id, type: "stage", text };
      break;
    case "action":
      next = { id, type: "action", text };
      break;
    case "scene": {
      const n = play.elements.slice(0, idx).filter((e) => e.type === "scene").length + 1;
      next = { id, type: "scene", label: text || sceneLabel(n, play.lang), setting: "" };
      break;
    }
    case "act": {
      const n = play.elements.slice(0, idx).filter((e) => e.type === "act").length + 1;
      next = { id, type: "act", label: text || actLabel(n, play.lang) };
      break;
    }
  }
  const elements = [...play.elements];
  elements[idx] = next;
  return withElements(play, elements);
}

/** Insert a batch of new elements after `index` (used by AI "insert into scene"). */
export function insertElementsAfter(play: Play, index: number, els: Element[]): Play {
  const stamped = els.map((e) => ({ ...e, id: uid() }));
  const elements = [...play.elements];
  elements.splice(index + 1, 0, ...stamped);
  return withElements(play, elements);
}

// ————————————————————————————————————————————————————————————————
// Beat-board structure ops — reorder whole scene/act blocks.
// ————————————————————————————————————————————————————————————————

/** Move a block one step earlier (-1) or later (+1) in the structure. */
export function moveBlock(play: Play, blockId: string, dir: -1 | 1): Play {
  const { preamble, blocks } = decompose(play);
  const i = blocks.findIndex((b) => b.id === blockId);
  if (i < 0) return play;
  const j = i + dir;
  if (j < 0 || j >= blocks.length) return play;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return withElements(play, recompose(preamble, blocks));
}

/** Move a block to a target position (used by drag-and-drop). */
export function moveBlockToIndex(play: Play, blockId: string, targetIndex: number): Play {
  const { preamble, blocks } = decompose(play);
  const i = blocks.findIndex((b) => b.id === blockId);
  if (i < 0) return play;
  const [moved] = blocks.splice(i, 1);
  const clamped = Math.max(0, Math.min(targetIndex, blocks.length));
  blocks.splice(clamped, 0, moved);
  return withElements(play, recompose(preamble, blocks));
}

/** Insert a new empty scene after `afterBlockId` (or at the end when null). */
export function addSceneAfter(play: Play, afterBlockId: string | null): { play: Play; id: string } {
  const { preamble, blocks } = decompose(play);
  const sceneCount = blocks.filter((b) => b.kind === "scene").length;
  const heading: SceneEl = { id: uid(), type: "scene", label: sceneLabel(sceneCount + 1, play.lang), setting: "" };
  const block = { id: heading.id, kind: "scene" as const, els: [heading as Element] };
  const at = afterBlockId ? blocks.findIndex((b) => b.id === afterBlockId) : blocks.length - 1;
  blocks.splice(at + 1, 0, block);
  return { play: withElements(play, recompose(preamble, blocks)), id: heading.id };
}

/** Append a new act heading at the end. */
export function addActAtEnd(play: Play): { play: Play; id: string } {
  const n = play.elements.filter((e) => e.type === "act").length + 1;
  const el: Element = { id: uid(), type: "act", label: actLabel(n, play.lang) };
  return { play: withElements(play, [...play.elements, el]), id: el.id };
}

/** Remove a scene heading, keeping its lines (they merge into the previous scene). */
export function removeSceneHeading(play: Play, sceneId: string): Play {
  return withElements(
    play,
    play.elements.filter((e) => e.id !== sceneId),
  );
}

export function addCharacterTo(play: Play, character: Play["characters"][number]): Play {
  return { ...play, characters: [...play.characters, character], updatedAt: Date.now() };
}

export function updateCharacter(play: Play, id: string, patch: Partial<Play["characters"][number]>): Play {
  return {
    ...play,
    characters: play.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    updatedAt: Date.now(),
  };
}

/** Remove a character; their lines become unassigned (kept, never silently deleted). */
export function removeCharacter(play: Play, id: string): Play {
  const elements = play.elements.map((e) =>
    e.type === "cue" && e.characterId === id ? { ...e, characterId: "" } : e,
  );
  return {
    ...play,
    characters: play.characters.filter((c) => c.id !== id),
    elements,
    updatedAt: Date.now(),
  };
}
