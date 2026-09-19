import { describe, expect, it } from "vitest";
import {
  GENERAL, MAX_BODY, buildThreads, can, cleanQuote, counts, highlight, threadKey, threadsFor,
  validateBody, validateName, type CommentRec, type PlayMeta,
} from "./comments";

const meta = (p: Partial<PlayMeta> = {}): PlayMeta => ({ commentsOpen: true, resolved: [], hidden: [], owner: "_owner", ...p });
let clock = 0;
const c = (id: string, p: Partial<CommentRec> = {}): CommentRec => ({
  id, shareID: "s", elementID: "e1", body: "note", authorName: "Zoé", resolved: false,
  createdAt: ++clock, creator: "_zoe", ...p,
});

describe("buildThreads", () => {
  it("groups replies under their root, oldest first", () => {
    const t = buildThreads([c("r2", { parentID: "a" }), c("a"), c("r1", { parentID: "a", createdAt: 0 })], meta(), ["e1"]);
    expect(t).toHaveLength(1);
    expect(t[0].root.id).toBe("a");
    expect(t[0].replies.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("resolves when the author OR the owner says so", () => {
    const t = buildThreads([c("a", { resolved: true }), c("b"), c("d")], meta({ resolved: ["b"] }), ["e1"]);
    expect(t.map((x) => x.resolved)).toEqual([true, true, false]);
  });

  it("hides a hidden reply, and a hidden root takes its replies with it", () => {
    const t = buildThreads(
      [c("a"), c("ra", { parentID: "a" }), c("b"), c("rb1", { parentID: "b" }), c("rb2", { parentID: "b" })],
      meta({ hidden: ["a", "rb1"] }), ["e1"]);
    expect(t).toHaveLength(1);
    expect(t[0].root.id).toBe("b");
    expect(t[0].replies.map((r) => r.id)).toEqual(["rb2"]);
  });

  it("keeps replies whose root was deleted — the earliest stands in", () => {
    const t = buildThreads([c("r1", { parentID: "gone" }), c("r2", { parentID: "gone" })], meta({ resolved: ["gone"] }), ["e1"]);
    expect(t).toHaveLength(1);
    expect(t[0].rootDeleted).toBe(true);
    expect(t[0].root.id).toBe("r1");
    expect(t[0].replies.map((r) => r.id)).toEqual(["r2"]);
    expect(threadKey(t[0])).toBe("gone");
    expect(t[0].resolved).toBe(true);
  });

  it("detaches a thread whose line is gone, but never a general note", () => {
    const t = buildThreads([c("a", { elementID: "deleted" }), c("g", { elementID: GENERAL }), c("k")], meta(), ["e1"]);
    expect(t.map((x) => x.detached)).toEqual([true, false, false]);
    expect(threadsFor(t, "deleted")).toHaveLength(0);
    expect(threadsFor(t, "e1").map((x) => x.root.id)).toEqual(["k"]);
    expect(threadsFor(t, GENERAL).map((x) => x.root.id)).toEqual(["g"]);
  });

  it("counts open / resolved / detached", () => {
    const t = buildThreads([c("a", { resolved: true }), c("b"), c("d", { elementID: "x" })], meta(), ["e1"]);
    expect(counts(t)).toEqual({ open: 2, resolved: 1, detached: 1 });
  });
});

describe("validation", () => {
  it("trims, rejects empty and over-long bodies", () => {
    expect(validateBody("  salut \r\n toi ")).toEqual({ ok: true, value: "salut \n toi" });
    expect(validateBody(" \n ")).toEqual({ ok: false, reason: "empty" });
    expect(validateBody("x".repeat(MAX_BODY + 1))).toEqual({ ok: false, reason: "tooLong" });
    expect(validateBody("x".repeat(MAX_BODY)).ok).toBe(true);
  });
  it("collapses whitespace in names", () => {
    expect(validateName("  Zoé   LeBlanc ")).toEqual({ ok: true, value: "Zoé LeBlanc" });
    expect(validateName("")).toEqual({ ok: false, reason: "empty" });
    expect(validateName("n".repeat(41))).toEqual({ ok: false, reason: "tooLong" });
  });
  it("cleans quotes", () => {
    expect(cleanQuote("  La  lumière\n est ")).toBe("La lumière est");
    expect(cleanQuote(" a ")).toBeUndefined();
    expect(cleanQuote("q".repeat(400))).toHaveLength(280);
  });
});

describe("highlight", () => {
  const text = "La lumière est toujours allumée.";
  it("returns the text whole when nothing matches", () => {
    expect(highlight(text, [{ id: "a", quote: "réécrit" }, { id: "b" }])).toEqual([{ text, marks: [] }]);
  });
  it("marks a quote and keeps the rest plain", () => {
    expect(highlight(text, [{ id: "a", quote: "toujours" }])).toEqual([
      { text: "La lumière est ", marks: [] }, { text: "toujours", marks: ["a"] }, { text: " allumée.", marks: [] },
    ]);
  });
  it("skips a later overlapping quote, keeps disjoint ones in order", () => {
    const s = highlight(text, [{ id: "a", quote: "est toujours" }, { id: "b", quote: "toujours allumée" }, { id: "d", quote: "La" }]);
    expect(s.filter((x) => x.marks.length).map((x) => x.marks[0])).toEqual(["d", "a"]);
    expect(s.map((x) => x.text).join("")).toBe(text);
  });
});

describe("can", () => {
  const m = meta();
  it("lets authors delete and resolve their own roots", () => {
    expect(can("_zoe", m, c("a"))).toEqual({ remove: true, hide: false, resolve: true });
  });
  it("lets the owner hide and resolve others' notes, not delete them", () => {
    expect(can("_owner", m, c("a"))).toEqual({ remove: false, hide: true, resolve: true });
  });
  it("gives strangers and signed-out readers nothing; replies are never resolvable", () => {
    expect(can("_bob", m, c("a"))).toEqual({ remove: false, hide: false, resolve: false });
    expect(can(null, m, c("a"))).toEqual({ remove: false, hide: false, resolve: false });
    expect(can("_zoe", m, c("r", { parentID: "a" })).resolve).toBe(false);
  });
});
