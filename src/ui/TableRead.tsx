import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "../i18n";
import { characterById } from "../model";
import type { Play } from "../types";

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
  const playingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

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

  const stop = () => {
    playingRef.current = false;
    setPlaying(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  };

  // Speak the item at `i`, then chain forward while playing.
  const speakFrom = (i: number) => {
    if (typeof speechSynthesis === "undefined") return;
    if (i >= items.length) {
      stop();
      return;
    }
    setIndex(i);
    const it = items[i];
    const u = new SpeechSynthesisUtterance(it.kind === "cue" && it.name ? it.text : it.text);
    const v = voiceForItem(it);
    if (v) u.voice = v;
    u.lang = v?.lang ?? (play.lang === "fr" ? "fr-CA" : "en-US");
    u.rate = rate;
    u.onend = () => {
      if (playingRef.current) speakFrom(i + 1);
    };
    speechSynthesis.speak(u);
  };

  const play_ = () => {
    if (typeof speechSynthesis === "undefined") return;
    playingRef.current = true;
    setPlaying(true);
    speechSynthesis.cancel();
    speakFrom(index);
  };

  useEffect(() => {
    // scroll active line into view
    const el = listRef.current?.querySelector(`[data-read="${index}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [index]);

  // Guarantee silence on unmount.
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, []);

  const goto = (i: number) => {
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    setIndex(clamped);
    if (playingRef.current) {
      speechSynthesis.cancel();
      speakFrom(clamped);
    }
  };

  const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

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

      {!speechAvailable && (
        <p className="bg-rose/10 px-5 py-2 text-center text-sm text-rose">{t("tableReadNoVoice")}</p>
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
            disabled={!speechAvailable || items.length === 0}
            className="rounded-full bg-gel px-5 py-2.5 text-sm font-semibold text-white shadow-gel hover:bg-gel-bright disabled:opacity-40"
          >
            {playing ? t("pause") : t("play")}
          </button>
          <button onClick={() => goto(index + 1)} className="rounded-lg p-2 text-ink-faint hover:bg-desk-light hover:text-white" aria-label={t("next")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l9 6-9 6z" /></svg>
          </button>
          <div className="ml-2 flex items-center gap-2">
            <span className="text-xs text-ink-faint">{t("speed")}</span>
            <input type="range" min={0.7} max={1.3} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-24 accent-gel" />
          </div>
          <span className="ml-auto text-xs text-ink-faint">
            {Math.min(index + 1, items.length)} / {items.length}
          </span>
        </div>
      </footer>
    </div>
  );
}
