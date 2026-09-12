import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  ATELIER_OPS,
  coreText,
  craftSystem,
  extrasText,
  filesFor,
  type AtelierOp,
} from "./corpus.ts";
import { CORPUS_DIGEST, CORPUS_FILES, CORPUS_MANIFEST, CORPUS_PREAMBLE } from "./corpus.generated.ts";

const corpusDir = path.join(__dirname, "corpus");
const OPS: AtelierOp[] = ["relance", "dramaturgie", "traduire", "retoucher", "voix", "etsi", "dramaturge"];

describe("craft corpus — vendored files", () => {
  it("covers exactly the seven Atelier ops", () => {
    expect([...ATELIER_OPS].sort()).toEqual([...OPS].sort());
  });

  it("every manifest file is vendored, non-empty and carries its skill frontmatter", () => {
    const all = new Set([...CORPUS_MANIFEST.core, ...Object.values(CORPUS_MANIFEST.ops).flat()]);
    for (const rel of all) {
      const text = CORPUS_FILES[rel];
      expect(text, rel).toBeTypeOf("string");
      expect(text.length, rel).toBeGreaterThan(2000);
      if (rel.endsWith("SKILL.md")) {
        const name = rel.split("/")[0];
        expect(text.startsWith("---\nname: " + name), rel).toBe(true);
      }
    }
  });

  it("corpus.generated.ts is in sync with the vendored .md files (run `npm run corpus:build`)", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(corpusDir, "manifest.json"), "utf8"));
    const preamble = fs.readFileSync(path.join(corpusDir, "PREAMBLE.md"), "utf8");
    const wanted = [...new Set([...manifest.core, ...Object.values(manifest.ops).flat()])].sort() as string[];
    const hash = crypto.createHash("sha256");
    hash.update(preamble);
    for (const rel of wanted) {
      hash.update(rel).update("\0").update(fs.readFileSync(path.join(corpusDir, rel), "utf8")).update("\0");
    }
    expect(hash.digest("hex").slice(0, 16)).toBe(CORPUS_DIGEST);
    expect(Object.keys(CORPUS_FILES).sort()).toEqual(wanted);
  });

  it("the preamble states the rules that matter", () => {
    expect(CORPUS_PREAMBLE).toMatch(/Never quote it/);
    expect(CORPUS_PREAMBLE).toMatch(/Never output Chinese/);
    expect(CORPUS_PREAMBLE).toMatch(/background knowledge only/);
    expect(CORPUS_PREAMBLE).toMatch(/lens, not a rulebook/);
  });
});

describe("craft corpus — system blocks", () => {
  it("core block is byte-identical across ops (one shared cache prefix)", () => {
    const first = craftSystem("relance", "x")[0];
    for (const op of OPS) {
      const blocks = craftSystem(op, "task for " + op);
      expect(blocks[0]).toEqual(first);
      expect(blocks[0].text).toBe(coreText());
    }
  });

  it("core starts with the preamble, then the terminology table, then the three core skills", () => {
    const core = coreText();
    expect(core.startsWith("# Craft reference for the Atelier")).toBe(true);
    const order = ["sw-workflow/terms.md", "sw-dialogue/SKILL.md", "sw-scene-craft/SKILL.md", "sw-character-conflict/SKILL.md"];
    let last = -1;
    for (const rel of order) {
      const i = core.indexOf(`<craft-reference file="${rel}">`);
      expect(i, rel).toBeGreaterThan(last);
      last = i;
    }
  });

  it("caches the corpus blocks (1h by default, 5m on demand) and never the task prompt", () => {
    for (const op of OPS) {
      const blocks = craftSystem(op, "TASK", "1h");
      const task = blocks[blocks.length - 1];
      expect(task.text).toBe("TASK");
      expect(task.cache_control).toBeUndefined();
      for (const b of blocks.slice(0, -1)) {
        expect(b.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
        expect(b.text.length).toBeGreaterThan(4000); // comfortably above Opus 4.8's 1024-token minimum
      }
      expect(craftSystem(op, "TASK", "5m")[0].cache_control).toEqual({ type: "ephemeral", ttl: "5m" });
    }
  });

  it("ops with extras get a second cached block; traduire rides on the core alone", () => {
    expect(extrasText("traduire")).toBeNull();
    expect(craftSystem("traduire", "T")).toHaveLength(2);
    for (const op of OPS.filter((o) => o !== "traduire")) {
      const blocks = craftSystem(op, "T");
      expect(blocks, op).toHaveLength(3);
      for (const rel of CORPUS_MANIFEST.ops[op]) {
        expect(blocks[1].text, `${op} ← ${rel}`).toContain(`<craft-reference file="${rel}">`);
      }
    }
  });

  it("the op profiles point each tool at the right craft", () => {
    expect(filesFor("relance")).toContain("chekhov-dramaturgy/SKILL.md"); // half-step-off dialogue
    expect(filesFor("dramaturgie")).toContain("sw-story-structure/SKILL.md");
    expect(filesFor("etsi")).toContain("sw-premise-theme/SKILL.md");
    expect(filesFor("voix")).toContain("sw-character-conflict/reference.md");
    expect(filesFor("dramaturge")).toContain("sw-premise-theme/SKILL.md");
    expect(filesFor("dramaturge")).toContain("chekhov-dramaturgy/SKILL.md");
    for (const op of OPS) expect(filesFor(op).slice(0, 4)).toEqual([...CORPUS_MANIFEST.core]);
  });

  it("keeps the whole prompt under a sane ceiling (≈1 token per char in this corpus)", () => {
    for (const op of OPS) {
      const chars = craftSystem(op, "").reduce((n, b) => n + b.text.length, 0);
      expect(chars, op).toBeLessThan(100_000);
    }
  });
});

describe("tool list — part of the cache prefix", () => {
  it("is one fixed list in a stable order with every op's schema", async () => {
    const { TOOLS, TOOL_SCHEMAS } = await import("./dramaturge.ts");
    expect(TOOLS.map((t) => t.name)).toEqual(["proposer_replique", "notes", "retoucher", "voix", "et_si", "traduction", "reponse"]);
    for (const t of TOOLS) {
      expect(t.input_schema).toBe(TOOL_SCHEMAS[t.name as keyof typeof TOOL_SCHEMAS]);
      expect(t.input_schema.type).toBe("object");
    }
  });
});
