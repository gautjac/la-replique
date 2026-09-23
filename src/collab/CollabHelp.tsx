import { useEffect, useState } from "react";
import type { Locale } from "../i18n";
import { Modal } from "../ui/common";

const T = <A,>(l: Locale, fr: A, en: A): A => (l === "fr" ? fr : en);
const KEY = "lr.collab.onboarded";

const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode */ } };

/**
 * « Comment ça marche » for writing together — three cards, shown once on the
 * first visit (with `auto`) and any time from the link this renders.
 */
export function CollabHelp({ locale, auto, className }: { locale: Locale; auto?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => { if (auto && !seen()) setOpen(true); }, [auto]);

  const cards = [
    {
      glyph: "⚭",
      title: T(locale, "Trois rôles", "Three roles"),
      body: T(locale,
        "Écrire change le texte. Commenter laisse des notes sans toucher au texte. Lire regarde. La personne qui a partagé la pièce choisit le rôle de chaque invitation, et peut le changer après.",
        "Write changes the text. Comment leaves notes without touching the text. Read just reads. Whoever shared the play picks each invitation's role, and can change it later."),
    },
    {
      glyph: "❝",
      title: T(locale, "Notes, historique, versions", "Notes, history, versions"),
      body: T(locale,
        "Passe la souris sur une ligne et clique le + à sa droite pour laisser une note ; le survol d'une bulle montre l'aperçu, un double-clic ouvre le fil. En haut à droite : 🕘 Historique liste chaque changement signé (et le restaure), 📌 Versions enregistre une photo nommée de la pièce, à comparer ou à restaurer.",
        "Hover a line and click the + on its right to leave a note; hovering a bubble previews it, double-click opens the thread. Top right: 🕘 History lists every signed change (and restores it), 📌 Versions saves a named snapshot of the play, to compare or restore."),
    },
    {
      glyph: "✧",
      title: T(locale, "Chacun signe, partout", "Everyone signs, everywhere"),
      body: T(locale,
        "Ce que tu écris apparaît chez les autres en direct, avec ton nom. Une ligne que quelqu'un d'autre écrit se verrouille un instant. Hors ligne, tout se réconcilie au retour du réseau. La même pièce s'ouvre dans l'app sur iPhone, iPad et Mac.",
        "What you write shows up for the others live, with your name on it. A line someone else is writing locks for a moment. Offline, everything reconciles when the network returns. The same play opens in the app on iPhone, iPad and Mac."),
    },
  ];
  const card = cards[i];
  const last = i === cards.length - 1;
  const done = () => { markSeen(); setOpen(false); setI(0); };

  return (
    <>
      <button type="button" onClick={() => { setI(0); setOpen(true); }} className={className ?? "text-gel-bright hover:underline"}>
        {T(locale, "Comment ça marche", "How it works")}
      </button>
      {open && (
        <Modal onClose={done} label="collab-help">
          <div className="p-7 sm:p-9">
            <div className="mb-5 flex items-center gap-2">
              <span className="font-display text-lg font-semibold tracking-tight text-white">La Réplique</span>
              <span className="text-sm text-ink-faint">— {T(locale, "écrire à plusieurs", "writing together")}</span>
            </div>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gel/15 text-3xl text-gel-bright">{card.glyph}</div>
            <h2 className="mb-2 font-display text-2xl font-semibold text-white">{card.title}</h2>
            <p className="text-[15px] leading-relaxed text-ink-faint">{card.body}</p>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-1.5">
                {cards.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-gel" : "w-1.5 bg-desk-rule"}`} />)}
              </div>
              <div className="flex items-center gap-3">
                {!last && <button type="button" onClick={done} className="text-sm text-ink-faint hover:text-white">{T(locale, "Passer", "Skip")}</button>}
                <button type="button" onClick={() => (last ? done() : setI(i + 1))}
                  className="rounded-full bg-gel px-5 py-2 text-sm font-semibold text-white shadow-gel transition-colors hover:bg-gel-bright">
                  {last ? T(locale, "Compris", "Got it") : T(locale, "Suivant", "Next")}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
