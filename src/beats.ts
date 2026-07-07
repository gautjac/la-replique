// The dramaturgical beats a scene card can be tagged with, in narrative order.
// Colours are cool-leaning and distinct from the cast swatches.
import type { BeatKind } from "./types";
import type { Locale } from "./i18n";

export interface BeatDef {
  key: BeatKind;
  fr: string;
  en: string;
  color: string;
}

export const BEATS: BeatDef[] = [
  { key: "setup", fr: "Exposition", en: "Setup", color: "#64748b" },
  { key: "inciting", fr: "Élément déclencheur", en: "Inciting", color: "#0ea5b7" },
  { key: "rising", fr: "Montée", en: "Rising", color: "#4f7cff" },
  { key: "turn", fr: "Pivot", en: "Turn", color: "#8b5cf6" },
  { key: "crisis", fr: "Crise", en: "Crisis", color: "#d97706" },
  { key: "climax", fr: "Point culminant", en: "Climax", color: "#f43f5e" },
  { key: "resolution", fr: "Dénouement", en: "Resolution", color: "#10b981" },
];

export function beatDef(key: BeatKind | undefined): BeatDef | undefined {
  return key ? BEATS.find((b) => b.key === key) : undefined;
}

export function beatLabel(key: BeatKind, locale: Locale): string {
  const d = beatDef(key);
  return d ? d[locale] : key;
}
