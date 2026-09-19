// CloudKit JS client for the public viewer.
//  • Reading a PublicPlay (recordName == shareID) and its PlayComment records
//    needs only the origin-restricted web API token — no sign-in.
//  • Writing a comment needs the reader to sign in with their Apple ID. CloudKit
//    stamps each record with its creator, and the default security roles let
//    only that creator change or delete it.
import { BackendError, SIGN_IN_ID, SIGN_OUT_ID, type Backend, type Draft, type Identity, type LoadedPlay } from "./backend";
import type { CommentRec, PlayMeta } from "./comments";

const TOKEN = import.meta.env.VITE_CLOUDKIT_TOKEN as string | undefined;
const CONTAINER = "iCloud.app.atelier.lareplique";
const ENVIRONMENT = "production"; // TestFlight/App Store builds publish to production
const COMMENT_TYPE = "PlayComment";
const PLAY_TYPE = "PublicPlay";
// The field holding the reading's share id. Deliberately NOT `shareID`: native
// CKQuery reads that key as CloudKit's system `share` reference ("Unknown field
// '___share'"). Must match `CloudKitComments.shareField` in the app.
const SHARE_FIELD = "readingID";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCK = any;

let ckPromise: Promise<AnyCK> | null = null;

export function hasToken(): boolean {
  return !!TOKEN;
}

function loadCloudKit(): Promise<AnyCK> {
  if (ckPromise) return ckPromise;
  ckPromise = new Promise<AnyCK>((resolve, reject) => {
    const existing = (window as unknown as { CloudKit?: AnyCK }).CloudKit;
    if (existing) return resolve(existing);
    const s = document.createElement("script");
    s.src = "https://cdn.apple-cloudkit.com/ck/2/cloudkit.js";
    s.async = true;
    s.onload = () => {
      const CloudKit = (window as unknown as { CloudKit?: AnyCK }).CloudKit;
      if (CloudKit) resolve(CloudKit);
      else reject(new Error("CloudKit unavailable"));
    };
    s.onerror = () => reject(new Error("CloudKit script failed to load"));
    document.head.appendChild(s);
  }).then((CloudKit: AnyCK) => {
    CloudKit.configure({
      containers: [
        {
          containerIdentifier: CONTAINER,
          apiTokenAuth: {
            apiToken: TOKEN,
            // Remember a signed-in commenter across visits. Anonymous reading is
            // unaffected: no cookie exists until someone actually signs in.
            persist: true,
            signInButton: { id: SIGN_IN_ID, theme: "black" },
            signOutButton: { id: SIGN_OUT_ID, theme: "black" },
          },
          environment: ENVIRONMENT,
        },
      ],
    });
    return CloudKit;
  });
  return ckPromise;
}

async function publicDB(): Promise<AnyCK> {
  if (!TOKEN) throw new BackendError("unknown", "no-token");
  const CloudKit = await loadCloudKit();
  return CloudKit.getDefaultContainer().publicCloudDatabase;
}

const str = (r: AnyCK, k: string): string | undefined => {
  const v = r?.fields?.[k]?.value;
  return typeof v === "string" && v !== "" ? v : undefined;
};
const list = (r: AnyCK, k: string): string[] => {
  const v = r?.fields?.[k]?.value;
  return Array.isArray(v) ? v.filter((x: unknown): x is string => typeof x === "string") : [];
};

function toMeta(r: AnyCK): PlayMeta {
  return {
    commentsOpen: Number(r?.fields?.commentsOpen?.value ?? 0) === 1,
    resolved: list(r, "resolvedComments"),
    hidden: list(r, "hiddenComments"),
    owner: r?.created?.userRecordName ?? "",
    changeTag: r?.recordChangeTag,
  };
}

function toComment(r: AnyCK): CommentRec {
  return {
    id: r.recordName,
    shareID: str(r, SHARE_FIELD) ?? "",
    elementID: str(r, "elementID") ?? "",
    quote: str(r, "quote"),
    body: str(r, "body") ?? "",
    authorName: str(r, "authorName") ?? "?",
    parentID: str(r, "parentID"),
    resolved: Number(r?.fields?.resolved?.value ?? 0) === 1,
    createdAt: r?.created?.timestamp ?? Date.now(),
    creator: r?.created?.userRecordName ?? "",
    changeTag: r.recordChangeTag,
  };
}

