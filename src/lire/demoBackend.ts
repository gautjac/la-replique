// The demo home for comments (`/lire/demo`): same interface as CloudKit, but
// everything lives in this browser (sessionStorage). It lets anyone try the
// feature — sign in, comment, reply, resolve, and see it as the play's author —
// without an Apple ID, and lets us verify the whole UI offline.
import { BackendError, type Backend, type Draft, type Identity, type LoadedPlay } from "./backend";
import type { CommentRec, PlayMeta } from "./comments";

export const DEMO_OWNER = "_demo-autrice";
export const DEMO_VISITOR = "_demo-toi";
const KEY = "lr.demo.comments.v1";

export const DEMO_DOC = {
  format: "la-replique/1",
  title: "La porte",
  subtitle: "esquisse",
  author: "A. Dramaturge",
  logline: "Dix ans après, il revient frapper. Elle a une assiette dans les mains et toute une vie à ne pas ouvrir.",
  lang: "fr",
  characters: [{ name: "ALICE" }, { name: "BRUNO" }],
  elements: [
    { id: "d-act1", type: "act", label: "ACTE I" },
    { id: "d-sc1", type: "scene", label: "SCÈNE 1", setting: "Une cuisine. Fin de soirée." },
    { id: "d-st1", type: "stage", text: "Alice essuie la même assiette depuis trop longtemps. On frappe. Elle n'ouvre pas." },
    { id: "d-c1", type: "cue", character: "BRUNO", parenthetical: "derrière la porte", text: "Je sais que t'es là. La lumière est allumée." },
    { id: "d-c2", type: "cue", character: "ALICE", text: "La lumière est toujours allumée. Ça veut rien dire." },
    { id: "d-c3", type: "cue", character: "BRUNO", text: "Dix ans, Alice. Ouvre la porte." },
    { id: "d-st2", type: "stage", text: "Un temps. Elle pose l'assiette." },
  ],
};

interface Shape {
  comments: CommentRec[];
  meta: PlayMeta;
}

const HOUR = 3_600_000;
function seed(): Shape {
  const now = Date.now();
  const mk = (id: string, p: Partial<CommentRec>): CommentRec => ({
    id, shareID: "demo", elementID: "", body: "", authorName: "", resolved: false, createdAt: now, creator: "_demo-x", ...p,
  });
  return {
    meta: { commentsOpen: true, resolved: [], hidden: [], owner: DEMO_OWNER },
    comments: [
      mk("s1", { elementID: "d-c2", quote: "Ça veut rien dire.", authorName: "Mireille (dramaturge)", creator: "_demo-mireille", createdAt: now - 26 * HOUR,
        body: "C'est la meilleure réplique de la page. Elle ment, pis on le sait tout de suite. Garde ça sec." }),
      mk("s2", { elementID: "d-c2", parentID: "s1", authorName: "A. Dramaturge", creator: DEMO_OWNER, createdAt: now - 25 * HOUR,
        body: "Merci. J'hésitais à rajouter une phrase après — je la laisse tomber." }),
      mk("s3", { elementID: "d-st1", quote: "depuis trop longtemps", authorName: "Luc (metteur en scène)", creator: "_demo-luc", createdAt: now - 5 * HOUR,
        body: "Combien de temps, concrètement ? J'ai besoin d'un chiffre pour régler le silence d'ouverture." }),
      mk("s4", { elementID: "d-c3", authorName: "Luc (metteur en scène)", creator: "_demo-luc", createdAt: now - 4 * HOUR, resolved: true,
        body: "« Dix ans » : on l'entend bien, c'est réglé." }),
      mk("s5", { elementID: "d-coupee", quote: "Tu peux pas rester là toute la nuit.", authorName: "Mireille (dramaturge)", creator: "_demo-mireille", createdAt: now - 30 * HOUR,
        body: "Cette réplique-là explique trop. (Note laissée sur une ligne que l'autrice a coupée depuis.)" }),
    ],
  };
}

function read(): Shape {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Shape;
  } catch {
    /* private mode — fall through to a fresh seed */
  }
  return seed();
}
function write(s: Shape): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* fine: the demo then simply forgets on reload */
  }
}

let state: Shape | null = null;
const db = (): Shape => (state ??= read());

let who: Identity | null = null;
let notify: ((w: Identity | null) => void) | null = null;

/** Demo-only: there is no Apple button here, the page calls this instead. */
export function demoSignIn(as: "visitor" | "owner" | null): void {
  who = as === null ? null : { userRecordName: as === "owner" ? DEMO_OWNER : DEMO_VISITOR };
  notify?.(who);
}

const tick = () => new Promise<void>((r) => setTimeout(r, 120));

export const demoBackend: Backend = {
  kind: "demo",
  async loadPlay(): Promise<LoadedPlay> {
    return { json: JSON.stringify(DEMO_DOC), meta: { ...db().meta } };
  },
  async startAuth(onAuth): Promise<void> {
    notify = onAuth;
    onAuth(who);
  },
  async list(): Promise<CommentRec[]> {
    await tick();
    return db().comments.map((c) => ({ ...c }));
  },
  async post(d: Draft): Promise<CommentRec> {
    await tick();
    if (!who) throw new BackendError("auth");
    const c: CommentRec = { ...d, id: crypto.randomUUID(), resolved: false, createdAt: Date.now(), creator: who.userRecordName };
    db().comments.push(c);
    write(db());
    return { ...c };
  },
  async remove(c): Promise<void> {
    await tick();
    const s = db();
    const found = s.comments.find((x) => x.id === c.id);
    if (!who || found?.creator !== who.userRecordName) throw new BackendError("auth");
    s.comments = s.comments.filter((x) => x.id !== c.id);
    write(s);
  },
  async setResolvedByAuthor(c, resolved): Promise<CommentRec> {
    await tick();
    const found = db().comments.find((x) => x.id === c.id);
    if (!who || !found || found.creator !== who.userRecordName) throw new BackendError("auth");
    found.resolved = resolved;
    write(db());
    return { ...found };
  },
  async ownerUpdate(_shareID, meta, patch): Promise<PlayMeta> {
    await tick();
    if (who?.userRecordName !== DEMO_OWNER) throw new BackendError("auth");
    const s = db();
    s.meta = { ...s.meta, resolved: patch.resolved ?? meta.resolved, hidden: patch.hidden ?? meta.hidden };
    write(s);
    return { ...s.meta };
  },
};
