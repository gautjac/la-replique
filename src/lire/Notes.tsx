// The notes UI for a shared reading: the bar under the title, the chip in each
// line's margin, the thread cards and the composer. Presentation only — state
// and rules live in useComments.ts / comments.ts.
import { useEffect, useRef, useState } from "react";
import { SIGN_IN_ID, SIGN_OUT_ID } from "./backend";
import { can, counts, validateBody, validateName, type Thread } from "./comments";
import { demoSignIn } from "./demoBackend";
import { ago, type Lang, type Strings } from "./strings";
import type { CommentsAPI } from "./useComments";

export interface NotesCtx {
  api: CommentsAPI;
  t: Strings;
  lang: Lang;
  demo: boolean;
  name: string;
  setName(n: string): void;
  showResolved: boolean;
}

const NAME_KEY = "lr.commentName";
export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveName(n: string): void {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    /* private mode: the name lasts for this visit */
  }
}

// MARK: bar

export function NotesBar({ ctx, onToggleResolved }: { ctx: NotesCtx; onToggleResolved(): void }) {
  const { api, t, demo } = ctx;
  const n = counts(api.threads);
  const signedIn = !!api.identity;
  return (
    <section id="notes-bar" aria-label={t.commentsOpen} className="mt-5 rounded-xl border border-desk-rule bg-desk-light px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
          <BubbleIcon className="text-gel-bright" /> {t.commentsOpen}
        </span>
        <span className="text-sm text-ink-faint">
          {t.nOpen(n.open)}
          {n.resolved > 0 && <> · {t.nResolved(n.resolved)}</>}
        </span>
        {n.resolved > 0 && (
          <button type="button" onClick={onToggleResolved} className="text-sm font-medium text-gel-bright hover:underline">
            {ctx.showResolved ? t.hideResolved : t.showResolved}
          </button>
        )}
      </div>
      <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-ink-faint">{t.commentsIntro}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {demo ? (
          <DemoAuth ctx={ctx} />
        ) : (
          <>
            {/* CloudKit JS renders Apple's own buttons into these two elements. */}
            <div id={SIGN_IN_ID} className={signedIn ? "hidden" : ""} />
            <div id={SIGN_OUT_ID} className={signedIn ? "" : "hidden"} />
            {!signedIn && <span className="text-[13px] text-ink-faint">{t.signInToComment}</span>}
          </>
        )}
        {signedIn && <NameField ctx={ctx} />}
      </div>
      {demo && <p className="mt-2 text-[12px] text-ink-faint">{t.demoBanner}</p>}
    </section>
  );
}

function DemoAuth({ ctx }: { ctx: NotesCtx }) {
  const { api, t } = ctx;
  const btn = "rounded-lg border border-desk-rule px-3 py-1.5 text-sm font-medium text-white hover:border-gel-bright";
  if (api.identity)
    return (
      <button type="button" className={btn} onClick={() => demoSignIn(null)}>
        {t.demoOut}
      </button>
    );
  return (
    <>
      <button type="button" className={btn + " bg-gel/20"} onClick={() => demoSignIn("visitor")}>
        {t.demoVisitor}
      </button>
      <button type="button" className={btn} onClick={() => demoSignIn("owner")}>
        {t.demoOwner}
      </button>
    </>
  );
}

function NameField({ ctx }: { ctx: NotesCtx }) {
  const { t, name, setName } = ctx;
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(!name);
  useEffect(() => {
    if (!name) setEditing(true);
  }, [name]);
  const v = validateName(draft);
  if (!editing)
    return (
      <span className="text-sm text-ink-faint">
        {t.signedInAs} <strong className="font-semibold text-white">{name}</strong>{" "}
        <button type="button" className="text-gel-bright hover:underline" onClick={() => setEditing(true)} aria-label={t.yourName}>
          ✎
        </button>
      </span>
    );
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.ok) return;
        setName(v.value);
        setEditing(false);
      }}
    >
      <input
        id="notes-name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.yourName}
        maxLength={40}
        aria-label={t.yourName}
        className="min-w-0 flex-1 rounded-lg border border-desk-rule bg-desk px-3 py-1.5 text-sm text-white placeholder:text-ink-faint focus:border-gel-bright focus:outline-none sm:max-w-xs"
      />
      <button type="submit" disabled={!v.ok} className="rounded-lg bg-gel px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
        {t.save}
      </button>
    </form>
  );
}

// MARK: chip

