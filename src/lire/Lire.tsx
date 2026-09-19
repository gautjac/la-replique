import { useCallback, useEffect, useMemo, useState } from "react";
import { CAST_SWATCHES } from "../types";
import type { Backend } from "./backend";
import { cloudKitBackend, hasToken } from "./cloudkit";
import { GENERAL, cleanQuote, highlight, threadsFor, type PlayMeta, type Thread } from "./comments";
import { demoBackend } from "./demoBackend";
import { NoteChip, NotesBar, ThreadCard, ThreadStack, loadName, saveName, type NotesCtx } from "./Notes";
import { strings, useReaderLang, type Lang, type Strings } from "./strings";
import { useComments } from "./useComments";

// The shared la-replique/1 document (loose types — this is a reading view).
interface Cast {
  name?: string;
  color?: string;
}
interface El {
  /** Stable element id — present on plays published since notes exist. */
  id?: string;
  type: string;
  label?: string;
  setting?: string;
  text?: string;
  parenthetical?: string;
  character?: string;
  alt?: string;
}
interface Doc {
  title?: string;
  subtitle?: string;
  author?: string;
  logline?: string;
  lang?: string;
  characters?: Cast[];
  elements?: El[];
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; doc: Doc; meta: PlayMeta }
  | { kind: "notFound" }
  | { kind: "error"; message: keyof Pick<Strings, "notConfigured" | "loadError"> };

