import { focus, lines, wordDiff } from "../collab/wordDiff";

/**
 * A line before → after, verse by verse: removed words struck through in rose,
 * inserted words in the author's colour. A long cue is focused on the verses
 * that changed (one verse of context, « ⋯ » between) unless `whole` is set.
 */
export function DiffText({ before, after, color, className, whole }: { before: string; after: string; color: string; className?: string; whole?: boolean }) {
  const ls = lines(wordDiff(before, after));
  const items = whole ? ls : focus(ls);
  return (
    <div className={`whitespace-pre-wrap ${className ?? ""}`}>
      {items.map((item, i) => item === "gap"
        ? <div key={i} className="text-ink-faint">⋯</div>
        : <div key={i} className="min-h-[1.4em]">
            {item.segments.map((s, k) =>
              s.kind === "same" ? <span key={k}>{s.text}</span>
              : s.kind === "removed" ? <span key={k} className="text-rose/90 line-through">{s.text}</span>
              : <span key={k} className="font-semibold" style={{ color }}>{s.text}</span>)}
          </div>)}
    </div>
  );
}
