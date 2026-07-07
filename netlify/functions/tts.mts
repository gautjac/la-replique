import type { Context } from "@netlify/functions";

// A rotation of stable ElevenLabs default voices (available on every account).
// Characters map onto these by index; the last is reserved for the narrator.
const VOICES = [
  "21m00Tcm4TlvDq8ikWAM", // Rachel (F)
  "ErXwobaYiN019PkySvjV", // Antoni (M)
  "EXAVITQu4vr4xnSDxMaL", // Bella (F)
  "VR6AewLTigWG4xSOukaG", // Arnold (M)
  "MF3mGyEYCl7XYWbV9V6O", // Elli (F)
  "TxGEqnHWrfWFTfGW9XjX", // Josh (M)
  "AZnzlk1XvdvUeBnXmlld", // Domi (F)
  "pNInz6obpgDQGcFmaJgB", // Adam (M)
];
const NARRATOR = "onwK4e9ZLuTAKqWW03F9"; // Daniel — a calm, neutral narrator

interface Body {
  text?: string;
  voiceId?: string; // explicit chosen voice — wins over the index rotation
  voiceIndex?: number;
  narrator?: boolean;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return json({ error: "no-key" }, 503); // client falls back to OS voices

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const text = (body.text ?? "").trim();
  if (!text) return json({ error: "Empty text" }, 400);
  if (text.length > 800) return json({ error: "Text too long" }, 400);

  const voiceId =
    typeof body.voiceId === "string" && body.voiceId.trim()
      ? body.voiceId.trim()
      : body.narrator
        ? NARRATOR
        : VOICES[Math.abs(body.voiceIndex ?? 0) % VOICES.length];

  try {
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15 },
        }),
      },
    );

    if (!resp.ok || !resp.body) {
      const detail = await resp.text().catch(() => "");
      return json({ error: `elevenlabs ${resp.status}`, detail: detail.slice(0, 200) }, 502);
    }

    return new Response(resp.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "tts failed" }, 500);
  }
};
