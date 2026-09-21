// Notes on a SHARED play — `plays/{play}/notes/{id}`, live — behind the same
// `Backend` interface the reading page uses, so the thread cards, the composer and
// the rules (`lire/comments.ts`) are reused as they are. Twin of the app's
// `FirestoreComments.swift`: `resolved` and `hidden` are plain fields on the note.
import { collection, deleteDoc, doc, getDocs, getFirestore, onSnapshot, serverTimestamp, setDoc, updateDoc, type QueryDocumentSnapshot, type Timestamp } from "firebase/firestore";
import { BackendError, type Backend, type Draft } from "../lire/backend";
import type { CommentRec, PlayMeta } from "../lire/comments";
import { currentUid } from "./firebase";

const toRec = (d: QueryDocumentSnapshot): CommentRec | null => {
  if (d.get("hidden") === true) return null;                        // hidden notes never leave this function
  const s = (k: string): string | undefined => { const v = d.get(k); return typeof v === "string" && v ? v : undefined; };
  const at = d.get("createdAt", { serverTimestamps: "estimate" }) as Timestamp | undefined;
  return {
    id: d.id, shareID: "", elementID: s("elementID") ?? "", quote: s("quote"), body: s("body") ?? "",
    authorName: s("authorName") ?? "?", parentID: s("parentID"), resolved: d.get("resolved") === true,
    createdAt: at?.toMillis() ?? Date.now(), creator: s("authorUid") ?? "",
  };
};

export function notesBackend(playID: string, role: string, ownerUid: string): Backend {
  const notes = () => collection(getFirestore(), "plays", playID, "notes");
  const meta = (): PlayMeta => ({ commentsOpen: true, resolved: [], hidden: [], owner: ownerUid, moderator: role === "writer" });
  const guard = async <T,>(op: () => Promise<T>): Promise<T> => {
    try { return await op(); } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      throw new BackendError(/permission|unauth/.test(code) ? "auth" : /unavailable|deadline/.test(code) ? "network" : "unknown", code);
    }
  };
  return {
    kind: "cloudkit",                                                   // "not the demo": real accounts, real storage
    async loadPlay() { return { json: "{}", meta: meta() }; },
    async startAuth(onAuth) { const uid = currentUid(); onAuth(uid ? { userRecordName: uid } : null); },
    list: () => guard(async () => (await getDocs(notes())).docs.map(toRec).filter((x): x is CommentRec => !!x)),
    post: (d: Draft) => guard(async () => {
      const uid = currentUid();
      if (!uid) throw new BackendError("auth");
      const id = crypto.randomUUID().toUpperCase();
      const data: Record<string, unknown> = { authorUid: uid, authorName: d.authorName, elementID: d.elementID, body: d.body, resolved: false, hidden: false, createdAt: serverTimestamp() };
      if (d.quote) data.quote = d.quote;
      if (d.parentID) data.parentID = d.parentID;
      await setDoc(doc(notes(), id), data);
      return { id, shareID: "", elementID: d.elementID, quote: d.quote, body: d.body, authorName: d.authorName, parentID: d.parentID, resolved: false, createdAt: Date.now(), creator: uid };
    }),
    remove: (c) => guard(() => deleteDoc(doc(notes(), c.id))),
    setResolvedByAuthor: (c, resolved) => guard(async () => { await updateDoc(doc(notes(), c.id), { resolved }); return { ...c, resolved }; }),
    async ownerUpdate(_id, m) { return m; },
    hide: (c) => guard(() => updateDoc(doc(notes(), c.id), { hidden: true })),
    subscribe(_shareID, onChange) {
      return onSnapshot(notes(), (snap) => onChange(snap.docs.map(toRec).filter((x): x is CommentRec => !!x)));
    },
  };
}
