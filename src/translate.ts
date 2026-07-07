// Build a translation bundle from a play and re-apply the translated strings.
// Structure (acts/scenes/cues order, character ↔ line mapping) is preserved locally;
// only free text crosses to the model. Pure + tested.
import { actLabel, sceneLabel, uid } from "./model";
import type { Element, Lang, Play } from "./types";

export interface BundleItem {
  k: string; // "field" or "field:elementId"
  t: string;
}

/** Collect every translatable string as a keyed item. Empty strings are skipped. */
export function buildBundle(play: Play): BundleItem[] {
  const items: BundleItem[] = [];
  const push = (k: string, t: string | undefined) => {
    if (t && t.trim()) items.push({ k, t });
  };
  push("title", play.title);
  push("subtitle", play.subtitle);
  for (const c of play.characters) push(`cnote:${c.id}`, c.note);
  for (const el of play.elements) {
    switch (el.type) {
      case "scene":
        push(`setting:${el.id}`, el.setting);
        break;
      case "stage":
        push(`stage:${el.id}`, el.text);
        break;
      case "action":
        push(`action:${el.id}`, el.text);
        break;
      case "cue":
        push(`cue:${el.id}`, el.text);
        push(`paren:${el.id}`, el.parenthetical);
        break;
      // act/scene labels are regenerated in the target language, not translated
    }
  }
  return items;
}

/**
 * Produce a new translated play. Act/scene labels are relabeled in the target
 * language; character names are kept (proper nouns); everything else uses the map.
 * Any string the model didn't return falls back to the original — never dropped.
 */
export function applyBundle(play: Play, to: Lang, translated: BundleItem[]): Play {
  const map = new Map(translated.map((i) => [i.k, i.t]));
  const get = (k: string, fallback: string | undefined): string | undefined => map.get(k) ?? fallback;

  let actN = 0;
  let sceneN = 0;
  const elements: Element[] = play.elements.map((el): Element => {
    const id = uid();
    switch (el.type) {
      case "act":
        actN += 1;
        return { id, type: "act", label: actLabel(actN, to) };
      case "scene":
        sceneN += 1;
        return { id, type: "scene", label: sceneLabel(sceneN, to), setting: get(`setting:${el.id}`, el.setting) ?? "" };
      case "stage":
        return { id, type: "stage", text: get(`stage:${el.id}`, el.text) ?? "" };
      case "action":
        return { id, type: "action", text: get(`action:${el.id}`, el.text) ?? "" };
      case "cue":
        return {
          id,
          type: "cue",
          characterId: el.characterId,
          text: get(`cue:${el.id}`, el.text) ?? "",
          parenthetical: get(`paren:${el.id}`, el.parenthetical) ?? "",
        };
    }
  });

  const now = Date.now();
  const suffix = to === "fr" ? " (FR)" : " (EN)";
  return {
    id: uid(),
    title: (get("title", play.title) ?? play.title) + suffix,
    subtitle: get("subtitle", play.subtitle) ?? "",
    author: play.author,
    lang: to,
    characters: play.characters.map((c) => ({ ...c, id: c.id, note: get(`cnote:${c.id}`, c.note) })),
    elements,
    createdAt: now,
    updatedAt: now,
  };
}
