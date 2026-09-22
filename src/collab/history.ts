// The history log of a shared play, web side — twin of the app's History.swift.
// Written by the writer's own browser as it syncs; a burst of typing on one line
// by one person is ONE entry (its `after` keeps moving for ten minutes).
import { collection, doc, getFirestore, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, type Timestamp } from "firebase/firestore";
import type { Fields, Op } from "./core";
import type { Play } from "../types";

export type HistoryKind = "edit" | "add" | "delete" | "move" | "cast" | "info";
export interface HistoryEntry {
  id: string; uid: string; name: string; kind: HistoryKind; elementID: string; speaker?: string;
  before?: Fields; after?: Fields; at: number; count: number;
}
const WINDOW_MS = 600_000;

export function historyLog(playID: string, author: { uid: string; name: string }, getPlay: () => Play | null) {
  const col = () => collection(getFirestore(), "plays", playID, "history");
  const open = new Map<string, { id: string; at: number }>();

  const write = (kind: HistoryKind, key: string, isElement: boolean, before?: Fields, after?: Fields) => {
    const now = Date.now();
    const o = open.get(key);
    if (kind === "edit" && o && now - o.at < WINDOW_MS) {
      open.set(key, { id: o.id, at: now });
      const patch: Record<string, unknown> = { at: serverTimestamp(), count: increment(1) };
      if (after) patch.after = after;
      void updateDoc(doc(col(), o.id), patch).catch(() => undefined);
      return;
    }
    const id = crypto.randomUUID().toUpperCase();
    const data: Record<string, unknown> = { uid: author.uid, name: author.name, kind, elementID: key, at: serverTimestamp(), count: 1 };
    if (before) data.before = before;
    if (after) data.after = after;
    if (isElement) {
      const play = getPlay();
      const cid = after?.characterID ?? before?.characterID ?? (play?.elements.find((e) => e.id === key) as { characterId?: string } | undefined)?.characterId;
      const who = cid && play?.characters.find((c) => c.id === cid)?.name;
      if (who) data.speaker = who;
    }
    void setDoc(doc(col(), id), data).catch(() => undefined);
    if (kind === "edit") open.set(key, { id, at: now }); else open.delete(key);
  };

  return {
    /** `old` = the core's shadow BEFORE the flush that produced `ops`. */
    record(ops: Op[], old: Map<string, Fields>) {
      for (const op of ops) {
        const ref = op.ref, key = ref.id, isEl = ref.kind === "element";
        const kindFor = (base: HistoryKind): HistoryKind => (ref.kind === "character" ? "cast" : ref.kind === "info" ? "info" : base);
        if (op.t === "put") write(kindFor("add"), key, isEl, undefined, op.fields);
        else if (op.t === "delete") write(kindFor("delete"), key, isEl, old.get(`${ref.kind}:${key}`));
        else {
          const was = old.get(`${ref.kind}:${key}`) ?? {};
          const before: Fields = {}, after: Fields = {};
          for (const [k, v] of Object.entries(op.set)) { if (was[k] !== undefined) before[k] = was[k]; after[k] = v; }
          for (const k of op.unset) if (was[k] !== undefined) before[k] = was[k];
          const onlyOrder = Object.keys(op.set).every((k) => k === "orderKey") && !op.unset.length;
          const kind = kindFor(onlyOrder ? "move" : "edit");
          if (kind === "edit") for (const k of ["text", "label"]) if (before[k] === undefined && was[k] !== undefined) before[k] = was[k];
          write(kind, key, isEl, before, after);
        }
      }
    },
  };
}

export function watchHistory(playID: string, onChange: (entries: HistoryEntry[]) => void): () => void {
  const q = query(collection(getFirestore(), "plays", playID, "history"), orderBy("at", "desc"), limit(500));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({
    id: d.id, uid: String(d.get("uid") ?? ""), name: String(d.get("name") ?? "?"), kind: d.get("kind") as HistoryKind,
    elementID: String(d.get("elementID") ?? ""), speaker: d.get("speaker") as string | undefined,
    before: d.get("before") as Fields | undefined, after: d.get("after") as Fields | undefined,
    at: (d.get("at", { serverTimestamps: "estimate" }) as Timestamp | undefined)?.toMillis() ?? Date.now(), count: Number(d.get("count") ?? 1),
  }))), () => undefined);
}

// MARK: named versions

export interface SharedVersion { id: string; name: string; uid: string; by: string; at: number; json: string; authors: Record<string, string> }

export function watchVersions(playID: string, onChange: (v: SharedVersion[]) => void): () => void {
  const q = query(collection(getFirestore(), "plays", playID, "versions"), orderBy("at", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({
    id: d.id, name: String(d.get("name") ?? ""), uid: String(d.get("uid") ?? ""), by: String(d.get("by") ?? "?"),
    at: (d.get("at", { serverTimestamps: "estimate" }) as Timestamp | undefined)?.toMillis() ?? Date.now(),
    json: String(d.get("json") ?? "{}"), authors: (d.get("authors") as Record<string, string>) ?? {},
  }))), () => undefined);
}

export async function saveVersion(playID: string, name: string, by: { uid: string; name: string }, json: string, authors: Record<string, string>): Promise<void> {
  await setDoc(doc(collection(getFirestore(), "plays", playID, "versions"), crypto.randomUUID().toUpperCase()),
    { name: name || "Version", uid: by.uid, by: by.name, at: serverTimestamp(), json, authors });
}
