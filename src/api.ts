// Client for the Atelier endpoint. Opus calls stream NDJSON: blank-line heartbeats
// while the model thinks, then a final {"result": ...} line. We read the last JSON line.

export type AtelierOp = "relance" | "dramaturgie" | "traduire" | "retoucher" | "voix" | "etsi";

export interface ElevenVoice {
  id: string;
  name: string;
  gender?: string;
  accent?: string;
  description?: string;
  category?: string;
}

/** List the account's ElevenLabs voices. null = no key configured. */
export async function fetchVoices(signal?: AbortSignal): Promise<ElevenVoice[] | null> {
  const resp = await fetch("/api/voices", { signal });
  if (resp.status === 503) return null;
  if (!resp.ok) throw new Error(`voices ${resp.status}`);
  const data = (await resp.json()) as { voices?: ElevenVoice[] };
  return data.voices ?? [];
}

export interface TtsOpts {
  voiceId?: string; // explicit chosen voice
  voiceIndex: number; // fallback rotation index
  narrator: boolean;
}

/**
 * Fetch ElevenLabs speech for a line. Returns an audio Blob, or `null` when the
 * server has no ElevenLabs key configured (so the caller falls back to OS voices).
 * Throws on other failures.
 */
export async function ttsFetch(text: string, opts: TtsOpts, signal?: AbortSignal): Promise<Blob | null> {
  const resp = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, voiceId: opts.voiceId, voiceIndex: opts.voiceIndex, narrator: opts.narrator }),
    signal,
  });
  if (resp.status === 503) return null; // no key configured
  if (!resp.ok) throw new Error(`tts ${resp.status}`);
  return await resp.blob();
}

export interface RelanceReq {
  op: "relance";
  lang: "fr" | "en";
  scene: string; // the scene so far, as formatted script text
  characterName: string;
  cast: string[]; // character names, for context
}
export interface RelanceRes {
  line: string;
  parenthetical?: string;
}

export interface DramaturgieReq {
  op: "dramaturgie";
  lang: "fr" | "en";
  scene: string;
}
export interface DramaturgiePoint {
  kind: "tension" | "clarte" | "voix" | "piste";
  text: string;
}
export interface DramaturgieRes {
  read: string; // one honest paragraph
  points: DramaturgiePoint[];
}

export interface TraduireReq {
  op: "traduire";
  from: "fr" | "en";
  to: "fr" | "en";
  items: { k: string; t: string }[];
}
export interface TraduireRes {
  items: { k: string; t: string }[];
}

export type RetoucheMode = "tighten" | "alternatives" | "tactic";
export interface RetoucheReq {
  op: "retoucher";
  lang: "fr" | "en";
  scene: string;
  characterName: string;
  line: string;
  mode: RetoucheMode;
}
export interface RetoucheRes {
  variants: { text: string; note?: string }[];
}

export interface VoixReq {
  op: "voix";
  lang: "fr" | "en";
  characterName: string;
  lines: string[];
}
export interface VoixRes {
  read: string;
  points: { excerpt: string; note: string }[];
}

export interface EtSiReq {
  op: "etsi";
  lang: "fr" | "en";
  scene: string;
}
export interface EtSiRes {
  ideas: { premise: string; why: string }[];
}

type ReqOf<T> = T extends RelanceRes
  ? RelanceReq
  : T extends DramaturgieRes
    ? DramaturgieReq
    : T extends RetoucheRes
      ? RetoucheReq
      : T extends VoixRes
        ? VoixReq
        : T extends EtSiRes
          ? EtSiReq
          : TraduireReq;

/**
 * POST to /api/atelier and read an NDJSON stream. `onHeartbeat` fires on each
 * keepalive so the UI can advance its staged-wait labels.
 */
export async function atelier<Res extends RelanceRes | DramaturgieRes | TraduireRes | RetoucheRes | VoixRes | EtSiRes>(
  body: ReqOf<Res>,
  opts?: { signal?: AbortSignal; onHeartbeat?: () => void },
): Promise<Res> {
  const resp = await fetch("/api/atelier", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`atelier ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastJson: unknown = null;

  const consume = (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) {
        opts?.onHeartbeat?.();
        continue;
      }
      try {
        lastJson = JSON.parse(line);
      } catch {
        /* partial or non-JSON heartbeat text — ignore */
      }
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (value) consume(decoder.decode(value, { stream: true }));
    if (done) break;
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      lastJson = JSON.parse(tail);
    } catch {
      /* ignore */
    }
  }

  const obj = lastJson as { result?: Res; error?: string } | null;
  if (!obj || obj.error || !obj.result) {
    throw new Error(obj?.error || "atelier: no result");
  }
  return obj.result;
}
