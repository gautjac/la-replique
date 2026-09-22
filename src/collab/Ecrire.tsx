// /ecrire — writing together, in a browser. The way in for everyone around a
// play who isn't on an Apple device. It reuses the editor component as-is: the
// sync engine sits beside it, exactly as it does in the app.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STRINGS, UIContext, type Locale, type UIKey } from "../i18n";
import type { Play } from "../types";
import { CastPanel } from "../ui/CastPanel";
import { Editor } from "../ui/Editor";
import { GENERAL, threadsFor, type PlayMeta } from "../lire/comments";
import { ThreadCard, ThreadStack, type NotesCtx } from "../lire/Notes";
import { strings } from "../lire/strings";
import { useComments } from "../lire/useComments";
import { CollabCore } from "./core";
import { notesBackend } from "./notesBackend";
import {
  EMULATOR, fetchAll, join, listen, myPlays, myRole, playOwner, presence, rename, send, sendEmailLink, signInDemo, signInGoogle,
  colorFor, signOutNow, watchAuth, type LineEdit, type Other, type Person, type Seat,
} from "./firebase";

const T = <A,>(l: Locale, fr: A, en: A): A => (l === "fr" ? fr : en);

function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, set] = useState<Locale>(() => {
    try { const v = localStorage.getItem("lareplique-lang"); if (v === "fr" || v === "en") return v; } catch { /* private mode */ }
    return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
  });
  return [locale, (l) => { try { localStorage.setItem("lareplique-lang", l); } catch { /* fine */ } set(l); }];
}

export function Ecrire({ path }: { path: string }) {
  const [locale, setLocale] = useLocale();
  const [person, setPerson] = useState<Person | null | undefined>(undefined);
  useEffect(() => watchAuth(setPerson), []);
  const playID = decodeURIComponent(path.replace(/^\/ecrire\/?/, "").replace(/\/$/, "")) || null;
  const ui = useMemo(() => ({ locale, setLocale, t: (k: UIKey) => STRINGS[k][locale] }), [locale]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UIContext.Provider value={ui}>
      <div className="min-h-screen bg-desk text-white">
        {person === undefined ? (
          <Centered>{T(locale, "Un instant…", "One moment…")}</Centered>
        ) : !person ? (
          <Shell locale={locale} setLocale={setLocale}><SignIn locale={locale} /></Shell>
        ) : playID ? (
          <Room key={playID} playID={playID} person={person} locale={locale} setLocale={setLocale} />
        ) : (
          <Shell locale={locale} setLocale={setLocale} person={person}><Lobby person={person} locale={locale} /></Shell>
        )}
      </div>
    </UIContext.Provider>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center px-6 text-center text-ink-faint">{children}</div>;
}

function LangToggle({ locale, setLocale }: { locale: Locale; setLocale(l: Locale): void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-desk-rule text-xs font-semibold" role="group" aria-label="Langue / Language">
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={locale === l} onClick={() => setLocale(l)}
          className={`px-2.5 py-1 uppercase tracking-wide ${locale === l ? "bg-gel text-white" : "text-ink-faint hover:text-white"}`}>{l}</button>
      ))}
    </div>
  );
}

function Shell(props: { locale: Locale; setLocale(l: Locale): void; person?: Person; children: React.ReactNode }) {
  const { locale } = props;
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <a href="/" className="font-display text-lg font-semibold tracking-tight">La Réplique</a>
        <span className="text-sm text-ink-faint">— {T(locale, "écrire à plusieurs", "writing together")}</span>
        <span className="ml-auto" />
        <LangToggle locale={locale} setLocale={props.setLocale} />
      </header>
      {props.children}
      {props.person && (
        <p className="mt-10 text-sm text-ink-faint">
          {props.person.email ?? props.person.name} ·{" "}
          <button type="button" className="text-gel-bright hover:underline" onClick={() => void signOutNow()}>{T(locale, "Se déconnecter", "Sign out")}</button>
        </p>
      )}
    </div>
  );
}

// MARK: sign-in

