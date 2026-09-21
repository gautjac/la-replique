// Firebase for the collaborative web editor: who you are, the road to Firestore,
// who else is here, and joining a play. The same project, rules and document
// shapes as the native app (see la-replique-native/docs/COLLAB.md).
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider, connectAuthEmulator, getAuth, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail,
  signInAnonymously, signInWithEmailLink, signInWithPopup, signOut, updateProfile, type Auth, type User,
} from "firebase/auth";
import {
  Timestamp, collection, collectionGroup, connectFirestoreEmulator, deleteDoc, deleteField, doc, getDoc, getDocFromServer,
  getDocs, initializeFirestore, memoryLocalCache, onSnapshot, persistentLocalCache, persistentMultipleTabManager, query,
  serverTimestamp, setDoc, updateDoc, where, writeBatch, type Firestore, type Unsubscribe,
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";
import { INFO, keyOf, type Change, type Fields, type Kind, type Op, type Ref } from "./core";
import { CAST_SWATCHES } from "../types";

/** `?emu=1` on localhost talks to the local emulators (npm run emulators). */
export const EMULATOR =
  typeof window !== "undefined" && window.location.hostname === "localhost" &&
  (new URLSearchParams(window.location.search).has("emu") || sessionStorage.getItem("lr.emu") === "1");

let app: FirebaseApp | null = null;
let db: Firestore;
let auth: Auth;

function boot(): void {
  if (app) return;
  if (EMULATOR) sessionStorage.setItem("lr.emu", "1");
  app = initializeApp(EMULATOR ? { ...firebaseConfig, projectId: "demo-la-replique" } : firebaseConfig);
  db = initializeFirestore(app, {
    localCache: EMULATOR ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  auth = getAuth(app);
  if (EMULATOR) {
    connectFirestoreEmulator(db, "127.0.0.1", 8085);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
}

// MARK: who you are

export interface Person { uid: string; name: string; email: string | null }
const toPerson = (u: User | null): Person | null => (u ? { uid: u.uid, name: u.displayName ?? "", email: u.email } : null);

export function watchAuth(cb: (p: Person | null) => void): Unsubscribe {
  boot();
  return onAuthStateChanged(auth, (u) => cb(toPerson(u)));
}
export const currentUid = (): string | null => { boot(); return auth.currentUser?.uid ?? null; };

export async function signInGoogle(): Promise<void> { boot(); await signInWithPopup(auth, new GoogleAuthProvider()); }
/** Emulator only — lets the editor be exercised without any real account. */
export async function signInDemo(name: string): Promise<void> {
  boot();
  const c = await signInAnonymously(auth);
  await updateProfile(c.user, { displayName: name });
}

const PENDING_EMAIL = "lr.pendingEmail";
const RETURN_TO = "lr.returnTo";
export async function sendEmailLink(email: string, returnTo: string): Promise<void> {
  boot();
  await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), { url: `${window.location.origin}/connexion`, handleCodeInApp: true });
  localStorage.setItem(PENDING_EMAIL, email.trim().toLowerCase());
  localStorage.setItem(RETURN_TO, returnTo);
}
/**
 * On /connexion: if THIS browser asked for the link, finish here and say where to
 * go back to. Otherwise (the link was asked for from the app) return null — the
 * page then offers "copy this link".
 */
export async function completeEmailLink(href: string): Promise<string | null> {
  boot();
  const email = localStorage.getItem(PENDING_EMAIL);
  if (!email || !isSignInWithEmailLink(auth, href)) return null;
  await signInWithEmailLink(auth, email, href);
  localStorage.removeItem(PENDING_EMAIL);
  const back = localStorage.getItem(RETURN_TO) ?? "/ecrire";
  localStorage.removeItem(RETURN_TO);
  return back;
}
export async function rename(name: string): Promise<void> { boot(); if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name }); }
export async function signOutNow(): Promise<void> { boot(); await signOut(auth); }

// MARK: the road to Firestore

