import type { Context } from "@netlify/functions";
import {
  dramaturgie,
  etsi,
  relance,
  retoucher,
  traduire,
  voix,
  type Lang,
  type RetoucheMode,
} from "./lib/dramaturge.ts";

interface Body {
  op?: "relance" | "dramaturgie" | "traduire" | "retoucher" | "voix" | "etsi";
  lang?: Lang;
  from?: Lang;
  to?: Lang;
  scene?: string;
  characterName?: string;
  cast?: string[];
  items?: { k: string; t: string }[];
  line?: string;
  mode?: RetoucheMode;
  lines?: string[];
}

const errJson = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return errJson({ error: "POST only" }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return errJson({ error: "Invalid JSON" }, 400);
  }

  const lang: Lang = body.lang === "en" ? "en" : "fr";

  // Validate cheaply before opening the stream, so bad input returns a real 400.
  if (body.op === "relance") {
    if (!body.scene?.trim() || !body.characterName?.trim()) {
      return errJson({ error: "Need a scene and a character." }, 400);
    }
  } else if (body.op === "dramaturgie") {
    if (!body.scene?.trim()) return errJson({ error: "Need a scene." }, 400);
  } else if (body.op === "traduire") {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errJson({ error: "Nothing to translate." }, 400);
    }
  } else if (body.op === "retoucher") {
    if (!body.line?.trim() || !body.characterName?.trim()) {
      return errJson({ error: "Need a line and a character." }, 400);
    }
  } else if (body.op === "voix") {
    if (!Array.isArray(body.lines) || body.lines.length === 0 || !body.characterName?.trim()) {
      return errJson({ error: "Need a character's lines." }, 400);
    }
  } else if (body.op === "etsi") {
    if (!body.scene?.trim()) return errJson({ error: "Need a scene." }, 400);
  } else {
    return errJson({ error: "Unknown op" }, 400);
  }

  // Opus can run 25–55s. Stream NDJSON: heartbeat every 3s, then a final
  // {result|error} line. The client parses the last JSON line.
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = false;
      const beat = setInterval(() => {
        if (!done) {
          try {
            controller.enqueue(enc.encode("\n"));
          } catch {
            /* closed */
          }
        }
      }, 3000);

      try {
        let result: unknown;
        if (body.op === "relance") {
          result = await relance({
            lang,
            scene: body.scene!,
            characterName: body.characterName!,
            cast: Array.isArray(body.cast) ? body.cast : [],
          });
        } else if (body.op === "dramaturgie") {
          result = await dramaturgie({ lang, scene: body.scene! });
        } else if (body.op === "retoucher") {
          result = await retoucher({
            lang,
            scene: body.scene ?? "",
            characterName: body.characterName!,
            line: body.line!,
            mode: body.mode === "tighten" || body.mode === "tactic" ? body.mode : "alternatives",
          });
        } else if (body.op === "voix") {
          result = await voix({ lang, characterName: body.characterName!, lines: body.lines! });
        } else if (body.op === "etsi") {
          result = await etsi({ lang, scene: body.scene! });
        } else {
          const from: Lang = body.from === "en" ? "en" : "fr";
          const to: Lang = body.to === "en" ? "en" : from === "fr" ? "en" : "fr";
          result = await traduire({ from, to, items: body.items! });
        }
        done = true;
        clearInterval(beat);
        controller.enqueue(enc.encode(JSON.stringify({ result }) + "\n"));
      } catch (err) {
        done = true;
        clearInterval(beat);
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(enc.encode(JSON.stringify({ error: message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
};
