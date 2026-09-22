// Mirrors the app's CollabCoreTests: same scenarios, same simulated Firestore
// (field-level merges, a patch that FAILS on a missing doc, listeners that see
// server state overlaid with their own pending writes).
import { describe, expect, it } from "vitest";
import { CollabCore, keyOf, longestIncreasingRun, type Change, type Fields, type Op, type Ref } from "./core";
import { insertAfter, removeElement, updateElement } from "../ops";
import type { CueEl, Element, Play } from "../types";

class FakeServer {
  docs = new Map<string, Fields>();
  log: Change[] = [];
  commit(op: Op): number | null {
    const k = keyOf(op.ref);
    if (op.t === "put") { this.docs.set(k, { ...op.fields }); this.log.push({ t: "upsert", ref: op.ref, fields: { ...op.fields } }); }
    else if (op.t === "patch") {
      const d = this.docs.get(k);
      if (!d) return null;
      const n = { ...d, ...op.set };
      for (const u of op.unset) delete n[u];
      this.docs.set(k, n); this.log.push({ t: "upsert", ref: op.ref, fields: { ...n } });
    } else if (this.docs.delete(k)) this.log.push({ t: "removed", ref: op.ref });
    return this.log.length;
  }
}

const refOf = (k: string): Ref => ({ kind: k.slice(0, k.indexOf(":")) as Ref["kind"], id: k.slice(k.indexOf(":") + 1) });
const eq = (a?: Fields, b?: Fields) => !!a && !!b && Object.keys(a).length === Object.keys(b).length && Object.keys(b).every((k) => a[k] === b[k]);

class Peer {
  core = new CollabCore();
  play: Play;
  online = true;
  private queued: Op[] = [];
  private sent: { op: Op; version: number }[] = [];
  private seen = 0;
  private serverView = new Map<string, Fields>();
  private lastView = new Map<string, Fields>();
  name: string;
  private server: FakeServer;
  constructor(name: string, server: FakeServer, play?: Play) {
    this.name = name;
    this.server = server;
    this.play = play ?? { id: "P", title: "", author: "", lang: "fr", characters: [], elements: [], createdAt: 0, updatedAt: 0 };
  }
  relaunch() { this.core = new CollabCore(this.core.shadowData); }
  join() {
    this.seen = this.server.log.length;
    this.serverView = new Map([...this.server.docs].map(([k, f]) => [k, { ...f }]));
    this.lastView = new Map(this.serverView);
    this.play = this.core.adopt(this.serverView, { id: "P", createdAt: 0 });
  }
  tick() { this.queued.push(...this.core.flushLocal(this.play)); this.deliver(); }
  upload() {
    if (!this.online) return;
    for (const op of this.queued) { const v = this.server.commit(op); if (v !== null) this.sent.push({ op, version: v }); }
    this.queued = [];
    this.deliver();
  }
  receive(count?: number) {
    if (!this.online) return;
    const upTo = Math.min(this.server.log.length, count === undefined ? Infinity : this.seen + count);
    for (const ch of this.server.log.slice(this.seen, upTo)) {
      if (ch.t === "upsert") this.serverView.set(keyOf(ch.ref), { ...ch.fields }); else this.serverView.delete(keyOf(ch.ref));
    }
    this.seen = upTo;
    this.sent = this.sent.filter((s) => s.version > this.seen);
    this.deliver();
  }
  private composed(): Map<string, Fields> {
    const view = new Map([...this.serverView].map(([k, f]) => [k, { ...f }]));
    for (const op of [...this.sent.map((s) => s.op), ...this.queued]) {
      const k = keyOf(op.ref);
      if (op.t === "put") view.set(k, { ...op.fields });
      else if (op.t === "delete") view.delete(k);
      else { const d = view.get(k); if (!d) continue; const n = { ...d, ...op.set }; for (const u of op.unset) delete n[u]; view.set(k, n); }
    }
    return view;
  }
  private deliver() {
    const view = this.composed();
    const changes: Change[] = [];
    for (const [k, f] of view) if (!eq(this.lastView.get(k), f)) changes.push({ t: "upsert", ref: refOf(k), fields: f });
    for (const k of this.lastView.keys()) if (!view.has(k)) changes.push({ t: "removed", ref: refOf(k) });
    this.lastView = view;
    if (!changes.length) return;
    const r = this.core.applyRemote(this.play, changes);
    this.play = r.play;
    this.queued.push(...r.ops);
    if (r.ops.length) this.deliver();   // the SDK reports the effect of writes issued during a callback
  }
  // what the user does
  line(text: string): Element | undefined { return this.play.elements.find((e) => "text" in e && e.text === text); }
  setText(el: Element, text: string) { this.play = updateElement(this.play, el.id, { text } as Partial<Element>); }
  insert(after: Element | undefined, text: string): Element {
    const i = after ? this.play.elements.findIndex((e) => e.id === after.id) : this.play.elements.length - 1;
    const r = insertAfter(this.play, i, "cue");
    this.play = updateElement(r.play, r.id, { text } as Partial<Element>);
    return this.play.elements.find((e) => e.id === r.id)!;
  }
  del(el: Element) { this.play = removeElement(this.play, el.id); }
  move(el: Element, to: number) {
    const rest = this.play.elements.filter((e) => e.id !== el.id);
    rest.splice(Math.min(Math.max(to, 0), rest.length), 0, el);
    this.play = { ...this.play, elements: rest };
  }
  get texts(): string[] { return this.play.elements.map((e) => ("text" in e ? e.text : e.label)); }
  get fingerprint(): string {
    return JSON.stringify([this.play.title, this.play.characters.map((c) => [c.id, c.name]).sort(), this.play.elements]);
  }
}

