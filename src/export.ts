// Export / import. Pure string functions (tested); the download helper is browser-only.
import { characterById, uid } from "./model";
import type { CharacterT, Element, Play, SceneEl } from "./types";

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
    case "scene": {
      const beat = el.beat;
      const validBeat =
        typeof beat === "string" && ["setup", "inciting", "rising", "turn", "crisis", "climax", "resolution"].includes(beat);
      return {
        id,
        type: "scene",
        label: String(el.label ?? ""),
        setting: typeof el.setting === "string" ? el.setting : "",
        synopsis: typeof el.synopsis === "string" ? el.synopsis : undefined,
        beat: validBeat ? (beat as SceneEl["beat"]) : undefined,
      };
    }
    case "stage":
      return { id, type: "stage", text: String(el.text ?? ""), alt: typeof el.alt === "string" ? el.alt : undefined };
    case "action":
      return { id, type: "action", text: String(el.text ?? "") };
    case "cue":
      return {
        id,
        type: "cue",
        characterId: String(el.characterId ?? ""),
        parenthetical: typeof el.parenthetical === "string" ? el.parenthetical : "",
        text: String(el.text ?? ""),
        alt: typeof el.alt === "string" ? el.alt : undefined,
      };
    default:
      return null;
  }
}

/** Per-character "sides": their scenes, their lines in full, with cue-ins. */
export function toSides(play: Play, characterId: string): string {
  const char = characterById(play, characterId);
  const out: string[] = [];
  out.push(`${play.lang === "fr" ? "CÔTÉ" : "SIDES"} — ${(char?.name ?? "?").toUpperCase()}`);
  out.push(play.title.toUpperCase());
  out.push("");

  const els = play.elements;
  // group into scenes
  let sceneHeader = "";
  let printedHeaderFor = "";
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (el.type === "act" || el.type === "scene") {
      sceneHeader = el.type === "scene" ? el.label + (el.setting ? ` — ${el.setting}` : "") : el.label;
      continue;
    }
    if (el.type === "cue" && el.characterId === characterId) {
      if (sceneHeader && printedHeaderFor !== sceneHeader) {
        out.push("");
        out.push(sceneHeader.toUpperCase());
        out.push("");
        printedHeaderFor = sceneHeader;
      }
      // cue-in: the previous cue (a different speaker), last sentence only
      const prev = [...els.slice(0, i)].reverse().find((e) => e.type === "cue");
      if (prev && prev.type === "cue" && prev.characterId !== characterId) {
        const pc = characterById(play, prev.characterId);
        const cueIn = lastSentence(prev.text);
        out.push(`   …${(pc?.name ?? "?").toUpperCase()}: ${cueIn}`);
      }
      const head = el.parenthetical ? `${(char?.name ?? "?").toUpperCase()}, ${el.parenthetical}` : (char?.name ?? "?").toUpperCase();
      out.push(head);
      out.push(el.text);
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function lastSentence(s: string): string {
  const parts = s.trim().split(/(?<=[.!?…])\s+/);
  return parts[parts.length - 1] || s.trim();
}

/** Numbered bilingual surtitle cue sheet (the conduite an operator advances by hand). */
export function toSurtitles(play: Play): string {
  const out: string[] = [];
  out.push(`${play.title.toUpperCase()} — ${play.lang.toUpperCase()}${play.altLang ? " / " + play.altLang.toUpperCase() : ""}`);
  out.push("");
  let n = 0;
  for (const el of play.elements) {
    if (el.type === "cue") {
      n += 1;
      const c = characterById(play, el.characterId);
      out.push(`${n}. ${(c?.name ?? "?").toUpperCase()}`);
      out.push(el.text);
      if (el.alt) out.push(el.alt);
      out.push("");
    } else if (el.type === "scene") {
      out.push(`— ${el.label} —`);
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

/** A simple LCS line diff between two script renderings (for version compare). */
export function linesDiff(aText: string, bText: string): DiffLine[] {
  const a = aText.split("\n");
  const b = bText.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
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
