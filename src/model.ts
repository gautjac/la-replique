// Pure, framework-free helpers over the play model. Everything here is unit-tested.
import type {
  CharacterT,
  CueEl,
  Element,
  ElementType,
  Lang,
  Play,
  SceneEl,
} from "./types";
import { CAST_SWATCHES } from "./types";

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Roman numeral for act labels (1 → I). Falls back to the number past 39. */
export function roman(n: number): string {
  if (n < 1 || n > 39 || !Number.isInteger(n)) return String(n);
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let x = n;
  for (const [v, s] of map) {
    while (x >= v) {
      out += s;
      x -= v;
    }
  }
  return out;
}

const ACT_WORD: Record<Lang, string> = { fr: "ACTE", en: "ACT" };
const SCENE_WORD: Record<Lang, string> = { fr: "SCÈNE", en: "SCENE" };

export function actLabel(n: number, lang: Lang): string {
  return `${ACT_WORD[lang]} ${roman(n)}`;
}
export function sceneLabel(n: number, lang: Lang): string {
  return `${SCENE_WORD[lang]} ${n}`;
}

export function nextCharacterColor(chars: CharacterT[]): string {
  const used = new Set(chars.map((c) => c.color));
  return CAST_SWATCHES.find((c) => !used.has(c)) ?? CAST_SWATCHES[chars.length % CAST_SWATCHES.length];
}

export function makeCharacter(name: string, chars: CharacterT[]): CharacterT {
  return { id: uid(), name: name.trim(), color: nextCharacterColor(chars) };
}

/** Create a blank element of a given type (with sensible auto-labels for act/scene). */
export function makeElement(type: ElementType, play: Play): Element {
  switch (type) {
    case "act": {
      const n = play.elements.filter((e) => e.type === "act").length + 1;
      return { id: uid(), type: "act", label: actLabel(n, play.lang) };
    }
    case "scene": {
      const n = play.elements.filter((e) => e.type === "scene").length + 1;
      return { id: uid(), type: "scene", label: sceneLabel(n, play.lang), setting: "" };
    }
    case "stage":
      return { id: uid(), type: "stage", text: "" };
    case "action":
      return { id: uid(), type: "action", text: "" };
    case "cue": {
      const lastCue = [...play.elements].reverse().find((e) => e.type === "cue") as CueEl | undefined;
      const characterId = lastCue?.characterId ?? play.characters[0]?.id ?? "";
      return { id: uid(), type: "cue", characterId, text: "", parenthetical: "" };
    }
  }
}

