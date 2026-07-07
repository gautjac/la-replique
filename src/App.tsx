import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, deletePlay as dbDelete, getPlay, putPlay } from "./db";
import { UIContext, type Locale, type UIKey, STRINGS } from "./i18n";
import { blankPlay, samplePlay } from "./model";
import { downloadText, fromJSON, slugify, toJSON, toPlainText } from "./export";
import type { Play } from "./types";
import { Segmented } from "./ui/common";
import { Drawer } from "./ui/common";
import { Library } from "./ui/Library";
import { Editor } from "./ui/Editor";
import { CastPanel } from "./ui/CastPanel";
import { Measures } from "./ui/Measures";
import { Atelier } from "./ui/Atelier";
import { Onboarding } from "./ui/Onboarding";

type Panel = "cast" | "measures" | "atelier" | null;

function usePersistedLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocale] = useState<Locale>(() => {
    const v = localStorage.getItem("lr.locale");
    return v === "en" ? "en" : "fr";
  });
  const set = (l: Locale) => {
    localStorage.setItem("lr.locale", l);
    setLocale(l);
  };
  return [locale, set];
}

export default function App() {
  const [locale, setLocale] = usePersistedLocale();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("lr.onboarded") === "1");
  const [current, setCurrent] = useState<Play | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  const plays = useLiveQuery(() => db.plays.orderBy("updatedAt").reverse().toArray(), [], undefined) as
    | Play[]
    | undefined;

  const past = useRef<Play[]>([]);
  const lastPush = useRef(0);
  const [undoDepth, setUndoDepth] = useState(0);

  const tt = useMemo(() => (k: UIKey) => STRINGS[k][locale], [locale]);
  const ctx = useMemo(() => ({ locale, setLocale, t: tt }), [locale, setLocale, tt]);

  const showToast = useCallback((msg: string) => setToast({ msg, key: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2300);
    return () => clearTimeout(id);
  }, [toast]);

  // Debounced autosave — IndexedDB is the only copy.
  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => void putPlay(current), 450);
    return () => clearTimeout(id);
  }, [current]);

  // Flush on tab hide / unload.
  useEffect(() => {
    const flush = () => {
      if (current) void putPlay(current);
    };
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [current]);

  const commit = useCallback(
    (next: Play) => {
      setCurrent((prev) => {
        if (prev) {
          const now = Date.now();
          const structural =
            prev.elements.length !== next.elements.length || prev.characters.length !== next.characters.length;
          if (structural || now - lastPush.current > 1200) {
            past.current.push(prev);
            if (past.current.length > 120) past.current.shift();
            lastPush.current = now;
            setUndoDepth(past.current.length);
          }
        }
        return next;
      });
    },
    [],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev) {
      setUndoDepth(past.current.length);
      setCurrent(prev);
    }
  }, []);

  const openPlay = useCallback(async (id: string) => {
    const p = await getPlay(id);
    if (p) {
      past.current = [];
      lastPush.current = 0;
      setUndoDepth(0);
      setCurrent(p);
      setPanel(null);
    }
  }, []);

  const startPlay = useCallback(
    (p: Play) => {
      void putPlay(p);
      past.current = [];
      lastPush.current = 0;
      setUndoDepth(0);
      setCurrent(p);
      setPanel(null);
    },
    [],
  );

  const backToLibrary = useCallback(() => {
    if (current) void putPlay(current);
    setCurrent(null);
    setPanel(null);
    setExportOpen(false);
  }, [current]);

  const deletePlay = useCallback(
    async (id: string) => {
      if (!confirm(STRINGS.confirmDelete[locale])) return;
      await dbDelete(id);
      if (current?.id === id) setCurrent(null);
    },
    [current, locale],
  );

  const importFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const p = fromJSON(text);
        await putPlay(p);
        void openPlay(p.id);
      } catch {
        showToast(locale === "fr" ? "Fichier illisible." : "Couldn't read that file.");
      }
    },
    [locale, openPlay, showToast],
  );

  // Keyboard: ⌘Z undo in editor.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        // don't hijack undo inside a fresh text edit the browser can handle itself
        if (past.current.length > 0) {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, undo]);

  const doExport = (kind: "print" | "txt" | "json") => {
    if (!current) return;
    setExportOpen(false);
    const slug = slugify(current.title);
    if (kind === "print") window.print();
    else if (kind === "txt") downloadText(`${slug}.txt`, toPlainText(current), "text/plain");
    else downloadText(`${slug}.json`, toJSON(current), "application/json");
  };

  return (
    <UIContext.Provider value={ctx}>
      {!onboarded && (
        <Onboarding
          onDone={() => {
            localStorage.setItem("lr.onboarded", "1");
            setOnboarded(true);
          }}
        />
      )}

      {!current ? (
        <Library
          plays={plays ?? []}
          locale={locale}
          setLocale={setLocale}
          onOpen={(id) => void openPlay(id)}
          onNew={() => startPlay(blankPlay(locale))}
          onNewSample={() => startPlay(samplePlay(locale))}
          onDelete={(id) => void deletePlay(id)}
          onImport={(f) => void importFile(f)}
        />
      ) : (
        <div className="min-h-full">
          <EditorHeader
            title={current.title}
            locale={locale}
            setLocale={setLocale}
            canUndo={undoDepth > 0}
            onUndo={undo}
            onBack={backToLibrary}
            onPanel={setPanel}
            exportOpen={exportOpen}
            setExportOpen={setExportOpen}
            onExport={doExport}
          />
          <Editor play={current} commit={commit} />

          {panel === "cast" && (
            <Drawer title={tt("cast")} onClose={() => setPanel(null)}>
              <CastPanel play={current} commit={commit} />
            </Drawer>
          )}
          {panel === "measures" && (
            <Drawer title={tt("stats")} onClose={() => setPanel(null)}>
              <Measures play={current} />
            </Drawer>
          )}
          {panel === "atelier" && (
            <Drawer title={tt("atelier")} onClose={() => setPanel(null)}>
              <Atelier play={current} commit={commit} onCreatePlay={startPlay} onToast={showToast} />
            </Drawer>
          )}
        </div>
      )}

      {toast && (
        <div
          key={toast.key}
          className="no-print fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink shadow-lift"
        >
          {toast.msg}
        </div>
      )}
    </UIContext.Provider>
  );
}