const settle = (peers: Peer[]) => {
  for (const p of peers) p.online = true;
  for (let i = 0; i < 6; i++) { for (const p of peers) { p.tick(); p.upload(); } for (const p of peers) p.receive(); }
};

const scene = (): Play => ({
  id: "P", title: "La porte", author: "", lang: "fr", createdAt: 0, updatedAt: 0,
  characters: [{ id: "C-ALICE", name: "ALICE", color: "#4f7cff" }, { id: "C-BRUNO", name: "BRUNO", color: "#0ea5b7" }],
  elements: [
    { id: "E0", type: "scene", label: "SCÈNE 1" },
    { id: "E1", type: "cue", characterId: "C-BRUNO", text: "Un." },
    { id: "E2", type: "cue", characterId: "C-ALICE", text: "Deux." },
    { id: "E3", type: "cue", characterId: "C-BRUNO", text: "Trois." },
  ],
});

function table(extra = 1): [FakeServer, Peer, Peer[]] {
  const server = new FakeServer();
  const a = new Peer("A", server, scene());
  a.tick(); a.upload(); a.receive();
  const others = Array.from({ length: extra }, (_, i) => { const p = new Peer(`B${i}`, server); p.join(); return p; });
  return [server, a, others];
}

describe("CollabCore (web twin)", () => {
  it("joining reproduces the play exactly, ids included, and echoes nothing", () => {
    const [, a, [b]] = table();
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(b.core.flushLocal(b.play)).toEqual([]);
  });

  it("edits to different fields of one line both survive", () => {
    const [, a, [b]] = table();
    a.play = updateElement(a.play, "E2", { parenthetical: "sèche" } as Partial<CueEl>);
    b.setText(b.line("Deux.")!, "Deux, j'ai dit.");
    settle([a, b]);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect((a.line("Deux, j'ai dit.") as CueEl).parenthetical).toBe("sèche");
  });

  it("the same field is last-writer-wins and everyone agrees", () => {
    const [server, a, [b]] = table();
    a.setText(a.line("Un.")!, "Version A"); b.setText(b.line("Un.")!, "Version B");
    a.tick(); b.tick(); a.upload(); b.upload();
    settle([a, b]);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(server.docs.get("element:E1")?.text).toBe("Version B");
  });

  it("two inserts into the same gap both land, in the same order everywhere", () => {
    const [, a, [b, c]] = table(2);
    a.insert(a.line("Un."), "de A"); b.insert(b.line("Un."), "de B");
    settle([a, b, c]);
    expect(a.texts).toHaveLength(6);
    expect(a.texts).toEqual(b.texts); expect(b.texts).toEqual(c.texts);
    c.insert(c.play.elements[2], "de C");
    settle([a, b, c]);
    expect(a.texts).toEqual(c.texts);
    expect(a.texts[3]).toBe("de C");
  });

  it("delete beats a concurrent edit — no resurrection, not even for an instant", () => {
    const [server, a, [b]] = table();
    b.setText(b.line("Deux.")!, "Deux, retouché."); b.tick(); b.upload();
    a.del(a.line("Deux.")!);
    a.receive();
    expect(a.play.elements.find((e) => e.id === "E2")).toBeUndefined();
    settle([a, b]);
    expect(a.texts).toEqual(["SCÈNE 1", "Un.", "Trois."]);
    expect(b.texts).toEqual(a.texts);
    expect(server.docs.has("element:E2")).toBe(false);
  });

  it("moving one line rewrites only that line's key; writing at the end sends one put", () => {
    const [, a] = table();
    a.move(a.line("Trois.")!, 1);
    const ops = a.core.flushLocal(a.play);
    expect(ops).toHaveLength(1);
    expect(ops[0].t === "patch" && Object.keys(ops[0].set)).toEqual(["orderKey"]);
    a.insert(a.play.elements[a.play.elements.length - 1], "Quatre.");
    const ops2 = a.core.flushLocal(a.play);
    expect(ops2.map((o) => o.t)).toEqual(["put"]);
  });

  it("offline edits merge on reconnect, even across a reload", () => {
    const [, a, [b]] = table();
    b.online = false;
    b.setText(b.line("Trois.")!, "Trois, écrit dans le train.");
    b.insert(b.play.elements[b.play.elements.length - 1], "Quatre, aussi hors ligne.");
    b.tick();
    b.play = updateElement(b.play, "E1", { parenthetical: "juste avant de fermer l'onglet" } as Partial<CueEl>);
    b.relaunch();
    a.setText(a.line("Deux.")!, "Deux, écrit pendant ce temps.");
    a.insert(a.line("Un."), "Un et demi.");
    settle([a, b]);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.texts).toEqual(["SCÈNE 1", "Un.", "Un et demi.", "Deux, écrit pendant ce temps.", "Trois, écrit dans le train.", "Quatre, aussi hors ligne."]);
  });

  it("carries through what the web doesn't model (the app's logline)", () => {
    const [server, a, [b]] = table();
    server.commit({ t: "patch", ref: { kind: "info", id: "info" }, set: { logline: "Dix ans après, il revient frapper." }, unset: [] });
    settle([a, b]);
    a.play = { ...a.play, title: "La porte (2)" };
    settle([a, b]);
    expect(server.docs.get("info:info")?.logline).toBe("Dix ans après, il revient frapper.");
    expect(b.play.title).toBe("La porte (2)");
  });

  it("rebase lays an edit made on a stale play onto the current one", () => {
    const [, a, [b]] = table();
    const stale = a.play;                                           // what the editor rendered
    b.setText(b.line("Trois.")!, "Trois, changé par B."); b.insert(b.line("Un."), "inséré par B");
    settle([a, b]);                                                 // …then B's changes land on A
    const edited = updateElement(stale, "E1", { text: "Un, tapé par A." } as Partial<Element>);
    a.play = a.core.rebase(stale, edited, a.play);
    expect(a.texts).toEqual(["SCÈNE 1", "Un, tapé par A.", "inséré par B", "Deux.", "Trois, changé par B."]);
    settle([a, b]);
    expect(b.texts).toEqual(a.texts);
  });

  it("longest increasing run is strict", () => {
    expect([...longestIncreasingRun(["a", null, "b", "b", "c"])].sort()).toEqual([0, 3, 4]);
  });

  // ~4 s alone; under the full suite's parallel load it blew vitest's 5 s default.
  it("fuzz: three writers, offline spells, reloads, late deliveries — everyone converges", { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 120; seed++) {
      let s = seed * 2654435761 % 4294967296;
      const rnd = (n: number) => { s = (s * 1664525 + 1013904223) % 4294967296; return Math.floor((s / 4294967296) * n); };
      const pick = <T,>(xs: T[]): T | undefined => xs[rnd(xs.length)];
      const [server, a, others] = table(2);
      const peers = [a, ...others];
      for (let step = 0; step < 200; step++) {
        const p = pick(peers)!;
        const roll = rnd(11);
        const l = pick(p.play.elements);
        if (roll <= 2 && l && "text" in l) p.setText(l, `${p.name}·${step}`);
        else if (roll <= 4) p.insert(l, `nouvelle ${p.name}·${step}`);
        else if (roll === 5 && p.play.elements.length > 3 && l) p.del(l);
        else if (roll === 6 && l) p.move(l, rnd(p.play.elements.length + 1));
        else if (roll === 7) p.online = !p.online;
        else if (roll === 8 && l && l.type === "cue") p.play = updateElement(p.play, l.id, { parenthetical: step % 3 ? `jeu ${step}` : undefined } as Partial<CueEl>);
        else if (roll === 9 && rnd(4) === 0) { p.tick(); p.relaunch(); }
        if (rnd(2)) p.tick();
        if (rnd(2)) p.upload();
        if (rnd(2)) p.receive(1 + rnd(4));
      }
      settle(peers);
      for (const p of others) expect(p.fingerprint, `seed ${seed}: ${p.name} diverged`).toBe(a.fingerprint);
      expect([...server.docs.keys()].filter((k) => k.startsWith("element:")).length, `seed ${seed}`).toBe(a.play.elements.length);
    }
  });
});
