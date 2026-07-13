# La Réplique — promo film

A ~39-second Remotion showcase of La Réplique, in the app's own visual identity
(charcoal desk, gel-blue accent, Space Grotesk / IBM Plex Sans).

## Scenes

Logo → hook → **writing** (script page + keyboard flow) → **cast** (presence grid) →
**beat board** → **Atelier** (AI proposal) → **bilingual** (surtitles) →
**table read** (per-character ElevenLabs voices) → closing (tagline + URL).

1920×1080, 30 fps, H.264.

## Editing — text, timing & colours, all in one panel

**Everything editable lives in one file: [`src/copy.ts`](src/copy.ts)**, in three sections:

- **`copy`** — every word the video says (headlines, dialogue, tags, tagline, URL).
- **`timing`** — how long each scene holds, in frames (30 fps → `90` = 3 s), plus the
  `transition` length. Change a number and the **total video length re-fits itself**.
- **`palette`** — the accent colour of each scene (`gel`, `cyan`, `plum`, `rose`, `jade`).
  These drive each scene's glow, kicker and highlights. (Per-character/beat colours live
  next to their text in `copy`.)

Two ways to edit:

1. **Live, in the browser (no code):** `npm run dev` opens Remotion Studio; edit the
   fields in the right-hand **props panel** (grouped: copy / timing / palette) and the
   preview updates as you type. Download to render, or "Save default props" to write
   your changes back into `src/copy.ts`.
2. **In the file:** edit `src/copy.ts`, save. With the Studio open it hot-reloads
   instantly; then `npm run render`.

Titles that span two lines use a real line break (`\n`) inside the string.

```bash
npm install
npm run dev      # Remotion Studio — edit text live in the props panel
npm run render   # → out/la-replique.mp4
npm run still -- --frame=284   # a single frame
```

Composition id: `Showcase` (see `src/Root.tsx`, which wires `copy.ts` as the
editable schema + default props). Scene lengths live in `src/timeline.ts`; each
scene is a component under `src/scenes/`. Colours in `src/theme.ts`, shared
primitives in `src/ui.tsx`.

Renders and caches (`out/`, `.remotion/`) are git-ignored.
