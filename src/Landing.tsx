import { useEffect, useState, type ReactNode } from "react";

// ── L'Atelier hub ────────────────────────────────────────────────────────────
// The "Aussi de l'atelier" card points at the hub (L'Atelier front door). The hub
// isn't deployed yet (awaiting its Netlify name) — set this to its URL once live.
const HUB_URL = "https://latelier.netlify.app";

type Lang = "fr" | "en";
// Writing lives in the native iOS/macOS app; the button points at the App Store
// product (adamId 6790472715) — resolves once the app is published there.
const APP_STORE_URL = "https://apps.apple.com/app/id6790472715";

/** Persisted FR/EN choice — FR is the source language. */
function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem("lareplique-lang");
    return saved === "en" ? "en" : "fr";
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("lareplique-lang", lang);
    } catch {
      /* private mode — fine */
    }
  }, [lang]);
  return [lang, setLang];
}

const T = <A, B>(lang: Lang, fr: A, en: B) => (lang === "fr" ? fr : en);

// ── Marks ─────────────────────────────────────────────────────────────────────

/** The » réplique mark — two stage-gel quotation strokes on a dark tile. */
function Mark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-desk-light ring-1 ring-desk-rule"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 32 32" aria-hidden>
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

/** App Store download button — badge-style (Apple mark + "App Store"). */
function AppStoreButton({ lang, large = false }: { lang: Lang; large?: boolean }) {
  return (
    <a
      href={APP_STORE_URL}
      className={`inline-flex items-center gap-2.5 rounded-full bg-gel text-white shadow-gel transition hover:bg-gel-bright ${
        large ? "px-6 py-3" : "px-4 py-2"
      }`}
    >
      <svg viewBox="0 0 24 24" width={large ? 22 : 18} height={large ? 22 : 18} fill="currentColor" aria-hidden>
        <path d="M16.365 1.43c0 1.14-.417 2.2-1.11 2.98-.83.93-2.18 1.65-3.29 1.56-.14-1.09.42-2.24 1.06-2.95.72-.8 2.02-1.42 3.14-1.47.03.09.1.28.1.88zM20.9 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-.99-4.02-.98-2.09.01-2.52 1-4.06.98-1.73-.02-3.05-1.78-4.04-3.34-2.78-4.4-2.06-10.55 1.8-10.75 1.36-.07 2.36.86 3.14.86.78 0 2.35-1.07 3.96-.91.67.03 2.56.27 3.77 2.03-3.31 1.8-2.78 6.53.48 7.72z" />
      </svg>
      <span className="flex flex-col items-start leading-tight">
        <span className={`${large ? "text-[10px]" : "text-[9px]"} font-medium opacity-80`}>
          {T(lang, "Télécharger sur", "Download on the")}
        </span>
        <span className={`${large ? "text-[15px]" : "text-[13px]"} font-semibold leading-none`}>App Store</span>
      </span>
    </a>
  );
}

