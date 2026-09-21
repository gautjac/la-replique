// The sync engine's heart, web side — the twin of the app's
// `Sources/Collab/CollabCore.swift`. Same rules, same tests, same wire format:
//
//   flushLocal(play)            local play ─diff vs shadow→ ops to send
//   applyRemote(play, changes)  changes from others ─→ a new play (+ my pending ops)
//
// `shadow` is the last state both sides agreed on, per entity and per field, so
// every merge is three-way. Different fields of one line both win; the same
// field is last-writer-wins; delete beats edit.
//
// Here a play is an immutable value (React state), so both calls are pure with
// respect to the play: they take one and hand back another.
import { between, spread } from "./fractionalIndex";
import type { CharacterT, Element, Lang, Play } from "../types";

export type Kind = "info" | "character" | "element";
export interface Ref { kind: Kind; id: string }
export type Fields = Record<string, string>;

export type Op =
  | { t: "put"; ref: Ref; fields: Fields }
  /** Must FAIL on a missing document, never resurrect it: delete beats edit. */
  | { t: "patch"; ref: Ref; set: Fields; unset: string[] }
  | { t: "delete"; ref: Ref };

/** Server state overlaid with this client's own pending writes, in server order. */
export type Change = { t: "upsert"; ref: Ref; fields: Fields } | { t: "removed"; ref: Ref };

export const INFO: Ref = { kind: "info", id: "info" };
export const keyOf = (r: Ref): string => `${r.kind}:${r.id}`;
const refOf = (k: string): Ref => ({ kind: k.slice(0, k.indexOf(":")) as Kind, id: k.slice(k.indexOf(":") + 1) });

const REBALANCE_AT = 40;
/** Fields the app keeps that the web play doesn't model — carried through untouched. */
const PASSTHROUGH: Record<Kind, string[]> = { info: ["logline"], character: [], element: [] };

// MARK: object ⇄ fields (names match the app's CollabField exactly)

function infoFields(p: Play): Fields {
  const f: Fields = { title: p.title, subtitle: p.subtitle ?? "", author: p.author, lang: p.lang };
  if (p.altLang) f.altLang = p.altLang;
  return f;
}
function characterFields(c: CharacterT, index: number): Fields {
  const f: Fields = { name: c.name, color: c.color, order: String(index) };
  if (c.note !== undefined) f.note = c.note;
  if (c.voiceId !== undefined) f.voiceID = c.voiceId;
  return f;
}
function elementFields(e: Element): Fields {
  const f: Fields = { kind: e.type };
  const put = (k: string, v: string | undefined) => { if (v !== undefined) f[k] = v; };
  switch (e.type) {
    case "act": put("label", e.label); break;
    case "scene": put("label", e.label); put("setting", e.setting); put("synopsis", e.synopsis); put("beat", e.beat); break;
    case "stage": put("text", e.text); put("alt", e.alt); break;
    case "action": put("text", e.text); break;
    case "cue": put("characterID", e.characterId); put("text", e.text); put("parenthetical", e.parenthetical); put("alt", e.alt); break;
  }
  return f;
}
function elementFrom(id: string, f: Fields): Element {
  switch (f.kind) {
    case "act": return { id, type: "act", label: f.label ?? "" };
    case "scene": return { id, type: "scene", label: f.label ?? "", setting: f.setting, synopsis: f.synopsis, beat: f.beat as never };
    case "stage": return { id, type: "stage", text: f.text ?? "", alt: f.alt };
    case "action": return { id, type: "action", text: f.text ?? "" };
    default: return { id, type: "cue", characterId: f.characterID ?? "", text: f.text ?? "", parenthetical: f.parenthetical, alt: f.alt };
  }
}
function characterFrom(id: string, f: Fields): CharacterT {
  return { id, name: f.name ?? "", color: f.color ?? "#4f7cff", note: f.note, voiceId: f.voiceID };
}

const same = (a: Fields | undefined, b: Fields): boolean => {
  if (!a) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && kb.every((k) => a[k] === b[k]);
};

