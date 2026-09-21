# Writing together — the web editor (`/ecrire`)

The way in for everyone around a play who is not on an Apple device. Design,
data layout and status live in the native repo: `la-replique-native/docs/COLLAB.md`.

| File | Role |
|---|---|
| `src/collab/fractionalIndex.ts` | Order keys — twin of the app's `FractionalIndex`, identical vectors. |
| `src/collab/core.ts` | The sync core — twin of `CollabCore.swift`: shadow diff → ops, apply remote, **rebase**. 11 tests incl. a 120-seed fuzz against a simulated Firestore. |
| `src/collab/firebase.ts` | Auth (Google, email link; emulator: anonymous), Firestore transport, membership, join, presence. |
| `src/collab/Ecrire.tsx` | `/ecrire` (sign-in → my plays + join) and `/ecrire/<playID>` (the live room). Reuses `ui/Editor.tsx` and `ui/CastPanel.tsx` untouched in spirit. |
| `firebase/firestore.rules` + `rules.test.ts` | Access rules, 13 emulator tests (`npm run test:rules`). |

Things worth knowing:

- **`rebase`** — the editor commits whole plays computed from what it last
  rendered. If someone's change landed in between, committing as-is would undo
  it and the next flush would push that undo to everyone. `commit` therefore
  lays only what changed (base → next) onto the current truth, using the live
  engine's real order keys.
- **Ids are UPPERCASE** (`model.uid()`): the app's UUID strings are uppercase and
  an id is a document key — a lowercase twin would be a second line.
- **Loaded on demand**: `main.tsx` imports `/ecrire` dynamically, so the landing
  and the reader carry neither Firebase nor the editor.
- **No AI here** (`<Editor noAI>`): the retouch popover spends the site owner's key.
- **Emulator**: `npm run emulators`, then `http://localhost:3260/ecrire?emu=1`
  (adds an "enter as « Navigateur »" button; never in production).
- Not yet: Sign in with Apple on the web (needs an Apple Services ID + key),
  creating a shared play from the web, notes (step 4).
