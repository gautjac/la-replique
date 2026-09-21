// Security rules, exercised against the Firestore emulator:
//   npm run test:rules
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { Timestamp, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

let env: RulesTestEnvironment;
const PLAY = "play1";
const db = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const soon = () => Timestamp.fromMillis(Date.now() + 3600_000);
const past = () => Timestamp.fromMillis(Date.now() - 1000);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-la-replique",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8"), host: "127.0.0.1", port: 8085 },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // jac owns the play; zoe writes, luc comments, ana reads; bob is a stranger.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, `plays/${PLAY}`), { title: "La porte", ownerUid: "jac" });
    await setDoc(doc(f, `plays/${PLAY}/members/jac`), { uid: "jac", role: "writer", name: "Jac" });
    await setDoc(doc(f, `plays/${PLAY}/members/zoe`), { uid: "zoe", role: "writer", name: "Zoé" });
    await setDoc(doc(f, `plays/${PLAY}/members/luc`), { uid: "luc", role: "commenter", name: "Luc" });
    await setDoc(doc(f, `plays/${PLAY}/members/ana`), { uid: "ana", role: "reader", name: "Ana" });
    await setDoc(doc(f, `plays/${PLAY}/elements/e1`), { kind: "cue", text: "Un.", orderKey: "V" });
    await setDoc(doc(f, `plays/${PLAY}/notes/n1`), { authorUid: "luc", body: "Garde ça sec.", resolved: false });
    await setDoc(doc(f, "invites/tok-w"), { playID: PLAY, role: "writer", createdBy: "jac", expiresAt: soon() });
    await setDoc(doc(f, "invites/tok-old"), { playID: PLAY, role: "writer", createdBy: "jac", expiresAt: past() });
  });
});

describe("reading", () => {
  it("members read the play and its lines; strangers and signed-out people don't", async () => {
    for (const who of ["jac", "zoe", "luc", "ana"]) await assertSucceeds(getDoc(doc(db(who), `plays/${PLAY}/elements/e1`)));
    await assertFails(getDoc(doc(db("bob"), `plays/${PLAY}`)));
    await assertFails(getDoc(doc(db("bob"), `plays/${PLAY}/elements/e1`)));
    await assertFails(getDoc(doc(db(), `plays/${PLAY}/elements/e1`)));
  });
  it("you can list the plays you're in, and only those", async () => {
    await assertSucceeds(getDocs(query(collectionGroup(db("zoe"), "members"), where("uid", "==", "zoe"))));
    await assertFails(getDocs(query(collectionGroup(db("zoe"), "members"), where("uid", "==", "jac"))));
    await assertFails(getDocs(collectionGroup(db("zoe"), "members")));
  });
});

describe("writing the script", () => {
  it("writers edit lines, cast and info", async () => {
    await assertSucceeds(updateDoc(doc(db("zoe"), `plays/${PLAY}/elements/e1`), { text: "Un, j'ai dit." }));
    await assertSucceeds(setDoc(doc(db("zoe"), `plays/${PLAY}/elements/e2`), { kind: "cue", text: "Deux.", orderKey: "V00G" }));
    await assertSucceeds(deleteDoc(doc(db("zoe"), `plays/${PLAY}/elements/e1`)));
    await assertSucceeds(setDoc(doc(db("zoe"), `plays/${PLAY}/characters/c1`), { name: "ALICE" }));
    await assertSucceeds(updateDoc(doc(db("zoe"), `plays/${PLAY}`), { title: "La porte (2)" }));
  });
  it("commenters, readers and strangers cannot touch the script", async () => {
    for (const who of ["luc", "ana", "bob"]) {
      await assertFails(updateDoc(doc(db(who), `plays/${PLAY}/elements/e1`), { text: "piraté" }));
      await assertFails(setDoc(doc(db(who), `plays/${PLAY}/elements/x`), { kind: "cue", text: "x" }));
      await assertFails(deleteDoc(doc(db(who), `plays/${PLAY}/elements/e1`)));
    }
  });
  it("a writer cannot take the play over, and a line has a size limit", async () => {
    await assertFails(updateDoc(doc(db("zoe"), `plays/${PLAY}`), { ownerUid: "zoe" }));
    await assertFails(updateDoc(doc(db("zoe"), `plays/${PLAY}/elements/e1`), { text: "x".repeat(20001) }));
    await assertFails(deleteDoc(doc(db("zoe"), `plays/${PLAY}`)));
    await assertSucceeds(deleteDoc(doc(db("jac"), `plays/${PLAY}`)));
  });
});

