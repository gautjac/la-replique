// Local-first storage. IndexedDB is the ONLY copy — migrations must never be destructive.
import Dexie, { type Table } from "dexie";
import type { Play } from "./types";

class RepliqueDB extends Dexie {
  plays!: Table<Play, string>;

  constructor() {
    super("la-replique");
    // v1 — the play library, keyed by id, indexed by updatedAt for recency sort.
    this.version(1).stores({
      plays: "id, updatedAt, title",
    });
  }
}

export const db = new RepliqueDB();

export async function putPlay(play: Play): Promise<void> {
  await db.plays.put(play);
}

export async function deletePlay(id: string): Promise<void> {
  await db.plays.delete(id);
}

export async function getPlay(id: string): Promise<Play | undefined> {
  return db.plays.get(id);
}
