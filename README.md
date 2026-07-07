# La Réplique

**L'atelier bilingue d'écriture théâtrale** — a playwriting studio for the stage.

Write a play the way a scene is built: block by block, réplique by réplique, with a
pocket dramaturg who reads, relaunches, and translates — but never writes for you unless
you say so.

Where [L'Interligne](https://l-interligne.netlify.app) analyses a *finished* script for
subtext, La Réplique is where the script gets *written*.

## What it does

- **A structured stage editor.** Every block is a typed element — réplique (line),
  didascalie (stage direction), scène, acte. `Enter` starts the next line, `Tab` changes
  a block's type, `⌫` on an empty block deletes it. Character cues are colour-coded to
  your cast.
- **A living cast.** Name a character once; the presence grid (*grille de présence*) shows
  who speaks in which scene, and *Mesures* counts lines, spoken words, and an estimated
  running time.
- **Bilingual, twice over.** The interface is FR/EN (Québécois-first), *and* each play has
  its own language — write an English play with a French interface, or the reverse.
- **The Atelier (AI).** Three tools, each a proposal you accept or reject in one gesture:
  - **Relancer** — proposes the next line in a chosen character's voice *(inline)*.
  - **Lecture dramaturgique** — an honest, no-flattery read of a scene *(artifact)*.
  - **Traduire** — a playable FR ↔ EN translation that keeps the structure, created as a
    **new** play so your original is never touched *(preview-before-apply)*.
- **Exports.** Print / PDF (clean stage manuscript), plain-text `.txt`, and a `.json`
  backup you can re-import.

## Stack

Vite + React 19 + TypeScript + Tailwind v3 + Dexie (IndexedDB, local-first) + a Netlify
Function that calls the Claude API. No backend, no accounts — your plays live in your
browser (persistent storage is requested at boot; IndexedDB is the only copy).

## Develop

```bash
npm install
npm run dev        # netlify dev (functions + vite) — needs CLAUDE_API_KEY
npm run dev:vite   # UI only, no AI
npm test           # vitest (model / ops / export / translate / i18n)
npm run build      # tsc -b && vite build
```

The Atelier endpoint lives at `netlify/functions/atelier.mts` (+ `lib/dramaturge.ts`) and
streams NDJSON (heartbeats then a final `{result}` line) so long Opus calls survive the
proxy timeout. The model id is pinned in one place; see `evals/goldens.md` before bumping
it.

## AI conduct

Follows the atelier's shared [Conduite AI](../_CONDUITE_AI.md): draft-not-verdict labels
(« ébauche · à toi de décider »), no sycophancy in the dramaturgical read, nothing added
to your script without an explicit gesture, staged waits on the stream, and untrusted
scene text framed as material — never as instructions.

Built for Jac. 🎭
