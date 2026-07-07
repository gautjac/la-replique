import { useState } from "react";
import { useUI } from "../i18n";
import { fromJSON } from "../export";
import { AI_IMPORT_PROMPT } from "../importFormat";
import { blankPlay, parseScript } from "../model";
import type { Play } from "../types";
import { Modal } from "./common";

export function ImportPaste({ onCreate, onClose }: { onCreate: (p: Play) => void; onClose: () => void }) {
  const { t, locale } = useUI();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const looksLikeJson = (s: string) => {
    const trimmed = s.trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  };

  const create = () => {
    if (!text.trim()) {
      setError(t("importEmpty"));
      return;
    }
    let play: Play;
    if (looksLikeJson(text)) {
      try {
        play = fromJSON(text);
      } catch {
        setError(t("importBadJson"));
        return;
      }
    } else {
      const { characters, elements } = parseScript(text, locale);
      play = {
        ...blankPlay(locale),
        title: locale === "fr" ? "Pièce importée" : "Imported play",
        characters,
        elements,
      };
    }
    onCreate(play);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <Modal onClose={onClose} wide label="import">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">{t("importText")}</h2>
            <p className="mt-1 text-sm text-ink-faint">{t("importDesc")}</p>
          </div>
          <button
            onClick={copyPrompt}
            className="shrink-0 rounded-lg bg-gel/15 px-3 py-2 text-xs font-medium text-gel-bright ring-1 ring-gel/30 transition hover:bg-gel/25"
            title={t("copyAiPromptHint")}
          >
            {copied ? t("copied") : t("copyAiPrompt")}
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          placeholder={t("importPlaceholder")}
          rows={10}
          className="mt-4 w-full rounded-xl bg-desk p-3 font-mono text-sm text-white outline-none ring-1 ring-desk-rule placeholder:text-ink-faint focus:ring-gel"
          autoFocus
        />
        <p className="mt-2 text-xs text-ink-faint">{t("importFormats")}</p>
        {error && <p className="mt-2 text-sm text-rose">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-faint hover:text-white">
            {t("cancel")}
          </button>
          <button onClick={create} className="rounded-lg bg-gel px-4 py-2 text-sm font-semibold text-white shadow-gel hover:bg-gel-bright">
            {t("importAsNew")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
