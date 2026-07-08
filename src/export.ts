// Export / import. Pure string functions (tested); the download helper is browser-only.
import { characterById, nextCharacterColor, uid } from "./model";
import type { CharacterT, Element, Lang, Play, SceneEl } from "./types";

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

/**
 * A clean `la-replique/1` document for handing to an AI (or re-importing): cues name
 * their speaker, ids/colours/timestamps are dropped, empty fields omitted. Round-trips
 * through fromJSON. Use this to revise an existing play with a model, then re-import.
 */
export function toAiJSON(play: Play): string {
  const nameOf = (id: string) => characterById(play, id)?.name ?? "?";

  const characters = play.characters.map((c) => {
    const o: Record<string, unknown> = { name: c.name };
    if (c.note) o.note = c.note;
    if (c.voiceId) o.voiceId = c.voiceId;
    return o;
  });

  const elements = play.elements.map((el): Record<string, unknown> => {
    switch (el.type) {
      case "act":
        return { type: "act", label: el.label };
      case "scene": {
        const o: Record<string, unknown> = { type: "scene", label: el.label };
        if (el.setting) o.setting = el.setting;
        if (el.synopsis) o.synopsis = el.synopsis;
        if (el.beat) o.beat = el.beat;
        return o;
      }
      case "stage": {
        const o: Record<string, unknown> = { type: "stage", text: el.text };
        if (el.alt) o.alt = el.alt;
        return o;
      }
      case "action":
        return { type: "action", text: el.text };
      case "cue": {
        const o: Record<string, unknown> = { type: "cue", character: nameOf(el.characterId), text: el.text };
        if (el.parenthetical) o.parenthetical = el.parenthetical;
        if (el.alt) o.alt = el.alt;
        return o;
      }
    }
  });

  const doc: Record<string, unknown> = { format: "la-replique/1", title: play.title, lang: play.lang };
  if (play.subtitle) doc.subtitle = play.subtitle;
  if (play.author) doc.author = play.author;
  if (play.altLang) doc.altLang = play.altLang;
  doc.characters = characters;
  doc.elements = elements;
  return JSON.stringify(doc, null, 2);
}

/** Parse and normalize an imported backup. Throws on anything unusable. */
export function fromJSON(text: string): Play {
  const data = JSON.parse(text);
  const raw = data?.play ?? data;
  if (!raw || typeof raw !== "object") throw new Error("Not a La Réplique document");
  if (!Array.isArray(raw.elements)) throw new Error("Missing elements");

  const lang: Lang = raw.lang === "en" ? "en" : "fr";

  // Characters may be listed explicitly (backup) or omitted (AI docs that name
  // speakers inline). Build lookup by id and by name; create on demand.
  const characters: CharacterT[] = [];
  const byId = new Map<string, CharacterT>();
  const byName = new Map<string, CharacterT>();
  const addChar = (c: CharacterT) => {
    characters.push(c);
    byId.set(c.id, c);
    byName.set(c.name.trim().toLowerCase(), c);
  };

  if (Array.isArray(raw.characters)) {
    for (const c of raw.characters) {
      const cc = c as Partial<CharacterT> & Record<string, unknown>;
      addChar({
        id: typeof cc.id === "string" ? cc.id : uid(),
        name: String(cc.name ?? "?"),
        color: typeof cc.color === "string" ? cc.color : nextCharacterColor(characters),
        note: typeof cc.note === "string" ? cc.note : undefined,
        voiceId: typeof cc.voiceId === "string" ? cc.voiceId : undefined,
      });
    }
  }

  // Resolve a cue's speaker to a character id. Backups carry a matching
  // characterId; AI docs carry a `character`/`speaker` NAME instead.
  const resolveSpeaker = (el: Record<string, unknown>): string => {
    const cid = typeof el.characterId === "string" ? el.characterId : "";
    if (cid && byId.has(cid)) return cid;
    const nameRef =
      typeof el.character === "string" ? el.character.trim() : typeof el.speaker === "string" ? el.speaker.trim() : "";
    if (nameRef) {
      const existing = byName.get(nameRef.toLowerCase());
      if (existing) return existing.id;
      const created: CharacterT = { id: uid(), name: nameRef.toUpperCase(), color: nextCharacterColor(characters) };
      addChar(created);
      return created.id;
    }
    return cid;
  };

  const elements: Element[] = [];
  for (const e of raw.elements) {
    const el = normalizeElement(e, resolveSpeaker);
    if (el) elements.push(el);
  }

  const now = Date.now();
  return {
    id: uid(), // a fresh id so import never clobbers an existing play
    title: String(raw.title ?? (lang === "fr" ? "Pièce importée" : "Imported play")),
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    author: typeof raw.author === "string" ? raw.author : "",
    lang,
    altLang: raw.altLang === "en" || raw.altLang === "fr" ? raw.altLang : undefined,
    characters,
    elements,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: now,
  };
}

function normalizeElement(e: unknown, resolveSpeaker: (el: Record<string, unknown>) => string): Element | null {
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
        characterId: resolveSpeaker(el),
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
