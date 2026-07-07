// A ready-to-paste prompt that teaches any AI model to emit a play La Réplique imports.
// Kept in sync with `fromJSON` in export.ts (the AI-friendly JSON path).
export const AI_IMPORT_PROMPT = `You are writing a stage play that will be imported into "La Réplique", a playwriting app.

Output ONLY a single JSON object — no prose, no explanation, no markdown code fences — in exactly this shape:

{
  "format": "la-replique/1",
  "title": "The Door",
  "subtitle": "a sketch",            // optional
  "author": "",                       // optional
  "lang": "fr",                        // "fr" or "en" — the language the play is written in
  "characters": [                      // optional — speakers are also inferred from the cues
    { "name": "ALICE", "note": "the older sister" },
    { "name": "BRUNO", "note": "back after ten years" }
  ],
  "elements": [                        // the play itself, in order
    { "type": "act",   "label": "ACTE I" },
    { "type": "scene", "label": "SCÈNE 1", "setting": "A kitchen. Late evening." },
    { "type": "stage", "text": "Alice dries the same plate too long. A knock. She doesn't open." },
    { "type": "cue",   "character": "BRUNO", "parenthetical": "behind the door", "text": "I know you're in there." },
    { "type": "cue",   "character": "ALICE", "text": "The light's always on. It doesn't mean anything." }
  ]
}

Element types:
- "act"   — a top-level division. { "type": "act", "label": "ACTE I" }
- "scene" — a scene heading. { "type": "scene", "label": "SCÈNE 1", "setting": "place, time" }
- "cue"   — one spoken line (une réplique). { "type": "cue", "character": "NAME", "text": "…", "parenthetical": "optional stage beat" }
- "stage" — a stage direction (une didascalie). { "type": "stage", "text": "…" }

Rules:
- Reference each speaker by NAME in "character" — you do NOT need ids.
- Put the character's spoken words in "text" only (no name prefix, no quotation marks).
- Use "stage" for anything that happens on stage that nobody says aloud.
- Keep "lang" consistent with the language you actually write in ("fr" or "en").
- Labels like "ACTE I" / "SCÈNE 1" should match the play's language ("ACT I" / "SCENE 1" for English).
- Return the JSON object ONLY. Nothing before or after it.

Now write the play the user asks for, following this format exactly.`;
