// La Réplique — domain model for a stage play.
// A play is a flat, ordered list of typed elements (like a prompt-book), plus a cast.

export type Lang = "fr" | "en";

export type ElementType = "act" | "scene" | "stage" | "cue" | "action";

export interface CharacterT {
  id: string;
  name: string;
  color: string; // hex, from the cast swatch palette
  note?: string; // short description / who they are
}

interface BaseEl {
  id: string;
  type: ElementType;
}

/** ACTE I — a top-level division. */
export interface ActEl extends BaseEl {
  type: "act";
  label: string;
}

/** A dramaturgical function a scene can carry on the beat board. */
export type BeatKind = "setup" | "inciting" | "rising" | "turn" | "crisis" | "climax" | "resolution";

/** SCÈNE 1 — a scene heading, optionally with a place/time (le lieu). */
export interface SceneEl extends BaseEl {
  type: "scene";
  label: string;
  setting?: string;
  /** Beat-board planning note: what this scene does. Never exported into the script. */
  synopsis?: string;
  /** Beat-board structural tag. */
  beat?: BeatKind;
}

/** Didascalie — a stage direction. */
export interface StageEl extends BaseEl {
  type: "stage";
  text: string;
}

/** Réplique — a character's spoken line, with an optional inline parenthetical (jeu). */
export interface CueEl extends BaseEl {
  type: "cue";
  characterId: string;
  parenthetical?: string;
  text: string;
}

/** Action/narration that isn't a bracketed stage direction (used rarely). */
export interface ActionEl extends BaseEl {
  type: "action";
  text: string;
}

export type Element = ActEl | SceneEl | StageEl | CueEl | ActionEl;

export interface Play {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  lang: Lang; // the primary language the play is written in
  characters: CharacterT[];
  elements: Element[];
  createdAt: number;
  updatedAt: number;
}

export const CAST_SWATCHES = [
  "#4f7cff", // gel
  "#0ea5b7", // cyan
  "#10b981", // jade
  "#8b5cf6", // plum
  "#f43f5e", // rose
  "#64748b", // slate
  "#d97706", // amber
  "#3f7d5c", // pine
  "#4f46e5", // indigo
  "#fb7185", // coral
] as const;