export function NoteChip(props: { open: number; resolvedOnly: boolean; active: boolean; label: string; onClick(): void }) {
  const { open, resolvedOnly, active } = props;
  const base =
    "note-chip absolute right-0 top-0.5 inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold transition sm:-right-9";
  const look =
    open > 0
      ? "bg-gel text-white shadow-gel"
      : resolvedOnly
        ? "border border-paper-edge text-ink-faint"
        : `border border-dashed border-gel/50 text-gel ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`;
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-expanded={active}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick();
      }}
      className={`${base} ${look}`}
    >
      {open > 0 ? (
        <>
          <BubbleIcon size={11} /> {open}
        </>
      ) : resolvedOnly ? (
        "✓"
      ) : (
        "+"
      )}
    </button>
  );
}

// MARK: threads

export function ThreadStack(props: {
  ctx: NotesCtx;
  threads: Thread[];
  elementID: string;
  quote?: string;
  onDropQuote?(): void;
  onClose?(): void;
  autoFocus?: boolean;
}) {
  const { ctx, threads } = props;
  const shown = threads.filter((th) => ctx.showResolved || !th.resolved);
  return (
    <div className="notes-stack my-2 space-y-2.5 font-sans" onClick={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      {shown.map((th) => (
        <ThreadCard key={th.root.id} ctx={ctx} thread={th} />
      ))}
      <Composer
        ctx={ctx}
        elementID={props.elementID}
        quote={props.quote}
        onDropQuote={props.onDropQuote}
        onClose={props.onClose}
        autoFocus={props.autoFocus}
        placeholder={ctx.t.notePlaceholder}
        submit={ctx.t.post}
      />
    </div>
  );
}

export function ThreadCard({ ctx, thread }: { ctx: NotesCtx; thread: Thread }) {
  const { api, t } = ctx;
  const viewer = api.identity?.userRecordName ?? null;
  const rootCan = can(viewer, api.meta, thread.root);
  const mayResolve = !thread.resolved && (thread.rootDeleted ? viewer === api.meta.owner : rootCan.resolve);
  return (
    <article className={`rounded-xl border bg-white px-3.5 py-3 shadow-sm ${thread.resolved ? "border-paper-edge opacity-75" : "border-gel/25"}`}>
      {thread.rootDeleted && <p className="mb-2 text-[12px] text-ink-faint">{t.rootDeleted}</p>}
      {thread.root.quote && (
        <p className="mb-2 border-l-2 border-gel/50 pl-2.5 font-body text-[13px] leading-snug text-ink-soft">« {thread.root.quote} »</p>
      )}
      <Note ctx={ctx} thread={thread} index={-1} />
      {thread.replies.map((_, i) => (
        <div key={thread.replies[i].id} className="mt-2.5 border-t border-paper-edge pt-2.5">
          <Note ctx={ctx} thread={thread} index={i} />
        </div>
      ))}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium">
        {thread.resolved && <span className="inline-flex items-center gap-1 text-cast-jade">✓ {t.resolved}</span>}
        {mayResolve && (
          <button type="button" className="text-gel-deep hover:underline" onClick={() => void api.setResolved(thread, true)}>
            {t.resolve}
          </button>
        )}
        {thread.resolved && api.canReopen(thread) && (
          <button type="button" className="text-gel-deep hover:underline" onClick={() => void api.setResolved(thread, false)}>
            {t.reopen}
          </button>
        )}
      </div>
      {!thread.resolved && (
        <div className="mt-2">
          <Composer
            ctx={ctx}
            elementID={thread.root.elementID}
            parentID={thread.rootDeleted ? thread.root.parentID : thread.root.id}
            placeholder={t.replyPlaceholder}
            submit={t.reply}
            compact
          />
        </div>
      )}
    </article>
  );
}

function Note({ ctx, thread, index }: { ctx: NotesCtx; thread: Thread; index: number }) {
  const { api, t, lang } = ctx;
  const c = index < 0 ? thread.root : thread.replies[index];
  const viewer = api.identity?.userRecordName ?? null;
  const rights = can(viewer, api.meta, c);
  // Deleting a root that has replies would orphan them; resolve it instead.
  const removable = rights.remove && !(index < 0 && thread.replies.length > 0);
  return (
    <div>
      <header className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[13px] font-semibold text-ink">{c.authorName}</span>
        {c.creator === api.meta.owner && (
          <span className="rounded-full bg-gel-wash px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gel-deep">{t.author}</span>
        )}
        <time className="text-[11px] text-ink-faint" dateTime={new Date(c.createdAt).toISOString()}>
          {ago(c.createdAt, lang)}
        </time>
        <span className="ml-auto flex gap-2.5 text-[11px] font-medium text-ink-faint">
          {removable && (
            <button type="button" className="hover:text-rose" onClick={() => window.confirm(t.confirmRemove) && void api.remove(c)}>
              {t.remove}
            </button>
          )}
          {rights.hide && (
            <button type="button" className="hover:text-rose" onClick={() => window.confirm(t.confirmHide) && void api.hide(c)}>
              {t.hide}
            </button>
          )}
        </span>
      </header>
      <p className="mt-0.5 whitespace-pre-wrap break-words font-body text-[14px] leading-relaxed text-ink">{c.body}</p>
    </div>
  );
}

// MARK: composer

function Composer(props: {
  ctx: NotesCtx;
  elementID: string;
  parentID?: string;
  quote?: string;
  onDropQuote?(): void;
  onClose?(): void;
  autoFocus?: boolean;
  placeholder: string;
  submit: string;
  compact?: boolean;
}) {
  const { ctx, compact } = props;
  const { api, t, name } = ctx;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [grabFocus, setGrabFocus] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (props.autoFocus && api.identity && name) ref.current?.focus({ preventScroll: true });
  }, [props.autoFocus, api.identity, name]);

  if (!api.identity)
    return compact ? null : (
      <div className="rounded-xl border border-dashed border-paper-edge bg-paper-shade px-3.5 py-3 text-[13px] text-ink-soft">
        {t.signInToComment}{" "}
        <a href="#notes-bar" className="font-medium text-gel-deep hover:underline">
          {t.signInAbove} ↑
        </a>
      </div>
    );
  if (!name)
    return compact ? null : (
      <div className="rounded-xl border border-dashed border-paper-edge bg-paper-shade px-3.5 py-3 text-[13px] text-ink-soft">
        {t.nameNeeded}{" "}
        <a href="#notes-bar" className="font-medium text-gel-deep hover:underline" onClick={() => setTimeout(() => document.getElementById("notes-name")?.focus(), 50)}>
          ↑
        </a>
      </div>
    );

  const v = validateBody(body);
  const send = async () => {
    if (!v.ok || busy) return;
    setBusy(true);
    const ok = await api.post({ elementID: props.elementID, parentID: props.parentID, quote: props.parentID ? undefined : props.quote, body: v.value, authorName: name });
    setBusy(false);
    if (ok) {
      setBody("");
      props.onDropQuote?.();
      if (compact) setExpanded(false);
    }
  };

  if (!expanded)
    return (
      <button type="button" onClick={() => { setExpanded(true); setGrabFocus(true); }}
        className="w-full rounded-lg border border-paper-edge bg-paper-shade px-3 py-1.5 text-left text-[13px] text-ink-faint hover:border-gel/40">
        {props.placeholder}
      </button>
    );

  return (
    <div className={compact ? "" : "rounded-xl border border-gel/30 bg-white px-3.5 py-3 shadow-sm"}>
      {!compact && <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-gel-deep">{t.addNote}</p>}
      {props.quote && !props.parentID && (
        <p className="mb-2 flex items-start gap-2 border-l-2 border-gel/50 pl-2.5 font-body text-[13px] leading-snug text-ink-soft">
          <span className="min-w-0 flex-1">« {props.quote} »</span>
          <button type="button" aria-label={t.dropQuote} onClick={props.onDropQuote} className="text-ink-faint hover:text-rose">×</button>
        </p>
      )}
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          if (e.key === "Escape" && !body) (compact ? setExpanded(false) : props.onClose?.());
        }}
        rows={compact ? 2 : 3}
        autoFocus={grabFocus}
        placeholder={props.placeholder}
        className="block w-full resize-y rounded-lg border border-paper-edge bg-paper px-3 py-2 font-body text-[14px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-gel focus:outline-none"
      />
      {!v.ok && v.reason === "tooLong" && <p className="mt-1 text-[12px] text-rose">{t.tooLong}</p>}
      {api.error && (
        <p role="alert" className="mt-1 text-[12px] text-rose">
          {api.error === "auth" ? t.errAuth : api.error === "network" ? t.errNetwork : t.errUnknown}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        {(compact || props.onClose) && (
          <button type="button" className="rounded-lg px-2.5 py-1 text-[13px] font-medium text-ink-soft hover:text-ink"
            onClick={() => { setBody(""); api.clearError(); if (compact) setExpanded(false); else props.onClose?.(); }}>
            {compact ? t.cancel : t.close}
          </button>
        )}
        <button type="button" disabled={!v.ok || busy} onClick={() => void send()}
          className="rounded-lg bg-gel px-3 py-1 text-[13px] font-semibold text-white transition disabled:opacity-40">
          {props.submit}
        </button>
      </div>
    </div>
  );
}

export function BubbleIcon({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 2.5h10A1.5 1.5 0 0 1 14.5 4v6A1.5 1.5 0 0 1 13 11.5H7.2L4.3 14a.5.5 0 0 1-.8-.4v-2.1H3A1.5 1.5 0 0 1 1.5 10V4A1.5 1.5 0 0 1 3 2.5z" />
    </svg>
  );
}