const INFO_KEYS = new Set(["title", "subtitle", "author", "logline", "lang", "altLang"]);
const strings = (data: Record<string, unknown>, only?: Set<string>): Fields => {
  const out: Fields = {};
  for (const [k, v] of Object.entries(data)) if (typeof v === "string" && (!only || only.has(k))) out[k] = v;
  return out;
};
const colName = (k: Kind) => (k === "character" ? "characters" : "elements");
const docOf = (playID: string, ref: Ref) => (ref.kind === "info" ? doc(db, "plays", playID) : doc(db, "plays", playID, colName(ref.kind), ref.id));

export interface TransportHandlers {
  onChanges(changes: Change[]): void;
  onLive(live: boolean): void;
  onLost(): void;
}

/** Listeners report server state overlaid with this tab's pending writes — the core's contract. */
export function listen(playID: string, known: Iterable<string>, h: TransportHandlers): Unsubscribe {
  boot();
  const mine: Record<string, Set<string>> = { character: new Set(), element: new Set() };
  for (const k of known) { const [kind, id] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)]; mine[kind]?.add(id); }
  const fromServer = new Set<Kind>();
  const heard = (kind: Kind, cache: boolean) => { if (cache) fromServer.delete(kind); else fromServer.add(kind); h.onLive(fromServer.size === 3); };

  const subs: Unsubscribe[] = [
    onSnapshot(doc(db, "plays", playID), { includeMetadataChanges: true }, (snap) => {
      if (!snap.exists()) { if (!snap.metadata.fromCache) h.onLost(); return; }
      h.onChanges([{ t: "upsert", ref: INFO, fields: strings(snap.data(), INFO_KEYS) }]);
      heard("info", snap.metadata.fromCache);
    }, () => h.onLost()),
  ];
  for (const kind of ["character", "element"] as const) {
    let reconciled = false;
    subs.push(onSnapshot(collection(db, "plays", playID, colName(kind)), { includeMetadataChanges: true }, (snap) => {
      const changes: Change[] = snap.docChanges({ includeMetadataChanges: false }).map((c) =>
        c.type === "removed" ? { t: "removed", ref: { kind, id: c.doc.id } } : { t: "upsert", ref: { kind, id: c.doc.id }, fields: strings(c.doc.data()) });
      // First word from the server: what we knew and it no longer has was deleted while we were away.
      if (!snap.metadata.fromCache && !reconciled) {
        reconciled = true;
        const alive = new Set(snap.docs.map((d) => d.id));
        for (const id of mine[kind]) if (!alive.has(id)) changes.push({ t: "removed", ref: { kind, id } });
      }
      if (changes.length) h.onChanges(changes);
      heard(kind, snap.metadata.fromCache);
    }, () => h.onLost()));
  }
  return () => subs.forEach((u) => u());
}

/** Puts and deletes in batches; patches ONE BY ONE so a patch to a just-deleted line fails alone. */
export function send(playID: string, ops: Op[]): void {
  boot();
  let batch = writeBatch(db), n = 0;
  const flush = (force = false) => { if (n && (force || n >= 400)) { void batch.commit().catch(() => undefined); batch = writeBatch(db); n = 0; } };
  for (const op of ops) {
    if (op.t === "put") { batch.set(docOf(playID, op.ref), op.fields, { merge: op.ref.kind === "info" }); n++; }
    else if (op.t === "delete") { batch.delete(docOf(playID, op.ref)); n++; }
    else {
      flush(true);
      const data: Record<string, unknown> = { ...op.set };
      for (const u of op.unset) data[u] = deleteField();
      void updateDoc(docOf(playID, op.ref), data).catch(() => undefined);   // NOT_FOUND = the line is gone
    }
    flush();
  }
  flush(true);
}

export async function fetchAll(playID: string): Promise<Map<string, Fields>> {
  boot();
  const info = await getDocFromServer(doc(db, "plays", playID));
  if (!info.exists()) throw new Error("not-found");
  const all = new Map<string, Fields>([[keyOf(INFO), strings(info.data(), INFO_KEYS)]]);
  for (const kind of ["character", "element"] as const)
    for (const d of (await getDocs(collection(db, "plays", playID, colName(kind)))).docs) all.set(keyOf({ kind, id: d.id }), strings(d.data()));
  return all;
}

// MARK: membership

