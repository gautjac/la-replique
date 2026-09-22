// The note chip in a line's margin, with a preview: HOVER shows the thread(s)
// (a pointer just passing by doesn't — 300 ms); a single click pins the same
// preview (that is how it works on a touch screen); a DOUBLE click opens the
// full notes drawer to reply or edit. A line without notes: one click opens.
import { useEffect, useRef, useState } from "react";
import { useUI } from "../i18n";

export interface NotePreviewItem {
  author: string;
  body: string;
  quote?: string;
  replies: number;
  at: number;
}

export function NoteChipPreview(props: { count: number; items: NotePreviewItem[]; active: boolean; dim: boolean; onOpen(): void }) {
  const { count, items, active, dim, onOpen } = props;
  const { locale } = useUI();
  const fr = locale === "fr";
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const arm = (on: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHover(on), on ? 300 : 250);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const shown = count > 0 && (pinned || hover);
  const close = () => { window.clearTimeout(timer.current); setPinned(false); setHover(false); };

  return (
    <>
      <button
        type="button"
        aria-label={count ? `${count} notes` : "note"}
        aria-expanded={shown}
        onMouseEnter={() => count && arm(true)}
        onMouseLeave={() => arm(false)}
        onClick={() => (count ? setPinned((p) => !p) : onOpen())}
        onDoubleClick={() => { close(); onOpen(); }}
        title={count ? (fr ? "Double-clic : ouvrir" : "Double-click: open") : undefined}
        className={`no-print absolute -right-1 top-1 z-10 inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full px-1.5 font-sans text-[11px] font-semibold transition sm:-right-9 ${
          count ? "bg-gel text-white shadow-gel" : `border border-dashed border-gel/50 text-gel ${active ? "opacity-100" : "opacity-0 hover:opacity-100 focus-visible:opacity-100"} ${dim ? "sm:opacity-30" : ""}`
        }`}
      >
        {count ? <>💬 {count}</> : "+"}
      </button>
      {shown && (
        <div
          role="dialog"
          onMouseEnter={() => arm(true)}
          onMouseLeave={() => arm(false)}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          className="no-print absolute right-0 top-8 z-30 w-72 rounded-xl border border-gel/25 bg-white p-3 font-sans text-ink shadow-lift"
        >
          {items.slice(0, 3).map((it, i) => (
            <div key={i} className={i ? "mt-3 border-t border-paper-edge pt-3" : ""}>
              <div className="flex items-baseline gap-2 text-[12px]">
                <span className="font-semibold">{it.author}</span>
                <span className="text-ink-faint">{relative(it.at, locale)}</span>
              </div>
              {it.quote && <div className="mt-0.5 truncate font-body text-[12px] text-ink-soft">« {it.quote} »</div>}
              <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap font-body text-[13px] leading-snug">{it.body}</p>
              {it.replies > 0 && <div className="mt-0.5 text-[11px] font-medium text-gel-deep">{it.replies} {fr ? (it.replies > 1 ? "réponses" : "réponse") : it.replies > 1 ? "replies" : "reply"}</div>}
            </div>
          ))}
          {items.length > 3 && <div className="mt-2 text-[11px] text-ink-faint">{fr ? `… et ${items.length - 3} de plus` : `… and ${items.length - 3} more`}</div>}
          <button type="button" onClick={() => { close(); onOpen(); }} className="mt-3 w-full rounded-lg bg-gel px-3 py-1.5 text-[12px] font-semibold text-white">
            {fr ? "Ouvrir · répondre" : "Open · reply"}
          </button>
        </div>
      )}
    </>
  );
}

function relative(ts: number, locale: "fr" | "en"): string {
  const s = Math.round((ts - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const a = Math.abs(s);
  if (a < 60) return rtf.format(0, "minute");
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