/** A small emblem for the atelier hub: a shadow-board of hung tools. */
function HubMark() {
  return (
    <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-desk-light ring-1 ring-desk-rule">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="4" y="5" width="24" height="22" rx="2.5" stroke="#8b93a4" strokeWidth="1.4" />
        <path d="M4 11h24" stroke="#8b93a4" strokeWidth="1.4" />
        <circle cx="10" cy="8" r="1.1" fill="#4f7cff" />
        <path d="M9 16v7M13 16l3 6M20 16v7M24 16l-2 7" stroke="#4f7cff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ── Section: hero script page (echoes the real /lire reading) ─────────────────

function ScriptPage({ lang }: { lang: Lang }) {
  return (
    <div className="relative rounded-2xl bg-paper px-6 py-8 text-ink shadow-page sm:px-9 sm:py-10">
      <div className="mb-6 flex items-center justify-center gap-3">
        <span className="h-px flex-1 bg-paper-edge" />
        <span className="font-display text-xs font-bold tracking-[0.25em] text-ink-soft">
          {T(lang, "ACTE I", "ACT I")}
        </span>
        <span className="h-px flex-1 bg-paper-edge" />
      </div>

      <div className="script space-y-3.5 text-[15px] leading-relaxed">
        <div>
          <div className="font-display text-xs font-bold tracking-[0.18em] text-ink-soft">
            {T(lang, "SCÈNE 1", "SCENE 1")}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-faint">
            {T(lang, "La lanterne du phare. Nuit.", "The lighthouse lantern. Night.")}
          </div>
        </div>

        <p className="border-l-2 border-gel/50 pl-3 text-ink-soft">
          {T(
            lang,
            "Madeleine gravit l'escalier de fer, une allumette à la main.",
            "Madeleine climbs the iron stairs, a match in her hand.",
          )}
        </p>

        <div>
          <div className="font-display text-sm font-semibold tracking-wide text-gel">MADELEINE</div>
          <p className="text-ink">
            {T(lang, "Encore un soir. T'as pas changé, toi.", "Another night. You haven't changed.")}
          </p>
        </div>

        <div>
          <div className="font-display text-sm font-semibold tracking-wide" style={{ color: "#0ea5b7" }}>
            ÉTIENNE
          </div>
          <p className="text-ink">
            {T(lang, "J'ai signé les papiers, moman.", "I signed the papers, Mum.")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Feature glyphs ────────────────────────────────────────────────────────────

const glyph: Record<string, ReactNode> = {
  line: (
    <path d="M4 5h11M4 10h16M4 15h9M4 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  ),
  board: (
    <>
      <rect x="3" y="4" width="6.5" height="8" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14.5" y="4" width="6.5" height="12" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="15" width="6.5" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  surtitle: (
    <>
      <path d="M4 8h16M4 8l3-3M20 8l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16H4M20 16l-3 3M4 16l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  cast: (
    <>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M13 20c0-3 2.2-5 5-5 1.1 0 2.1.3 3 .9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.1 10.9l7.8-3.8M8.1 13.1l7.8 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
};

function Feature({ icon, title, body }: { icon: keyof typeof glyph; title: string; body: string }) {
  return (
    <div className="group rounded-2xl border border-desk-rule bg-desk-light/60 p-5 transition hover:border-gel/40 hover:bg-desk-light">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-desk ring-1 ring-desk-rule text-gel transition group-hover:text-gel-bright">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          {glyph[icon]}
        </svg>
      </span>
      <h3 className="mt-3.5 font-display text-[17px] font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-faint">{body}</p>
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

export function Landing() {
  const [lang, setLang] = useLang();

  const features = [
    {
      icon: "line" as const,
      title: T(lang, "Réplique à réplique", "Line by line"),
      body: T(
        lang,
        "Une page qui s'efface sous le texte. Personnage, didascalie, action — chacun d'une seule touche.",
        "A page that gets out of the way. Character, stage direction, action — each one keystroke away.",
      ),
    },
    {
      icon: "board" as const,
      title: T(lang, "Le tableau", "The board"),
      body: T(
        lang,
        "Vois la pièce en cartes. Glisse les scènes, lis la tension acte par acte.",
        "See the play as cards. Drag the scenes, read the tension act by act.",
      ),
    },
    {
      icon: "surtitle" as const,
      title: T(lang, "Surtitres bilingues", "Bilingual surtitles"),
      body: T(
        lang,
        "Chaque réplique dans sa langue et son écho. FR ↔ EN, côte à côte.",
        "Every line in its language and its echo. FR ↔ EN, side by side.",
      ),
    },
    {
      icon: "ai" as const,
      title: T(lang, "Dramaturge de poche", "Pocket dramaturge"),
      body: T(
        lang,
        "L'Atelier relance une scène, la lit d'un œil critique, la traduit. Toujours une proposition — jamais un verdict.",
        "The Studio continues a scene, reads it critically, translates it. Always a proposal — never a verdict.",
      ),
    },
    {
      icon: "cast" as const,
      title: T(lang, "Distribution & doublage", "Cast & doubling"),
      body: T(
        lang,
        "Qui parle, combien, et quels rôles un seul comédien peut tenir sans jamais se croiser.",
        "Who speaks, how much, and which roles one actor can double without ever colliding.",
      ),
    },
    {
      icon: "share" as const,
      title: T(lang, "Lecture partagée", "Shared reading"),
      body: T(
        lang,
        "Publie une lecture web, en lecture seule. Un lien, et n'importe qui peut la lire.",
        "Publish a read-only web reading. One link, and anyone can read it.",
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-desk text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-desk-rule/60 bg-desk/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <Mark size={30} />
            <span className="font-display text-[17px] font-semibold tracking-tight">La Réplique</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-full border border-desk-rule text-xs font-semibold">
              {(["fr", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 transition ${
                    lang === l ? "bg-gel text-white" : "text-ink-faint hover:text-white"
                  }`}
                  aria-pressed={lang === l}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="hidden sm:block">
              <AppStoreButton lang={lang} />
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* ghostlight — a soft stage glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-[-8rem] h-[28rem] w-[44rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(79,124,255,0.35), transparent)" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-desk-rule bg-desk-light/60 px-3 py-1 text-xs font-medium text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-gel animate-ghostlight" />
              {T(lang, "Atelier d'écriture théâtrale", "Playwriting studio")}
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              {T(lang, "Écris ta pièce,", "Write your play,")}
              <br />
              <span className="text-gel">{T(lang, "réplique à réplique.", "line by line.")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-faint">
              {T(
                lang,
                "L'app d'écriture théâtrale pour iPhone, iPad et Mac. Un plateau propre pour le texte, un tableau pour la structure, un dramaturge de poche qui propose. Chaque pièce se partage en lecture web.",
                "The playwriting app for iPhone, iPad and Mac. A clean stage for the text, a board for the structure, a pocket dramaturge that suggests. Every play shares as a web reading.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <AppStoreButton lang={lang} large />
              <a
                href="/lire/demo"
                className="rounded-full border border-desk-rule px-6 py-3 text-base font-semibold text-white transition hover:border-gel/50 hover:bg-desk-light"
              >
                {T(lang, "Lire un exemple", "Read an example")}
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              {T(
                lang,
                "Sur iPhone, iPad et Mac. Tes pièces te suivent, synchronisées par iCloud.",
                "On iPhone, iPad and Mac. Your plays follow you, synced over iCloud.",
              )}
            </p>
          </div>

          <div className="animate-riseIn">
            <ScriptPage lang={lang} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {T(lang, "Tout le théâtre, rien de trop.", "All the theatre, nothing spare.")}
          </h2>
          <p className="mt-2 text-ink-faint">
            {T(
              lang,
              "De la première réplique à la lecture partagée, l'atelier reste hors du chemin.",
              "From the first line to the shared reading, the studio stays out of the way.",
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Reading band */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-desk-rule bg-desk-light/50 p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <h3 className="font-display text-xl font-semibold sm:text-2xl">
              {T(lang, "Une lecture, en un lien.", "A reading, in one link.")}
            </h3>
            <p className="mt-1.5 max-w-xl text-ink-faint">
              {T(
                lang,
                "Publie ta pièce en lecture seule sur le web — le texte, pas le fichier modifiable. Élégante à lire, sur tout écran.",
                "Publish your play read-only on the web — the text, not the editable file. Elegant to read, on any screen.",
              )}
            </p>
          </div>
          <a
            href="/lire/demo"
            className="shrink-0 rounded-full border border-gel/50 px-5 py-2.5 font-semibold text-gel-bright transition hover:bg-gel hover:text-white"
          >
            {T(lang, "Voir une lecture", "See a reading")} →
          </a>
        </div>
      </section>

      {/* Aussi de l'atelier */}
      <section className="mx-auto max-w-6xl px-5 pb-6 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {T(lang, "Aussi de l'atelier", "Also from the atelier")}
        </div>
        <a
          href={HUB_URL}
          className="group mt-3 flex items-center gap-4 rounded-2xl border border-desk-rule bg-desk-light/50 p-4 transition hover:-translate-y-0.5 hover:border-gel/40 hover:bg-desk-light"
        >
          <HubMark />
          <span className="flex flex-col">
            <span className="font-display text-[17px] font-semibold text-white">L'Atelier</span>
            <span className="text-sm text-ink-faint">
              {T(lang, "Les outils d'un seul artisan.", "One maker's tools.")}
            </span>
          </span>
          <span className="ml-auto text-xl text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-gel-bright">
            →
          </span>
        </a>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 border-t border-desk-rule pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Mark size={26} />
            <span className="font-display text-sm font-semibold">La Réplique</span>
          </div>
          <div className="text-sm text-ink-faint">
            {T(lang, "Fait à Moncton.", "Made in Moncton.")}{" "}
            <span className="text-ink-soft">·</span>{" "}
            {T(lang, "Pas de cookies, pas de pistage.", "No cookies, no tracking.")}
          </div>
        </div>
      </footer>
    </div>
  );
}