function SignIn({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (op: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await op(); } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (!/popup-closed|cancelled-popup/.test(code)) setError(T(locale, "La connexion n'a pas marché. Réessaie.", "Sign-in didn't work. Try again."));
    }
    setBusy(false);
  };
  const back = window.location.pathname + window.location.search;
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{T(locale, "Dis-nous qui tu es", "Tell us who you are")}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
        {T(locale, "Pour écrire à plusieurs, chacun signe ses changements et ses notes.", "To write together, everyone signs their changes and notes.")}
      </p>
      <button type="button" disabled={busy} onClick={() => void run(signInGoogle)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-desk-rule bg-desk-light px-4 py-3 font-semibold hover:border-gel-bright disabled:opacity-50">
        <span className="font-display text-lg font-bold">G</span> {T(locale, "Continuer avec Google", "Continue with Google")}
      </button>
      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); void run(async () => { await sendEmailLink(email, back); setSent(true); }); }}>
        <label className="text-xs font-bold uppercase tracking-wider text-ink-faint" htmlFor="lr-email">{T(locale, "Ou par courriel — sans mot de passe", "Or by email — no password")}</label>
        <div className="mt-2 flex gap-2">
          <input id="lr-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T(locale, "toi@exemple.ca", "you@example.com")}
            className="min-w-0 flex-1 rounded-lg border border-desk-rule bg-desk px-3 py-2.5 text-white placeholder:text-ink-faint focus:border-gel-bright focus:outline-none" />
          <button type="submit" disabled={busy} className="rounded-lg bg-gel px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{T(locale, "Envoyer le lien", "Send the link")}</button>
        </div>
      </form>
      {sent && <p className="mt-3 text-sm text-ink-faint">{T(locale, "Lien envoyé. Ouvre-le dans ce navigateur pour revenir ici, connecté·e.", "Link sent. Open it in this browser to come back here, signed in.")}</p>}
      {EMULATOR && (
        <button type="button" className="mt-6 rounded-lg border border-dashed border-desk-rule px-3 py-2 text-sm text-ink-faint" onClick={() => void run(() => signInDemo("Navigateur"))}>
          Emulator: enter as « Navigateur »
        </button>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-rose">{error}</p>}
    </div>
  );
}

// MARK: lobby — my plays, and joining one

function Lobby({ person, locale }: { person: Person; locale: Locale }) {
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("code") ?? "");
  const [name, setName] = useState(person.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void myPlays().then(setSeats).catch(() => setSeats([])); }, []);

  const go = async () => {
    setBusy(true); setError(null);
    try {
      const n = name.trim();
      if (n && n !== person.name) await rename(n);
      const id = await join(code, n || person.email || "?");
      window.location.assign(`/ecrire/${id}${EMULATOR ? "?emu=1" : ""}`);
    } catch (e) {
      const m = (e as Error).message;
      setError(m === "expired" ? T(locale, "Cette invitation a expiré. Demandes-en une nouvelle.", "That invitation has expired. Ask for a new one.")
        : T(locale, "Cette invitation n'existe pas. Vérifie le code.", "That invitation doesn't exist. Check the code."));
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{T(locale, "Tes pièces à plusieurs", "Your shared plays")}</h1>
      <div className="mt-5 space-y-2">
        {seats === null && <p className="text-ink-faint">{T(locale, "Je regarde…", "Looking…")}</p>}
        {seats?.length === 0 && <p className="text-ink-faint">{T(locale, "Aucune pour l'instant. Entre un code d'invitation ci-dessous.", "None yet. Enter an invitation code below.")}</p>}
        {seats?.map((s) => (
          <a key={s.playID} href={`/ecrire/${s.playID}${EMULATOR ? "?emu=1" : ""}`} className="flex items-center gap-3 rounded-xl border border-desk-rule bg-desk-light px-4 py-3 hover:border-gel-bright">
            <span className="min-w-0 flex-1 truncate font-display font-semibold">{s.title || T(locale, "Pièce sans titre", "Untitled play")}</span>
            <span className="rounded-full bg-gel/15 px-2 py-0.5 text-xs font-semibold text-gel-bright">{roleLabel(s.role, locale)}</span>
          </a>
        ))}
      </div>
      <form className="mt-8 rounded-xl border border-desk-rule bg-desk-light p-4" onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <h2 className="font-display font-semibold">{T(locale, "Rejoindre une pièce", "Join a play")}</h2>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCDE23456" aria-label={T(locale, "Code ou lien d'invitation", "Invitation code or link")}
          className="mt-3 w-full rounded-lg border border-desk-rule bg-desk px-3 py-2.5 font-mono uppercase tracking-widest text-white placeholder:text-ink-faint focus:border-gel-bright focus:outline-none" />
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={T(locale, "Ton nom, pour les autres", "Your name, as others see it")}
          className="mt-2 w-full rounded-lg border border-desk-rule bg-desk px-3 py-2.5 text-white placeholder:text-ink-faint focus:border-gel-bright focus:outline-none" />
        <button type="submit" disabled={busy || code.trim().length < 6 || !name.trim()} className="mt-3 w-full rounded-lg bg-gel px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{T(locale, "Rejoindre", "Join")}</button>
        {error && <p role="alert" className="mt-3 text-sm text-rose">{error}</p>}
      </form>
    </div>
  );
}

