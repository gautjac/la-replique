// The reader's own small FR/EN dictionary. The interface language follows the
// visitor (saved choice, else the browser), NOT the play's language.
import { useEffect, useState } from "react";

export type Lang = "fr" | "en";

export function useReaderLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("lareplique-lang");
      if (saved === "fr" || saved === "en") return saved;
    } catch {
      /* private mode */
    }
    return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("lareplique-lang", lang);
    } catch {
      /* fine */
    }
  }, [lang]);
  return [lang, setLang];
}

const D = {
  reading: { fr: "lecture", en: "reading" },
  loading: { fr: "Chargement…", en: "Loading…" },
  notFound: { fr: "Cette pièce n'existe pas ou n'est plus partagée.", en: "This play doesn't exist or is no longer shared." },
  notConfigured: { fr: "Le lecteur web n'est pas encore configuré.", en: "The web reader isn't configured yet." },
  loadError: { fr: "Impossible de charger cette pièce.", en: "Couldn't load this play." },
  untitled: { fr: "Pièce sans titre", en: "Untitled play" },
  writtenWith: { fr: "Écrit avec", en: "Written with" },

  commentsOpen: { fr: "Notes ouvertes", en: "Notes are open" },
  commentsIntro: {
    fr: "Touche une ligne pour y laisser une note, ou sélectionne quelques mots pour les citer. Tout le monde qui a le lien voit les notes.",
    en: "Tap a line to leave a note on it, or select a few words to quote them. Everyone with the link sees the notes.",
  },
  nOpen: { fr: (n: number) => (n === 1 ? "1 note ouverte" : `${n} notes ouvertes`), en: (n: number) => (n === 1 ? "1 open note" : `${n} open notes`) },
  nResolved: { fr: (n: number) => (n === 1 ? "1 réglée" : `${n} réglées`), en: (n: number) => `${n} resolved` },
  showResolved: { fr: "Voir les réglées", en: "Show resolved" },
  hideResolved: { fr: "Cacher les réglées", en: "Hide resolved" },
  signInToComment: { fr: "Connecte-toi avec ton identifiant Apple pour laisser une note.", en: "Sign in with your Apple ID to leave a note." },
  signInAbove: { fr: "Le bouton est en haut de la page", en: "The button is at the top of the page" },
  signedInAs: { fr: "Tu signes", en: "Signing as" },
  yourName: { fr: "Ton nom, tel qu'il paraîtra", en: "Your name, as it will appear" },
  nameNeeded: { fr: "Écris d'abord le nom qui signera tes notes.", en: "First, enter the name your notes will be signed with." },
  save: { fr: "Enregistrer", en: "Save" },
  addNote: { fr: "Laisser une note", en: "Leave a note" },
  notePlaceholder: { fr: "Ta note…", en: "Your note…" },
  replyPlaceholder: { fr: "Répondre…", en: "Reply…" },
  post: { fr: "Publier", en: "Post" },
  reply: { fr: "Répondre", en: "Reply" },
  cancel: { fr: "Annuler", en: "Cancel" },
  close: { fr: "Fermer", en: "Close" },
  resolve: { fr: "Marquer réglée", en: "Resolve" },
  reopen: { fr: "Rouvrir", en: "Reopen" },
  resolved: { fr: "Réglée", en: "Resolved" },
  remove: { fr: "Supprimer", en: "Delete" },
  hide: { fr: "Masquer", en: "Hide" },
  confirmRemove: { fr: "Supprimer ta note ? C'est définitif.", en: "Delete your note? This can't be undone." },
  confirmHide: { fr: "Masquer cette note pour tout le monde ?", en: "Hide this note for everyone?" },
  author: { fr: "auteur·rice", en: "author" },
  rootDeleted: { fr: "La note d'origine a été supprimée.", en: "The original note was deleted." },
  quoteChip: { fr: "Citation", en: "Quote" },
  dropQuote: { fr: "Retirer la citation", en: "Remove the quote" },
  general: { fr: "Notes générales", en: "General notes" },
  generalHint: { fr: "Sur la pièce dans son ensemble.", en: "About the play as a whole." },
  detached: { fr: "Notes détachées", en: "Detached notes" },
  detachedHint: {
    fr: "Leur ligne a été coupée ou réécrite depuis. Elles restent ici pour mémoire.",
    en: "Their line has since been cut or rewritten. They stay here for the record.",
  },
  tooLong: { fr: "C'est trop long (2000 caractères au plus).", en: "That's too long (2000 characters at most)." },
  errAuth: { fr: "Ta session a expiré — reconnecte-toi.", en: "Your session expired — sign in again." },
  errNetwork: { fr: "Pas de réseau. Réessaie dans un instant.", en: "No network. Try again in a moment." },
  errUnknown: { fr: "Ça n'a pas marché. Réessaie.", en: "That didn't work. Try again." },
  notesOn: { fr: (n: number) => (n === 1 ? "1 note sur cette ligne" : `${n} notes sur cette ligne`), en: (n: number) => (n === 1 ? "1 note on this line" : `${n} notes on this line`) },
  demoBanner: { fr: "Démo — rien ne quitte ton navigateur.", en: "Demo — nothing leaves your browser." },
  demoVisitor: { fr: "Entrer comme lecteur·rice", en: "Enter as a reader" },
  demoOwner: { fr: "Entrer comme l'autrice", en: "Enter as the author" },
  demoOut: { fr: "Sortir", en: "Sign out" },
} as const;

export type Strings = { [K in keyof typeof D]: (typeof D)[K]["fr"] };

export function strings(lang: Lang): Strings {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(D) as (keyof typeof D)[]) out[k] = D[k][lang];
  return out as Strings;
}

export function ago(ts: number, lang: Lang, now = Date.now()): string {
  const s = Math.round((ts - now) / 1000);
  const abs = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "minute");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 14) return rtf.format(Math.round(s / 86400), "day");
  return new Date(ts).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "short", day: "numeric" });
}
