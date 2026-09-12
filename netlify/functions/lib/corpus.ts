import type Anthropic from "@anthropic-ai/sdk";
import { CORPUS_FILES, CORPUS_MANIFEST, CORPUS_PREAMBLE } from "./corpus.generated.ts";

// The Atelier's craft corpus: the screenwriting / dramaturgy skills
// (jtydhr88/screenwriting-skills) vendored under ./corpus and prepended to
// every Atelier call as cached system blocks.
//
// Layout of `system` for an op (prefix order matters for the cache):
//   [0] core   = PREAMBLE + terms table + dialogue + scene craft + character   (cached, shared by ALL ops)
//   [1] extras = the op's own reference files, when it has any               (cached, per op)
//   [2] task   = the op's instruction prompt (small, varies with lang/mode)  (not cached)
// Two breakpoints means a relance right after a dramaturgie still reads the
// core from cache and only writes the extras. TTL defaults to 1h because a
// writing session has gaps longer than 5 minutes between Atelier calls.

export type AtelierOp = keyof typeof CORPUS_MANIFEST.ops;
export type CacheTtl = "5m" | "1h";

export const ATELIER_OPS = Object.keys(CORPUS_MANIFEST.ops) as AtelierOp[];

/** One vendored file, wrapped so the model can tell files apart. */
export function wrapFile(rel: string): string {
  const text = CORPUS_FILES[rel];
  if (text === undefined) throw new Error(`corpus: file not vendored: ${rel}`);
  return `<craft-reference file="${rel}">\n${text.trim()}\n</craft-reference>`;
}

/** The core block text — identical for every op (the shared cache prefix). */
export function coreText(): string {
  return [CORPUS_PREAMBLE.trim(), ...CORPUS_MANIFEST.core.map(wrapFile)].join("\n\n");
}

/** The op-specific extras block text, or null when the op has none. */
export function extrasText(op: AtelierOp): string | null {
  const files = CORPUS_MANIFEST.ops[op] as readonly string[];
  if (files.length === 0) return null;
  return files.map(wrapFile).join("\n\n");
}

export function cacheTtl(): CacheTtl {
  return process.env.ATELIER_CACHE_TTL === "5m" ? "5m" : "1h";
}

/**
 * The full `system` array for an op: cached craft blocks, then the task prompt.
 * `task` is the op's own instruction text (what used to be the whole system prompt).
 */
export function craftSystem(op: AtelierOp, task: string, ttl: CacheTtl = cacheTtl()): Anthropic.TextBlockParam[] {
  const cache: Anthropic.CacheControlEphemeral = { type: "ephemeral", ttl };
  const blocks: Anthropic.TextBlockParam[] = [{ type: "text", text: coreText(), cache_control: cache }];
  const extras = extrasText(op);
  if (extras) blocks.push({ type: "text", text: extras, cache_control: cache });
  blocks.push({ type: "text", text: task });
  return blocks;
}

/** Which vendored files an op sees, core first — for docs, tests and logs. */
export function filesFor(op: AtelierOp): string[] {
  return [...CORPUS_MANIFEST.core, ...(CORPUS_MANIFEST.ops[op] as readonly string[])];
}
