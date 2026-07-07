import { useEffect, useRef, useState } from "react";
import { fetchVoices, ttsFetch, type ElevenVoice } from "../api";
import { useUI } from "../i18n";
import { castStats, makeCharacter } from "../model";
import { addCharacterTo, removeCharacter, updateCharacter } from "../ops";
import { downloadText, slugify, toSides } from "../export";
import type { CharacterT, Lang, Play } from "../types";
import { CAST_SWATCHES } from "../types";
import { Segmented } from "./common";

// Fetch the ElevenLabs voice list once per session and share it across renders.
let voicesPromise: Promise<ElevenVoice[] | null> | null = null;
function loadVoices(): Promise<ElevenVoice[] | null> {
  if (!voicesPromise) voicesPromise = fetchVoices().catch(() => null);
  return voicesPromise;
}

export function CastPanel({ play, commit }: { play: Play; commit: (p: Play) => void }) {
  const { t } = useUI();
  const [draft, setDraft] = useState("");
  const [voices, setVoices] = useState<ElevenVoice[] | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void loadVoices().then((v) => {
      if (alive) setVoices(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  const stats = castStats(play);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    commit(addCharacterTo(play, makeCharacter(name.toUpperCase(), play.characters)));
    setDraft("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
        <span className="text-sm text-ink-faint">{t("langOfPlay")}</span>
        <Segmented
          size="sm"
          value={play.lang}
          onChange={(v: Lang) => commit({ ...play, lang: v, updatedAt: Date.now() })}
          options={[
            { value: "fr", label: "FR" },
            { value: "en", label: "EN" },
          ]}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("addCharacter")}
          className="min-w-0 flex-1 rounded-lg bg-desk px-3 py-2 text-sm uppercase tracking-wide text-white outline-none ring-1 ring-desk-rule placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-faint focus:ring-gel"
        />
        <button type="submit" className="rounded-lg bg-gel px-3.5 py-2 text-sm font-semibold text-white hover:bg-gel-bright">
          +
        </button>
      </form>

      {play.characters.length === 0 && <p className="py-6 text-center text-sm text-ink-faint">{t("noCast")}</p>}

      <ul className="space-y-2">
        {play.characters.map((c) => {
          const s = stats.perCharacter.find((p) => p.character.id === c.id);
          return (
            <li key={c.id} className="rounded-xl bg-desk p-3 ring-1 ring-desk-rule">
              <div className="flex items-center gap-2.5">
                <ColorDot
                  color={c.color}
                  onPick={(color) => commit(updateCharacter(play, c.id, { color }))}
                />
                <input
                  value={c.name}
                  onChange={(e) => commit(updateCharacter(play, c.id, { name: e.target.value.toUpperCase() }))}
                  className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold uppercase tracking-wide text-white outline-none"
                  aria-label={t("characterName")}
                />
                <button
                  onClick={() => commit(removeCharacter(play, c.id))}
                  className="rounded-md p-1 text-ink-faint transition hover:bg-desk-rule hover:text-rose"
                  aria-label={t("delete")}
                  title={t("delete")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>
              <input
                value={c.note ?? ""}
                onChange={(e) => commit(updateCharacter(play, c.id, { note: e.target.value }))}
                placeholder={t("characterNote")}
                className="mt-2 w-full bg-transparent text-xs text-ink-faint outline-none placeholder:text-ink-faint/60"
              />
              {voices && voices.length > 0 && (
                <VoicePicker
                  character={c}
                  voices={voices}
                  lang={play.lang}
                  onChange={(voiceId) => commit(updateCharacter(play, c.id, { voiceId }))}
                />
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-ink-faint">
                <span>
                  <span className="font-semibold text-white">{s?.lines ?? 0}</span> {t("lines")}
                </span>
                <span>
                  <span className="font-semibold text-white">{s?.scenes ?? 0}</span> {t("scenesIn")}
                </span>
                {(s?.lines ?? 0) > 0 && (
                  <button
                    onClick={() => downloadText(`sides-${slugify(c.name)}.txt`, toSides(play, c.id), "text/plain")}
                    className="ml-auto rounded-md px-2 py-1 text-gel-bright transition hover:bg-gel/15"
                    title={t("sides")}
                  >
                    ↓ {t("sides")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VoicePicker({
  character,
  voices,
  lang,
  onChange,
}: {
  character: CharacterT;
  voices: ElevenVoice[];
  lang: Lang;
  onChange: (voiceId: string | undefined) => void;
}) {
  const { t } = useUI();
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const preview = async () => {
    if (!character.voiceId) return;
    setBusy(true);
    try {
      const sample = lang === "fr" ? `Bonjour, je suis ${character.name}.` : `Hello, I'm ${character.name}.`;
      const blob = await ttsFetch(sample, { voiceId: character.voiceId, voiceIndex: 0, narrator: false });
      if (blob) {
        const url = URL.createObjectURL(blob);
        audioRef.current?.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play().catch(() => {});
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b93a4" strokeWidth="2" aria-hidden>
        <path d="M12 3v18M8 8v8M4 11v2M16 6v12M20 9v6" />
      </svg>
      <select
        value={character.voiceId ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="min-w-0 flex-1 rounded-md bg-desk px-2 py-1 text-xs text-white outline-none ring-1 ring-desk-rule focus:ring-gel"
        aria-label={t("voiceFor")}
      >
        <option value="">{t("voiceAuto")}</option>
        {voices.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
            {v.accent ? ` · ${v.accent}` : ""}
            {v.gender ? ` · ${v.gender}` : ""}
          </option>
        ))}
      </select>
      <button
        onClick={preview}
        disabled={!character.voiceId || busy}
        title={t("voicePreview")}
        aria-label={t("voicePreview")}
        className="rounded-md p-1 text-ink-faint transition hover:bg-desk-rule hover:text-white disabled:opacity-30"
      >
        {busy ? (
          <span className="block h-3 w-3 animate-spin rounded-full border-2 border-gel border-t-transparent" />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M5 4l14 8-14 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function ColorDot({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-4 w-4 rounded-full ring-2 ring-white/10"
        style={{ background: color }}
        aria-label="color"
      />
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 grid w-[132px] grid-cols-5 gap-1.5 rounded-lg bg-desk p-2 shadow-lift ring-1 ring-desk-rule">
          {CAST_SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => {
                onPick(c);
                setOpen(false);
              }}
              className="h-4 w-4 rounded-full ring-2 ring-transparent hover:ring-white/40"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