/** Indices of the longest strictly increasing run of the non-null keys. */
export function longestIncreasingRun(keys: (string | null)[]): Set<number> {
  const tails: number[] = [];
  const back = new Array<number>(keys.length).fill(-1);
  keys.forEach((k, i) => {
    if (k === null) return;
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if ((keys[tails[mid]] as string) < k) lo = mid + 1; else hi = mid; }
    back[i] = lo > 0 ? tails[lo - 1] : -1;
    if (lo === tails.length) tails.push(i); else tails[lo] = i;
  });
  const out = new Set<number>();
  for (let at = tails.length ? tails[tails.length - 1] : -1; at >= 0; at = back[at]) out.add(at);
  return out;
}

export class CollabCore {
  shadow: Map<string, Fields>;

  constructor(saved?: string | null) {
    this.shadow = new Map();
    if (saved) try { for (const [k, f] of JSON.parse(saved) as [string, Fields][]) this.shadow.set(k, f); } catch { /* start clean */ }
  }
  get shadowData(): string { return JSON.stringify([...this.shadow.entries()]); }

  /** Everything that changed locally since the last flush, as ops. The shadow moves forward at once. */
  flushLocal(play: Play): Op[] {
    const local = new Map<string, Fields>();
    const carry = (ref: Ref, f: Fields): Fields => {
      const was = this.shadow.get(keyOf(ref));
      if (was) for (const k of PASSTHROUGH[ref.kind]) if (was[k] !== undefined) f[k] = was[k];
      return f;
    };
    local.set(keyOf(INFO), carry(INFO, infoFields(play)));
    play.characters.forEach((c, i) => local.set(keyOf({ kind: "character", id: c.id }), characterFields(c, i)));
    const keys = this.orderKeys(play.elements);
    play.elements.forEach((e, i) => local.set(keyOf({ kind: "element", id: e.id }), { ...elementFields(e), orderKey: keys[i] }));

    const ops: Op[] = [];
    for (const [k, now] of local) {
      const was = this.shadow.get(k);
      if (!was) { ops.push({ t: "put", ref: refOf(k), fields: now }); continue; }
      const set: Fields = {};
      for (const f of Object.keys(now)) if (was[f] !== now[f]) set[f] = now[f];
      const unset = Object.keys(was).filter((f) => now[f] === undefined).sort();
      if (Object.keys(set).length || unset.length) ops.push({ t: "patch", ref: refOf(k), set, unset });
    }
    for (const k of this.shadow.keys()) if (!local.has(k)) ops.push({ t: "delete", ref: refOf(k) });
    this.shadow = local;
    const rank = { put: 0, patch: 1, delete: 2 } as const;
    return ops.sort((a, b) => rank[a.t] - rank[b.t] || (keyOf(a.ref) < keyOf(b.ref) ? -1 : 1));
  }

  /** Keep agreed keys wherever they still read in order; re-mint only what was inserted or moved. */
  private orderKeys(ordered: Element[]): string[] {
    const keys: (string | null)[] = ordered.map((e) => this.shadow.get(keyOf({ kind: "element", id: e.id }))?.orderKey ?? null);
    const keep = longestIncreasingRun(keys);
    keys.forEach((_, i) => { if (!keep.has(i)) keys[i] = null; });
    const out = new Array<string>(keys.length).fill("");
    let prev: string | null = null;
    for (let i = 0; i < keys.length; ) {
      const k = keys[i];
      if (k !== null) { out[i] = k; prev = k; i++; continue; }
      let j = i;
      while (j < keys.length && keys[j] === null) j++;
      const next = j < keys.length ? keys[j] : null;
      for (let n = i; n < j; n++) { const nk: string = between(prev, next); out[n] = nk; prev = nk; }
      i = j;
    }
    return out.some((k) => k.length > REBALANCE_AT) ? spread(out.length) : out;
  }

