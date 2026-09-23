// A word-level comparison of two texts — twin of the app's WordDiff.swift:
// same tokens (runs of non-blanks / runs of blanks / single newlines), same
// plain LCS, same verse focus, so both sides show the same thing on the same
// input (shared test vectors).

export type Segment = { kind: "same" | "removed" | "inserted"; text: string };
export type Line = { segments: Segment[]; changed: boolean };
export type Focused = Line | "gap";

export function tokens(s: string): string[] {
  const out: string[] = [];
  let cur = "", blank: boolean | undefined;
  for (const ch of s) {
    if (ch === "\n") { if (cur) { out.push(cur); cur = ""; } out.push("\n"); blank = undefined; continue; }
    const b = /\s/.test(ch);
    if (blank !== undefined && blank !== b) { out.push(cur); cur = ""; }
    cur += ch; blank = b;
  }
  if (cur) out.push(cur);
  return out;
}

/** Above this many cell comparisons the line is shown as replaced outright. */
const CAP = 250_000;

export function wordDiff(oldText: string, newText: string): Segment[] {
  if (oldText === newText) return oldText ? [{ kind: "same", text: oldText }] : [];
  const a = tokens(oldText), b = tokens(newText);
  if (!a.length) return [{ kind: "inserted", text: newText }];
  if (!b.length) return [{ kind: "removed", text: oldText }];
  if (a.length * b.length > CAP) return [{ kind: "removed", text: oldText }, { kind: "inserted", text: newText }];
  const n = a.length, m = b.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  // Walk forward; at a fork prefer removing (old text first, then new).
  const raw: Segment[] = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { raw.push({ kind: "same", text: a[i] }); i++; j++; }
    else if (j === m || (i < n && L[i + 1][j] >= L[i][j + 1])) { raw.push({ kind: "removed", text: a[i] }); i++; }
    else { raw.push({ kind: "inserted", text: b[j] }); j++; }
  }
  return normalise(raw);
}

/** Within each run of changes put removals before insertions, then merge neighbours of the same kind. */
function normalise(raw: Segment[]): Segment[] {
  const out: Segment[] = [];
  let removed = "", inserted = "";
  const flush = () => {
    if (removed) { out.push({ kind: "removed", text: removed }); removed = ""; }
    if (inserted) { out.push({ kind: "inserted", text: inserted }); inserted = ""; }
  };
  for (const s of raw) {
    if (s.kind === "same") {
      flush();
      const last = out[out.length - 1];
      if (last?.kind === "same") last.text += s.text; else out.push({ kind: "same", text: s.text });
    } else if (s.kind === "removed") removed += s.text;
    else inserted += s.text;
  }
  flush();
  return out;
}

/** A newline that came or went shows as « ↵ »: an inserted break ends the verse there; a removed one joins two verses. */
export const NEWLINE_MARK = "↵";

/** The merged diff, verse by verse. */
export function lines(segs: Segment[]): Line[] {
  const out: Line[] = [];
  let cur: Line = { segments: [], changed: false };
  const push = (s: Segment) => { cur.segments.push(s); if (s.kind !== "same") cur.changed = true; };
  const end = () => { out.push(cur); cur = { segments: [], changed: false }; };
  for (const seg of segs) {
    const parts = seg.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) {
        if (seg.kind === "same") end();
        else if (seg.kind === "inserted") { push({ kind: "inserted", text: NEWLINE_MARK }); end(); }
        else push({ kind: "removed", text: NEWLINE_MARK });
      }
      if (part) push({ kind: seg.kind, text: part });
    });
  }
  out.push(cur);
  return out;
}

/** Only the verses that changed, `context` verses around each, "gap" between. A short text (up to `showAllUpTo` verses) is shown whole. */
export function focus(ls: Line[], context = 1, showAllUpTo = 4): Focused[] {
  if (ls.length <= showAllUpTo || !ls.some((l) => l.changed)) return ls;
  const keep = new Set<number>();
  ls.forEach((l, i) => { if (l.changed) for (let k = Math.max(0, i - context); k <= Math.min(ls.length - 1, i + context); k++) keep.add(k); });
  const out: Focused[] = [];
  ls.forEach((l, i) => { if (keep.has(i)) out.push(l); else if (out[out.length - 1] !== "gap") out.push("gap"); });
  return out;
}

export const hasChange = (a: string, b: string): boolean => wordDiff(a, b).some((s) => s.kind !== "same");
