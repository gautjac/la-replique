// Local-first storage. IndexedDB is the ONLY copy — migrations must never be destructive.
import Dexie, { type Table } from "dexie";
import type { Play } from "./types";

export interface Version {
  id: string;
  playId: string;
  name: string;
  createdAt: number;
  snapshot: Play;
}

class RepliqueDB extends Dexie {
  plays!: Table<Play, string>;
  versions!: Table<Version, string>;

  constructor() {
    super("la-replique");
    // v1 — the play library, keyed by id, indexed by updatedAt for recency sort.
    this.version(1).stores({
      plays: "id, updatedAt, title",
    });
    // v2 — named draft snapshots. Additive only; never touches `plays` (data durability).
    this.version(2).stores({
      versions: "id, playId, createdAt",
    });
  }
}

export const db = new RepliqueDB();

export async function putPlay(play: Play): Promise<void> {
  await db.plays.put(play);
}

export async function deletePlay(id: string): Promise<void> {
  await db.plays.delete(id);
  await db.versions.where("playId").equals(id).delete();
}

export async function getPlay(id: string): Promise<Play | undefined> {
  return db.plays.get(id);
}

export async function saveVersion(play: Play, name: string): Promise<void> {
  await db.versions.put({
    id: crypto.randomUUID(),
    playId: play.id,
    name,
    createdAt: Date.now(),
    snapshot: JSON.parse(JSON.stringify(play)) as Play,
  });
}

export async function deleteVersion(id: string): Promise<void> {
  await db.versions.delete(id);
}
