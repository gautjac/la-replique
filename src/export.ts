// Export / import. Pure string functions (tested); the download helper is browser-only.
import { characterById, uid } from "./model";
import type { CharacterT, Element, Play } from "./types";

export function slugify(s: string): string {
  const base = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "piece";
}

/** Render a play as a clean, readable stage script in plain text. */
export function toPlainText(play: Play): string {
  const head: string[] = [];
  head.push(play.title.toUpperCase());
  if (play.subtitle) head.push(play.subtitle);
  if (play.author) head.push((play.lang === "fr" ? "de " : "by ") + play.author);
  head.push("");
  head.push("");
  const body = elementsToScript(play, play.elements);
  return (head.join("\n") + body).replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Render a subset of elements as script text (used for exports and AI context). */
export function elementsToScript(play: Play, els: Element[]): string {
  const out: string[] = [];
  for (const el of els) {
    switch (el.type) {
      case "act":
        out.push("");
        out.push(el.label.toUpperCase());
        out.push("");
        break;
      case "scene":
        out.push("");
        out.push(el.label.toUpperCase());
        if (el.setting) out.push(el.setting);
        out.push("");
        break;
      case "stage":
        out.push(indent(el.text));
        out.push("");
        break;
      case "action":
        out.push(el.text);
        out.push("");
        break;
      case "cue": {
        const c = characterById(play, el.characterId);
        const name = (c?.name ?? "?").toUpperCase();
        const headline = el.parenthetical ? `${name}, ${el.parenthetical}` : name;
        out.push(headline);
        out.push(el.text);
        out.push("");
        break;
      }
    }
  }
  return out.join("\n");
}

function indent(s: string): string {
  return s
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
}

export function toJSON(play: Play): string {
  return JSON.stringify({ format: "la-replique/1", play }, null, 2);
}

/** Parse and normalize an imported backup. Throws on anything unusable. */
export function fromJSON(text: string): Play {
  const data = JSON.parse(text);
  const raw = data?.play ?? data;
  if (!raw || typeof raw !== "object") throw new Error("Not a La Réplique backup");
  if (!Array.isArray(raw.elements) || !Array.isArray(raw.characters)) {
    throw new Error("Missing elements or characters");
  }

  const characters: CharacterT[] = raw.characters.map((c: unknown) => {
    const cc = c as Partial<CharacterT>;
    return {
      id: typeof cc.id === "string" ? cc.id : uid(),
      name: String(cc.name ?? "?"),
      color: typeof cc.color === "string" ? cc.color : "#4f7cff",
      note: typeof cc.note === "string" ? cc.note : undefined,
    };
  });

  const elements: Element[] = raw.elements
    .map((e: unknown) => normalizeElement(e))
    .filter((e: Element | null): e is Element => e !== null);

  const now = Date.now();
  const lang = raw.lang === "en" ? "en" : "fr";
  return {
    id: uid(), // a fresh id so import never clobbers an existing play
    title: String(raw.title ?? (lang === "fr" ? "Pièce importée" : "Imported play")),
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    author: typeof raw.author === "string" ? raw.author : "",
    lang,
    characters,
    elements,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: now,
  };
}

function normalizeElement(e: unknown): Element | null {
  const el = e as Record<string, unknown>;
  const id = typeof el.id === "string" ? el.id : uid();
  switch (el.type) {
    case "act":
      return { id, type: "act", label: String(el.label ?? "") };
    case "scene":
      return { id, type: "scene", label: String(el.label ?? ""), setting: typeof el.setting === "string" ? el.setting : "" };
    case "stage":
      return { id, type: "stage", text: String(el.text ?? "") };
    case "action":
      return { id, type: "action", text: String(el.text ?? "") };
    case "cue":
      return {
        id,
        type: "cue",
        characterId: String(el.characterId ?? ""),
        parenthetical: typeof el.parenthetical === "string" ? el.parenthetical : "",
        text: String(el.text ?? ""),
      };
    default:
      return null;
  }
}

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
