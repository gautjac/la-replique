import { useEffect, useMemo, useRef, useState } from "react";
import { ttsFetch } from "../api";
import { useUI } from "../i18n";
import { characterById } from "../model";
import type { Play } from "../types";
import { Segmented } from "./common";

type Engine = "eleven" | "system";

interface ReadItem {
  id: string;
  kind: "heading" | "cue" | "stage";
  name?: string;
  color?: string;
  characterIndex?: number;
  text: string;
}

function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

export function TableRead({ play, onClose }: { play: Play; onClose: () => void }) {
  const { t } = useUI();
  const voices = useVoices();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [engine, setEngine] = useState<Engine>("eleven");
  const [elevenOff, setElevenOff] = useState(false); // true once we learn there's no key
  const playingRef = useRef(false);
  const engineRef = useRef<Engine>("eleven");
  engineRef.current = engine;
  const listRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const fetchAbort = useRef<AbortController | null>(null);

  const items = useMemo<ReadItem[]>(() => {
    const charIndex = new Map(play.characters.map((c, i) => [c.id, i]));
    const out: ReadItem[] = [];
    for (const el of play.elements) {
      if (el.type === "act" || el.type === "scene") {
        out.push({ id: el.id, kind: "heading", text: el.label + (el.type === "scene" && el.setting ? ` — ${el.setting}` : "") });
      } else if (el.type === "stage") {
        if (el.text.trim()) out.push({ id: el.id, kind: "stage", text: el.text });
      } else if (el.type === "cue") {
        const c = characterById(play, el.characterId);
        if (el.text.trim()) {
          out.push({
            id: el.id,
            kind: "cue",
            name: c?.name,
            color: c?.color,
            characterIndex: charIndex.get(el.characterId) ?? 0,
            text: el.text,
          });
        }
      }
    }
    return out;
  }, [play]);

  const langVoices = useMemo(() => {
    const matched = voices.filter((v) => v.lang.toLowerCase().startsWith(play.lang));
    return matched.length ? matched : voices;
  }, [voices, play.lang]);

  const voiceForItem = (it: ReadItem): SpeechSynthesisVoice | undefined => {
    if (!langVoices.length) return undefined;
    if (it.kind === "cue" && it.characterIndex !== undefined) {
      return langVoices[it.characterIndex % langVoices.length];
    }
    return langVoices[langVoices.length - 1]; // narrator = a distinct voice
  };

  const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    fetchAbort.current?.abort();
  };

  const stop = () => {
    playingRef.current = false;
    setPlaying(false);
    if (speechAvailable) speechSynthesis.cancel();
    stopAudio();
  };

  const audioKey = (it: ReadItem) => `${it.kind === "cue" ? "c" + (it.characterIndex ?? 0) : "n"}:${it.text}`;

  // Get (and cache) an ElevenLabs audio URL for an item. null = server has no key.
  const getAudioUrl = async (it: ReadItem): Promise<string | null> => {
    const key = audioKey(it);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    const ac = new AbortController();
    fetchAbort.current = ac;
    const blob = await ttsFetch(it.text, it.characterIndex ?? 0, it.kind !== "cue", ac.signal);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    cacheRef.current.set(key, url);
    return url;
  };

  const systemSpeak = (i: number) => {
    if (!speechAvailable) {
      if (playingRef.current) speakFrom(i + 1);
      return;
    }
    const it = items[i];
    const u = new SpeechSynthesisUtterance(it.text);
    const v = voiceForItem(it);
    if (v) u.voice = v;
    u.lang = v?.lang ?? (play.lang === "fr" ? "fr-CA" : "en-US");
    u.rate = rate;
    u.onend = () => {
      if (playingRef.current) speakFrom(i + 1);
    };
    speechSynthesis.speak(u);
  };

  // Speak item `i`, then chain forward while playing. Uses ElevenLabs when selected
  // and available; falls back to OS voices on the first missing-key signal.
  const speakFrom = (i: number) => {
    if (i >= items.length) {
      stop();
      return;
    }
    setIndex(i);
    if (engineRef.current === "eleven" && !elevenOff) {
      void (async () => {
        let url: string | null;
        try {
          url = await getAudioUrl(items[i]);
        } catch {
          if (playingRef.current) speakFrom(i + 1);
          return;
        }
        if (url === null) {
          setElevenOff(true);
          setEngine("system");
          engineRef.current = "system";
          if (playingRef.current) systemSpeak(i);
          return;
        }
        if (!playingRef.current) return;
        const audio = new Audio(url);
        audio.playbackRate = rate;
        audioRef.current = audio;
        // prefetch the next line so playback is gapless
        if (items[i + 1] && engineRef.current === "eleven") void getAudioUrl(items[i + 1]).catch(() => {});
        audio.onended = () => {
          if (playingRef.current) speakFrom(i + 1);
        };
        void audio.play().catch(() => {});
      })();
    } else {
      systemSpeak(i);
    }
  };

  const play_ = () => {
    playingRef.current = true;
    setPlaying(true);
    if (speechAvailable) speechSynthesis.cancel();
    stopAudio();
    speakFrom(index);
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-read="${index}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [index]);

  // Guarantee silence + free blobs on unmount.
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      audioRef.current?.pause();
      fetchAbort.current?.abort();
      for (const url of cache.values()) URL.revokeObjectURL(url);
    };
  }, []);

  const goto = (i: number) => {
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    setIndex(clamped);
    if (playingRef.current) {
      if (speechAvailable) speechSynthesis.cancel();
      stopAudio();
      speakFrom(clamped);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex flex-col bg-desk">
      <header className="flex items-center justify-between border-b border-desk-rule px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold text-white">{t("tableRead")}</span>
          <span className="text-sm text-ink-faint">— {play.title}</span>
        </div>
        <button onClick={() => { stop(); onClose(); }} className="rounded-full p-1.5 text-ink-faint hover:bg-desk-rule hover:text-white" aria-label={t("close")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      {!speechAvailable && engine === "system" && (
        <p className="bg-rose/10 px-5 py-2 text-center text-sm text-rose">{t("tableReadNoVoice")}</p>
      )}
      {elevenOff && (
        <p className="bg-desk-light px-5 py-1.5 text-center text-xs text-ink-faint">{t("tableReadElevenOff")}</p>
      )}

      <div ref={listRef} className="thin-scroll mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-5 py-8">
        {items.map((it, i) => {
          const active = i === index;
          if (it.kind === "heading") {
            return (
              <div key={it.id} data-read={i} className={`mt-6 mb-2 font-display text-sm font-semibold uppercase tracking-widest ${active ? "text-white" : "text-ink-faint"}`}>
                {it.text}
              </div>
            );
          }
          if (it.kind === "stage") {
            return (
              <p key={it.id} data-read={i} className={`my-2 border-l-2 pl-3 text-[15px] ${active ? "border-gel text-white" : "border-desk-rule text-ink-faint"}`}>
                {it.text}
              </p>
            );
          }
          return (
            <div key={it.id} data-read={i} className={`my-3 rounded-lg px-3 py-2 transition-colors ${active ? "bg-desk-light" : ""}`}>
              <div className="font-display text-xs font-semibold uppercase tracking-widest" style={{ color: it.color }}>
                {it.name}
              </div>
              <p className={`text-[17px] leading-relaxed ${active ? "text-white" : "text-ink-faint"}`}>{it.text}</p>
            </div>
          );
        })}
        {items.length === 0 && <p className="py-16 text-center text-ink-faint">{t("emptyScript")}</p>}
      </div>

      <footer className="border-t border-desk-rule px-5 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => goto(index - 1)} className="rounded-lg p-2 text-ink-faint hover:bg-desk-light hover:text-white" aria-label={t("prev")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6l-9 6 9 6z" /></svg>
          </button>
          <button
            onClick={() => (playing ? stop() : play_())}
            disabled={items.length === 0}
            className="rounded-full bg-gel px-5 py-2.5 text-sm font-semibold text-white shadow-gel hover:bg-gel-bright disabled:opacity-40"
          >
            {playing ? t("pause") : t("play")}
          </button>
          <button onClick={() => goto(index + 1)} className="rounded-lg p-2 text-ink-faint hover:bg-desk-light hover:text-white" aria-label={t("next")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l9 6-9 6z" /></svg>
          </button>
          <div className="ml-2 hidden items-center gap-2 sm:flex">
            <span className="text-xs text-ink-faint">{t("speed")}</span>
            <input type="range" min={0.7} max={1.3} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-20 accent-gel" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {!elevenOff && (
              <Segmented
                size="sm"
                value={engine}
                onChange={(v) => {
                  const wasPlaying = playingRef.current;
                  stop();
                  setEngine(v);
                  engineRef.current = v;
                  if (wasPlaying) {
                    playingRef.current = true;
                    setPlaying(true);
                    speakFrom(index);
                  }
                }}
                options={[
                  { value: "eleven", label: t("voiceEleven") },
                  { value: "system", label: t("voiceSystem") },
                ]}
              />
            )}
            <span className="text-xs text-ink-faint">
              {Math.min(index + 1, items.length)} / {items.length}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
