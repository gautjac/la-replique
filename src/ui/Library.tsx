import { useRef } from "react";
import { useUI, type Locale } from "../i18n";
import { castStats } from "../model";
import type { Play } from "../types";
import { Segmented } from "./common";

interface LibraryProps {
  plays: Play[];
  locale: Locale;
  setLocale: (l: Locale) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onNewSample: () => void;
  onDelete: (id: string) => void;
  onImport: (file: File) => void;
  onImportText: () => void;
}

export function Library(props: LibraryProps) {
  const { t } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo />
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">{t("appName")}</h1>
          </div>
          <p className="mt-1 text-ink-faint">{t("tagline")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint">{t("interfaceLang")}</span>
          <Segmented
            size="sm"
            value={props.locale}
            onChange={(v) => props.setLocale(v)}
            options={[
              { value: "fr", label: "FR" },
              { value: "en", label: "EN" },
            ]}
          />
        </div>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={props.onNew}
          className="rounded-full bg-gel px-5 py-2.5 text-sm font-semibold text-white shadow-gel transition hover:bg-gel-bright"
        >
          + {t("newPlay")}
        </button>
        <button
          onClick={props.onNewSample}
          className="rounded-full bg-desk-light px-5 py-2.5 text-sm font-medium text-white ring-1 ring-desk-rule transition hover:bg-desk-rule"
        >
          {t("fromSample")}
        </button>
        <button
          onClick={props.onImportText}
          className="rounded-full bg-desk-light px-5 py-2.5 text-sm font-medium text-white ring-1 ring-desk-rule transition hover:bg-desk-rule"
        >
          {t("importText")}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full px-4 py-2.5 text-sm text-ink-faint transition hover:text-white"
        >
          {t("importJson")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <h2 className="mb-3 mt-10 font-display text-sm font-semibold uppercase tracking-widest text-ink-faint">
        {t("library")}
      </h2>

      {props.plays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-desk-rule py-16 text-center text-ink-faint">
          {t("emptyScript")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.plays.map((p) => (
            <PlayCard key={p.id} play={p} onOpen={() => props.onOpen(p.id)} onDelete={() => props.onDelete(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayCard({ play, onOpen, onDelete }: { play: Play; onOpen: () => void; onDelete: () => void }) {
  const { t, locale } = useUI();
  const stats = castStats(play);
  const when = new Date(play.updatedAt).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group relative rounded-2xl bg-desk-light p-5 text-left ring-1 ring-desk-rule transition hover:ring-gel/60">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-gel/15 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wide text-gel-bright">
            {play.lang}
          </span>
          <span className="text-xs text-ink-faint">{when}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-white">{play.title || t("untitled")}</h3>
        {play.subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-ink-faint">{play.subtitle}</p>}

        <div className="mt-4 flex items-center gap-1.5">
          {play.characters.slice(0, 6).map((c) => (
            <span key={c.id} className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} title={c.name} />
          ))}
          {play.characters.length === 0 && <span className="text-xs text-ink-faint">{t("noCast")}</span>}
        </div>
        <div className="mt-3 flex gap-3 text-xs text-ink-faint">
          <span>{stats.totalLines} {t("lines")}</span>
          <span>{stats.sceneCount} {t("scenesCount").toLowerCase()}</span>
        </div>
      </button>

      <button
        onClick={onDelete}
        className="absolute right-3 top-3 rounded-md p-1.5 text-ink-faint opacity-0 transition hover:bg-desk-rule hover:text-rose group-hover:opacity-100"
        aria-label={t("delete")}
        title={t("delete")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
        </svg>
      </button>
    </div>
  );
}

function Logo() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-desk-light ring-1 ring-desk-rule">
      <svg width="20" height="20" viewBox="0 0 32 32">
        <path
          d="M11 9.5c-2.4 0-4.3 1.9-4.3 4.3 0 2.3 1.7 4.1 3.9 4.3-.2 1.6-1 2.7-2.4 3.4-.5.2-.6.9-.2 1.2.2.2.5.2.7.1 2.9-1.2 4.6-3.6 4.6-7V13.8c0-2.4-1.9-4.3-4.3-4.3z"
          fill="#4f7cff"
        />
        <path
          d="M22.5 9.5c-2.4 0-4.3 1.9-4.3 4.3 0 2.3 1.7 4.1 3.9 4.3-.2 1.6-1 2.7-2.4 3.4-.5.2-.6.9-.2 1.2.2.2.5.2.7.1 2.9-1.2 4.6-3.6 4.6-7V13.8c0-2.4-1.9-4.3-4.3-4.3z"
          fill="#12b5d4"
        />
      </svg>
    </span>
  );
}