export function Lire({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [lang, setLang] = useReaderLang();
  const t = useMemo(() => strings(lang), [lang]);
  const backend: Backend = id === "demo" ? demoBackend : cloudKitBackend;

  useEffect(() => {
    let alive = true;
    if (backend.kind === "cloudkit" && !hasToken()) {
      setState({ kind: "error", message: "notConfigured" });
      return;
    }
    (async () => {
      try {
        const loaded = await backend.loadPlay(id);
        if (!alive) return;
        if (!loaded) return setState({ kind: "notFound" });
        const data = JSON.parse(loaded.json);
        setState({ kind: "ready", doc: (data?.play ?? data) as Doc, meta: loaded.meta });
      } catch {
        if (alive) setState({ kind: "error", message: "loadError" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, backend]);

  return (
    <div className="min-h-screen bg-desk text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <header className="mb-6 flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">La Réplique</span>
          <span className="text-sm text-ink-faint">— {t.reading}</span>
          <LangToggle lang={lang} setLang={setLang} />
        </header>
        {state.kind === "loading" && <Centered>{t.loading}</Centered>}
        {state.kind === "notFound" && <Centered>{t.notFound}</Centered>}
        {state.kind === "error" && <Centered>{t[state.message]}</Centered>}
        {state.kind === "ready" && <Reader doc={state.doc} meta={state.meta} backend={backend} shareID={id} t={t} lang={lang} />}
      </div>
    </div>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang(l: Lang): void }) {
  return (
    <div className="ml-auto flex overflow-hidden rounded-lg border border-desk-rule text-xs font-semibold" role="group" aria-label="Langue / Language">
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
          className={`px-2.5 py-1 uppercase tracking-wide ${lang === l ? "bg-gel text-white" : "text-ink-faint hover:text-white"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-desk-rule py-20 text-center text-ink-faint">{children}</div>;
}

function Reader(props: { doc: Doc; meta: PlayMeta; backend: Backend; shareID: string; t: Strings; lang: Lang }) {
  const { doc, t, lang } = props;
  const elements = useMemo(() => doc.elements ?? [], [doc]);
  const elementIDs = useMemo(() => elements.map((e) => e.id).filter((x): x is string => !!x), [elements]);
  // Notes need stable anchors: a play published before element ids existed
  // stays a plain reading even if its owner opened notes.
  const notesOn = props.meta.commentsOpen && elementIDs.length > 0;
  const api = useComments(props.backend, props.shareID, { ...props.meta, commentsOpen: notesOn }, elementIDs);

  const [name, setNameState] = useState(loadName);
  const [showResolved, setShowResolved] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ el: string; text: string } | null>(null);

  const ctx: NotesCtx = {
    api, t, lang, demo: props.backend.kind === "demo", name, showResolved,
    setName: (n) => { saveName(n); setNameState(n); },
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !(e.target instanceof HTMLTextAreaElement) && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** A text selection inside one line becomes the quote for a new note on it. */
  const captureSelection = useCallback((elID: string, host: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode) return;
    const textHost = host.querySelector("[data-quotable]");
    if (!textHost || !textHost.contains(sel.anchorNode) || !textHost.contains(sel.focusNode)) return;
    const q = cleanQuote(sel.toString());
    if (!q) return;
    setQuote({ el: elID, text: q });
    setActive(elID);
  }, []);

  const colorFor = useMemo(() => {
    const map = new Map<string, string>();
    const used: string[] = [];
    (doc.characters ?? []).forEach((c) => {
      if (!c.name) return;
      const color = c.color ?? CAST_SWATCHES.find((s) => !used.includes(s)) ?? CAST_SWATCHES[used.length % CAST_SWATCHES.length];
      used.push(color);
      map.set(c.name.toLowerCase(), color);
    });
    return (who?: string) => {
      if (!who) return "#8b93a4";
      const key = who.toLowerCase();
      if (map.has(key)) return map.get(key)!;
      const color = CAST_SWATCHES.find((s) => !used.includes(s)) ?? CAST_SWATCHES[used.length % CAST_SWATCHES.length];
      used.push(color);
      map.set(key, color);
      return color;
    };
  }, [doc]);

  const general = threadsFor(api.threads, GENERAL);
  const detached = api.threads.filter((th) => th.detached && (showResolved || !th.resolved));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">{doc.title || t.untitled}</h1>
      {doc.subtitle && <p className="mt-1 text-ink-faint">{doc.subtitle}</p>}
      {doc.author && <p className="mt-1 text-sm text-ink-faint">{(doc.lang === "en" ? "by " : "de ") + doc.author}</p>}
      {doc.logline && <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-faint">{doc.logline}</p>}

      {notesOn && <NotesBar ctx={ctx} onToggleResolved={() => setShowResolved((v) => !v)} />}

      <div className="script mt-6 rounded-xl bg-paper px-6 py-8 text-ink shadow-page sm:px-12 sm:py-12">
        {elements.map((el, i) => {
          const body = (marks: Thread[]) => <ElementBody el={el} colorFor={colorFor} marks={marks} />;
          if (!notesOn || !el.id) return <div key={el.id ?? i}>{body([])}</div>;
          const elID = el.id;
          const here = threadsFor(api.threads, elID);
          const open = here.filter((th) => !th.resolved);
          const isActive = active === elID;
          return (
            <div
              key={elID}
              data-el={elID}
              className={`group relative -mx-3 rounded-lg px-3 pr-9 transition-colors sm:pr-3 ${isActive ? "bg-gel-wash/70" : "hover:bg-paper-shade/70"}`}
              onClick={() => setActive(elID)}
              onMouseUp={(e) => captureSelection(elID, e.currentTarget)}
              onTouchEnd={(e) => { const host = e.currentTarget; setTimeout(() => captureSelection(elID, host), 0); }}
            >
              {body(open)}
              <NoteChip
                open={open.length}
                resolvedOnly={open.length === 0 && here.length > 0}
                active={isActive}
                label={open.length ? t.notesOn(open.length) : t.addNote}
                onClick={() => setActive(isActive ? null : elID)}
              />
              {isActive && (
                <ThreadStack
                  ctx={ctx}
                  threads={here}
                  elementID={elID}
                  quote={quote?.el === elID ? quote.text : undefined}
                  onDropQuote={() => setQuote(null)}
                  onClose={() => setActive(null)}
                  autoFocus={open.length === 0}
                />
              )}
            </div>
          );
        })}
      </div>

      {notesOn && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-white">{t.general}</h2>
          <p className="text-sm text-ink-faint">{t.generalHint}</p>
          <div className="mt-3 rounded-xl bg-paper px-4 py-3 text-ink">
            <ThreadStack ctx={ctx} threads={general} elementID={GENERAL} />
          </div>
        </section>
      )}

      {notesOn && detached.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-white">{t.detached}</h2>
          <p className="text-sm text-ink-faint">{t.detachedHint}</p>
          <div className="mt-3 space-y-2.5 rounded-xl bg-paper px-4 py-4 text-ink">
            {detached.map((th) => (
              <ThreadCard key={th.root.id} ctx={ctx} thread={th} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-ink-faint">
        {t.writtenWith} <a className="text-gel-bright" href="/">La Réplique</a>
      </p>
    </div>
  );
}

/** One element of the script. `marks` = open threads whose quotes get highlighted. */
function ElementBody({ el, colorFor, marks }: { el: El; colorFor(n?: string): string; marks: Thread[] }) {
  const text = (s?: string) => (
    <span data-quotable>
      {highlight(s ?? "", marks.map((th) => ({ id: th.root.id, quote: th.root.quote }))).map((seg, i) =>
        seg.marks.length ? (
          <mark key={i} className="rounded-sm bg-gel/20 px-px text-inherit">{seg.text}</mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
  if (el.type === "act")
    return (
      <div className="my-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-edge" />
        <span className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink">{el.label}</span>
        <span className="h-px flex-1 bg-paper-edge" />
      </div>
    );
  if (el.type === "scene")
    return (
      <div className="mb-4 mt-7">
        <div className="font-display text-base font-semibold uppercase tracking-[0.14em] text-ink">{el.label}</div>
        {el.setting && <div className="mt-1 text-sm text-ink-soft">{el.setting}</div>}
      </div>
    );
  if (el.type === "stage")
    return (
      <div className="my-3 border-l-2 border-gel/50 pl-4 text-[15px] text-ink-soft">
        {text(el.text)}
        {el.alt && <div className="surtitle mt-1 text-[14px]">{el.alt}</div>}
      </div>
    );
  if (el.type === "action") return <div className="my-3 text-[15px] text-ink">{text(el.text)}</div>;
  return (
    <div className="mb-3.5">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: colorFor(el.character) }}>
          {(el.character || "?").toUpperCase()}
        </span>
        {el.parenthetical && <span className="text-sm text-ink-soft">{el.parenthetical}</span>}
      </div>
      <div className="mt-0.5 text-[17px] leading-relaxed text-ink">{text(el.text)}</div>
      {el.alt && <div className="surtitle mt-1 text-[15px]">{el.alt}</div>}
    </div>
  );
}

function Logo() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-desk-light ring-1 ring-desk-rule">
      <svg width="18" height="18" viewBox="0 0 32 32">
        <path d="M11 9.5c-2.4 0-4.3 1.9-4.3 4.3 0 2.3 1.7 4.1 3.9 4.3-.2 1.6-1 2.7-2.4 3.4-.5.2-.6.9-.2 1.2.2.2.5.2.7.1 2.9-1.2 4.6-3.6 4.6-7V13.8c0-2.4-1.9-4.3-4.3-4.3z" fill="#4f7cff" />
        <path d="M22.5 9.5c-2.4 0-4.3 1.9-4.3 4.3 0 2.3 1.7 4.1 3.9 4.3-.2 1.6-1 2.7-2.4 3.4-.5.2-.6.9-.2 1.2.2.2.5.2.7.1 2.9-1.2 4.6-3.6 4.6-7V13.8c0-2.4-1.9-4.3-4.3-4.3z" fill="#12b5d4" />
      </svg>
    </span>
  );
}