function fail(response: AnyCK): never {
  const e = response?.errors?.[0];
  const code: string = e?.serverErrorCode ?? e?.ckErrorCode ?? "";
  if (/AUTHENTICATION|ACCESS_DENIED|NOT_AUTHENTICATED/.test(code)) throw new BackendError("auth", code);
  if (/CONFLICT|ATOMIC/.test(code)) throw new BackendError("conflict", code);
  if (/NETWORK|THROTTLED|UNAVAILABLE/.test(code)) throw new BackendError("network", code);
  throw new BackendError("unknown", code || e?.reason || "cloudkit");
}
const failed = (response: AnyCK): boolean => !!(response?.hasErrors && response.hasErrors());

export const cloudKitBackend: Backend = {
  kind: "cloudkit",

  async loadPlay(shareID): Promise<LoadedPlay | null> {
    const db = await publicDB();
    const response = await db.fetchRecords([shareID]);
    // a "record not found" comes back as a per-record error; treat as null
    if (failed(response)) return null;
    const record = response.records && response.records[0];
    const json = record?.fields?.json?.value;
    return typeof json === "string" ? { json, meta: toMeta(record) } : null;
  },

  async startAuth(onAuth: (who: Identity | null) => void): Promise<void> {
    const CloudKit = await loadCloudKit();
    const container = CloudKit.getDefaultContainer();
    let who: AnyCK = await container.setUpAuth();
    // CloudKit's own documented loop: each promise resolves once, then we wait
    // for the opposite event. It re-renders its buttons by itself.
    for (;;) {
      onAuth(who ? { userRecordName: who.userRecordName } : null);
      if (who) {
        await container.whenUserSignsOut();
        who = null;
      } else {
        who = await container.whenUserSignsIn();
      }
    }
  },

  async list(shareID): Promise<CommentRec[]> {
    const db = await publicDB();
    const out: CommentRec[] = [];
    let response: AnyCK = await db.performQuery(
      { recordType: COMMENT_TYPE, filterBy: [{ fieldName: SHARE_FIELD, comparator: "EQUALS", fieldValue: { value: shareID } }] },
      { resultsLimit: 200 },
    );
    for (let page = 0; page < 10; page++) {
      if (failed(response)) fail(response);
      out.push(...(response.records ?? []).map(toComment));
      if (!response.moreComing) break;
      response = await db.performQuery(response);
    }
    return out;
  },

  async post(d: Draft): Promise<CommentRec> {
    const db = await publicDB();
    const fields: Record<string, { value: unknown; type: string }> = {
      [SHARE_FIELD]: { value: d.shareID, type: "STRING" },
      elementID: { value: d.elementID, type: "STRING" },
      body: { value: d.body, type: "STRING" },
      authorName: { value: d.authorName, type: "STRING" },
      resolved: { value: 0, type: "INT64" },
    };
    if (d.quote) fields.quote = { value: d.quote, type: "STRING" };
    if (d.parentID) fields.parentID = { value: d.parentID, type: "STRING" };
    const response = await db.saveRecords([{ recordType: COMMENT_TYPE, recordName: crypto.randomUUID().toUpperCase(), fields }]);
    if (failed(response)) fail(response);
    return toComment(response.records[0]);
  },

  async remove(c): Promise<void> {
    const db = await publicDB();
    const response = await db.deleteRecords([{ recordName: c.id, recordChangeTag: c.changeTag }]);
    if (failed(response)) fail(response);
  },

  async setResolvedByAuthor(c, resolved): Promise<CommentRec> {
    const db = await publicDB();
    const response = await db.saveRecords([
      { recordType: COMMENT_TYPE, recordName: c.id, recordChangeTag: c.changeTag, fields: { resolved: { value: resolved ? 1 : 0, type: "INT64" } } },
    ]);
    if (failed(response)) fail(response);
    return { ...c, resolved, changeTag: response.records[0]?.recordChangeTag ?? c.changeTag };
  },

  async ownerUpdate(shareID, meta, patch): Promise<PlayMeta> {
    const db = await publicDB();
    const fields: Record<string, { value: unknown; type: string }> = {};
    if (patch.resolved) fields.resolvedComments = { value: patch.resolved, type: "STRING_LIST" };
    if (patch.hidden) fields.hiddenComments = { value: patch.hidden, type: "STRING_LIST" };
    const response = await db.saveRecords([{ recordType: PLAY_TYPE, recordName: shareID, recordChangeTag: meta.changeTag, fields }]);
    if (failed(response)) fail(response);
    return {
      ...meta,
      resolved: patch.resolved ?? meta.resolved,
      hidden: patch.hidden ?? meta.hidden,
      changeTag: response.records[0]?.recordChangeTag ?? meta.changeTag,
    };
  },
};