const roleLabel = (r: string, l: Locale) => (r === "writer" ? T(l, "Écrire", "Write") : r === "commenter" ? T(l, "Commenter", "Comment") : T(l, "Lire", "Read"));

// MARK: the room — one shared play, live

type Status = "connecting" | "live" | "offline" | "gone" | "stranger";

function Room({ playID, person, locale, setLocale }: { playID: string; person: Person; locale: Locale; setLocale(l: Locale): void }) {
  const [play, setPlayState] = useState<Play | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [role, setRole] = useState<string>("reader");
  const [others, setOthers] = useState<Other[]>([]);
  const [showCast, setShowCast] = useState(false);
  const [ownerUid, setOwnerUid] = useState("");
  const [notesFor, setNotesFor] = useState<string | null | undefined>(undefined);   // undefined = closed, null = all
  const [edits, setEdits] = useState<Record<string, LineEdit>>({});
  const [showChanges, setShowChanges] = useState(false);
  // "Since my last visit": fixed for this whole session; the visit ends when the tab does.
  const since = useRef<number>((() => { try { return Number(localStorage.getItem(`lr.seen.${playID}`)) || Date.now(); } catch { return Date.now(); } })());
  const core = useRef(new CollabCore());
  const latest = useRef<Play | null>(null);        // the truth, always current
  const rendered = useRef<Play | null>(null);      // what the editor last saw
  const pres = useRef<{ focus(id: string | null): void; stop(): void } | null>(null);
  const canWrite = role === "writer";
  const canWriteRef = useRef(false);
  canWriteRef.current = canWrite;

  const setPlay = (p: Play) => { latest.current = p; setPlayState(p); };

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    (async () => {
      const r = await myRole(playID);
      if (!alive) return;
      if (!r) return setStatus("stranger");
      setRole(r);
      void playOwner(playID).then((o) => alive && setOwnerUid(o));
      let all;
      try { all = await fetchAll(playID); } catch { if (alive) setStatus("gone"); return; }
      if (!alive) return;
      setPlay(core.current.adopt(all, { id: playID, createdAt: Date.now() }));
      const author = { uid: person.uid, name: person.name || person.email || "?" };
      const seen = () => { try { localStorage.setItem(`lr.seen.${playID}`, String(Date.now())); } catch { /* fine */ } };
      window.addEventListener("pagehide", seen);
      const unlisten = listen(playID, core.current.shadow.keys(), {
        onChanges: (changes) => {
          if (!latest.current) return;
          const out = core.current.applyRemote(latest.current, changes);
          if (out.play !== latest.current) setPlay(out.play);
          if (canWriteRef.current && out.ops.length) send(playID, out.ops, author);
        },
        onEdits: (next) => setEdits((cur) => {
          const out = { ...cur };
          for (const [id, e] of Object.entries(next)) { if (e) out[id] = e; else delete out[id]; }
          return out;
        }),
        onLive: (live) => setStatus((s) => (s === "gone" ? s : live ? "live" : "offline")),
        onLost: () => setStatus("gone"),
      });
      const timer = window.setInterval(() => {
        if (!latest.current || !canWriteRef.current) return;
        const ops = core.current.flushLocal(latest.current);
        if (ops.length) send(playID, ops, author);
      }, 400);
      pres.current = presence(playID, person.name || person.email || "?", setOthers);
      stop = () => { window.clearInterval(timer); unlisten(); pres.current?.stop(); window.removeEventListener("pagehide", seen); seen(); };
    })();
    return () => { alive = false; stop(); };
  }, [playID, person.uid, person.name, person.email]);

  // The editor hands back whole plays computed from what it last rendered; lay
  // only what CHANGED onto the current truth, so a change that landed in between
  // is never undone (see CollabCore.rebase).
  const commit = useCallback((next: Play) => {
    if (!latest.current) return;
    setPlay(core.current.rebase(rendered.current ?? latest.current, next, latest.current));
  }, []);

  const byElement = useMemo(() => {
    const m: Record<string, { name: string; color: string }[]> = {};
    for (const o of others) if (o.elementID) (m[o.elementID] ??= []).push({ name: o.name, color: o.color });
    return m;
  }, [others]);

  const recent = useMemo(() => Object.entries(edits).filter(([, e]) => e.uid !== person.uid && e.at > since.current).sort((a, b) => b[1].at - a[1].at), [edits, person.uid]);
  const changedMap = useMemo(() => Object.fromEntries(recent.map(([id, e]) => [id, { name: e.name, color: colorFor(e.uid) }])), [recent]);

  if (status === "stranger")
    return <Centered><div><p>{T(locale, "Tu n'es pas invité·e à cette pièce — ou pas avec ce compte.", "You aren't invited to this play — or not with this account.")}</p>
      <a className="mt-3 inline-block text-gel-bright hover:underline" href={`/ecrire${EMULATOR ? "?emu=1" : ""}`}>{T(locale, "Entrer un code d'invitation", "Enter an invitation code")}</a></div></Centered>;
  if (!play) return <Centered>{status === "gone" ? T(locale, "Cette pièce n'est plus partagée.", "This play is no longer shared.") : T(locale, "J'ouvre la pièce…", "Opening the play…")}</Centered>;
  rendered.current = play;

  const dot = status === "live" ? "bg-cast-jade" : status === "offline" ? "bg-cast-amber" : status === "gone" ? "bg-rose" : "bg-gel";
  const label = status === "live" ? T(locale, "À plusieurs · en direct", "Together · live")
    : status === "offline" ? T(locale, "Hors ligne — tes changements partiront au retour du réseau", "Offline — your changes will go out when the network returns")
    : status === "gone" ? T(locale, "Cette pièce n'est plus partagée avec toi", "This play is no longer shared with you") : T(locale, "Connexion…", "Connecting…");

  return (
    <div>
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-desk-rule bg-desk/95 px-4 py-2.5 backdrop-blur">
        <a href={`/ecrire${EMULATOR ? "?emu=1" : ""}`} className="text-sm text-gel-bright hover:underline">← {T(locale, "Mes pièces", "My plays")}</a>
        <span className="min-w-0 flex-1 truncate text-center font-display font-semibold">{play.title || T(locale, "Pièce sans titre", "Untitled play")}</span>
        <button type="button" onClick={() => setShowCast(true)} className="rounded-lg border border-desk-rule px-2.5 py-1 text-xs font-semibold hover:border-gel-bright">{STRINGS.cast[locale]}</button>
        <LangToggle locale={locale} setLocale={setLocale} />
      </header>

      <RoomNotes playID={playID} role={role} ownerUid={ownerUid} play={play} person={person} locale={locale} openFor={notesFor} onClose={() => setNotesFor(undefined)}>
        {(counts, total, previews) => (
          <>
            <button type="button" onClick={() => setNotesFor(null)}
              className="no-print fixed right-4 top-14 z-30 rounded-full border border-desk-rule bg-desk-light px-3 py-1.5 text-xs font-semibold shadow-lift hover:border-gel-bright">
              💬 Notes{total ? ` · ${total}` : ""}
            </button>
            <button type="button" onClick={() => setShowChanges(true)}
              className="no-print fixed right-4 top-24 z-30 rounded-full border border-desk-rule bg-desk-light px-3 py-1.5 text-xs font-semibold shadow-lift hover:border-gel-bright">
              🕘 {T(locale, "Changements", "Changes")}{recent.length ? ` · ${recent.length}` : ""}
            </button>
            <Editor play={play} commit={commit} others={byElement} onFocusElement={(id) => pres.current?.focus(id)}
              readOnly={!canWrite || status === "gone"} noAI noteCounts={counts} notePreviews={previews} onNotes={role === "reader" ? undefined : (id) => setNotesFor(id)} changed={changedMap} />
          </>
        )}
      </RoomNotes>

      <footer className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-desk-rule bg-desk-light px-4 py-1.5 text-xs text-ink-faint">
        <span className={`h-2 w-2 rounded-full ${dot}`} /> <span className="font-medium">{label}</span>
        {!canWrite && <span>· {T(locale, "lecture seule", "read-only")} ({roleLabel(role, locale)})</span>}
        <span className="ml-auto flex items-center gap-2">
          <span className="flex -space-x-1.5">
            {others.slice(0, 5).map((o) => (
              <span key={o.uid} title={o.name} className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-desk-light" style={{ background: o.color }}>{o.name.slice(0, 1).toUpperCase()}</span>
            ))}
          </span>
          <span className="max-w-[40vw] truncate">{others.map((o) => o.name).join(", ")}</span>
        </span>
      </footer>

      {showChanges && (
        <div className="no-print fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setShowChanges(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-desk-light p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center"><h2 className="font-display text-lg font-semibold">{T(locale, "Changements", "Changes")}</h2>
              <button type="button" className="ml-auto text-sm text-gel-bright" onClick={() => setShowChanges(false)}>{STRINGS.close[locale]}</button></div>
            <p className="mb-4 text-sm text-ink-faint">{T(locale, "Ce que les autres ont changé depuis ta dernière visite.", "What the others changed since your last visit.")}</p>
            {recent.length === 0 && <p className="text-ink-faint">{T(locale, "Rien de neuf.", "Nothing new.")}</p>}
            {recent.map(([id, e]) => {
              const el = play.elements.find((x) => x.id === id);
              if (!el) return null;
              const who = el.type === "cue" ? play.characters.find((c) => c.id === el.characterId)?.name : undefined;
              const text = ("text" in el ? el.text : el.label) ?? "";
              return (
                <button key={id} type="button" className="mb-2 flex w-full items-start gap-2.5 rounded-lg bg-desk px-3 py-2.5 text-left hover:ring-1 hover:ring-gel-bright"
                  onClick={() => { setShowChanges(false); document.querySelector(`[data-elid="${id}"], [data-row="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: colorFor(e.uid) }} />
                  <span className="min-w-0"><span className="block text-sm">{(who ? `${who} — ` : "") + (text.length > 90 ? text.slice(0, 90) + "…" : text)}</span>
                    <span className="text-xs text-ink-faint">{e.name} · {new Date(e.at).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" })}</span></span>
                </button>
              );
            })}
          </aside>
        </div>
      )}

      {showCast && (
        <div className="no-print fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setShowCast(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-desk-light p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center"><h2 className="font-display text-lg font-semibold">{STRINGS.cast[locale]}</h2>
              <button type="button" className="ml-auto text-sm text-gel-bright" onClick={() => setShowCast(false)}>{STRINGS.close[locale]}</button></div>
            <fieldset disabled={!canWrite} className="m-0 min-w-0 border-0 p-0"><CastPanel play={play} commit={commit} /></fieldset>
          </aside>
        </div>
      )}
    </div>
  );
}

// MARK: notes — the reading page's thread cards and rules, on the shared play's notes

function RoomNotes(props: {
  playID: string; role: string; ownerUid: string; play: Play; person: Person; locale: Locale;
  openFor: string | null | undefined; onClose(): void;
  children: (counts: Record<string, number>, total: number, previews: Record<string, { author: string; body: string; quote?: string; replies: number; at: number }[]>) => React.ReactNode;
}) {
  const { play, locale, openFor } = props;
  const backend = useMemo(() => notesBackend(props.playID, props.role, props.ownerUid), [props.playID, props.role, props.ownerUid]);
  const meta = useMemo<PlayMeta>(() => ({ commentsOpen: true, resolved: [], hidden: [], owner: props.ownerUid, moderator: props.role === "writer" }), [props.ownerUid, props.role]);
  const elementIDs = useMemo(() => play.elements.map((e) => e.id), [play.elements]);
  const api = useComments(backend, props.playID, meta, elementIDs);
  const [showResolved, setShowResolved] = useState(false);
  const [name, setName] = useState(props.person.name || props.person.email || "");
  const canPost = props.role === "writer" || props.role === "commenter";
  const ctx: NotesCtx = { api: { ...api, meta, identity: canPost ? api.identity : null }, t: strings(locale), lang: locale, demo: false, name, setName, showResolved };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const th of api.threads) if (!th.resolved && !th.detached && th.root.elementID !== GENERAL) m[th.root.elementID] = (m[th.root.elementID] ?? 0) + 1;
    return m;
  }, [api.threads]);
  const total = api.threads.filter((th) => !th.resolved).length;
  const previews = useMemo(() => {
    const m: Record<string, { author: string; body: string; quote?: string; replies: number; at: number }[]> = {};
    for (const th of api.threads) if (!th.resolved && !th.detached && th.root.elementID !== GENERAL)
      (m[th.root.elementID] ??= []).push({ author: th.root.authorName, body: th.root.body, quote: th.root.quote, replies: th.replies.length, at: th.root.createdAt });
    return m;
  }, [api.threads]);

  const label = (id: string): string => {
    const el = play.elements.find((e) => e.id === id);
    if (!el) return "";
    const who = el.type === "cue" ? play.characters.find((c) => c.id === el.characterId)?.name : undefined;
    const text = ("text" in el ? el.text : el.label) ?? "";
    return (who ? `${who} — ` : "") + (text.length > 90 ? text.slice(0, 90) + "…" : text);
  };
  const lines = [...new Set(api.threads.filter((th) => !th.detached && th.root.elementID !== GENERAL && (showResolved || !th.resolved)).map((th) => th.root.elementID))]
    .filter((id) => id !== openFor)
    .sort((a, b) => elementIDs.indexOf(a) - elementIDs.indexOf(b));
  const detached = api.threads.filter((th) => th.detached && (showResolved || !th.resolved));
  const resolvedCount = api.threads.filter((th) => th.resolved).length;

  return (
    <>
      {props.children(counts, total, previews)}
      {openFor !== undefined && (
        <div className="no-print fixed inset-0 z-40 flex justify-end bg-black/50" onClick={props.onClose}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-paper p-5 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-lg font-semibold">Notes</h2>
              {resolvedCount > 0 && (
                <button type="button" className="text-sm font-medium text-gel-deep hover:underline" onClick={() => setShowResolved((v) => !v)}>
                  {showResolved ? ctx.t.hideResolved : ctx.t.showResolved}
                </button>
              )}
              <button type="button" className="ml-auto text-sm font-medium text-gel-deep" onClick={props.onClose}>{ctx.t.close}</button>
            </div>
            {!canPost && <p className="mb-3 text-sm text-ink-soft">{T(locale, "Tu vois les notes en direct. Ton rôle (Lire) ne permet pas d'en laisser.", "You see the notes live. Your role (Read) doesn't allow leaving any.")}</p>}
            {openFor && (
              <section className="mb-5">
                <h3 className="font-body text-[13px] font-semibold text-ink-soft">{label(openFor)}</h3>
                <ThreadStack ctx={ctx} threads={threadsFor(api.threads, openFor)} elementID={openFor} autoFocus />
              </section>
            )}
            {lines.map((id) => (
              <section key={id} className="mb-5">
                <h3 className="font-body text-[13px] font-semibold text-ink-soft">{label(id)}</h3>
                <div className="my-2 space-y-2.5">{threadsFor(api.threads, id).filter((th) => showResolved || !th.resolved).map((th) => <ThreadCard key={th.root.id} ctx={ctx} thread={th} />)}</div>
              </section>
            ))}
            <section className="mb-5">
              <h3 className="font-display text-sm font-semibold">{ctx.t.general}</h3>
              <ThreadStack ctx={ctx} threads={threadsFor(api.threads, GENERAL)} elementID={GENERAL} />
            </section>
            {detached.length > 0 && (
              <section>
                <h3 className="font-display text-sm font-semibold">{ctx.t.detached}</h3>
                <p className="text-[12px] text-ink-soft">{ctx.t.detachedHint}</p>
                <div className="my-2 space-y-2.5">{detached.map((th) => <ThreadCard key={th.root.id} ctx={ctx} thread={th} />)}</div>
              </section>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