/** Tab cycles the type of an empty element in a natural writing order. */
export function cycleType(current: ElementType): ElementType {
  const order: ElementType[] = ["cue", "stage", "scene", "act", "action"];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

export function characterById(play: Play, id: string): CharacterT | undefined {
  return play.characters.find((c) => c.id === id);
}

export function findCharacterByName(play: Play, name: string): CharacterT | undefined {
  const n = name.trim().toLowerCase();
  return play.characters.find((c) => c.name.trim().toLowerCase() === n);
}

/** Distinct speakers (character ids), in first-appearance order, within the scene at `atIndex`. */
export function sceneSpeakers(play: Play, atIndex: number): string[] {
  const els = sceneElements(play, atIndex);
  const seen: string[] = [];
  for (const e of els) {
    if (e.type === "cue" && e.characterId && !seen.includes(e.characterId)) seen.push(e.characterId);
  }
  return seen;
}

/**
 * When starting a new réplique after the cue at `atIndex`, the speaker to switch to.
 * In a two-speaker scene, returns the OTHER speaker (dialogue ping-pongs); otherwise
 * null, meaning "keep the inherited speaker".
 */
export function alternateSpeaker(play: Play, atIndex: number): string | null {
  const src = play.elements[atIndex];
  if (!src || src.type !== "cue" || !src.characterId) return null;
  const speakers = sceneSpeakers(play, atIndex);
  if (speakers.length === 2) return speakers.find((s) => s !== src.characterId) ?? null;
  return null;
}

export function countWords(s: string | undefined): number {
  if (!s) return 0;
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
const words = countWords;

/** Stats over an arbitrary run of elements — used per-scene on the beat board. */
export interface ElementStats {
  speakerIds: string[];
  lines: number;
  words: number;
  runtimeMinutes: number;
}
export function elementStats(els: Element[]): ElementStats {
  const speakerIds: string[] = [];
  let lines = 0;
  let w = 0;
  let stageDirs = 0;
  for (const e of els) {
    if (e.type === "cue") {
      lines += 1;
      w += countWords(e.text);
      if (e.characterId && !speakerIds.includes(e.characterId)) speakerIds.push(e.characterId);
    } else if (e.type === "stage") {
      stageDirs += 1;
    }
  }
  return { speakerIds, lines, words: w, runtimeMinutes: w / 140 + stageDirs * 0.08 };
}

/** A structural block: a single act heading, or a scene heading plus its body. */
export interface Block {
  id: string; // the act or scene heading element id
  kind: "act" | "scene";
  els: Element[]; // the heading and (for scenes) everything up to the next scene/act
}

/**
 * Split a play into its reorderable structure: any elements before the first
 * heading (preamble, pinned) and an ordered list of act/scene blocks.
 */
export function decompose(play: Play): { preamble: Element[]; blocks: Block[] } {
  const preamble: Element[] = [];
  const blocks: Block[] = [];
  let cur: Block | null = null;

  for (const el of play.elements) {
    if (el.type === "act") {
      if (cur) {
        blocks.push(cur);
        cur = null;
      }
      blocks.push({ id: el.id, kind: "act", els: [el] });
    } else if (el.type === "scene") {
      if (cur) blocks.push(cur);
      cur = { id: el.id, kind: "scene", els: [el] };
    } else if (cur) {
      cur.els.push(el);
    } else if (blocks.length > 0) {
      // loose element after an act heading but before the first scene — keep it with the act
      blocks[blocks.length - 1].els.push(el);
    } else {
      preamble.push(el);
    }
  }
  if (cur) blocks.push(cur);
  return { preamble, blocks };
}

export function recompose(preamble: Element[], blocks: Block[]): Element[] {
  return [...preamble, ...blocks.flatMap((b) => b.els)];
}

export interface CastStat {
  character: CharacterT;
  lines: number; // number of répliques
  words: number; // spoken words
  scenes: number; // scenes they appear in
}

/** Per-character line/word/scene counts, plus play totals. */
export function castStats(play: Play): {
  perCharacter: CastStat[];
  totalLines: number;
  totalSpokenWords: number;
  sceneCount: number;
  actCount: number;
  runtimeMinutes: number;
} {
  const grid = presenceGrid(play);
  const scenesByChar = new Map<string, number>();
  for (const seg of grid.segments) {
    for (const cid of seg.characterIds) {
      scenesByChar.set(cid, (scenesByChar.get(cid) ?? 0) + 1);
    }
  }

  const perCharacter: CastStat[] = play.characters.map((character) => {
    let lines = 0;
    let w = 0;
    for (const el of play.elements) {
      if (el.type === "cue" && el.characterId === character.id) {
        lines += 1;
        w += words(el.text);
      }
    }
    return { character, lines, words: w, scenes: scenesByChar.get(character.id) ?? 0 };
  });

  const totalLines = perCharacter.reduce((a, c) => a + c.lines, 0);
  const totalSpokenWords = perCharacter.reduce((a, c) => a + c.words, 0);
  const sceneCount = play.elements.filter((e) => e.type === "scene").length;
  const actCount = play.elements.filter((e) => e.type === "act").length;

  // Stage estimate: spoken dialogue ≈ 140 wpm; add a beat for each stage direction.
  const stageDirs = play.elements.filter((e) => e.type === "stage").length;
  const runtimeMinutes = totalSpokenWords / 140 + stageDirs * 0.08;

  return { perCharacter, totalLines, totalSpokenWords, sceneCount, actCount, runtimeMinutes };
}

export interface PresenceSegment {
  scene: SceneEl | null; // null = material before the first scene heading
  index: number;
  characterIds: Set<string>;
}

/** Which characters speak in each scene — the classic "grille de présence". */
export function presenceGrid(play: Play): { segments: PresenceSegment[] } {
  const segments: PresenceSegment[] = [];
  let current: PresenceSegment = { scene: null, index: 0, characterIds: new Set() };
  let started = false;

  for (const el of play.elements) {
    if (el.type === "scene") {
      if (started || current.characterIds.size > 0) segments.push(current);
      current = { scene: el, index: segments.length, characterIds: new Set() };
      started = true;
    } else if (el.type === "cue" && el.characterId) {
      current.characterIds.add(el.characterId);
    }
  }
  if (started || current.characterIds.size > 0) segments.push(current);
  return { segments };
}

/**
 * The contiguous run of elements belonging to the scene that contains `atIndex`:
 * from the scene heading at/just-before it through just before the next scene heading.
 * If there are no scene headings, returns the whole play.
 */
export function sceneRange(play: Play, atIndex: number): { start: number; end: number } {
  const els = play.elements;
  if (els.length === 0) return { start: 0, end: 0 };
  const clamped = Math.max(0, Math.min(atIndex, els.length - 1));
  let start = 0;
  for (let i = clamped; i >= 0; i--) {
    if (els[i].type === "scene") {
      start = i;
      break;
    }
  }
  let end = els.length;
  for (let i = start + 1; i < els.length; i++) {
    if (els[i].type === "scene") {
      end = i;
      break;
    }
  }
  return { start, end };
}

export function sceneElements(play: Play, atIndex: number): Element[] {
  const { start, end } = sceneRange(play, atIndex);
  return play.elements.slice(start, end);
}

export function formatRuntime(minutes: number, lang: Lang): string {
  if (minutes < 0.5) return lang === "fr" ? "moins d'une minute" : "under a minute";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return lang === "fr" ? `~${m} min` : `~${m} min`;
  return lang === "fr" ? `~${h} h ${m.toString().padStart(2, "0")}` : `~${h}h${m.toString().padStart(2, "0")}`;
}

export function touch(play: Play): Play {
  return { ...play, updatedAt: Date.now() };
}

export function blankPlay(lang: Lang): Play {
  const now = Date.now();
  return {
    id: uid(),
    title: lang === "fr" ? "Pièce sans titre" : "Untitled Play",
    subtitle: "",
    author: "",
    lang,
    characters: [],
    elements: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** A tiny bilingual sample so a first-time writer sees the form, not a void. */
export function samplePlay(lang: Lang): Play {
  const now = Date.now();
  const a: CharacterT = { id: uid(), name: lang === "fr" ? "ALICE" : "ALICE", color: CAST_SWATCHES[0], note: lang === "fr" ? "la sœur aînée" : "the older sister" };
  const b: CharacterT = { id: uid(), name: lang === "fr" ? "BRUNO" : "BRUNO", color: CAST_SWATCHES[3], note: lang === "fr" ? "revenu après dix ans" : "back after ten years" };

  const els: Element[] =
    lang === "fr"
      ? [
          { id: uid(), type: "act", label: "ACTE I" },
          { id: uid(), type: "scene", label: "SCÈNE 1", setting: "Une cuisine. Fin de soirée." },
          { id: uid(), type: "stage", text: "Alice essuie la même assiette depuis trop longtemps. On frappe. Elle n'ouvre pas." },
          { id: uid(), type: "cue", characterId: b.id, parenthetical: "derrière la porte", text: "Je sais que t'es là. La lumière est allumée." },
          { id: uid(), type: "cue", characterId: a.id, text: "La lumière est toujours allumée. Ça veut rien dire." },
          { id: uid(), type: "cue", characterId: b.id, text: "Dix ans, Alice. Ouvre la porte." },
          { id: uid(), type: "stage", text: "Un temps. Elle pose l'assiette." },
        ]
      : [
          { id: uid(), type: "act", label: "ACT I" },
          { id: uid(), type: "scene", label: "SCENE 1", setting: "A kitchen. Late evening." },
          { id: uid(), type: "stage", text: "Alice has been drying the same plate too long. A knock. She doesn't open." },
          { id: uid(), type: "cue", characterId: b.id, parenthetical: "behind the door", text: "I know you're in there. The light's on." },
          { id: uid(), type: "cue", characterId: a.id, text: "The light's always on. It doesn't mean anything." },
          { id: uid(), type: "cue", characterId: b.id, text: "Ten years, Alice. Open the door." },
          { id: uid(), type: "stage", text: "A beat. She sets the plate down." },
        ];

  return {
    id: uid(),
    title: lang === "fr" ? "La porte" : "The Door",
    subtitle: lang === "fr" ? "esquisse" : "a sketch",
    author: "",
    lang,
    characters: [a, b],
    elements: els,
    createdAt: now,
    updatedAt: now,
  };
}