export interface Seat { playID: string; role: string; title: string }
export async function myPlays(): Promise<Seat[]> {
  boot();
  const uid = currentUid();
  if (!uid) return [];
  const seats = await getDocs(query(collectionGroup(db, "members"), where("uid", "==", uid)));
  const out: Seat[] = [];
  for (const s of seats.docs) {
    const playRef = s.ref.parent.parent;
    if (!playRef) continue;
    const info = await getDoc(playRef).catch(() => null);
    if (info?.exists()) out.push({ playID: playRef.id, role: String(s.get("role") ?? "reader"), title: String(info.get("title") ?? "") });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}
export async function myRole(playID: string): Promise<string | null> {
  boot();
  const uid = currentUid();
  if (!uid) return null;
  const s = await getDoc(doc(db, "plays", playID, "members", uid)).catch(() => null);
  return s?.exists() ? String(s.get("role")) : null;
}

export async function playOwner(playID: string): Promise<string> {
  boot();
  const d = await getDoc(doc(db, "plays", playID)).catch(() => null);
  return d?.exists() ? String(d.get("ownerUid") ?? "") : "";
}

export type JoinError = "bad" | "expired";
/** Accepts a bare code or a whole invitation link. Returns the play id. */
export async function join(raw: string, name: string): Promise<string> {
  boot();
  const uid = currentUid();
  if (!uid) throw new Error("auth");
  const token = (raw.trim().split("/").pop() ?? "").toUpperCase();
  const inv = token ? await getDocFromServer(doc(db, "invites", token)).catch(() => null) : null;
  if (!inv?.exists()) throw new Error("bad" satisfies JoinError);
  const exp = inv.get("expiresAt") as Timestamp | undefined;
  if (exp && exp.toMillis() < Date.now()) throw new Error("expired" satisfies JoinError);
  const playID = String(inv.get("playID"));
  const seat = doc(db, "plays", playID, "members", uid);
  const has = await getDoc(seat).then((s) => s.exists()).catch(() => false);
  if (!has) await setDoc(seat, { uid, role: inv.get("role"), name, via: token });
  return playID;
}

// MARK: presence

export interface Other { uid: string; name: string; color: string; elementID?: string }
export const colorFor = (uid: string): string => {
  let n = 0;
  for (const ch of uid) n = (n * 31 + (ch.codePointAt(0) ?? 0)) & 0xffff;
  return CAST_SWATCHES[n % CAST_SWATCHES.length];
};
const STALE_MS = 45_000;

export function presence(playID: string, name: string, onOthers: (o: Other[]) => void): { focus(id: string | null): void; stop(): void } {
  boot();
  const uid = currentUid();
  if (!uid) return { focus() {}, stop() {} };
  const mine = doc(db, "plays", playID, "presence", uid);
  let focused: string | null = null;
  let raw: (Other & { seen: number })[] = [];
  const write = () => void setDoc(mine, { uid, name, color: colorFor(uid), lastSeen: serverTimestamp(), elementID: focused ?? deleteField() }, { merge: true }).catch(() => undefined);
  const prune = () => onOthers(raw.filter((o) => Date.now() - o.seen < STALE_MS).sort((a, b) => a.name.localeCompare(b.name)));
  const unsub = onSnapshot(collection(db, "plays", playID, "presence"), (snap) => {
    raw = snap.docs.filter((d) => d.id !== uid).map((d) => ({
      uid: d.id, name: String(d.get("name") ?? "?"), color: String(d.get("color") ?? colorFor(d.id)),
      elementID: d.get("elementID") as string | undefined,
      seen: (d.get("lastSeen", { serverTimestamps: "estimate" }) as Timestamp | undefined)?.toMillis() ?? Date.now(),
    }));
    prune();
  });
  write();
  let n = 0;
  const timer = window.setInterval(() => { prune(); if (++n % 4 === 0) write(); }, 5000);
  const bye = () => void deleteDoc(mine).catch(() => undefined);
  window.addEventListener("pagehide", bye);
  return {
    focus(id) { if (id !== focused) { focused = id; write(); } },
    stop() { window.clearInterval(timer); unsub(); window.removeEventListener("pagehide", bye); bye(); },
  };
}
