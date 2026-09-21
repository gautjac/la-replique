// Two small landing pages for links the app hands out:
//   /connexion        where an emailed sign-in link lands — copy it back into the app
//   /rejoindre/<code> an invitation — shows the code to type into the app
// (A full web editor will take over /rejoindre later; until then the app is the way in.)
import { useEffect, useState } from "react";
import { useReaderLang } from "./strings";

const APP_STORE_URL = "https://apps.apple.com/app/id6790472715";

export function Passerelle({ kind, code }: { kind: "connexion" | "rejoindre"; code?: string }) {
  const [lang, setLang] = useReaderLang();
  const [copied, setCopied] = useState(false);
  const fr = lang === "fr";
  const value = kind === "connexion" ? window.location.href : (code ?? "").toUpperCase();
  const isLink = kind === "connexion" && /[?&]oobCode=/.test(window.location.href);

  // If THIS browser asked for the emailed link (from /ecrire), finish signing in
  // right here and go back. If the app asked for it, offer "copy this link" below.
  useEffect(() => {
    if (!isLink) return;
    void import("../collab/firebase")
      .then((fb) => fb.completeEmailLink(window.location.href))
      .then((back) => { if (back) window.location.replace(back); })
      .catch(() => undefined);
  }, [isLink]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the value is selectable below */
    }
  };

  return (
    <div className="min-h-screen bg-desk text-white">
      <div className="mx-auto max-w-xl px-5 py-12">
        <header className="mb-8 flex items-center gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">La Réplique</span>
          <div className="ml-auto flex overflow-hidden rounded-lg border border-desk-rule text-xs font-semibold" role="group" aria-label="Langue / Language">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 uppercase tracking-wide ${lang === l ? "bg-gel text-white" : "text-ink-faint hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>
        </header>

        {kind === "connexion" ? (
          <>
            <h1 className="font-display text-3xl font-semibold">{fr ? "Presque rendu" : "Almost there"}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
              {isLink
                ? fr
                  ? "Copie ce lien, retourne dans La Réplique, et colle-le dans « Colle le lien reçu ». C'est ce qui te connecte — sans mot de passe."
                  : "Copy this link, go back to La Réplique, and paste it into “Paste the link you received”. That is what signs you in — no password."
                : fr
                  ? "Cette page sert à terminer une connexion par courriel. Ouvre-la depuis le lien reçu dans ton courriel."
                  : "This page completes an email sign-in. Open it from the link in your email."}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold">{fr ? "On t'invite à écrire" : "You're invited to write"}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
              {fr
                ? "Dans La Réplique, choisis « Rejoindre une pièce », puis entre ce code. Il est valable 14 jours."
                : "In La Réplique, choose “Join a play”, then enter this code. It is valid for 14 days."}
            </p>
          </>
        )}

        {(isLink || kind === "rejoindre") && value && (
          <div className="mt-6 rounded-xl border border-desk-rule bg-desk-light p-4">
            <div className={`select-all break-all font-mono text-gel-bright ${kind === "rejoindre" ? "text-center text-3xl font-bold tracking-[0.2em]" : "text-[12px] leading-relaxed"}`}>
              {value}
            </div>
            <button type="button" onClick={() => void copy()} className="mt-4 w-full rounded-lg bg-gel px-4 py-2.5 text-sm font-semibold text-white">
              {copied ? (fr ? "Copié" : "Copied") : kind === "rejoindre" ? (fr ? "Copier le code" : "Copy the code") : fr ? "Copier le lien" : "Copy the link"}
            </button>
          </div>
        )}

        {kind === "rejoindre" && value && (
          <a href={`/ecrire?code=${encodeURIComponent(value)}`} className="mt-3 block w-full rounded-lg border border-desk-rule px-4 py-2.5 text-center text-sm font-semibold hover:border-gel-bright">
            {fr ? "Pas sur iPhone, iPad ou Mac ? Écrire dans le navigateur" : "Not on iPhone, iPad or Mac? Write in the browser"}
          </a>
        )}

        <p className="mt-8 text-sm text-ink-faint">
          {fr ? "Pas encore l'app ? " : "Don't have the app yet? "}
          <a className="text-gel-bright hover:underline" href={APP_STORE_URL}>
            {fr ? "La Réplique sur l'App Store" : "La Réplique on the App Store"}
          </a>
        </p>
      </div>
    </div>
  );
}
