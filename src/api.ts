// Client for the Atelier endpoint. Opus calls stream NDJSON: blank-line heartbeats
// while the model thinks, then a final {"result": ...} line. We read the last JSON line.

export type AtelierOp = "relance" | "dramaturgie" | "traduire";

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

type ReqOf<T> = T extends RelanceRes ? RelanceReq : T extends DramaturgieRes ? DramaturgieReq : TraduireReq;

/**
 * POST to /api/atelier and read an NDJSON stream. `onHeartbeat` fires on each
 * keepalive so the UI can advance its staged-wait labels.
 */
export async function atelier<Res extends RelanceRes | DramaturgieRes | TraduireRes>(
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
