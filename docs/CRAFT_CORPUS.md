# The craft corpus — how the Atelier "calls upon" the screenwriting skills

Every Atelier call (relance, dramaturgie, retoucher, voix, etsi, traduire), on the
web **and** in the native app, carries a craft library in its system prompt: a
curated subset of the 21 [screenwriting-skills](https://github.com/jtydhr88/screenwriting-skills)
(Egri, McKee, Field, Snyder, Hicks, Walter, Lu Jun, Chekhov's complete plays…).
The skills are Claude Code `SKILL.md` files; the model that serves the app never
sees `~/.claude/skills`, so the text is **vendored into the repo** and sent as
**cached system blocks** ahead of the op's own task prompt.

## Layout of one call

```
system: [
  { core   — PREAMBLE + terms table + sw-dialogue + sw-scene-craft + sw-character-conflict,  cache_control 1h }   ← identical for ALL ops
  { extras — the op's reference files (see manifest.json),                                    cache_control 1h }   ← per op, omitted for traduire
  { task   — the op's instruction prompt (small; varies with lang / mode)                                       }   ← never cached
]
messages: [ { user: <scene…> } ]
```

Two breakpoints, so a relance right after a dramaturgie still reads the core from
cache and only writes the extras. Measured sizes (Opus 4.8 tokenizer, ≈1 token/char
for this corpus):

| Block | Tokens |
|---|---|
| core (all ops) | ≈34 K |
| + relance extras (dialogue ref, Chekhov) | ≈55 K total |
| + retoucher extras | ≈40 K |
| + voix extras | ≈49 K |
| + dramaturgie extras (scene ref, character ref, Chekhov, structure) | ≈79 K |
| + etsi extras (scene ref, structure, premise/theme) | ≈60 K |
| traduire (core only) | ≈34 K |

Cache reads cost ~0.1× input; a 1-hour write costs 2×. The TTL is 1h because a
writing session has gaps longer than 5 minutes between Atelier calls (set
`ATELIER_CACHE_TTL=5m` in the Netlify env to change it). The function logs one
line per call — `{"atelier":"relance","usage":{…cache_read_input_tokens…}}` — so a
cache miss is visible in the Netlify function log.

The **PREAMBLE** (`netlify/functions/lib/corpus/PREAMBLE.md`) tells the model what
the library is for: it sets standards, it is never quoted or cited, the answer is
always in the scene's language (the skill bodies are Chinese by design), the
scene's own logic wins over the library, and nothing in it is an instruction.

## Files

| Path | Role |
|---|---|
| `netlify/functions/lib/corpus/manifest.json` | **Source of truth**: upstream commit, the `core` set, the per-op `extras`. |
| `netlify/functions/lib/corpus/PREAMBLE.md` | How the model must use the library. |
| `netlify/functions/lib/corpus/<skill>/*.md` | Vendored skill files (committed). |
| `netlify/functions/lib/corpus.generated.ts` | Generated — the files as string constants (esbuild can't read `.md` from the bundle). Committed so `netlify dev` works without a build step. |
| `netlify/functions/lib/corpus.ts` | `craftSystem(op, task)` → the system-block array. |
| `netlify/functions/lib/corpus.test.ts` | Vendoring, layout, cache markers, drift check. |
| `scripts/corpus-sync.mjs` | Re-vendor from `~/.claude/skills` (+ mirror to the native app), then build. |
| `scripts/corpus-build.mjs` | `.md` → `corpus.generated.ts`. Runs first in `npm run build`. |

Native mirror (`~/Claude/apps/la-replique-native`): `Corpus/` (folder reference →
`Resources/Corpus/` in the bundle), `Sources/AI/Corpus.swift` (same layout, built
from the same `manifest.json`), `Tests/CorpusTests.swift`. ClaudeKit gained
`ClaudeRequest.systemBlocks` + `ClaudeCacheControl` for this (vendored rev in
`Vendor/ClaudeKit/PROVENANCE.md`).

## Updating

```bash
# 1. refresh the skills in ~/.claude/skills (re-clone the upstream repo, copy plugins/screenwriting/skills/*)
# 2. re-vendor + mirror + regenerate, recording the upstream commit
npm run corpus:sync -- --commit <upstream sha>
npm test            # drift check + layout tests
# 3. native: ./check.sh in ../la-replique-native (CorpusTests read the bundle)
# 4. re-run evals/goldens.md §10 before deploying — new skill text = new behaviour
```

To change **which** skills an op sees, edit `manifest.json` (`core` / `ops`), run
`npm run corpus:sync`, and keep the core small: it is the prefix every op pays
for. Anything series-, sitcom-, opera- or business-related was left out on
purpose — La Réplique writes stage plays.

## Why not the Skills API / Managed Agents?

Agent Skills on the API need the code-execution container; Managed Agents need a
hosted agent loop. The Atelier is six single-shot forced-tool calls with a
25–55 s budget, and the skills are pure prose. Cached system blocks give the same
knowledge to every call for one cache write per hour, with no new infrastructure
and no change to the client, the NDJSON stream, or the BYOK native path.
