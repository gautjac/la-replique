import { useEffect, useMemo, useState } from "react";
import { CAST_SWATCHES } from "../types";
import { fetchPublicPlayJSON, hasToken } from "./cloudkit";

// The shared la-replique/1 document (loose types — this is a read-only view).
interface Cast {
  name?: string;
  color?: string;
}
interface El {
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
  lang?: string;
  characters?: Cast[];
  elements?: El[];
}

const DEMO: Doc = {
  title: "La porte",
  subtitle: "esquisse",
  lang: "fr",
  characters: [{ name: "ALICE" }, { name: "BRUNO" }],
  elements: [
    { type: "act", label: "ACTE I" },
    { type: "scene", label: "SCÈNE 1", setting: "Une cuisine. Fin de soirée." },
    { type: "stage", text: "Alice essuie la même assiette depuis trop longtemps. On frappe. Elle n'ouvre pas." },
    { type: "cue", character: "BRUNO", parenthetical: "derrière la porte", text: "Je sais que t'es là. La lumière est allumée." },
    { type: "cue", character: "ALICE", text: "La lumière est toujours allumée. Ça veut rien dire." },
    { type: "cue", character: "BRUNO", text: "Dix ans, Alice. Ouvre la porte." },
    { type: "stage", text: "Un temps. Elle pose l'assiette." },
  ],
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; doc: Doc }
  | { kind: "notFound" }
  | { kind: "error"; message: string };

export function Lire({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    if (id === "demo") {
      setState({ kind: "ready", doc: DEMO });
      return;
    }
    if (!hasToken()) {
      setState({ kind: "error", message: "Le lecteur web n'est pas encore configuré." });
      return;
    }
    (async () => {
      try {
        const json = await fetchPublicPlayJSON(id);
        if (!alive) return;
        if (!json) return setState({ kind: "notFound" });
        const data = JSON.parse(json);
        setState({ kind: "ready", doc: (data?.play ?? data) as Doc });
      } catch {
        if (alive) setState({ kind: "error", message: "Impossible de charger cette pièce." });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-desk text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <header className="mb-6 flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">La Réplique</span>
          <span className="text-sm text-ink-faint">— lecture</span>
        </header>
        {state.kind === "loading" && <Centered>Chargement…</Centered>}
        {state.kind === "notFound" && <Centered>Cette pièce n'existe pas ou n'est plus partagée.</Centered>}
        {state.kind === "error" && <Centered>{state.message}</Centered>}
        {state.kind === "ready" && <Reader doc={state.doc} />}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-desk-rule py-20 text-center text-ink-faint">{children}</div>;
}

function Reader({ doc }: { doc: Doc }) {
  const colorFor = useMemo(() => {
    const map = new Map<string, string>();
    const used: string[] = [];
    (doc.characters ?? []).forEach((c) => {
      if (!c.name) return;
      const color = c.color ?? CAST_SWATCHES.find((s) => !used.includes(s)) ?? CAST_SWATCHES[used.length % CAST_SWATCHES.length];
      used.push(color);
      map.set(c.name.toLowerCase(), color);
    });
    return (name?: string) => {
      if (!name) return "#8b93a4";
      const key = name.toLowerCase();
      if (map.has(key)) return map.get(key)!;
      const color = CAST_SWATCHES.find((s) => !used.includes(s)) ?? CAST_SWATCHES[used.length % CAST_SWATCHES.length];
      used.push(color);
      map.set(key, color);
      return color;
    };
  }, [doc]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">{doc.title || "Pièce sans titre"}</h1>
      {doc.subtitle && <p className="mt-1 text-ink-faint">{doc.subtitle}</p>}
      {doc.author && <p className="mt-1 text-sm text-ink-faint">{(doc.lang === "en" ? "by " : "de ") + doc.author}</p>}

      <div className="script mt-6 rounded-xl bg-paper px-6 py-8 text-ink shadow-page sm:px-12 sm:py-12">
        {(doc.elements ?? []).map((el, i) => {
          if (el.type === "act")
            return (
              <div key={i} className="my-8 flex items-center gap-3">
                <span className="h-px flex-1 bg-paper-edge" />
                <span className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink">{el.label}</span>
                <span className="h-px flex-1 bg-paper-edge" />
              </div>
            );
          if (el.type === "scene")
            return (
              <div key={i} className="mb-4 mt-7">
                <div className="font-display text-base font-semibold uppercase tracking-[0.14em] text-ink">{el.label}</div>
                {el.setting && <div className="mt-1 text-sm text-ink-soft">{el.setting}</div>}
              </div>
            );
          if (el.type === "stage")
            return (
              <div key={i} className="my-3 border-l-2 border-gel/50 pl-4 text-[15px] text-ink-soft">
                {el.text}
                {el.alt && <div className="surtitle mt-1 text-[14px]">{el.alt}</div>}
              </div>
            );
          if (el.type === "action") return <div key={i} className="my-3 text-[15px] text-ink">{el.text}</div>;
          // cue
          return (
            <div key={i} className="mb-3.5">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: colorFor(el.character) }}>
                  {(el.character || "?").toUpperCase()}
                </span>
                {el.parenthetical && <span className="text-sm text-ink-soft">{el.parenthetical}</span>}
              </div>
              <div className="mt-0.5 text-[17px] leading-relaxed text-ink">{el.text}</div>
              {el.alt && <div className="surtitle mt-1 text-[15px]">{el.alt}</div>}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-ink-faint">
        Écrit avec <a className="text-gel-bright" href="/">La Réplique</a>
      </p>
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
