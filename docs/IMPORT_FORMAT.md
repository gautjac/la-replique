# Importing a play into La Réplique

La Réplique can import a play two ways, both from **Mes pièces → Importer un texte**
(paste box) — it auto-detects which one you pasted:

1. **Plain text** — a human-readable transcript (`NAME: line`). Easiest to write by hand.
2. **`la-replique/1` JSON** — a precise, lossless structure. Best for AI-generated plays.

There's also **Importer une sauvegarde** (a `.json` file), which uses the same JSON format
(this is what the app exports as a backup).

---

## The fastest path: let an AI write it

Open **Importer un texte** and click **« Copier le prompt IA »**. That copies a ready prompt
to your clipboard — paste it into Claude (or any model), ask for the play you want, then paste
the model's JSON answer back into the import box. The prompt is reproduced in
[`src/importFormat.ts`](../src/importFormat.ts).

---

## Format 1 — plain text

One element per line. La Réplique infers the structure:

```
ACTE I
SCÈNE 1
Une gare, la nuit.
ALICE : Tu es en retard.
BRUNO : (essoufflé) Je sais. Le train est resté bloqué.
ALICE : Toujours une excuse avec toi.
(un train passe en trombe)
```

Rules the parser follows:

| You write…                              | Becomes…                                  |
|-----------------------------------------|-------------------------------------------|
| `ACTE I` / `ACT II` (line starts w/ act)| an **act** heading                        |
| `SCÈNE 1` / `SCENE 1` / `INT.` / `EXT.` | a **scene** heading                       |
| `NAME : line`  (name, then `:` )        | a **réplique** (cue) for that character   |
| `NAME : (beat) line`                    | a réplique with a parenthetical (jeu)     |
| `(text on its own line)`                | a **didascalie** (stage direction)        |
| `ALL CAPS NAME` alone on a line         | a réplique heading (text follows below)   |
| any other line                          | continues the previous réplique, else an action line |

- Character names can be `ALICE` or `Alice` — reused whenever the same name reappears.
- If you never write a scene heading, La Réplique wraps everything in `SCÈNE 1`.

Good for: quickly bringing in an existing scene, a rehearsal transcript, or a chat export.

---

## Format 2 — `la-replique/1` JSON (recommended for AI)

A single JSON object. **Cues reference characters by NAME — you don't need ids.**

```json
{
  "format": "la-replique/1",
  "title": "La porte",
  "subtitle": "esquisse",
  "author": "",
  "lang": "fr",
  "characters": [
    { "name": "ALICE", "note": "la sœur aînée" },
    { "name": "BRUNO", "note": "revenu après dix ans" }
  ],
  "elements": [
    { "type": "act",   "label": "ACTE I" },
    { "type": "scene", "label": "SCÈNE 1", "setting": "Une cuisine. Fin de soirée." },
    { "type": "stage", "text": "Alice essuie la même assiette depuis trop longtemps. On frappe." },
    { "type": "cue",   "character": "BRUNO", "parenthetical": "derrière la porte", "text": "Je sais que t'es là." },
    { "type": "cue",   "character": "ALICE", "text": "La lumière est toujours allumée. Ça veut rien dire." }
  ]
}
```

### Top-level fields

| Field        | Required | Notes |
|--------------|----------|-------|
| `format`     | no       | `"la-replique/1"` (nice to include; not enforced) |
| `title`      | no       | defaults to “Pièce importée” |
| `subtitle`   | no       | |
| `author`     | no       | |
| `lang`       | no       | `"fr"` or `"en"` (default `"fr"`) — the language you write in |
| `characters` | no       | array of `{ name, note?, color?, voiceId? }`. Can be omitted — speakers are created from the cues. |
| `elements`   | **yes**  | the play, in order |

### Element types

| `type`   | Fields                                                        |
|----------|---------------------------------------------------------------|
| `act`    | `label` — e.g. `"ACTE I"` (`"ACT I"` in English)              |
| `scene`  | `label` — e.g. `"SCÈNE 1"`; optional `setting`, `synopsis`, `beat` |
| `cue`    | `character` (the speaker's **name**), `text`; optional `parenthetical` |
| `stage`  | `text` — a didascalie                                          |
| `action` | `text` — narration that isn't a bracketed stage direction     |

- `beat` (optional, on a scene) is one of: `setup`, `inciting`, `rising`, `turn`, `crisis`,
  `climax`, `resolution` — it colours the scene card on the beat board.
- Put only the spoken words in a cue's `text` — no name prefix, no quotation marks.
- Ids, colours, and timestamps are all optional; La Réplique fills them in.
- Backups exported by the app also validate here (they carry explicit `characterId`s and a
  `voiceId` per character; both are honoured on import).

### Minimal valid document

```json
{ "lang": "en", "elements": [ { "type": "cue", "character": "A", "text": "Hello." } ] }
```

That imports as a one-line play with a single character **A** under an auto-created `SCENE 1`.
