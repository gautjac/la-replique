# Notes on a shared reading — web viewer

Design, storage model and the CloudKit Console setup are documented once, in
the native repo: `la-replique-native/docs/NOTES.md`. This side in brief:

| File | Role |
|---|---|
| `src/lire/comments.ts` | The pure rules (threads, resolved, hidden, detached, quotes, rights). Mirrors `Comments.swift`. |
| `src/lire/backend.ts` | One interface, two homes for notes. |
| `src/lire/cloudkit.ts` | CloudKit JS: anonymous reads with the web token; Apple ID sign-in to write. |
| `src/lire/demoBackend.ts` | `/lire/demo`: same UI, everything in `sessionStorage`, enter as a reader or as the author. |
| `src/lire/useComments.ts` | State, 30 s polling, owner-list edits with one conflict retry. |
| `src/lire/Notes.tsx`, `Lire.tsx` | The bar, margin chips, thread cards, composer, FR/EN. |

Notes appear only when the play's `PublicPlay` record has `commentsOpen = 1`
**and** its JSON carries element ids, so every reading published before this
feature renders exactly as it did.

Try it: `npm run dev:vite` → `/lire/demo`. Tests: `npx vitest run src/lire`.