function EditorHeader(props: {
  title: string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  canUndo: boolean;
  onUndo: () => void;
  onBack: () => void;
  onPanel: (p: Panel) => void;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  onExport: (kind: "print" | "txt" | "json") => void;
}) {
  const t = (k: UIKey) => STRINGS[k][props.locale];
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) props.setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [props]);

  return (
    <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-desk-rule bg-desk/85 px-3 py-2.5 backdrop-blur sm:px-5">
      <button
        onClick={props.onBack}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-faint transition hover:bg-desk-light hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span className="hidden sm:inline">{t("library")}</span>
      </button>

      <div className="mx-1 min-w-0 flex-1 truncate text-center text-sm font-medium text-ink-faint">{props.title}</div>

      <button
        onClick={props.onUndo}
        disabled={!props.canUndo}
        title={t("undo")}
        className="rounded-lg p-2 text-ink-faint transition hover:bg-desk-light hover:text-white disabled:opacity-30"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1" />
        </svg>
      </button>

      <ToolbarButton label={t("cast")} onClick={() => props.onPanel("cast")}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </ToolbarButton>
      <ToolbarButton label={t("stats")} onClick={() => props.onPanel("measures")}>
        <path d="M3 3v18h18M8 14v4M13 9v9M18 5v13" />
      </ToolbarButton>

      <button
        onClick={() => props.onPanel("atelier")}
        className="flex items-center gap-1.5 rounded-lg bg-gel/15 px-2.5 py-1.5 text-sm font-medium text-gel-bright ring-1 ring-gel/30 transition hover:bg-gel/25"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2z" />
        </svg>
        <span className="hidden sm:inline">{t("atelier")}</span>
      </button>

      <div className="relative" ref={exportRef}>
        <button
          onClick={() => props.setExportOpen(!props.exportOpen)}
          className="rounded-lg p-2 text-ink-faint transition hover:bg-desk-light hover:text-white"
          title={t("export")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </button>
        {props.exportOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl bg-desk-light p-1.5 shadow-lift ring-1 ring-desk-rule">
            <ExportItem label={t("print")} onClick={() => props.onExport("print")} />
            <ExportItem label={t("plainText")} onClick={() => props.onExport("txt")} />
            <ExportItem label={t("jsonBackup")} onClick={() => props.onExport("json")} />
          </div>
        )}
      </div>

      <Segmented
        size="sm"
        value={props.locale}
        onChange={props.setLocale}
        options={[
          { value: "fr", label: "FR" },
          { value: "en", label: "EN" },
        ]}
      />
    </header>
  );
}

function ToolbarButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      className="rounded-lg p-2 text-ink-faint transition hover:bg-desk-light hover:text-white"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {props.children}
      </svg>
    </button>
  );
}

function ExportItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-desk-rule"
    >
      {label}
    </button>
  );
}
