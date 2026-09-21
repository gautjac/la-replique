// State + actions for the notes on one shared reading.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackendError, type Backend, type Draft, type Identity } from "./backend";
import { buildThreads, threadKey, type CommentRec, type PlayMeta, type Thread } from "./comments";

export type ErrKind = "auth" | "network" | "unknown";

export interface CommentsAPI {
  threads: Thread[];
  meta: PlayMeta;
  identity: Identity | null;
  error: ErrKind | null;
  clearError(): void;
  post(d: Omit<Draft, "shareID">): Promise<boolean>;
  remove(c: CommentRec): Promise<void>;
  hide(c: CommentRec): Promise<void>;
  setResolved(t: Thread, resolved: boolean): Promise<void>;
  /** Can the viewer clear every "resolved" flag currently set on this thread? */
  canReopen(t: Thread): boolean;
}

const POLL_MS = 30_000;

export function useComments(backend: Backend, shareID: string, initial: PlayMeta, elementIDs: string[]): CommentsAPI {
  const [comments, setComments] = useState<CommentRec[]>([]);
  const [meta, setMeta] = useState<PlayMeta>(initial);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<ErrKind | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const open = initial.commentsOpen;

  const fail = useCallback((e: unknown) => {
    const code = e instanceof BackendError ? e.code : "unknown";
    setError(code === "auth" ? "auth" : code === "network" ? "network" : "unknown");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setComments(await backend.list(shareID));
    } catch {
      /* a failed background refresh is silent — the notes on screen stay */
    }
  }, [backend, shareID]);

  // Auth: CloudKit renders its buttons into elements that must already exist,
  // so this runs after the comment bar has mounted.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    backend.startAuth((who) => alive && setIdentity(who)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [backend, open]);

  useEffect(() => {
    if (!open) return;
    if (backend.subscribe) return backend.subscribe(shareID, setComments);   // live: no polling
    void refresh();
    const timer = window.setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, refresh, backend, shareID]);

  const threads = useMemo(() => buildThreads(comments, meta, elementIDs), [comments, meta, elementIDs]);

  /** Owner-side list edit, retried once on a stale change tag. */
  const ownerPatch = useCallback(
    async (edit: (m: PlayMeta) => { resolved?: string[]; hidden?: string[] }) => {
      try {
        setMeta(await backend.ownerUpdate(shareID, metaRef.current, edit(metaRef.current)));
      } catch (e) {
        if (!(e instanceof BackendError) || e.code !== "conflict") throw e;
        const fresh = await backend.loadPlay(shareID);
        if (!fresh) throw e;
        setMeta(await backend.ownerUpdate(shareID, fresh.meta, edit(fresh.meta)));
      }
    },
    [backend, shareID],
  );

  const viewer = identity?.userRecordName ?? null;

  return {
    threads,
    meta,
    identity,
    error,
    clearError: () => setError(null),

    async post(d) {
      try {
        const saved = await backend.post({ ...d, shareID });
        // With a live listener the same note may already be here — never twice.
        setComments((cs) => (cs.some((x) => x.id === saved.id) ? cs : [...cs, saved]));
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },

    async remove(c) {
      try {
        await backend.remove(c);
        setComments((cs) => cs.filter((x) => x.id !== c.id));
      } catch (e) {
        fail(e);
      }
    },

    async hide(c) {
      try {
        if (backend.hide) {
          await backend.hide(c);
          setComments((cs) => cs.filter((x) => x.id !== c.id && x.parentID !== c.id));
          return;
        }
        await ownerPatch((m) => ({ hidden: [...new Set([...m.hidden, c.id])] }));
      } catch (e) {
        fail(e);
      }
    },

    canReopen(t) {
      const authorFlag = !t.rootDeleted && t.root.resolved;
      const ownerFlag = meta.resolved.includes(threadKey(t));
      if (!authorFlag && !ownerFlag) return false;
      if (authorFlag && viewer !== t.root.creator && !meta.moderator) return false;
      if (ownerFlag && viewer !== meta.owner && !meta.moderator) return false;
      return true;
    },

    async setResolved(t, resolved) {
      try {
        const key = threadKey(t);
        const mine = !t.rootDeleted && viewer === t.root.creator;
        if (meta.moderator && !t.rootDeleted) {
          // Shared play: `resolved` is a field on the note; its author and every writer may set it.
          const saved = await backend.setResolvedByAuthor(t.root, resolved);
          setComments((cs) => cs.map((x) => (x.id === saved.id ? saved : x)));
          return;
        }
        if (resolved) {
          if (mine) {
            const saved = await backend.setResolvedByAuthor(t.root, true);
            setComments((cs) => cs.map((x) => (x.id === saved.id ? saved : x)));
          } else {
            await ownerPatch((m) => ({ resolved: [...new Set([...m.resolved, key])] }));
          }
          return;
        }
        if (mine && t.root.resolved) {
          const saved = await backend.setResolvedByAuthor(t.root, false);
          setComments((cs) => cs.map((x) => (x.id === saved.id ? saved : x)));
        }
        if (metaRef.current.resolved.includes(key)) await ownerPatch((m) => ({ resolved: m.resolved.filter((id) => id !== key) }));
      } catch (e) {
        fail(e);
      }
    },
  };
}
