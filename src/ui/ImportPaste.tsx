import { useState } from "react";
import { useUI } from "../i18n";
import { blankPlay, parseScript } from "../model";
import type { Play } from "../types";
import { Modal } from "./common";

export function ImportPaste({ onCreate, onClose }: { onCreate: (p: Play) => void; onClose: () => void }) {
  const { t, locale } = useUI();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const create = () => {
    if (!text.trim()) {
      setError(t("importEmpty"));
      return;
    }
    const { characters, elements } = parseScript(text, locale);
    const play: Play = {
      ...blankPlay(locale),
      title: locale === "fr" ? "Pièce importée" : "Imported play",
      characters,
      elements,
    };
    onCreate(play);
  };

  return (
    <Modal onClose={onClose} wide label="import">
      <div className="p-6 sm:p-7">
        <h2 className="font-display text-xl font-semibold text-white">{t("importText")}</h2>
        <p className="mt-1 text-sm text-ink-faint">{t("importDesc")}</p>
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
