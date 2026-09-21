// One interface, two homes for comments: CloudKit (real shared readings) and an
// in-browser demo (`/lire/demo`) so the whole UI can be exercised without an
// Apple ID or a network.
import type { CommentRec, PlayMeta } from "./comments";

export interface Identity {
  userRecordName: string;
}

export interface Draft {
  shareID: string;
  elementID: string;
  quote?: string;
  body: string;
  authorName: string;
  parentID?: string;
}

export interface LoadedPlay {
  json: string;
  meta: PlayMeta;
}

export interface Backend {
  readonly kind: "cloudkit" | "demo";
  /** Fetch the published play and its owner-side comment settings; null = not found. */
  loadPlay(shareID: string): Promise<LoadedPlay | null>;
  /**
   * Start authentication. For CloudKit this renders Apple's sign-in / sign-out
   * buttons into the elements with ids SIGN_IN_ID / SIGN_OUT_ID, which must
   * already be in the DOM. Calls `onAuth` now and on every change.
   */
  startAuth(onAuth: (who: Identity | null) => void): Promise<void>;
  list(shareID: string): Promise<CommentRec[]>;
  post(draft: Draft): Promise<CommentRec>;
  remove(c: CommentRec): Promise<void>;
  /** The author of a root comment marks their own thread resolved / reopened. */
  setResolvedByAuthor(c: CommentRec, resolved: boolean): Promise<CommentRec>;
  /** The play's owner updates the resolved / hidden lists on their PublicPlay record. */
  ownerUpdate(shareID: string, meta: PlayMeta, patch: { resolved?: string[]; hidden?: string[] }): Promise<PlayMeta>;
  /** A moderator hides someone's note (shared plays). */
  hide?(c: CommentRec): Promise<void>;
  /** Live updates, when the home supports them; otherwise the hook polls. */
  subscribe?(shareID: string, onChange: (list: CommentRec[]) => void): () => void;
}

export const SIGN_IN_ID = "apple-sign-in-button";
export const SIGN_OUT_ID = "apple-sign-out-button";

export type BackendErrorCode = "auth" | "conflict" | "network" | "unknown";

export class BackendError extends Error {
  code: BackendErrorCode;
  constructor(code: BackendErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}