describe("membership", () => {
  it("creating a play seats its owner as a writer — and only the owner", async () => {
    await assertSucceeds(setDoc(doc(db("bob"), "plays/p2"), { title: "Neuve", ownerUid: "bob" }));
    await assertSucceeds(setDoc(doc(db("bob"), "plays/p2/members/bob"), { uid: "bob", role: "writer", name: "Bob" }));
    await assertFails(setDoc(doc(db("bob"), "plays/p3"), { title: "Usurpée", ownerUid: "jac" }));
    await assertFails(setDoc(doc(db("zoe"), "plays/p2/members/zoe"), { uid: "zoe", role: "writer", name: "Zoé" }));
  });
  it("a live invite lets you in at exactly its role", async () => {
    await assertSucceeds(getDoc(doc(db("bob"), "invites/tok-w")));
    await assertSucceeds(setDoc(doc(db("bob"), `plays/${PLAY}/members/bob`), { uid: "bob", role: "writer", name: "Bob", via: "tok-w" }));
    await assertSucceeds(updateDoc(doc(db("bob"), `plays/${PLAY}/elements/e1`), { text: "Bob écrit." }));
  });
  it("no invite, a wrong role, an expired invite, or someone else's seat: refused", async () => {
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/members/bob`), { uid: "bob", role: "writer", name: "Bob" }));
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/members/bob`), { uid: "bob", role: "writer", name: "Bob", via: "nope" }));
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/members/bob`), { uid: "bob", role: "writer", name: "Bob", via: "tok-old" }));
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/members/bob`), { uid: "jac", role: "writer", name: "Bob", via: "tok-w" }));
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/members/eve`), { uid: "bob", role: "writer", name: "Eve", via: "tok-w" }));
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "invites/tok-r"), { playID: PLAY, role: "reader", createdBy: "jac", expiresAt: soon() }));
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/members/bob`), { uid: "bob", role: "writer", name: "Bob", via: "tok-r" }));
  });
  it("nobody promotes themselves; the owner changes roles and removes people; anyone may leave", async () => {
    await assertFails(updateDoc(doc(db("luc"), `plays/${PLAY}/members/luc`), { uid: "luc", role: "writer" }));
    await assertSucceeds(updateDoc(doc(db("luc"), `plays/${PLAY}/members/luc`), { name: "Luc B." }));
    await assertFails(updateDoc(doc(db("zoe"), `plays/${PLAY}/members/luc`), { uid: "luc", role: "writer" }));
    await assertSucceeds(updateDoc(doc(db("jac"), `plays/${PLAY}/members/luc`), { uid: "luc", role: "writer" }));
    await assertFails(deleteDoc(doc(db("zoe"), `plays/${PLAY}/members/ana`)));
    await assertSucceeds(deleteDoc(doc(db("jac"), `plays/${PLAY}/members/ana`)));
    await assertSucceeds(deleteDoc(doc(db("zoe"), `plays/${PLAY}/members/zoe`)));
    await assertFails(deleteDoc(doc(db("jac"), `plays/${PLAY}/members/jac`)));
  });
  it("only the owner makes invites, and they cannot be listed or edited", async () => {
    await assertSucceeds(setDoc(doc(db("jac"), "invites/t2"), { playID: PLAY, role: "commenter", createdBy: "jac", expiresAt: soon() }));
    await assertFails(setDoc(doc(db("zoe"), "invites/t3"), { playID: PLAY, role: "writer", createdBy: "zoe", expiresAt: soon() }));
    await assertFails(updateDoc(doc(db("jac"), "invites/tok-w"), { role: "reader" }));
    await assertSucceeds(deleteDoc(doc(db("jac"), "invites/tok-w")));
  });
});

describe("notes and presence", () => {
  it("writers and commenters leave notes as themselves; readers don't", async () => {
    await assertSucceeds(setDoc(doc(db("luc"), `plays/${PLAY}/notes/n2`), { authorUid: "luc", body: "Combien de temps ?", resolved: false }));
    await assertFails(setDoc(doc(db("luc"), `plays/${PLAY}/notes/n3`), { authorUid: "zoe", body: "au nom de Zoé", resolved: false }));
    await assertFails(setDoc(doc(db("ana"), `plays/${PLAY}/notes/n4`), { authorUid: "ana", body: "lectrice", resolved: false }));
    await assertFails(setDoc(doc(db("luc"), `plays/${PLAY}/notes/n5`), { authorUid: "luc", body: "x".repeat(2001), resolved: false }));
  });
  it("a note is its author's; writers may only resolve or hide it", async () => {
    await assertSucceeds(updateDoc(doc(db("luc"), `plays/${PLAY}/notes/n1`), { body: "Garde ça très sec." }));
    await assertSucceeds(updateDoc(doc(db("zoe"), `plays/${PLAY}/notes/n1`), { resolved: true }));
    await assertFails(updateDoc(doc(db("zoe"), `plays/${PLAY}/notes/n1`), { body: "réécrit par Zoé" }));
    await assertFails(deleteDoc(doc(db("zoe"), `plays/${PLAY}/notes/n1`)));
    await assertSucceeds(deleteDoc(doc(db("luc"), `plays/${PLAY}/notes/n1`)));
  });
  it("you write your own presence only", async () => {
    await assertSucceeds(setDoc(doc(db("ana"), `plays/${PLAY}/presence/ana`), { name: "Ana", elementID: "e1" }));
    await assertFails(setDoc(doc(db("ana"), `plays/${PLAY}/presence/zoe`), { name: "Zoé", elementID: "e1" }));
    await assertFails(setDoc(doc(db("bob"), `plays/${PLAY}/presence/bob`), { name: "Bob" }));
  });
});