  /** Apply what others did. Local edits are flushed FIRST, so what I typed is "mine" before "theirs" lands. */
  applyRemote(play: Play, changes: Change[]): { play: Play; ops: Op[] } {
    const mine = this.flushLocal(play);
    // A line I deleted a moment ago may still arrive as "edited by someone else". Delete wins.
    const justDeleted = new Set(mine.filter((o) => o.t === "delete").map((o) => keyOf(o.ref)));
    let touched = false;
    for (const ch of changes) {
      const k = keyOf(ch.ref);
      if (ch.t === "upsert") {
        if (justDeleted.has(k) || same(this.shadow.get(k), ch.fields)) continue;
        this.shadow.set(k, { ...ch.fields });
        touched = true;
      } else if (this.shadow.delete(k)) touched = true;
    }
    return { play: touched ? this.materialise(play) : play, ops: mine };
  }

  /** Build the play from a shared one (joining). Nothing is echoed back. */
  adopt(all: Map<string, Fields> | [Ref, Fields][], base: Pick<Play, "id" | "createdAt">): Play {
    this.shadow = new Map();
    const entries = all instanceof Map ? [...all.entries()] : all.map(([r, f]) => [keyOf(r), f] as [string, Fields]);
    for (const [k, f] of entries) this.shadow.set(k, { ...f });
    return this.materialise({ id: base.id, title: "", author: "", lang: "fr", characters: [], elements: [], createdAt: base.createdAt, updatedAt: Date.now() });
  }

  clone(): CollabCore {
    const c = new CollabCore();
    for (const [k, f] of this.shadow) c.shadow.set(k, { ...f });
    return c;
  }

  /**
   * Re-apply an edit made against `base` onto `current`.
   *
   * The editor hands back whole plays (`commit(next)`), computed from the play it
   * last rendered. If someone's change landed in between, committing `next` as-is
   * would silently undo it — and the next flush would push that undo to everyone.
   * So: take only what the edit CHANGED (base → next) and lay it on the current
   * play. Both sides start from this engine's real order keys, so a line inserted
   * against a slightly stale play still lands between the right neighbours.
   */
  rebase(base: Play, next: Play, current: Play): Play {
    if (base === current) return next;
    const from = this.clone();
    from.flushLocal(base);
    const delta = from.flushLocal(next);
    if (!delta.length) return current;
    const onto = this.clone();
    onto.flushLocal(current);
    for (const op of delta) {
      const k = keyOf(op.ref);
      if (op.t === "delete") onto.shadow.delete(k);
      else if (op.t === "put") onto.shadow.set(k, { ...op.fields });
      else {
        const was = onto.shadow.get(k);
        if (!was) continue;                                 // edited a line that is gone: delete wins
        const f = { ...was, ...op.set };
        for (const u of op.unset) delete f[u];
        onto.shadow.set(k, f);
      }
    }
    return onto.materialise(current);
  }

  /** The play the shadow describes. Order: agreed keys, ties broken by id — identically everywhere. */
  materialise(prev: Play): Play {
    const info = this.shadow.get(keyOf(INFO)) ?? {};
    const chars: { c: CharacterT; order: number }[] = [];
    const els: { e: Element; key: string }[] = [];
    for (const [k, f] of this.shadow) {
      const ref = refOf(k);
      if (ref.kind === "character") chars.push({ c: characterFrom(ref.id, f), order: Number(f.order ?? 0) });
      else if (ref.kind === "element") els.push({ e: elementFrom(ref.id, f), key: f.orderKey ?? "~" });
    }
    chars.sort((a, b) => a.order - b.order || (a.c.id < b.c.id ? -1 : 1));
    els.sort((a, b) => (a.key !== b.key ? (a.key < b.key ? -1 : 1) : a.e.id < b.e.id ? -1 : 1));
    return {
      ...prev,
      title: info.title ?? prev.title,
      subtitle: info.subtitle ?? prev.subtitle,
      author: info.author ?? prev.author,
      lang: ((info.lang as Lang) ?? prev.lang) as Lang,
      altLang: (info.altLang as Lang | undefined) ?? undefined,
      characters: chars.map((x) => x.c),
      elements: els.map((x) => x.e),
      updatedAt: Date.now(),
    };
  }
}
