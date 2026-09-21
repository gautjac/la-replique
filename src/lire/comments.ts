// Comments on a shared reading — the pure logic, shared in spirit with the native
// app's `Comments.swift` (same rules, same tests). No CloudKit in here.
//
// Storage model (CloudKit public database, default security roles only):
//   • PlayComment — one record per comment, created by the commenter. Only its
//     creator can modify or delete it.
//   • PublicPlay  — the owner's record. Owner moderation lives HERE, because the
//     owner cannot touch other people's records: `commentsOpen`, plus the lists
//     `resolvedComments` and `hiddenComments` (comment record names).

export const MAX_BODY = 2000;
export const MAX_NAME = 40;
export const MAX_QUOTE = 280;
/** elementID of a note about the play as a whole. */
export const GENERAL = "";

export interface CommentRec {
  id: string;
  shareID: string;
  elementID: string;
  quote?: string;
  body: string;
  authorName: string;
  /** Root comment's id when this is a reply. */
  parentID?: string;
  /** Set by the comment's own author on a root comment. */
  resolved: boolean;
  createdAt: number;
  /** CloudKit user record name of whoever created it. */
  creator: string;
  changeTag?: string;
}

export interface PlayMeta {
  commentsOpen: boolean;
  resolved: string[];
  hidden: string[];
  /** The play's owner (CloudKit user record name, or Firebase uid). */
  owner: string;
  changeTag?: string;
  /**
   * In a shared play every WRITER moderates (resolve, reopen, hide) — directly on
   * the note. On a CloudKit reading only the owner does, through the lists above.
   */
  moderator?: boolean;
}

export interface Thread {
  root: CommentRec;
  replies: CommentRec[];
  resolved: boolean;
  /** Its line no longer exists in the published text. */
  detached: boolean;
  /** The original root was deleted; the earliest surviving reply stands in. */
  rootDeleted: boolean;
}

/**
 * Group comments into threads.
 *  - hidden comments vanish (a hidden root takes its replies with it);
 *  - a reply whose root is gone is kept: the earliest orphan stands in as root,
 *    so nobody's note disappears silently;
 *  - resolved = the author resolved it OR the owner listed it;
 *  - detached = anchored to an element that is no longer in the text.
 */
export function buildThreads(comments: CommentRec[], meta: PlayMeta, elementIDs: Iterable<string>): Thread[] {
  const known = new Set(elementIDs);
  const hidden = new Set(meta.hidden);
  const ownerResolved = new Set(meta.resolved);
  const visible = comments.filter((c) => !hidden.has(c.id)).sort((a, b) => a.createdAt - b.createdAt);

  const roots = new Map<string, Thread>();
  for (const c of visible) {
    if (c.parentID) continue;
    roots.set(c.id, {
      root: c,
      replies: [],
      resolved: c.resolved || ownerResolved.has(c.id),
      detached: c.elementID !== GENERAL && !known.has(c.elementID),
      rootDeleted: false,
    });
  }
  const hiddenRootIDs = new Set(comments.filter((c) => !c.parentID && hidden.has(c.id)).map((c) => c.id));
  const orphans = new Map<string, Thread>();
  for (const c of visible) {
    if (!c.parentID) continue;
    if (hiddenRootIDs.has(c.parentID)) continue; // the owner hid the whole thread
    const t = roots.get(c.parentID);
    if (t) {
      t.replies.push(c);
      continue;
    }
    const o = orphans.get(c.parentID);
    if (o) o.replies.push(c);
    else
      orphans.set(c.parentID, {
        root: c,
        replies: [],
        resolved: ownerResolved.has(c.parentID),
        detached: c.elementID !== GENERAL && !known.has(c.elementID),
        rootDeleted: true,
      });
  }
  return [...roots.values(), ...orphans.values()].sort((a, b) => a.root.createdAt - b.root.createdAt);
}

/** The id the owner's resolved/hidden lists refer to for a thread. */
export function threadKey(t: Thread): string {
  return t.rootDeleted ? (t.root.parentID ?? t.root.id) : t.root.id;
}

export function threadsFor(threads: Thread[], elementID: string): Thread[] {
  return threads.filter((t) => !t.detached && t.root.elementID === elementID);
}

export function counts(threads: Thread[]): { open: number; resolved: number; detached: number } {
  let open = 0, resolved = 0, detached = 0;
  for (const t of threads) {
    if (t.resolved) resolved++;
    else open++;
    if (t.detached) detached++;
  }
  return { open, resolved, detached };
}

export type Validation = { ok: true; value: string } | { ok: false; reason: "empty" | "tooLong" };

export function validateBody(raw: string): Validation {
  const value = raw.replace(/\r\n/g, "\n").trim();
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > MAX_BODY) return { ok: false, reason: "tooLong" };
  return { ok: true, value };
}

export function validateName(raw: string): Validation {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > MAX_NAME) return { ok: false, reason: "tooLong" };
  return { ok: true, value };
}

/** Normalise a text selection into a storable quote (single-spaced, capped). */
export function cleanQuote(raw: string): string | undefined {
  const q = raw.replace(/\s+/g, " ").trim();
  if (q.length < 2) return undefined;
  return q.length > MAX_QUOTE ? q.slice(0, MAX_QUOTE) : q;
}

export interface Segment {
  text: string;
  /** Thread ids whose quote covers this run (empty = plain text). */
  marks: string[];
}

/**
 * Split a line into plain and highlighted runs from the quotes of its open
 * threads. A quote that no longer occurs in the text (the line was rewritten)
 * is simply not highlighted — the thread still shows its quote as context.
 * Overlapping quotes: first come, first served; later ones are skipped.
 */
export function highlight(text: string, quotes: { id: string; quote?: string }[]): Segment[] {
  const ranges: { start: number; end: number; id: string }[] = [];
  for (const { id, quote } of quotes) {
    if (!quote) continue;
    const start = text.indexOf(quote);
    if (start < 0) continue;
    const end = start + quote.length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end, id });
  }
  if (!ranges.length) return [{ text, marks: [] }];
  ranges.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let at = 0;
  for (const r of ranges) {
    if (r.start > at) out.push({ text: text.slice(at, r.start), marks: [] });
    out.push({ text: text.slice(r.start, r.end), marks: [r.id] });
    at = r.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), marks: [] });
  return out;
}

/** What a viewer may do to a comment. */
export function can(
  viewer: string | null,
  meta: PlayMeta,
  c: CommentRec,
): { remove: boolean; hide: boolean; resolve: boolean } {
  const mine = !!viewer && viewer === c.creator;
  const moderates = !!viewer && (viewer === meta.owner || !!meta.moderator);
  return {
    remove: mine,
    hide: moderates && !mine,
    resolve: !c.parentID && (mine || moderates),
  };
}
