# La Réplique — AI goldens

Model is a pinned dependency (Conduite AI P39). The Atelier endpoint (`/api/atelier`)
declares its model once: `MODEL = "claude-opus-4-8"` in
`netlify/functions/lib/dramaturge.ts`. **Before bumping that constant, run these against
the live endpoint and eyeball each against its qualities.** Not exact-match — qualities.

Interaction patterns: **relance** = inline suggestion; **dramaturgie** = generate-then-
inspect artifact; **traduire** = generate-then-inspect + preview-before-apply.

---

## 1. Relance — voice-matched next line (FR)

Input scene (Québécois register):
```
SCÈNE 1
Une cuisine. Fin de soirée.

BRUNO, derrière la porte
Je sais que t'es là. La lumière est allumée.

ALICE
La lumière est toujours allumée. Ça veut rien dire.
```
Ask for: **ALICE**.

Qualities:
- Répond en **français**, dans le registre familier de la scène (pas de vouvoiement soudain).
- Reste dans la voix d'Alice : évitante, sur la défensive — pas une confession soudaine.
- La réplique **agit** (repousse, teste, esquive) — ce n'est pas du meublage.
- Ne résout pas toute la scène ; un seul pas.
- `line` ne contient QUE les mots dits (pas « ALICE : », pas de guillemets).

## 2. Relance — voice-matched next line (EN)

Same scene in English, ask for **BRUNO**.

Qualities:
- Answers in **English**.
- Bruno stays insistent/wounded — consistent with "back after ten years".
- One playable move; doesn't wrap up the scene.
- No name prefix in `line`.

## 3. Dramaturgie — honest read, no flattery (FR)

Input: a deliberately flat scene where two characters agree about everything and nothing
is at stake (e.g. both say the weather is nice, agree, exit).

Qualities:
- `read` **names the problem** — no tension / nothing wanted — instead of praising it.
- Does NOT open with a compliment; no sycophancy.
- `points` include at least one `tension` observation about the slack.
- At least one `piste` offered as an option (not an order), specific to the text.
- Written in **French**.

## 4. Dramaturgie — a working scene (EN)

Input: a scene with a real reversal (a lie exposed).

Qualities:
- Identifies the actual turn/reversal specifically (quotes or points at the moment).
- Points are concrete, not generic ("add more conflict" is a FAIL).
- Tags are used sensibly (tension / clarity / voice / lead).
- Does not invent facts about the world beyond the scene.

## 5. Traduire — FR → EN, structure preserved

Input: the sample play "La porte" (2 characters, 1 act, 1 scene, ~3 cues + didascalies).

Qualities:
- **Every** item key returned (no dropped cues) — the client falls back to source for any
  missing key, so a short return = visibly untranslated lines in the preview.
- Dialogue reads as **playable English**, not word-for-word calque.
- Character names (ALICE, BRUNO) unchanged.
- Register kept informal where the French is informal (contractions).
- Didascalies translated too (stage directions), not just dialogue.

## 6. Traduire — EN → FR, Québécois-aware

Input: an English scene with casual dialogue.

Qualities:
- Natural contemporary French, Québécois-aware where the register fits (not stiff France-
  formal for a casual exchange).
- No added or merged lines; one `t` per input `k`.
- Keys (`k`) returned **unchanged** — they are identifiers, never translated.

---

### How to run
`npm run dev` (netlify dev with `CLAUDE_API_KEY` set) or hit the deployed
`/api/atelier`. POST bodies mirror `src/api.ts` (`RelanceReq` / `DramaturgieReq` /
`TraduireReq`). NDJSON: read the last JSON line, expect `{ "result": ... }`.
