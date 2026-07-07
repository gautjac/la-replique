import { useState } from "react";
import { useUI } from "../i18n";
import { Modal } from "./common";

const CARDS = [
  { title: "obTitle1", body: "obBody1", glyph: "❝" },
  { title: "obTitle2", body: "obBody2", glyph: "◍" },
  { title: "obTitle3", body: "obBody3", glyph: "✧" },
] as const;

export function Onboarding(props: { onDone: () => void }) {
  const { t } = useUI();
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;

  return (
    <Modal onClose={props.onDone} label="onboarding">
      <div className="p-7 sm:p-9">
        <div className="mb-5 flex items-center gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-white">La Réplique</span>
          <span className="text-sm text-ink-faint">— {t("tagline")}</span>
        </div>

        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gel/15 text-3xl text-gel-bright">
          {card.glyph}
        </div>
        <h2 className="mb-2 font-display text-2xl font-semibold text-white">{t(card.title)}</h2>
        <p className="text-[15px] leading-relaxed text-ink-faint">{t(card.body)}</p>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-1.5">
            {CARDS.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-gel" : "w-1.5 bg-desk-rule"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {!last && (
              <button onClick={props.onDone} className="text-sm text-ink-faint hover:text-white">
                {t("obSkip")}
              </button>
            )}
            <button
              onClick={() => (last ? props.onDone() : setI(i + 1))}
              className="rounded-full bg-gel px-5 py-2 text-sm font-semibold text-white shadow-gel transition-colors hover:bg-gel-bright"
            >
              {last ? t("obStart") : t("next")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
