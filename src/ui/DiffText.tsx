import { wordDiff } from "../collab/wordDiff";

/** A line before → after in one run: removed words struck through in rose, inserted words in the author's colour. */
export function DiffText({ before, after, color, className }: { before: string; after: string; color: string; className?: string }) {
  return (
    <div className={`whitespace-pre-wrap ${className ?? ""}`}>
      {wordDiff(before, after).map((s, i) =>
        s.kind === "same" ? <span key={i}>{s.text}</span>
        : s.kind === "removed" ? <span key={i} className="text-rose/90 line-through">{s.text}</span>
        : <span key={i} className="font-semibold" style={{ color }}>{s.text}</span>)}
    </div>
  );
}
