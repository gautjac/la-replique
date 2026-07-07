import { beatDef } from "../beats";
import { useUI } from "../i18n";
import { timelineSegments } from "../model";
import type { Play } from "../types";

/** A horizontal strip of the whole play — one block per scene, width ∝ spoken words. */
export function TimelineRibbon({ play, onJump }: { play: Play; onJump: (sceneId: string) => void }) {
  const { locale } = useUI();
  const segs = timelineSegments(play);
  if (segs.length < 2) return null;

  return (
    <div className="no-print mx-auto w-full max-w-[52rem] px-4 pt-3 sm:px-8">
      <div className="flex h-7 items-stretch gap-0.5 overflow-hidden rounded-lg" role="list">
        {segs.map((s, i) => {
          const def = beatDef(s.beat);
          const prevAct = i > 0 ? segs[i - 1].actLabel : null;
          const actBreak = s.actLabel !== prevAct && i > 0;
          return (
            <button
              key={s.sceneId}
              role="listitem"
              onClick={() => onJump(s.sceneId)}
              title={`${s.actLabel ? s.actLabel + " · " : ""}${s.label}`}
              className={`group relative min-w-[10px] transition-opacity hover:opacity-100 ${actBreak ? "ml-1" : ""}`}
              style={{ flexGrow: Math.max(s.fraction * 100, 2), background: def ? def.color : "#3a4152", opacity: 0.85 }}
            >
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-1 text-[10px] font-semibold text-white/90">
                {s.label.match(/\d+/)?.[0] ?? ""}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-ink-faint">
        <span>{segs[0].actLabel ?? (locale === "fr" ? "début" : "start")}</span>
        <span>{segs[segs.length - 1].actLabel ?? (locale === "fr" ? "fin" : "end")}</span>
      </div>
    </div>
  );
}
