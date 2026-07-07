import type { Context } from "@netlify/functions";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });

interface ElevenVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "GET only" }, 405);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return json({ error: "no-key" }, 503);

  try {
    const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!resp.ok) return json({ error: `elevenlabs ${resp.status}` }, 502);
    const data = (await resp.json()) as { voices?: ElevenVoice[] };
    const voices = (data.voices ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender,
      accent: v.labels?.accent,
      description: v.labels?.description,
      category: v.category,
    }));
    return json({ voices });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "voices failed" }, 500);
  }
};
